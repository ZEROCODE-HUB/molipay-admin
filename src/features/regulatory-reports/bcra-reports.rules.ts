import { MONTHS } from "@/shared/lib/months";
import {
type BcraFile,
type BcraItem,
type BcraRule,
} from "@/features/regulatory-reports/bcra.supabase";
import { userMessage } from "@/shared/lib/errors";
import { type StatusPeriod } from "./bcra-reports.types";

export const QK = ["bcra"] as const;

/** Explicación de cada columna de la tabla principal (popup del encabezado). */
export const HELP_FILE: Record<BcraFile, string> = {
  A: "Información para Supervisión: los saldos de cada día del mes.\nSe arma en bloques de 31 filas (una por día). 10000dd = saldo de las cuentas de los clientes y cuántas tenían saldo; 20000dd = fondos depositados en la cuenta a la vista del banco; 50000dd = cuentas activas; 60000dd = cobros con tarjeta pendientes de liquidar.\nSe descarga como XLS.",
  B: "Información estadística mensual (Sistema Nacional de Pagos).\nPor cada concepto (CVU a CBU, CBU a CVU, CVU a CVU, pagos con QR) informa la cantidad de operaciones del mes y el monto total en miles de pesos. Las partidas 60xxxxx cuentan clientes y cuentas.\nSe descarga como XLS.",
  P: "Padrón de clientes Persona Jurídica (empresas) activos en MoliPay.\nVa sin encabezado y con columnas de ancho fijo: la razón social a 80 caracteres y el código postal a 8.\nSe descarga como XLS.",
  I: "Transferencias intraentidades: las que se hicieron entre cuentas de MoliPay (entre subcuentas o hacia otro cliente de MoliPay).\nUna línea por tipo de titular (persona humana o jurídica) con cantidad y monto en miles.\nSe descarga como TXT separado por punto y coma.",
};

export const HELP_DATE =
  "Mes informado (se muestra su primer día).\nDebajo está el control de saldos: el saldo final del mes tiene que ser igual al saldo inicial + créditos − débitos. Si no cuadra se muestra la diferencia, que suele venir de ajustes, adelantos o reversos.";

export const HELP_STATUS =
  "Cómo está el mes en conjunto.\nSin generar: no hay ningún archivo. Incompleto: falta generar alguno de los 4. Completo: están los 4 y se puede bajar el paquete ZIP. Presentado: los 4 están marcados como presentados en SISCEN.";
export const STATUSES_PERIOD: StatusPeriod[] = [
  "Sin generar",
  "Incompleto",
  "Completo",
  "Presentado",
];

/** Últimos `n` períodos (AAAA-MM-01), del actual hacia atrás. */
export function lastsPeriods(n: number): string[] {
  const today = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
}

export const labelPeriod = (p: string) => `${MONTHS[Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}`;
export const cortoPeriod = (p: string) => `${p.slice(5, 7)}/${p.slice(0, 4)}`;

export const errMsg = (e: unknown) => userMessage(e);

export const SECTIONS_A: Record<string, string> = {
  "1": "Saldos de clientes",
  "2": "Cuenta a la vista",
  "3": "FCI",
  "4": "FCI",
  "5": "Cantidad de cuentas",
  "6": "Saldos a liquidar",
};

export const MAX_ROWS_PREVIEW = 500;

/* ---------- Corregir ---------- */

export const FIELDS_EDITABLES: Record<BcraFile, { key: string; label: string }[]> = {
  A: [
    { key: "monto", label: "Monto" },
    { key: "cantidad", label: "Cantidad" },
    { key: "aux", label: "Aux / CBU" },
  ],
  B: [
    { key: "medio", label: "Medio de pago" },
    { key: "esquema", label: "Esquema" },
    { key: "cantidad", label: "Cantidad" },
    { key: "monto", label: "Monto (miles)" },
  ],
  I: [
    { key: "medio", label: "Medio de pago" },
    { key: "titular", label: "Tipo de titular" },
    { key: "cantidad", label: "Cantidad" },
    { key: "monto", label: "Monto (miles)" },
  ],
  P: [
    { key: "razonSocial", label: "Razón social" },
    { key: "codigoPostal", label: "Código postal" },
    { key: "tipoPersonaSocietaria", label: "Tipo societario" },
  ],
};

/* ============================================================================
 * Partidas y parámetros
 * ========================================================================== */

export const RULES: Record<BcraRule, { label: string; apartado: "A" | "B" | "I" }> = {
  a_saldo_clientes: { label: "Saldo de clientes al cierre + cuentas con saldo", apartado: "A" },
  a_saldo_cuenta: { label: "Saldo de una cuenta contable al cierre", apartado: "A" },
  a_cantidad_cuentas: { label: "Cantidad de cuentas activas", apartado: "A" },
  a_cero: { label: "Siempre en cero", apartado: "A" },
  b_operaciones: { label: "Operaciones: cantidad y monto", apartado: "B" },
  b_clientes: { label: "Clientes involucrados (cantidad)", apartado: "B" },
  b_cuentas: { label: "Cuentas involucradas (cantidad)", apartado: "B" },
  b_clientes_registrados: { label: "Clientes registrados (cantidad)", apartado: "B" },
  b_cuentas_activas: { label: "Cuentas activas (cantidad)", apartado: "B" },
  manual: { label: "Valor fijo manual", apartado: "B" },
  i_internas: { label: "Transferencias internas por tipo de titular", apartado: "I" },
};

export const KINDS_OPERATION = [
  ["deposito", "Depósito"],
  ["transferencia", "Transferencia"],
  ["retiro", "Retiro"],
  ["tarjeta", "Pago con tarjeta"],
  ["pago_pct", "Pago PCT"],
  ["cobro_pct", "Cobro PCT"],
  ["liquidacion_lote", "Liquidación de lote"],
  ["acreditacion_lote", "Acreditación de lote"],
  ["adelanto", "Adelanto"],
  ["ajuste_manual", "Ajuste de saldo"],
] as const;
export const KIND_LABEL = new Map<string, string>(KINDS_OPERATION);

export function summaryParams(p: BcraItem): string {
  const x = p.params;
  const partes: string[] = [];
  if (x.tipos?.length) partes.push(x.tipos.map((t) => KIND_LABEL.get(t) ?? t).join(" + "));
  if (x.sentido && x.sentido !== "todos")
    partes.push(x.sentido === "credito" ? "créditos" : "débitos");
  if (x.contraparte && x.contraparte !== "todas")
    partes.push(`contraparte ${x.contraparte.toUpperCase()}`);
  if (x.tipo_persona) partes.push(x.tipo_persona === "juridica" ? "P. Jurídica" : "P. Humana");
  if (x.account_code) partes.push(x.account_code);
  if (x.buckets?.length) partes.push(x.buckets.join(" + "));
  if (x.unidad) partes.push(`en ${x.unidad}`);
  return partes.join(" · ");
}
