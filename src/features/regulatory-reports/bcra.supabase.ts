import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";

/** A = Apartado A, B = Apartado B, P = Padrón PJ, I = Transferencias intraentidades. */
export type BcraFile = "A" | "B" | "P" | "I";
export const BCRA_FILES: BcraFile[] = ["A", "B", "P", "I"];

export const BCRA_FILE_LABEL: Record<BcraFile, string> = {
  A: "Apartado A",
  B: "Apartado B",
  P: "Padrón",
  I: "Intraentidades",
};

export type BcraControl = {
  saldo_inicial: number;
  saldo_final: number;
  creditos: number;
  debitos: number;
  operaciones_otras: number;
  diferencia: number;
  cuadra: boolean;
  en_curso: boolean;
};

export type BcraFiling = {
  id: string;
  /** Primer día del mes (AAAA-MM-01). */
  periodo: string;
  archivo: BcraFile;
  version: number;
  estado: "generado" | "presentado";
  totales: { control?: BcraControl; operaciones?: number; personas_juridicas?: number };
  avisos: string[];
  cantidadFilas: number;
  generadoAt: string;
  generadoByName: string | null;
  presentadoAt: string | null;
  presentadoByName: string | null;
  notas: string | null;
  correcciones: number;
};

export type RowA = { codigo: string; monto: number; cantidad: number | null; aux: string };
export type RowB = {
  codigo: string;
  medio: string;
  esquema: string;
  cantidad: number;
  monto: number | null;
};
export type RowI = {
  codigo: string;
  medio: string;
  moneda: string;
  titular: string;
  cantidad: number;
  monto: number;
};
export type RowBcra = RowA | RowB | RowI | Record<string, string>;

export type BcraCorreccion = {
  id: string;
  fila: number;
  codigo: string | null;
  campo: string;
  valorAnterior: string | null;
  valorNuevo: string | null;
  motivo: string;
  createdAt: string;
};

export type BcraRule =
  | "a_saldo_clientes"
  | "a_saldo_cuenta"
  | "a_cantidad_cuentas"
  | "a_cero"
  | "b_operaciones"
  | "b_clientes"
  | "b_cuentas"
  | "b_clientes_registrados"
  | "b_cuentas_activas"
  | "manual"
  | "i_internas";

export type BcraItemParams = {
  tipos?: string[];
  sentido?: "credito" | "debito" | "todos";
  contraparte?: "cbu" | "cvu" | "interna" | "externa" | "todas";
  monto?: "neto" | "debitado" | "bruto";
  tipo_persona?: "fisica" | "juridica";
  unidad?: "miles" | "pesos";
  buckets?: string[];
  account_code?: string;
  aux_param?: string;
  /** Regla manual: valores fijos. */
  cantidad?: number;
  monto_fijo?: number;
};

export type BcraItem = {
  id: string;
  apartado: "A" | "B" | "I";
  codigo: string;
  descripcion: string;
  regla: BcraRule;
  params: BcraItemParams;
  medioPago: string | null;
  esquema: string | null;
  orden: number;
  activa: boolean;
  confirmada: boolean;
  updatedAt: string;
};

export type BcraParameters = { bcra_cuit_entidad?: string; bcra_cbu_cuenta_vista?: string };

async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw toAppError(error);
  return data as T;
}

type FilingRow = {
  id: string;
  periodo: string;
  archivo: BcraFile;
  version: number;
  estado: "generado" | "presentado";
  totales: BcraFiling["totales"] | null;
  avisos: string[] | null;
  cantidad_filas: number;
  generado_at: string;
  generado_by_name: string | null;
  presentado_at: string | null;
  presentado_by_name: string | null;
  notas: string | null;
  correcciones: number;
};

const toFiling = (r: FilingRow): BcraFiling => ({
  id: r.id,
  periodo: r.periodo,
  archivo: r.archivo,
  version: r.version,
  estado: r.estado,
  totales: r.totales ?? {},
  avisos: r.avisos ?? [],
  cantidadFilas: r.cantidad_filas,
  generadoAt: r.generado_at,
  generadoByName: r.generado_by_name,
  presentadoAt: r.presentado_at,
  presentadoByName: r.presentado_by_name,
  notas: r.notas,
  correcciones: Number(r.correcciones ?? 0),
});

/** Última versión de cada archivo para los períodos [desde, hasta] (AAAA-MM-01). */
export async function listFilings(from: string, to: string): Promise<BcraFiling[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("v_bcra_presentaciones")
    .select("*")
    .gte("periodo", from)
    .lte("periodo", to);
  if (error) throw toAppError(error);
  return ((data ?? []) as FilingRow[]).map(toFiling);
}

/** Filas guardadas (la foto exacta) de una versión. */
export async function getRowsFiling(id: string): Promise<RowBcra[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("bcra_presentaciones")
    .select("filas")
    .eq("id", id)
    .single();
  if (error) throw toAppError(error);
  return ((data as { filas: RowBcra[] } | null)?.filas ?? []) as RowBcra[];
}

export async function listCorrecciones(filingId: string): Promise<BcraCorreccion[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("bcra_correcciones")
    .select("id, fila, codigo, campo, valor_anterior, valor_nuevo, motivo, created_at")
    .eq("presentacion_id", filingId)
    .order("created_at", { ascending: false });
  if (error) throw toAppError(error);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    fila: r.fila as number,
    codigo: (r.codigo as string | null) ?? null,
    campo: r.campo as string,
    valorAnterior: (r.valor_anterior as string | null) ?? null,
    valorNuevo: (r.valor_nuevo as string | null) ?? null,
    motivo: r.motivo as string,
    createdAt: r.created_at as string,
  }));
}

/** Genera o regenera A, B o I desde la base (si la versión ya se presentó, crea una rectificativa). */
export const generateFile = (period: string, file: Exclude<BcraFile, "P">) =>
  rpc<string>("bcra_generar", { p_periodo: period, p_archivo: file });

/** Guarda la foto del padrón armado en el admin. */
export const saveRegistry = (period: string, rows: unknown[], notices: string[]) =>
  rpc<string>("bcra_guardar_padron", { p_periodo: period, p_filas: rows, p_avisos: notices });

export const corregirRow = (
  id: string,
  row: number,
  field: string,
  value: string,
  reason: string,
) =>
  rpc("bcra_corregir", { p_id: id, p_fila: row, p_campo: field, p_valor: value, p_motivo: reason });

export const markFiled = (id: string, notes: string) =>
  rpc("bcra_marcar_presentado", { p_id: id, p_notas: notes || null });

export async function listItems(): Promise<BcraItem[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("bcra_partidas")
    .select(
      "id, apartado, codigo, descripcion, regla, params, medio_pago, esquema, orden, activa, confirmada, updated_at",
    )
    .order("apartado")
    .order("orden")
    .order("codigo");
  if (error) throw toAppError(error);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    apartado: r.apartado as BcraItem["apartado"],
    codigo: r.codigo as string,
    descripcion: r.descripcion as string,
    regla: r.regla as BcraRule,
    params: (r.params as BcraItemParams) ?? {},
    medioPago: (r.medio_pago as string | null) ?? null,
    esquema: (r.esquema as string | null) ?? null,
    orden: r.orden as number,
    activa: r.activa as boolean,
    confirmada: r.confirmada as boolean,
    updatedAt: r.updated_at as string,
  }));
}

export const saveItem = (p: {
  id: string;
  descripcion: string;
  regla: BcraRule;
  params: BcraItemParams;
  medioPago: string;
  esquema: string;
  activa: boolean;
  confirmada: boolean;
}) =>
  rpc("bcra_guardar_partida", {
    p_id: p.id,
    p_descripcion: p.descripcion,
    p_regla: p.regla,
    p_params: p.params,
    p_medio_pago: p.medioPago,
    p_esquema: p.esquema,
    p_activa: p.activa,
    p_confirmada: p.confirmada,
  });

export const readParametersBcra = () => rpc<BcraParameters>("bcra_leer_parametros", {});

export const saveParameterBcra = (key: keyof BcraParameters, value: string) =>
  rpc("bcra_guardar_parametro", { p_clave: key, p_valor: value });
