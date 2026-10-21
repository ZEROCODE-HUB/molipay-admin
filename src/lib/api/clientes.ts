import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import { toCliente } from "./mappers";
import type { Cliente, ClienteRow, EstadoCliente, Page, Pagination, TipoPersona } from "./types";
import { normalizarEstado, puedeTransicionar } from "@/lib/cliente-estados";

export type ClienteFilters = Pagination & {
  /** Búsqueda de texto libre: legajo, correo o nombre (ilike server-side). */
  search?: string;
  estado?: EstadoCliente;
  tipoPersona?: TipoPersona;
};

const COLUMNS =
  "id, legajo, tipo_persona, correo, nombre, cuit, estado, fecha_alta, created_at, updated_at, email_verificado, onboarding_completo, cbu, cbu_cancelado, genero, cuit_cuil, fecha_nacimiento, ocupacion, origen_fondos, es_pep, tipo_sociedad, nombre_legal, nombre_fantasia, fecha_inscripcion, direccion, direccion2, ciudad, provincia, cp, estado_onboarding, limite_transferencia, limite_ops_diarias, limite_monto_diario";
const COLUMNS_LEGACY =
  "id, legajo, tipo_persona, correo, nombre, cuit, estado, fecha_alta, created_at, updated_at, email_verificado, onboarding_completo, cbu, cbu_cancelado";

function isMissingColumnError(error: unknown): boolean {
  const msg = (error as { message?: string })?.message ?? String(error);
  return /column.*does not exist|PGRST204|schema cache|genero|cuit_cuil|fecha_nacimiento|origen_fondos|es_pep|tipo_sociedad|nombre_legal|fecha_inscripcion|direccion2|provincia|estado_onboarding/i.test(msg);
}

export async function listClientes(filters: ClienteFilters): Promise<Page<Cliente>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado, tipoPersona } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const build = (cols: string) => {
    let q = sb.from("clientes").select(cols, { count: "exact" });
    if (search && search.trim()) {
      const qq = search.trim().replace(/[%_]/g, "\\$&");
      q = q.or(`legajo.ilike.%${qq}%,correo.ilike.%${qq}%,nombre.ilike.%${qq}%`);
    }
    if (estado) q = q.eq("estado", estado);
    else q = q.neq("estado", "eliminado");
    if (tipoPersona) q = q.eq("tipo_persona", tipoPersona);
    return q.order("fecha_alta", { ascending: false }).range(from, to);
  };

  let { data, error, count } = await build(COLUMNS);
  if (error && isMissingColumnError(error)) {
    const r = await build(COLUMNS_LEGACY);
    data = r.data as typeof data;
    error = r.error;
    count = r.count;
  }
  if (error) throw new DataAccessError(error);

  let rows = (data ?? []) as ClienteRow[];

  // Excluir emails de backoffice (admin_users) para que no aparezcan en
  // /admin/general/usuarios (persona física/jurídica). Solo deben verse en
  // /admin/administracion/usuarios. Best-effort: si falla (RLS/no admin), no filtramos.
  try {
    const { data: admins } = await sb.from("admin_users").select("email").limit(200);
    if (admins && admins.length) {
      const adminSet = new Set((admins as { email: string }[]).map((a) => a.email.trim().toLowerCase()));
      const before = rows.length;
      rows = rows.filter((r) => !adminSet.has(r.correo.trim().toLowerCase()));
      // Ajustar total para paginación (aproximado, evita contar admins como clientes)
      if (rows.length !== before && typeof count === "number") {
        // Si filtramos N filas en esta página, restamos al total proporcional
        // Best-effort: si la página filtró todo, el total puede quedar levemente inflado,
        // pero evita mostrar al admin en la lista.
        const filteredInPage = before - rows.length;
        count = Math.max(0, count - filteredInPage);
        // Si el total real de admins es mayor que lo filtrado en esta página,
        // la paginación puede quedar con páginas vacías; el migración 0023
        // elimina el duplicado a nivel DB para que el count sea exacto.
      }
    }
  } catch {
    // ignorar: sin permiso para leer admin_users o tabla inexistente
  }

  return { rows: rows.map(toCliente), total: count ?? rows.length, page, pageSize };
}

export async function getCliente(id: string): Promise<Cliente | null> {
  const sb = requireSupabase();
  let { data, error } = await sb.from("clientes").select(COLUMNS).eq("id", id).maybeSingle();
  if (error && isMissingColumnError(error)) {
    const r = await sb.from("clientes").select(COLUMNS_LEGACY).eq("id", id).maybeSingle();
    data = r.data as typeof data;
    error = r.error;
  }
  if (error) throw new DataAccessError(error);
  return data ? toCliente(data as ClienteRow) : null;
}

export async function getClienteByLegajo(legajo: string): Promise<Cliente | null> {
  const sb = requireSupabase();
  let { data, error } = await sb
    .from("clientes")
    .select(COLUMNS)
    .eq("legajo", legajo.trim().toUpperCase())
    .maybeSingle();
  if (error && isMissingColumnError(error)) {
    const r = await sb.from("clientes").select(COLUMNS_LEGACY).eq("legajo", legajo.trim().toUpperCase()).maybeSingle();
    data = r.data as typeof data;
    error = r.error;
  }
  if (error) throw new DataAccessError(error);
  return data ? toCliente(data as ClienteRow) : null;
}

export async function getClienteByCorreo(correo: string): Promise<Cliente | null> {
  const sb = requireSupabase();
  let { data, error } = await sb
    .from("clientes")
    .select(COLUMNS)
    .eq("correo", correo.trim().toLowerCase())
    .maybeSingle();
  if (error && isMissingColumnError(error)) {
    const r = await sb.from("clientes").select(COLUMNS_LEGACY).eq("correo", correo.trim().toLowerCase()).maybeSingle();
    data = r.data as typeof data;
    error = r.error;
  }
  if (error) throw new DataAccessError(error);
  return data ? toCliente(data as ClienteRow) : null;
}

export type ClienteInput = {
  tipoPersona: TipoPersona;
  correo: string;
  nombre: string;
  cuit: string;
  estado?: EstadoCliente;
  fechaAlta?: string;
};

/** El legajo se deriva del CUIT vía trigger `handle_new_cliente` (la DB es la fuente de verdad). */
export async function createCliente(input: ClienteInput): Promise<Cliente> {
  const sb = requireSupabase();
  let { data, error } = await sb
    .from("clientes")
    .insert({
      tipo_persona: input.tipoPersona,
      correo: input.correo,
      nombre: input.nombre,
      cuit: input.cuit,
      estado: input.estado ?? "pendiente_verificacion",
      fecha_alta: input.fechaAlta ?? new Date().toISOString().slice(0, 10),
    })
    .select(COLUMNS)
    .single();
  if (error && isMissingColumnError(error)) {
    const r = await sb.from("clientes").select(COLUMNS_LEGACY).eq("correo", input.correo.trim().toLowerCase()).maybeSingle();
    data = r.data as typeof data;
    error = r.error;
  }
  if (error) throw new DataAccessError(error);
  return toCliente(data as ClienteRow);
}

export async function updateClienteEstado(id: string, estado: EstadoCliente): Promise<Cliente> {
  const sb = requireSupabase();
  let { data, error } = await sb
    .from("clientes")
    .update({ estado })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error && isMissingColumnError(error)) {
    const r = await sb.from("clientes").update({ estado }).eq("id", id).select(COLUMNS_LEGACY).single();
    data = r.data as typeof data;
    error = r.error;
  }
  if (error) throw new DataAccessError(error);
  return toCliente(data as ClienteRow);
}

// --- Helpers de homologación ---

export async function clienteTieneMovimientos(legajo: string): Promise<boolean> {
  const sb = requireSupabase();
  const { count, error } = await sb
    .from("movimientos")
    .select("id", { count: "exact", head: true })
    .eq("legajo", legajo.trim().toUpperCase());
  if (error) throw new DataAccessError(error);
  return (count ?? 0) > 0;
}

export async function clienteTieneComision(clienteId: string): Promise<boolean> {
  const sb = requireSupabase();
  const { count, error } = await sb
    .from("comisiones_cliente")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", clienteId)
    .eq("estado", "Habilitado");
  if (error) throw new DataAccessError(error);
  return (count ?? 0) > 0;
}

export async function clienteTieneCbu(cliente: Cliente): Promise<boolean> {
  // CBU puede estar en clientes.cbu o en subcuentas.cbu (si existe)
  if (cliente.cbu && cliente.cbu.trim().length >= 10 && !cliente.cbuCancelado) return true;
  // fallback: consultar subcuentas
  try {
    const sb = requireSupabase();
    const { count } = await sb
      .from("subcuentas")
      .select("id", { count: "exact", head: true })
      .eq("cliente_legajo", cliente.legajo);
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

// ============================================================================
// ENRIQUECIMIENTOS PARA LA TABLA DE PERSONAS FÍSICAS / JURÍDICAS
// ============================================================================
// Las políticas RLS ya están ajustadas: las views y tablas aquí usadas son
// admin-only. Se cargan en paralelo en una sola llamada para no generar N+1.
//
// - getClientesEnrichment(legajos)     — riesgo, CVUs, KYC y consumo mensual
// - getRiesgoVigentePorLegajo(legajo)  — para el detalle
//
// Si alguna tabla/view no existe en el remote, las funciones devuelven {}
// silenciosamente para no romper páginas legacy.
// ============================================================================

export type RiesgoPLD = "bajo" | "medio" | "alto" | "critico";

export type ClienteEnrichment = {
  /** Nivel de riesgo PLAFT vigente (de v_cliente_riesgo_vigente). */
  riesgo?: RiesgoPLD | null;
  riesgoMotivo?: string | null;
  /** Cantidad de subcuentas/CVUs operativas. */
  cvuCount?: number;
  /** Cantidad de comercios asociados (de tabla `comercios` con FK al legajo). */
  comerciosCount?: number;
  /** KYC: hay al menos una fila en `validaciones` para este legajo. */
  kycCompleto?: boolean;
  /** % usado del limite_transferencia en el mes en curso (0-100). */
  consumoMensualPct?: number | null;
};

/**
 * Carga en paralelo, para un lote de legajos, los enriquecimientos que
 * aparecen como columnas extra en la tabla del backoffice.
 *
 * Devuelve un map legajo -> enrichment. No lanza errores: si una pieza
 * no existe (migración no aplicada), devuelve null/0/false para esa pieza.
 */
export async function getClientesEnrichment(
  legajos: string[],
): Promise<Record<string, ClienteEnrichment>> {
  const empty: Record<string, ClienteEnrichment> = {};
  if (legajos.length === 0) return empty;
  const sb = requireSupabase();
  const result: Record<string, ClienteEnrichment> = {};
  for (const l of legajos) result[l] = {};

  // 1. Riesgo (view). La view usa security_invoker así que respeta RLS admin-only.
  try {
    const { data } = await sb
      .from("v_cliente_riesgo_vigente" as never)
      .select("cliente_legajo,nivel,motivo")
      .in("cliente_legajo" as never, legajos as never[]);
    if (data) {
      for (const row of data as unknown as { cliente_legajo: string; nivel: RiesgoPLD; motivo: string }[]) {
        if (result[row.cliente_legajo]) {
          result[row.cliente_legajo].riesgo = row.nivel;
          result[row.cliente_legajo].riesgoMotivo = row.motivo;
        }
      }
    }
  } catch {
    // view no existe aún: tolerar
  }

  // 2. Conteo de subcuentas/CVUs por legajo.
  try {
    const { data } = await sb
      .from("subcuentas")
      .select("cliente_legajo")
      .in("cliente_legajo", legajos);
    if (data) {
      const counts: Record<string, number> = {};
      for (const r of data as { cliente_legajo: string }[]) {
        counts[r.cliente_legajo] = (counts[r.cliente_legajo] ?? 0) + 1;
      }
      for (const [l, n] of Object.entries(counts)) {
        if (result[l]) result[l].cvuCount = n;
      }
      for (const l of legajos) {
        if (result[l] && result[l].cvuCount == null) result[l].cvuCount = 0;
      }
    }
  } catch {
    // RLS o tabla no existe: dejar 0
  }

  // 2b. Comercios por legajo (FK comercios.legajo -> clientes.legajo).
  try {
    const { data } = await sb
      .from("comercios")
      .select("legajo")
      .in("legajo", legajos);
    if (data) {
      const counts: Record<string, number> = {};
      for (const r of data as { legajo: string }[]) {
        counts[r.legajo] = (counts[r.legajo] ?? 0) + 1;
      }
      for (const [l, n] of Object.entries(counts)) {
        if (result[l]) result[l].comerciosCount = n;
      }
      for (const l of legajos) {
        if (result[l] && result[l].comerciosCount == null) result[l].comerciosCount = 0;
      }
    }
  } catch {
    // RLS o tabla no existe: dejar 0
  }

  // 3. KYC: existencia de al menos una fila en validaciones por legajo.
  try {
    const { data } = await sb
      .from("validaciones")
      .select("cliente_legajo")
      .in("cliente_legajo", legajos)
      .limit(10000);
    if (data) {
      const set = new Set((data as { cliente_legajo: string }[]).map((r) => r.cliente_legajo));
      for (const l of legajos) {
        if (result[l]) result[l].kycCompleto = set.has(l);
      }
    }
  } catch {
    // tabla no existe
  }

  return result;
}

/** Trae el % consumido del límite de transferencia del mes en curso. */
export async function getConsumoMensualPorLegajo(
  legajo: string,
  limite?: number | null,
): Promise<number | null> {
  if (!limite || limite <= 0) return null;
  const sb = requireSupabase();
  const inicio = new Date();
  inicio.setDate(1);
  inicio.setHours(0, 0, 0, 0);
  try {
    const { data } = await sb
      .from("movimientos")
      .select("monto_operacion")
      .eq("legajo", legajo)
      .gte("fecha", inicio.toISOString());
    if (!data) return 0;
    const total = (data as { monto_operacion: number }[]).reduce((a, r) => a + Number(r.monto_operacion), 0);
    return Math.min(100, Math.round((total / limite) * 100));
  } catch {
    return null;
  }
}

/** Helper de UI: formatea un CUIT de 11 dígitos con guiones `XX-XXXXXXXX-X`. */
export function formatCuit(cuit: string | null | undefined): string {
  if (!cuit) return "—";
  const clean = cuit.replace(/\D/g, "");
  if (clean.length !== 11) return cuit;
  return `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`;
}

// ============================================================================
// PLAFT: edición de riesgo y perfil transaccional
// ============================================================================

export type EvaluacionRiesgoRow = {
  id: string;
  cliente_legajo: string;
  nivel: RiesgoPLD;
  motivo: string;
  detalle: Record<string, unknown> | null;
  evaluado_por: string | null;
  vigente_desde: string;
  vigente_hasta: string | null;
  created_at: string;
};

/** Historial completo de evaluaciones de riesgo PLAFT (append-only). */
export async function listEvaluacionesRiesgo(legajo: string): Promise<EvaluacionRiesgoRow[]> {
  const sb = requireSupabase();
  try {
    const { data, error } = await sb
      .from("cliente_perfil_riesgo")
      .select("*")
      .eq("cliente_legajo", legajo)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []) as EvaluacionRiesgoRow[];
  } catch (e) {
    if (e instanceof Error) throw new DataAccessError(e);
    throw e;
  }
}

/** Inserta una nueva evaluación de riesgo. Append-only: la vigente anterior queda en el historial. */
export async function registrarEvaluacionRiesgo(input: {
  legajo: string;
  nivel: RiesgoPLD;
  motivo: string;
  vigenteHasta?: string | null;
}): Promise<EvaluacionRiesgoRow> {
  const sb = requireSupabase();
  // Primero cerrar la vigente anterior (si la hay) para que la nueva sea la única vigente.
  const actual = await sb
    .from("cliente_perfil_riesgo")
    .select("id,vigente_hasta")
    .eq("cliente_legajo", input.legajo)
    .or("vigente_hasta.is.null")
    .maybeSingle();
  if (actual.data) {
    await sb
      .from("cliente_perfil_riesgo")
      .update({ vigente_hasta: new Date().toISOString() })
      .eq("id", (actual.data as EvaluacionRiesgoRow).id);
  }
  const { data, error } = await sb
    .from("cliente_perfil_riesgo")
    .insert({
      cliente_legajo: input.legajo,
      nivel: input.nivel,
      motivo: input.motivo,
      vigente_hasta: input.vigenteHasta ?? null,
    })
    .select("*")
    .single();
  if (error) throw new DataAccessError(error);
  return data as EvaluacionRiesgoRow;
}

/** Actualiza los límites de Perfil Transaccional en la ficha del cliente. */
export async function updatePerfilTransaccional(input: {
  clienteId: string;
  limiteTransferencia: number | null;
  limiteOpsDiarias: number | null;
  limiteMontoDiario: number | null;
}): Promise<Cliente> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("clientes")
    .update({
      limite_transferencia: input.limiteTransferencia,
      limite_ops_diarias: input.limiteOpsDiarias,
      limite_monto_diario: input.limiteMontoDiario,
    })
    .eq("id", input.clienteId)
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  if (!data) throw new DataAccessError({ message: "Cliente no encontrado" });
  return toCliente(data as ClienteRow);
}

export type TransicionResult = { ok: true; cliente: Cliente } | { ok: false; motivo: string };

async function transicionarCliente(
  cliente: Cliente,
  nuevoEstado: EstadoCliente,
  opts?: { adminUserId?: string; comentario?: string },
): Promise<TransicionResult> {
  const hasMov = await clienteTieneMovimientos(cliente.legajo);
  const hasCom = await clienteTieneComision(cliente.id);
  const hasCbu = await clienteTieneCbu(cliente);
  const ctx = { hasCbu, hasComision: hasCom, hasMovimientos: hasMov };

  const check = puedeTransicionar(cliente.estado, nuevoEstado, ctx);
  if (!check.ok) return { ok: false, motivo: check.motivo! };

  // Deshabilitar cancela CBU (idempotente)
  const patch: Record<string, unknown> = { estado: nuevoEstado };
  if (nuevoEstado === "deshabilitado") {
    patch.cbu_cancelado = true;
  }
  if (nuevoEstado === "registrado") {
    patch.email_verificado = true;
  }

  const sb = requireSupabase();
  let { data, error } = await sb
    .from("clientes")
    .update(patch)
    .eq("id", cliente.id)
    .select(COLUMNS)
    .single();
  if (error && isMissingColumnError(error)) {
    const r = await sb.from("clientes").update(patch).eq("id", cliente.id).select(COLUMNS_LEGACY).single();
    data = r.data as typeof data;
    error = r.error;
  }
  if (error) throw new DataAccessError(error);

  // Auditoría explícita si la tabla existe (no bloquea si falla)
  try {
    await sb.from("cliente_transiciones").insert({
      cliente_id: cliente.id,
      legajo: cliente.legajo,
      estado_anterior: normalizarEstado(cliente.estado),
      estado_nuevo: normalizarEstado(nuevoEstado),
      origen: "manual",
      admin_user_id: opts?.adminUserId ?? null,
      comentario: opts?.comentario ?? null,
    });
  } catch {
    // tabla puede no existir aún si migración no aplicada: no bloquear
  }

  return { ok: true, cliente: toCliente(data as ClienteRow) };
}

// Acciones específicas del flujo (§1-6)
export async function verificarEmailCliente(cliente: Cliente): Promise<TransicionResult> {
  return transicionarCliente(cliente, "registrado");
}

export async function aprobarDocumentacionCliente(cliente: Cliente): Promise<TransicionResult> {
  return transicionarCliente(cliente, "preactivado", { comentario: "Aprobación de documentación" });
}

export async function activarCliente(cliente: Cliente): Promise<TransicionResult> {
  return transicionarCliente(cliente, "activado");
}

export async function suspenderCliente(cliente: Cliente): Promise<TransicionResult> {
  return transicionarCliente(cliente, "suspendido");
}

export async function reactivarCliente(cliente: Cliente): Promise<TransicionResult> {
  return transicionarCliente(cliente, "activado");
}

export async function deshabilitarCliente(cliente: Cliente): Promise<TransicionResult> {
  return transicionarCliente(cliente, "deshabilitado", { comentario: "Deshabilitación BCRA: CBU cancelado, historial conservado" });
}

export async function eliminarCliente(cliente: Cliente): Promise<TransicionResult> {
  // Eliminado NO es estado: borrado físico (hard delete) solo si no tiene movimientos
  const hasMov = await clienteTieneMovimientos(cliente.legajo);
  if (hasMov) return { ok: false, motivo: "No se puede eliminar: tiene movimientos. Solo puede deshabilitarse." };
  try {
    await hardDeleteCliente(cliente.id);
    return { ok: true, cliente };
  } catch (e) {
    return { ok: false, motivo: (e as Error).message };
  }
}

// Hard delete real — borrado físico en cascada (solo si no tiene movimientos)
export async function hardDeleteCliente(id: string): Promise<void> {
  const sb = requireSupabase();
  const cliente = await getCliente(id);
  if (!cliente) throw new Error("Cliente no encontrado");
  const hasMov = await clienteTieneMovimientos(cliente.legajo);
  if (hasMov) throw new Error("No se puede eliminar: el cliente tiene movimientos históricos.");

  // Limpieza de tablas dependientes (idempotente: ignora si tabla no existe o sin filas)
  const legajo = cliente.legajo;
  const cid = cliente.id;
  const tablasLegajo = [
    "subcuentas",
    "documentos",
    "historial_cambios",
    "validaciones",
    "alertas",
    "bloqueos",
    "cliente_modulos",
    "cliente_parametros_alertas",
    "cliente_parametros_bloqueos",
    "cliente_comercios_pst",
    "impuestos_asignaciones",
    "cliente_transiciones",
  ];
  for (const t of tablasLegajo) {
    try {
      const col = t === "impuestos_asignaciones" ? "legajo" : "cliente_legajo";
      // cliente_transiciones tiene ambos; intentamos legajo
      if (t === "cliente_transiciones") {
        await sb.from(t).delete().eq("legajo", legajo);
        await sb.from(t).delete().eq("cliente_id", cid);
      } else {
        await sb.from(t).delete().eq(col, legajo);
      }
    } catch {
      // ignora tabla inexistente o RLS
    }
  }
  // Tablas por cliente_id
  try { await sb.from("comisiones_cliente").delete().eq("cliente_id", cid); } catch {}
  try { await sb.from("cliente_links_pago").delete().eq("cliente_legajo", legajo); } catch {}
  try { await sb.from("productos").delete().eq("cliente_legajo", legajo); } catch {}
  // comercios (y puntos_venta por CASCADE)
  try { await sb.from("comercios").delete().eq("legajo", legajo); } catch {}

  // Finalmente cliente (dispara trigger trg_cliente_deleted_cleanup que borra auth.users)
  const { error } = await sb.from("clientes").delete().eq("id", cid);
  if (error) throw new DataAccessError(error);

  // Garantizar borrado en auth aunque el trigger no tenga permisos o la migración
  // aún no esté aplicada: best-effort via Edge Function + RPC.
  const correoLower = legajo ? cliente.correo.trim().toLowerCase() : "";
  if (correoLower) {
    // 1) Edge Function con service_role (borra auth + limpia public huérfano)
    try {
      // supabase.functions.invoke está disponible si el cliente está configurado
      const supabaseAny = sb as unknown as { functions?: { invoke: (name: string, opts: unknown) => Promise<unknown> } };
      if (supabaseAny.functions?.invoke) {
        await supabaseAny.functions.invoke("eliminar-usuario", { body: { email: correoLower, legajo } });
      }
    } catch {
      // ignorar: edge puede no estar desplegada aún
    }
    // 2) Fallback RPC SECURITY DEFINER (no requiere service_role en el cliente)
    try {
      await sb.rpc("eliminar_auth_por_email", { p_email: correoLower });
    } catch {
      // ignorar: función puede no existir si migración no aplicada
    }
  }
}

export async function generarCbuParaCliente(cliente: Cliente, cbu: string): Promise<Cliente> {
  const sb = requireSupabase();
  let { data, error } = await sb
    .from("clientes")
    .update({ cbu: cbu.trim(), cbu_cancelado: false })
    .eq("id", cliente.id)
    .select(COLUMNS)
    .single();
  if (error && isMissingColumnError(error)) {
    const r = await sb.from("clientes").update({ cbu: cbu.trim(), cbu_cancelado: false }).eq("id", cliente.id).select(COLUMNS_LEGACY).single();
    data = r.data as typeof data;
    error = r.error;
  }
  if (error) throw new DataAccessError(error);
  return toCliente(data as ClienteRow);
}
