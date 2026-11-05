import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";
import { toFee } from "@/infrastructure/supabase/legacy/mappers";
import type {
FeeCustomer,
FeeCustomerRow,
StatusFee,
ModalidadFee,
Page,
Pagination,
KindOperation,
KindPerson,
} from "@/infrastructure/supabase/legacy/types";

export type FeeFilters = Pagination & {
  /** Búsqueda de texto libre: código/descripción o legajo, correo, nombre o CUIT del cliente. */
  search?: string;
  tipo?: KindOperation;
  /** Restringe a estos tipos (la pantalla de usuarios solo maneja Depósito y Retiro). */
  tipos?: KindOperation[];
  modalidad?: ModalidadFee;
  estado?: StatusFee;
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
async function idsCustomers(text: string, onlyLegajo = false): Promise<string[]> {
  const sb = requireSupabase();
  const q = `%${escapeLike(text)}%`;
  let query = sb.from("clientes").select("id").limit(200);
  query = onlyLegajo
    ? query.ilike("legajo", q)
    : query.or(`legajo.ilike.${q},correo.ilike.${q},nombre.ilike.${q},cuit.ilike.${q}`);
  const { data, error } = await query;
  if (error) throw toAppError(error);
  return (data ?? []).map((r) => r.id as string);
}

async function idsSubaccountsByCvu(text: string): Promise<string[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("subaccounts")
    .select("id")
    .ilike("cbu", `%${escapeLike(text)}%`)
    .limit(200);
  if (error) throw toAppError(error);
  return (data ?? []).map((r) => r.id as string);
}

const NINGUNO = "00000000-0000-0000-0000-000000000000";
const inList = (ids: string[]) => `(${(ids.length ? ids : [NINGUNO]).join(",")})`;

const COLUMNS =
  "id, cliente_id, subcuenta_id, operacion, tipo, modalidad, porcentaje, monto_fijo, porcentaje_impuesto, estado, descripcion, created_at, updated_at, clientes(legajo, correo, cuit, nombre, tipo_persona), subcuentas:subaccounts(cbu, nombre)";

export async function listFees(filters: FeeFilters): Promise<Page<FeeCustomer>> {
  const sb = requireSupabase();
  const {
    page,
    pageSize,
    search,
    tipo: kind,
    tipos: kinds,
    modalidad,
    estado: status,
    clienteId: customerId,
    subcuentaId: subaccountId,
    alcance: scope,
    legajo,
    cvu,
  } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("comisiones_cliente").select(COLUMNS, { count: "exact" });

  if (customerId) query = query.eq("cliente_id", customerId);
  if (subaccountId) query = query.eq("subcuenta_id", subaccountId);
  if (kind) query = query.eq("tipo", kind);
  else if (kinds?.length) query = query.in("tipo", kinds);
  if (modalidad) query = query.eq("modalidad", modalidad);
  if (status) query = query.eq("estado", status);
  if (scope === "cvu") query = query.not("subcuenta_id", "is", null);
  if (scope === "cuenta") query = query.is("subcuenta_id", null);
  if (legajo?.trim()) {
    const ids = await idsCustomers(legajo, true);
    query = query.in("cliente_id", ids.length ? ids : [NINGUNO]);
  }
  if (cvu?.trim()) {
    const ids = await idsSubaccountsByCvu(cvu);
    query = query.in("subcuenta_id", ids.length ? ids : [NINGUNO]);
  }
  if (search?.trim()) {
    const q = `%${escapeLike(search)}%`;
    const customers = await idsCustomers(search);
    query = query.or(
      `operacion.ilike.${q},descripcion.ilike.${q},cliente_id.in.${inList(customers)}`,
    );
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw toAppError(error);

  const rows = (data ?? []) as (FeeCustomerRow & {
    clientes?:
      | {
          legajo: string;
          correo: string;
          cuit: string;
          nombre: string;
          tipo_persona: KindPerson;
        }[]
      | null;
    subcuentas?: { cbu: string | null; nombre: string | null }[] | null;
  })[];

  return {
    rows: rows.map(toFee),
    total: count ?? rows.length,
    page,
    pageSize,
  };
}

export type FeeInput = {
  clienteId: string;
  /** CVU al que aplica; null/undefined = comisión del cliente (respaldo). */
  subcuentaId?: string | null;
  operacion: string;
  tipo: KindOperation;
  modalidad: ModalidadFee;
  porcentaje: number | null;
  montoFijo: number | null;
  porcentajeImpuesto: number;
  estado?: StatusFee;
  descripcion?: string;
};

export async function upsertFee(input: FeeInput & { id?: string }): Promise<FeeCustomer> {
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
  if (error) throw toAppError(error);
  return toFee(
    data as FeeCustomerRow & {
      clientes?:
        | {
            legajo: string;
            correo: string;
            cuit: string;
            nombre: string;
            tipo_persona: KindPerson;
          }[]
        | null;
      subcuentas?: { cbu: string | null; nombre: string | null }[] | null;
    },
  );
}

export async function setFeeStatus(id: string, status: StatusFee): Promise<FeeCustomer> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("comisiones_cliente")
    .update({ estado: status })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw toAppError(error);
  return toFee(
    data as FeeCustomerRow & {
      clientes?:
        | {
            legajo: string;
            correo: string;
            cuit: string;
            nombre: string;
            tipo_persona: KindPerson;
          }[]
        | null;
      subcuentas?: { cbu: string | null; nombre: string | null }[] | null;
    },
  );
}
