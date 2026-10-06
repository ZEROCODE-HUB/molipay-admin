import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import { toComision } from "./mappers";
import type {
  ComisionCliente,
  ComisionClienteRow,
  EstadoComision,
  ModalidadComision,
  Page,
  Pagination,
  TipoOperacion,
  TipoPersona,
} from "./types";

export type ComisionFilters = Pagination & {
  /** Búsqueda de texto libre: operación, legajo, correo o nombre del cliente. */
  search?: string;
  tipo?: TipoOperacion;
  modalidad?: ModalidadComision;
  estado?: EstadoComision;
  clienteId?: string;
};

const COLUMNS =
  "id, cliente_id, operacion, tipo, modalidad, porcentaje, monto_fijo, porcentaje_impuesto, estado, descripcion, created_at, updated_at, clientes(legajo, correo, cuit, nombre, tipo_persona)";

export async function listComisiones(filters: ComisionFilters): Promise<Page<ComisionCliente>> {
  const sb = requireSupabase();
  const { page, pageSize, search, tipo, modalidad, estado, clienteId } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("comisiones_cliente").select(COLUMNS, { count: "exact" });

  if (clienteId) query = query.eq("cliente_id", clienteId);
  if (tipo) query = query.eq("tipo", tipo);
  if (modalidad) query = query.eq("modalidad", modalidad);
  if (estado) query = query.eq("estado", estado);
  if (search && search.trim()) {
    const q = search.trim().replace(/[%_]/g, "\\$&");
    // Filtro en la propia tabla + en la relación embebida (legajo/correo/nombre).
    query = query.or(
      `operacion.ilike.%${q}%,clientes.legajo.ilike.%${q}%,clientes.correo.ilike.%${q}%,clientes.nombre.ilike.%${q}%`,
    );
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);

  const rows = (data ?? []) as (ComisionClienteRow & {
    clientes?:
      | {
          legajo: string;
          correo: string;
          cuit: string;
          nombre: string;
          tipo_persona: TipoPersona;
        }[]
      | null;
  })[];

  return {
    rows: rows.map(toComision),
    total: count ?? rows.length,
    page,
    pageSize,
  };
}

export type ComisionInput = {
  clienteId: string;
  operacion: string;
  tipo: TipoOperacion;
  modalidad: ModalidadComision;
  porcentaje: number | null;
  montoFijo: number | null;
  porcentajeImpuesto: number;
  estado?: EstadoComision;
  descripcion?: string;
};

export async function upsertComision(
  input: ComisionInput & { id?: string },
): Promise<ComisionCliente> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {
    cliente_id: input.clienteId,
    operacion: input.operacion,
    tipo: input.tipo,
    modalidad: input.modalidad,
    porcentaje: input.modalidad === "Porcentaje" ? input.porcentaje : null,
    monto_fijo: input.modalidad === "Fijo" ? input.montoFijo : null,
    porcentaje_impuesto: input.porcentajeImpuesto,
    estado: input.estado ?? "Habilitado",
    descripcion: input.descripcion ?? null,
  };
  if (input.id) payload.id = input.id;

  const { data, error } = await sb
    .from("comisiones_cliente")
    .upsert(payload)
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toComision(
    data as ComisionClienteRow & {
      clientes?:
        | {
            legajo: string;
            correo: string;
            cuit: string;
            nombre: string;
            tipo_persona: TipoPersona;
          }[]
        | null;
    },
  );
}

export async function setComisionEstado(
  id: string,
  estado: EstadoComision,
): Promise<ComisionCliente> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("comisiones_cliente")
    .update({ estado })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toComision(
    data as ComisionClienteRow & {
      clientes?:
        | {
            legajo: string;
            correo: string;
            cuit: string;
            nombre: string;
            tipo_persona: TipoPersona;
          }[]
        | null;
    },
  );
}
