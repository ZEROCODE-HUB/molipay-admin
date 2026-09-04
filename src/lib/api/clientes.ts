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
  "id, legajo, tipo_persona, correo, nombre, cuit, estado, fecha_alta, created_at, updated_at, email_verificado, onboarding_completo, cbu, cbu_cancelado";

export async function listClientes(filters: ClienteFilters): Promise<Page<Cliente>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado, tipoPersona } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("clientes").select(COLUMNS, { count: "exact" });

  if (search && search.trim()) {
    const q = search.trim().replace(/[%_]/g, "\\$&");
    query = query.or(`legajo.ilike.%${q}%,correo.ilike.%${q}%,nombre.ilike.%${q}%`);
  }
  if (estado) query = query.eq("estado", estado);
  if (tipoPersona) query = query.eq("tipo_persona", tipoPersona);

  query = query.order("fecha_alta", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);

  const rows = (data ?? []) as ClienteRow[];
  return { rows: rows.map(toCliente), total: count ?? rows.length, page, pageSize };
}

export async function getCliente(id: string): Promise<Cliente | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("clientes").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new DataAccessError(error);
  return data ? toCliente(data as ClienteRow) : null;
}

export async function getClienteByLegajo(legajo: string): Promise<Cliente | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("clientes")
    .select(COLUMNS)
    .eq("legajo", legajo.trim().toUpperCase())
    .maybeSingle();
  if (error) throw new DataAccessError(error);
  return data ? toCliente(data as ClienteRow) : null;
}

export async function getClienteByCorreo(correo: string): Promise<Cliente | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("clientes")
    .select(COLUMNS)
    .eq("correo", correo.trim().toLowerCase())
    .maybeSingle();
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
  const { data, error } = await sb
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
  if (error) throw new DataAccessError(error);
  return toCliente(data as ClienteRow);
}

export async function updateClienteEstado(id: string, estado: EstadoCliente): Promise<Cliente> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("clientes")
    .update({ estado })
    .eq("id", id)
    .select(COLUMNS)
    .single();
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
  const { data, error } = await sb
    .from("clientes")
    .update(patch)
    .eq("id", cliente.id)
    .select(COLUMNS)
    .single();
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
  // Guard estricto ya en puedeTransicionar, pero doble validación
  const hasMov = await clienteTieneMovimientos(cliente.legajo);
  if (hasMov) return { ok: false, motivo: "No se puede eliminar: tiene movimientos." };
  // Soft delete: pasar a eliminado (no borrar fila para trazabilidad)
  // Si se requiere hard delete, hacerlo solo si soft ok y sin movimientos:
  const res = await transicionarCliente(cliente, "eliminado");
  if (!res.ok) return res;
  return res;
}

// Hard delete real (solo si el guard lo permite y el caller lo solicita)
export async function hardDeleteCliente(id: string): Promise<void> {
  const sb = requireSupabase();
  const cliente = await getCliente(id);
  if (!cliente) throw new Error("Cliente no encontrado");
  const hasMov = await clienteTieneMovimientos(cliente.legajo);
  if (hasMov) throw new Error("No se puede eliminar: el cliente tiene movimientos históricos.");
  const { error } = await sb.from("clientes").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}

export async function generarCbuParaCliente(cliente: Cliente, cbu: string): Promise<Cliente> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("clientes")
    .update({ cbu: cbu.trim(), cbu_cancelado: false })
    .eq("id", cliente.id)
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toCliente(data as ClienteRow);
}
