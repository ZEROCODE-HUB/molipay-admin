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
  /** Búsqueda de texto libre: código/descripción o legajo, correo, nombre o CUIT del cliente. */
  search?: string;
  tipo?: TipoOperacion;
  /** Restringe a estos tipos (la pantalla de usuarios solo maneja Depósito y Retiro). */
  tipos?: TipoOperacion[];
  modalidad?: ModalidadComision;
  estado?: EstadoComision;
  clienteId?: string;
  subcuentaId?: string;
  /** "cvu" = solo comisiones de un CVU; "cuenta" = solo las del cliente (respaldo). */
  alcance?: "cvu" | "cuenta";
  /** Legajo del cliente (parcial). */
  legajo?: string;
  /** CVU de la subcuenta (parcial). */
  cvu?: string;
};

const escapeLike = (v: string) => v.trim().replace(/[%_,()]/g, "\\$&");

// PostgREST no filtra un .or() sobre una relación embebida sin !inner: los
// datos del cliente / la subcuenta se resuelven antes a ids.
async function idsClientes(texto: string, soloLegajo = false): Promise<string[]> {
  const sb = requireSupabase();
  const q = `%${escapeLike(texto)}%`;
  let query = sb.from("clientes").select("id").limit(200);
  query = soloLegajo
    ? query.ilike("legajo", q)
    : query.or(`legajo.ilike.${q},correo.ilike.${q},nombre.ilike.${q},cuit.ilike.${q}`);
  const { data, error } = await query;
  if (error) throw new DataAccessError(error);
  return (data ?? []).map((r) => r.id as string);
}

async function idsSubcuentasPorCvu(texto: string): Promise<string[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("subaccounts")
    .select("id")
    .ilike("cbu", `%${escapeLike(texto)}%`)
    .limit(200);
  if (error) throw new DataAccessError(error);
  return (data ?? []).map((r) => r.id as string);
}

const NINGUNO = "00000000-0000-0000-0000-000000000000";
const inList = (ids: string[]) => `(${(ids.length ? ids : [NINGUNO]).join(",")})`;

const COLUMNS =
  "id, cliente_id, subcuenta_id, operacion, tipo, modalidad, porcentaje, monto_fijo, porcentaje_impuesto, estado, descripcion, created_at, updated_at, clientes(legajo, correo, cuit, nombre, tipo_persona), subcuentas:subaccounts(cbu, nombre)";

export async function listComisiones(filters: ComisionFilters): Promise<Page<ComisionCliente>> {
  const sb = requireSupabase();
  const { page, pageSize, search, tipo, tipos, modalidad, estado, clienteId, subcuentaId, alcance, legajo, cvu } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("comisiones_cliente").select(COLUMNS, { count: "exact" });

  if (clienteId) query = query.eq("cliente_id", clienteId);
  if (subcuentaId) query = query.eq("subcuenta_id", subcuentaId);
  if (tipo) query = query.eq("tipo", tipo);
  else if (tipos?.length) query = query.in("tipo", tipos);
  if (modalidad) query = query.eq("modalidad", modalidad);
  if (estado) query = query.eq("estado", estado);
  if (alcance === "cvu") query = query.not("subcuenta_id", "is", null);
  if (alcance === "cuenta") query = query.is("subcuenta_id", null);
  if (legajo?.trim()) {
    const ids = await idsClientes(legajo, true);
    query = query.in("cliente_id", ids.length ? ids : [NINGUNO]);
  }
  if (cvu?.trim()) {
    const ids = await idsSubcuentasPorCvu(cvu);
    query = query.in("subcuenta_id", ids.length ? ids : [NINGUNO]);
  }
  if (search?.trim()) {
    const q = `%${escapeLike(search)}%`;
    const clientes = await idsClientes(search);
    query = query.or(`operacion.ilike.${q},descripcion.ilike.${q},cliente_id.in.${inList(clientes)}`);
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
    subcuentas?: { cbu: string | null; nombre: string | null }[] | null;
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
  /** CVU al que aplica; null/undefined = comisión del cliente (respaldo). */
  subcuentaId?: string | null;
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
    subcuenta_id: input.subcuentaId ?? null,
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
      subcuentas?: { cbu: string | null; nombre: string | null }[] | null;
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
      subcuentas?: { cbu: string | null; nombre: string | null }[] | null;
    },
  );
}
