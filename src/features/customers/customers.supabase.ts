import { AppError,userMessage } from "@/shared/lib/errors";
import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";
import { toCustomer } from "@/infrastructure/supabase/legacy/mappers";
import type {
Customer,
CustomerRow,
StatusCustomer,
Page,
Pagination,
KindPerson,
} from "@/infrastructure/supabase/legacy/types";
import { normalizeStatus,canTransicionar } from "@/features/customers/customer-status.rules";

export type CustomerFilters = Pagination & {
  /** Búsqueda de texto libre: legajo, correo o nombre (ilike server-side). */
  search?: string;
  estado?: StatusCustomer;
  tipoPersona?: KindPerson;
};

const COLUMNS =
  "id, legajo, tipo_persona, correo, nombre, cuit, estado, fecha_alta, created_at, updated_at, email_verificado, onboarding_completo, cbu, cbu_cancelado, genero, cuit_cuil, fecha_nacimiento, ocupacion, origen_fondos, es_pep, tipo_sociedad, nombre_legal, nombre_fantasia, fecha_inscripcion, direccion, direccion2, ciudad, provincia, cp, estado_onboarding, limite_transferencia, limite_ops_diarias, limite_monto_diario";
const COLUMNS_LEGACY =
  "id, legajo, tipo_persona, correo, nombre, cuit, estado, fecha_alta, created_at, updated_at, email_verificado, onboarding_completo, cbu, cbu_cancelado";

function isMissingColumnError(error: unknown): boolean {
  const msg = (error as { message?: string })?.message ?? String(error);
  return /column.*does not exist|PGRST204|schema cache|genero|cuit_cuil|fecha_nacimiento|origen_fondos|es_pep|tipo_sociedad|nombre_legal|fecha_inscripcion|direccion2|provincia|estado_onboarding/i.test(
    msg,
  );
}

export async function listCustomers(filters: CustomerFilters): Promise<Page<Customer>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado: status, tipoPersona: personType } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const build = (cols: string) => {
    let q = sb.from("clientes").select(cols, { count: "exact" });
    if (search && search.trim()) {
      const qq = search.trim().replace(/[%_]/g, "\\$&");
      q = q.or(`legajo.ilike.%${qq}%,correo.ilike.%${qq}%,nombre.ilike.%${qq}%`);
    }
    if (status) q = q.eq("estado", status);
    else q = q.neq("estado", "eliminado");
    if (personType) q = q.eq("tipo_persona", personType);
    return q.order("fecha_alta", { ascending: false }).range(from, to);
  };

  let { data, error, count } = await build(COLUMNS);
  if (error && isMissingColumnError(error)) {
    const r = await build(COLUMNS_LEGACY);
    data = r.data as typeof data;
    error = r.error;
    count = r.count;
  }
  if (error) throw toAppError(error);

  let rows = (data ?? []) as unknown as CustomerRow[];

  // Excluir emails de backoffice (backoffice_users) para que no aparezcan en
  // /admin/general/usuarios (persona física/jurídica). Solo deben verse en
  // /admin/administracion/usuarios. Best-effort: si falla (RLS/no admin), no filtramos.
  try {
    const { data: admins } = await sb.from("backoffice_users").select("email").limit(500);
    if (admins && admins.length) {
      const adminSet = new Set(
        (admins as { email: string }[]).map((a) => a.email.trim().toLowerCase()),
      );
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
    // ignorar: sin permiso para leer backoffice_users
  }

  return { rows: rows.map(toCustomer), total: count ?? rows.length, page, pageSize };
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const sb = requireSupabase();
  let { data, error } = await sb.from("clientes").select(COLUMNS).eq("id", id).maybeSingle();
  if (error && isMissingColumnError(error)) {
    const r = await sb.from("clientes").select(COLUMNS_LEGACY).eq("id", id).maybeSingle();
    data = r.data as typeof data;
    error = r.error;
  }
  if (error) throw toAppError(error);
  return data ? toCustomer(data as CustomerRow) : null;
}

export async function getCustomerByLegajo(legajo: string): Promise<Customer | null> {
  const sb = requireSupabase();
  let { data, error } = await sb
    .from("clientes")
    .select(COLUMNS)
    .eq("legajo", legajo.trim().toUpperCase())
    .maybeSingle();
  if (error && isMissingColumnError(error)) {
    const r = await sb
      .from("clientes")
      .select(COLUMNS_LEGACY)
      .eq("legajo", legajo.trim().toUpperCase())
      .maybeSingle();
    data = r.data as typeof data;
    error = r.error;
  }
  if (error) throw toAppError(error);
  return data ? toCustomer(data as CustomerRow) : null;
}

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  const sb = requireSupabase();
  let { data, error } = await sb
    .from("clientes")
    .select(COLUMNS)
    .eq("correo", email.trim().toLowerCase())
    .maybeSingle();
  if (error && isMissingColumnError(error)) {
    const r = await sb
      .from("clientes")
      .select(COLUMNS_LEGACY)
      .eq("correo", email.trim().toLowerCase())
      .maybeSingle();
    data = r.data as typeof data;
    error = r.error;
  }
  if (error) throw toAppError(error);
  return data ? toCustomer(data as CustomerRow) : null;
}

export type CustomerInput = {
  tipoPersona: KindPerson;
  correo: string;
  nombre: string;
  cuit: string;
  estado?: StatusCustomer;
  fechaAlta?: string;
};

/** El legajo se deriva del CUIT vía trigger `handle_new_cliente` (la DB es la fuente de verdad). */
export async function createCustomer(input: CustomerInput): Promise<Customer> {
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
    const r = await sb
      .from("clientes")
      .select(COLUMNS_LEGACY)
      .eq("correo", input.correo.trim().toLowerCase())
      .maybeSingle();
    data = r.data as typeof data;
    error = r.error;
  }
  if (error) throw toAppError(error);
  return toCustomer(data as CustomerRow);
}

export async function updateCustomerStatus(id: string, status: StatusCustomer): Promise<Customer> {
  const sb = requireSupabase();
  let { data, error } = await sb
    .from("clientes")
    .update({ estado: status })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error && isMissingColumnError(error)) {
    const r = await sb
      .from("clientes")
      .update({ estado: status })
      .eq("id", id)
      .select(COLUMNS_LEGACY)
      .single();
    data = r.data as typeof data;
    error = r.error;
  }
  if (error) throw toAppError(error);
  return toCustomer(data as CustomerRow);
}

// --- Helpers de homologación ---

export async function customerTieneMovements(legajo: string): Promise<boolean> {
  const sb = requireSupabase();
  const { count, error } = await sb
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("legajo", legajo.trim().toUpperCase());
  if (error) throw toAppError(error);
  return (count ?? 0) > 0;
}

export async function customerTieneFee(customerId: string): Promise<boolean> {
  const sb = requireSupabase();
  const { count, error } = await sb
    .from("comisiones_cliente")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", customerId)
    .eq("estado", "Habilitado");
  if (error) throw toAppError(error);
  return (count ?? 0) > 0;
}

export async function customerTieneCbu(customer: Customer): Promise<boolean> {
  // CBU puede estar en clientes.cbu o en subcuentas.cbu (si existe)
  if (customer.cbu && customer.cbu.trim().length >= 10 && !customer.cbuCancelado) return true;
  // fallback: consultar subcuentas
  try {
    const sb = requireSupabase();
    const { count } = await sb
      .from("subaccounts")
      .select("id", { count: "exact", head: true })
      .eq("cliente_legajo", customer.legajo);
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

export type RiskPLD = "bajo" | "medio" | "alto" | "critico";

export type CustomerEnrichment = {
  /** Nivel de riesgo PLAFT vigente (de v_cliente_riesgo_vigente). */
  riesgo?: RiskPLD | null;
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
export async function getCustomersEnrichment(
  legajos: string[],
): Promise<Record<string, CustomerEnrichment>> {
  const empty: Record<string, CustomerEnrichment> = {};
  if (legajos.length === 0) return empty;
  const sb = requireSupabase();
  const result: Record<string, CustomerEnrichment> = {};
  for (const l of legajos) result[l] = {};

  // 1. Riesgo (view). La view usa security_invoker así que respeta RLS admin-only.
  try {
    const { data } = await sb
      .from("v_cliente_riesgo_vigente" as never)
      .select("cliente_legajo,nivel,motivo")
      .in("cliente_legajo" as never, legajos as never[]);
    if (data) {
      for (const row of data as unknown as {
        cliente_legajo: string;
        nivel: RiskPLD;
        motivo: string;
      }[]) {
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
      .from("subaccounts")
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
    const { data } = await sb.from("comercios").select("legajo").in("legajo", legajos);
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
export async function getConsumoMensualByLegajo(
  legajo: string,
  limit?: number | null,
): Promise<number | null> {
  if (!limit || limit <= 0) return null;
  const sb = requireSupabase();
  const inicio = new Date();
  inicio.setDate(1);
  inicio.setHours(0, 0, 0, 0);
  try {
    const { data } = await sb
      .from("transactions")
      .select("monto_operacion")
      .eq("legajo", legajo)
      .gte("fecha", inicio.toISOString());
    if (!data) return 0;
    const total = (data as { monto_operacion: number }[]).reduce(
      (a, r) => a + Number(r.monto_operacion),
      0,
    );
    return Math.min(100, Math.round((total / limit) * 100));
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

export type EvaluacionRiskRow = {
  id: string;
  cliente_legajo: string;
  nivel: RiskPLD;
  motivo: string;
  detalle: Record<string, unknown> | null;
  evaluado_por: string | null;
  vigente_desde: string;
  vigente_hasta: string | null;
  created_at: string;
};

/** Historial completo de evaluaciones de riesgo PLAFT (append-only). */
export async function listEvaluacionesRisk(legajo: string): Promise<EvaluacionRiskRow[]> {
  const sb = requireSupabase();
  try {
    const { data, error } = await sb
      .from("cliente_perfil_riesgo")
      .select("*")
      .eq("cliente_legajo", legajo)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []) as EvaluacionRiskRow[];
  } catch (e) {
    if (e instanceof Error) throw toAppError(e);
    throw e;
  }
}

/** Inserta una nueva evaluación de riesgo. Append-only: la vigente anterior queda en el historial. */
export async function registrarEvaluacionRisk(input: {
  legajo: string;
  nivel: RiskPLD;
  motivo: string;
  vigenteHasta?: string | null;
}): Promise<EvaluacionRiskRow> {
  const sb = requireSupabase();
  // Primero cerrar la vigente anterior (si la hay) para que la nueva sea la única vigente.
  const current = await sb
    .from("cliente_perfil_riesgo")
    .select("id,vigente_hasta")
    .eq("cliente_legajo", input.legajo)
    .or("vigente_hasta.is.null")
    .maybeSingle();
  if (current.data) {
    await sb
      .from("cliente_perfil_riesgo")
      .update({ vigente_hasta: new Date().toISOString() })
      .eq("id", (current.data as EvaluacionRiskRow).id);
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
  if (error) throw toAppError(error);
  return data as EvaluacionRiskRow;
}

/** Actualiza los límites de Perfil Transaccional en la ficha del cliente. */
export async function updateProfileTransaccional(input: {
  clienteId: string;
  limiteTransferencia: number | null;
  limiteOpsDiarias: number | null;
  limiteMontoDiario: number | null;
}): Promise<Customer> {
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
  if (error) throw toAppError(error);
  if (!data) throw new AppError("not_found", "Cliente no encontrado");
  return toCustomer(data as CustomerRow);
}

export type TransicionResult = { ok: true; cliente: Customer } | { ok: false; motivo: string };

async function transicionarCustomer(
  customer: Customer,
  newStatus: StatusCustomer,
  opts?: { adminUserId?: string; comentario?: string },
): Promise<TransicionResult> {
  const hasMov = await customerTieneMovements(customer.legajo);
  const hasCom = await customerTieneFee(customer.id);
  const hasCbu = await customerTieneCbu(customer);
  const ctx = { hasCbu, hasComision: hasCom, hasMovimientos: hasMov };

  const check = canTransicionar(customer.estado, newStatus, ctx);
  if (!check.ok) return { ok: false, motivo: check.motivo! };

  // Deshabilitar cancela CBU (idempotente)
  const patch: Record<string, unknown> = { estado: newStatus };
  if (newStatus === "deshabilitado") {
    patch.cbu_cancelado = true;
  }
  if (newStatus === "registrado") {
    patch.email_verificado = true;
  }

  const sb = requireSupabase();
  let { data, error } = await sb
    .from("clientes")
    .update(patch)
    .eq("id", customer.id)
    .select(COLUMNS)
    .single();
  if (error && isMissingColumnError(error)) {
    const r = await sb
      .from("clientes")
      .update(patch)
      .eq("id", customer.id)
      .select(COLUMNS_LEGACY)
      .single();
    data = r.data as typeof data;
    error = r.error;
  }
  // Regla de la base: una empresa no avanza sin una solicitud de onboarding aprobada.
  if (error?.code === "23514") {
    return {
      ok: false,
      motivo: "Esta empresa necesita una solicitud aprobada. Revisala en la pestaña Onboarding.",
    };
  }
  if (error) throw toAppError(error);

  // Auditoría explícita si la tabla existe (no bloquea si falla)
  try {
    await sb.from("cliente_transiciones").insert({
      cliente_id: customer.id,
      legajo: customer.legajo,
      estado_anterior: normalizeStatus(customer.estado),
      estado_nuevo: normalizeStatus(newStatus),
      origen: "manual",
      admin_user_id: opts?.adminUserId ?? null,
      comentario: opts?.comentario ?? null,
    });
  } catch {
    // tabla puede no existir aún si migración no aplicada: no bloquear
  }

  return { ok: true, cliente: toCustomer(data as CustomerRow) };
}

// Acciones específicas del flujo (§1-6)
export async function verifyEmailCustomer(customer: Customer): Promise<TransicionResult> {
  return transicionarCustomer(customer, "registrado");
}

export async function aprobarDocumentacionCustomer(customer: Customer): Promise<TransicionResult> {
  return transicionarCustomer(customer, "preactivado", {
    comentario: "Aprobación de documentación",
  });
}

export async function activarCustomer(customer: Customer): Promise<TransicionResult> {
  return transicionarCustomer(customer, "activado");
}

export async function suspendCustomer(customer: Customer): Promise<TransicionResult> {
  return transicionarCustomer(customer, "suspendido");
}

export async function reactivateCustomer(customer: Customer): Promise<TransicionResult> {
  return transicionarCustomer(customer, "activado");
}

export async function disableCustomer(customer: Customer): Promise<TransicionResult> {
  return transicionarCustomer(customer, "deshabilitado", {
    comentario: "Deshabilitación BCRA: CBU cancelado, historial conservado",
  });
}

export async function removeCustomer(customer: Customer): Promise<TransicionResult> {
  // Eliminado NO es estado: borrado físico (hard delete) solo si no tiene movimientos
  const hasMov = await customerTieneMovements(customer.legajo);
  if (hasMov)
    return {
      ok: false,
      motivo: "No se puede eliminar: tiene movimientos. Solo puede deshabilitarse.",
    };
  try {
    await hardDeleteCustomer(customer.id);
    return { ok: true, cliente: customer };
  } catch (e) {
    return { ok: false, motivo: userMessage(e) };
  }
}

// Hard delete real — borrado físico en cascada (solo si no tiene movimientos)
export async function hardDeleteCustomer(id: string): Promise<void> {
  const sb = requireSupabase();
  const customer = await getCustomer(id);
  if (!customer) throw new AppError("validation", "Cliente no encontrado");
  const hasMov = await customerTieneMovements(customer.legajo);
  if (hasMov)
    throw new AppError(
      "validation",
      "No se puede eliminar: el cliente tiene movimientos históricos.",
    );
  // Alertas y bloqueos son historial de compliance: la base impide borrarlos.
  const [{ count: nAlerts }, { count: nBlocks }] = await Promise.all([
    sb.from("alerts").select("id", { count: "exact", head: true }).eq("client_id", customer.id),
    sb
      .from("account_blocks")
      .select("id", { count: "exact", head: true })
      .eq("client_id", customer.id),
  ]);
  if ((nAlerts ?? 0) > 0 || (nBlocks ?? 0) > 0) {
    throw new AppError(
      "validation",
      "No se puede eliminar: el cliente tiene alertas o bloqueos (historial de compliance).",
    );
  }

  // Limpieza de tablas dependientes (idempotente: ignora si tabla no existe o sin filas)
  const legajo = customer.legajo;
  const cid = customer.id;
  const tablesLegajo = [
    "subaccounts",
    "documentos",
    "historial_cambios",
    "validaciones",
    "cliente_modulos",
    "cliente_parametros_alertas",
    "cliente_parametros_bloqueos",
    "cliente_comercios_pst",
    "tax_assignments",
    "cliente_transiciones",
  ];
  for (const t of tablesLegajo) {
    try {
      const col = t === "tax_assignments" ? "client_legajo" : "cliente_legajo";
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
  try {
    await sb.from("comisiones_cliente").delete().eq("cliente_id", cid);
  } catch {
    // Tabla opcional: el borrado sigue con el resto.
  }
  try {
    await sb.from("cliente_links_pago").delete().eq("cliente_legajo", legajo);
  } catch {
    // Tabla opcional: el borrado sigue con el resto.
  }
  try {
    await sb.from("productos").delete().eq("cliente_legajo", legajo);
  } catch {
    // Tabla opcional: el borrado sigue con el resto.
  }
  // comercios (y puntos_venta por CASCADE)
  try {
    await sb.from("comercios").delete().eq("legajo", legajo);
  } catch {
    // Tabla opcional: el borrado sigue con el resto.
  }

  // Finalmente cliente (dispara trigger trg_cliente_deleted_cleanup que borra auth.users)
  const { error } = await sb.from("clientes").delete().eq("id", cid);
  if (error) throw toAppError(error);

  // Garantizar borrado en auth aunque el trigger no tenga permisos o la migración
  // aún no esté aplicada: best-effort via Edge Function + RPC.
  const emailLower = legajo ? customer.correo.trim().toLowerCase() : "";
  if (emailLower) {
    // 1) Edge Function con service_role (borra auth + limpia public huérfano)
    try {
      // supabase.functions.invoke está disponible si el cliente está configurado
      const supabaseAny = sb as unknown as {
        functions?: { invoke: (name: string, opts: unknown) => Promise<unknown> };
      };
      if (supabaseAny.functions?.invoke) {
        await supabaseAny.functions.invoke("eliminar-usuario", {
          body: { email: emailLower, legajo },
        });
      }
    } catch {
      // ignorar: edge puede no estar desplegada aún
    }
    // 2) Fallback RPC SECURITY DEFINER (no requiere service_role en el cliente)
    try {
      await sb.rpc("eliminar_auth_por_email", { p_email: emailLower });
    } catch {
      // ignorar: función puede no existir si migración no aplicada
    }
  }
}

export async function generateCbuForCustomer(customer: Customer, cbu: string): Promise<Customer> {
  const sb = requireSupabase();
  let { data, error } = await sb
    .from("clientes")
    .update({ cbu: cbu.trim(), cbu_cancelado: false })
    .eq("id", customer.id)
    .select(COLUMNS)
    .single();
  if (error && isMissingColumnError(error)) {
    const r = await sb
      .from("clientes")
      .update({ cbu: cbu.trim(), cbu_cancelado: false })
      .eq("id", customer.id)
      .select(COLUMNS_LEGACY)
      .single();
    data = r.data as typeof data;
    error = r.error;
  }
  if (error) throw toAppError(error);
  return toCustomer(data as CustomerRow);
}
