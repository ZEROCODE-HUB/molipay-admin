import { KINDS_LINE,type KindLine } from "@/features/movements/movement-lines.supabase";
import { formatMoney } from "@/shared/lib/format";
import {
type Movement as MovimientoDB,
type StatusMovement,
} from "@/infrastructure/supabase/legacy/types";
import { type Movimiento } from "@/features/movements/components/movement-detail";
import { resolverStatusMovement } from "@/features/movements/statuses";
import { calcularDesglose } from "@/shared/lib/fee-schedule";

export const PAGE_SIZES = [10, 20, 50];

// Operación de negocio que originó las líneas (transactions.tipo).
export const OPERATIONS: { label: string; code: string }[] = [
  { label: "Depósito", code: "deposito" },
  { label: "Retiro", code: "retiro" },
  { label: "Transferencia", code: "transferencia" },
  { label: "Pago con tarjeta", code: "tarjeta" },
  { label: "Pago PCT", code: "pago_pct" },
  { label: "Cobro PCT", code: "cobro_pct" },
  { label: "Liquidación de lote", code: "liquidacion_lote" },
  { label: "Acreditación de lote", code: "acreditacion_lote" },
  { label: "Adelanto", code: "adelanto" },
  { label: "Ajuste de saldo", code: "ajuste_manual" },
];
export const OPERATION_LABEL = new Map(OPERATIONS.map((o) => [o.code, o.label]));
export const KIND_LINE_LABEL = new Map(KINDS_LINE.map((t) => [t.code, t.label]));
export const KIND_LINE_CODE = new Map(KINDS_LINE.map((t) => [t.label, t.code]));

export const KIND_LINE_STYLE: Record<KindLine, string> = {
  ingreso: "bg-emerald-50 text-emerald-700 border-emerald-200",
  egreso: "bg-red-50 text-red-700 border-red-200",
  comision: "bg-amber-50 text-amber-700 border-amber-200",
  impuesto: "bg-violet-50 text-violet-700 border-violet-200",
  interes: "bg-sky-50 text-sky-700 border-sky-200",
  reverso: "bg-slate-100 text-slate-700 border-slate-300",
};

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export const fmtAmount = (n: number) => `${n >= 0 ? "+" : "-"} ${formatMoney(Math.abs(n))}`;

export function toViewMovement(m: MovimientoDB, catalog: StatusMovement[]): Movimiento {
  const pctTax = m.comision > 0 ? (m.impuesto / m.comision) * 100 : 0;
  return {
    clienteId: m.clienteId,
    legajo: m.legajo,
    id: m.idTxn,
    tipo: m.tipo,
    cvu: m.cvu ?? "",
    usuario: m.cliente?.correo ?? "—",
    nombreOrigen: m.cliente?.nombre ?? "—",
    nombreDestino: m.destinatarioNombre ?? (m.tipo === "transferencia" ? "—" : "MoliPay"),
    cuit: m.destinatarioCuit ?? m.cliente?.cuit ?? "—",
    bancoDestino: m.destinatarioBanco ?? undefined,
    monto: formatMoney(m.montoOperacion),
    fecha: fmtDate(m.fecha),
    estado: resolverStatusMovement(m, catalog).codigo,
    desglose: calcularDesglose(m.comision, pctTax),
  };
}
