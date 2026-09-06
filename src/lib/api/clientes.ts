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
  "id, legajo, tipo_persona, correo, nombre, cuit, estado, fecha_alta, created_at, updated_at, email_verificado, onboarding_completo, cbu, cbu_cancelado, genero, cuit_cuil, fecha_nacimiento, ocupacion, origen_fondos, es_pep, tipo_sociedad, nombre_legal, nombre_fantasia, fecha_inscripcion, direccion, direccion2, ciudad, provincia, cp, estado_onboarding";
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

  const rows = (data ?? []) as ClienteRow[];
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

  // Finalmente cliente
  const { error } = await sb.from("clientes").delete().eq("id", cid);
  if (error) throw new DataAccessError(error);
  // Nota: auth.users debe borrarse aparte via Authentication > Users (o SQL en auth schema) para re-registrar el mismo email
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
