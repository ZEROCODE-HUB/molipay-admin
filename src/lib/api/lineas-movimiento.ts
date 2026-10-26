import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import type { Page, Pagination } from "./types";

// Movimientos por linea contable (vista public.v_transaction_lines).
//
// Cada operacion genera una fila por concepto: el ingreso/egreso principal,
// la comision, el impuesto (IVA) y el interes, todas con el MISMO TXID. Los
// reversos son filas propias con el signo contrario. La vista sale del ledger
// (y de las operaciones legacy previas), asi que filtros y paginacion corren
// en la base, no en la pagina.

export type TipoLinea = "ingreso" | "egreso" | "comision" | "impuesto" | "interes" | "reverso";

export const TIPOS_LINEA: { code: TipoLinea; label: string }[] = [
  { code: "ingreso", label: "Ingreso" },
  { code: "egreso", label: "Egreso" },
  { code: "comision", label: "Comisión" },
  { code: "impuesto", label: "Impuesto" },
  { code: "interes", label: "Interés" },
  { code: "reverso", label: "Reverso" },
];

export type LineaMovimiento = {
  lineId: string;
  transactionId: string;
  idTxn: string;
  legajo: string;
  tipoOperacion: string;
  tipoLinea: TipoLinea;
  concepto: string;
  /** Con signo, desde el cliente: + entra, - sale. */
  monto: number;
  fecha: string;
  lineNo: number;
  subaccountId: string | null;
  cvuPropio: string | null;
  /** CVU/CBU de la contraparte (solo en la linea principal). */
  cvu: string | null;
  email: string | null;
  nombre: string | null;
  nombreDestino: string | null;
  cuit: string | null;
  estadoId: number;
  estadoCodigo: string;
  estadoNombre: string;
  ledgerStatus: string;
};

type LineaRow = {
  line_id: string;
  transaction_id: string;
  id_txn: string;
  legajo: string;
  tipo_operacion: string;
  tipo_linea: TipoLinea;
  concepto: string;
  monto: number | string;
  fecha: string;
  line_no: number;
  subaccount_id: string | null;
  cvu_propio: string | null;
  cvu: string | null;
  email: string | null;
  nombre: string | null;
  nombre_destino: string | null;
  cuit: string | null;
  estado_id: number;
  estado_codigo: string;
  estado_nombre: string;
  ledger_status: string;
};

const COLUMNS =
  "line_id, transaction_id, id_txn, legajo, tipo_operacion, tipo_linea, concepto, monto, fecha, line_no, subaccount_id, cvu_propio, cvu, email, nombre, nombre_destino, cuit, estado_id, estado_codigo, estado_nombre, ledger_status";

export type LineaFilters = Pagination & {
  /** Texto libre: TXID, legajo, email, nombre o nombre destino. */
  search?: string;
  tipoLinea?: TipoLinea;
  tipoOperacion?: string;
  estadoCodigo?: string;
  legajo?: string;
  txid?: string;
  cuit?: string;
  cvu?: string;
  subaccountId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
};

const ilike = (v: string) => `%${v.trim().replace(/[%_,()]/g, "\\$&")}%`;

function toLinea(r: LineaRow): LineaMovimiento {
  return {
    lineId: r.line_id,
    transactionId: r.transaction_id,
    idTxn: r.id_txn,
    legajo: r.legajo,
    tipoOperacion: r.tipo_operacion,
    tipoLinea: r.tipo_linea,
    concepto: r.concepto,
    monto: Number(r.monto),
    fecha: r.fecha,
    lineNo: r.line_no,
    subaccountId: r.subaccount_id,
    cvuPropio: r.cvu_propio,
    cvu: r.cvu,
    email: r.email,
    nombre: r.nombre,
    nombreDestino: r.nombre_destino,
    cuit: r.cuit,
    estadoId: r.estado_id,
    estadoCodigo: r.estado_codigo,
    estadoNombre: r.estado_nombre,
    ledgerStatus: r.ledger_status,
  };
}

export async function listLineasMovimiento(filters: LineaFilters): Promise<Page<LineaMovimiento>> {
  const sb = requireSupabase();
  const { page, pageSize } = filters;
  const from = page * pageSize;

  let q = sb.from("v_transaction_lines").select(COLUMNS, { count: "exact" });
  if (filters.legajo) q = q.eq("legajo", filters.legajo.trim().toUpperCase());
  if (filters.txid?.trim()) q = q.ilike("id_txn", ilike(filters.txid));
  const cuitDigitos = (filters.cuit ?? "").replace(/\D/g, "");
  if (cuitDigitos) q = q.ilike("cuit", ilike(cuitDigitos));
  if (filters.cvu?.trim()) q = q.or(`cvu.ilike.${ilike(filters.cvu)},cvu_propio.ilike.${ilike(filters.cvu)}`);
  if (filters.tipoLinea) q = q.eq("tipo_linea", filters.tipoLinea);
  if (filters.tipoOperacion) q = q.eq("tipo_operacion", filters.tipoOperacion);
  if (filters.estadoCodigo) q = q.eq("estado_codigo", filters.estadoCodigo);
  if (filters.subaccountId) q = q.eq("subaccount_id", filters.subaccountId);
  if (filters.fechaDesde) q = q.gte("fecha", filters.fechaDesde);
  if (filters.fechaHasta) q = q.lte("fecha", filters.fechaHasta);
  if (filters.search?.trim()) {
    const s = ilike(filters.search);
    q = q.or(`id_txn.ilike.${s},legajo.ilike.${s},email.ilike.${s},nombre.ilike.${s},nombre_destino.ilike.${s}`);
  }

  // Mas reciente primero; dentro de una operacion, en el orden de sus lineas.
  q = q
    .order("fecha", { ascending: false })
    .order("id_txn", { ascending: true })
    .order("line_no", { ascending: true })
    .range(from, from + pageSize - 1);

  const { data, error, count } = await q;
  if (error) throw new DataAccessError(error);
  const rows = ((data ?? []) as LineaRow[]).map(toLinea);
  return { rows, total: count ?? rows.length, page, pageSize };
}
