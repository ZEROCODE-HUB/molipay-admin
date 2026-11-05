import { type BatchCredit } from "@/infrastructure/supabase/legacy/types";
import { type Column } from "@/shared/ui/data-table";
import { Badge } from "@/shared/ui/badge";
import { formatMoney } from "@/shared/lib/format";
import {
SUBESTADO_TXT,
esBatchEstimated,
esDelFile,
fmtDateCorta,
netBatch,
parseDateLocal,
statusMostrado,
tone,
totalDescuentos,
} from "@/features/payment-links/batches.rules";
import { type SummaryMerchant } from "@/features/payment-links/batches.types";

export const BATCH_COLUMNS: Column<BatchCredit>[] = [
  {
    key: "comercio",
    label: "Comercio",
    minWidth: 200,
    maxWidth: 320,
    render: (r) => (
      <div>
        <div className="font-semibold text-sm truncate max-w-[180px]">
          {r.comercio?.nombreComercio ?? r.comercio?.usuario ?? "—"}
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          {r.comercio?.legajo ?? r.comercioId}
        </div>
      </div>
    ),
  },
  {
    key: "fecha",
    label: "Fecha de liquidación",
    hint: "Día en que Payway procesó la planilla de pago (FECHA del archivo). En los lotes Programado es la fecha estimada.",
    minWidth: 150,
    render: (r) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-xs tabular-nums">
          {parseDateLocal(r.fecha).toLocaleDateString("es-AR")}
        </span>
        <span className="flex items-center gap-1">
          {esDelFile(r) ? (
            <Badge tone="success">liquidado</Badge>
          ) : (
            <Badge tone="neutral">est.</Badge>
          )}
        </span>
      </div>
    ),
  },
  {
    key: "bandera",
    label: "Bandera",
    minWidth: 120,
    render: (r) => (
      <div className="flex flex-col gap-0.5">
        <span className="inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-muted/50">
          {r.bandera}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">{r.codigo}</span>
      </div>
    ),
  },
  {
    key: "importeBruto",
    label: "Monto bruto liquidado",
    hint: "Base bruta de ventas del lote.",
    minWidth: 150,
    render: (r) => (
      <span
        className={`font-mono tabular-nums ${esBatchEstimated(r) ? "text-muted-foreground/60" : ""}`}
      >
        {formatMoney(r.importeBruto)}
        {esBatchEstimated(r) && (
          <span className="ml-1 text-[10px] text-muted-foreground/70">(Est.)</span>
        )}
      </span>
    ),
  },
  {
    key: "descuentos",
    label: "Descuentos e impuestos",
    hint: "Aranceles e impuestos de Payway + tasa MoliPay con IVA + cierre de lote 0,45% + impuestos asignados al comercio (Ingresos Brutos, Ley de Cheques, etc.).",
    minWidth: 160,
    render: (r) => {
      const estimated = esBatchEstimated(r);
      return (
        <span
          className={`font-mono tabular-nums ${estimated ? "text-muted-foreground/60" : "text-red-600"}`}
        >
          - {formatMoney(totalDescuentos(r))}
          {estimated && (
            <span className="ml-1 text-[10px] text-muted-foreground/70">(sin 0,45%)</span>
          )}
        </span>
      );
    },
  },
  {
    key: "importeNeto",
    label: "Neto a acreditar",
    hint: "Importe neto real que ingresa al saldo del comercio (ya descontados adelantos y deudas, si los hay).",
    minWidth: 160,
    render: (r) => {
      const estimated = esBatchEstimated(r);
      const net = netBatch(r);
      return (
        <span
          className={`font-mono tabular-nums font-semibold ${
            net < 0 ? "text-red-600" : estimated ? "text-muted-foreground/70" : "text-emerald-700"
          }`}
        >
          {formatMoney(net)}
          {estimated && (
            <Badge tone="neutral" className="ml-1.5 align-middle">
              Est.
            </Badge>
          )}
        </span>
      );
    },
  },
  {
    key: "fechaAcreditacion",
    label: "Fecha de acreditación",
    hint: "Fecha efectiva de liberación del dinero al comercio.",
    minWidth: 130,
    render: (r) => (
      <span className="font-mono text-xs tabular-nums">
        {r.fechaAcreditacion ? fmtDateCorta(r.fechaAcreditacion) : "—"}
      </span>
    ),
  },
  {
    key: "estado",
    label: "Estado",
    hint: "Programado: Payway todavía no pagó. Pendiente: llegó en el archivo y falta acreditar. Adelantado: el comercio ya cobró parte por un adelanto. Acreditado: es saldo del comercio. Contracargo: liquidación negativa o con contracargo.",
    minWidth: 140,
    render: (r) => (
      <div className="flex flex-col gap-0.5">
        <Badge tone={tone(statusMostrado(r))}>{statusMostrado(r)}</Badge>
        {r.estado === "Pendiente" && r.subestado && r.subestado !== "listo" && (
          <span
            className="text-[10px] text-muted-foreground"
            title={r.motivoNoElegible ?? undefined}
          >
            {SUBESTADO_TXT[r.subestado] ?? r.subestado}
          </span>
        )}
        {r.legacy && <span className="text-[10px] text-muted-foreground">histórico</span>}
      </div>
    ),
  },
];

export const SUMMARY_COLUMNS: Column<SummaryMerchant>[] = [
  {
    key: "comercio",
    label: "Comercio / Legajo",
    minWidth: 200,
    maxWidth: 320,
    render: (r) => (
      <div>
        <div className="font-semibold text-sm truncate max-w-[160px]">{r.comercio}</div>
        <div className="font-mono text-xs text-muted-foreground">{r.legajo}</div>
      </div>
    ),
  },
  {
    key: "pendienteAcreditar",
    label: "Pendiente de acreditar",
    minWidth: 150,
    render: (r) => (
      <span className="font-mono text-xs font-semibold">{formatMoney(r.pendienteAcreditar)}</span>
    ),
  },
  {
    key: "pendienteImpuestos",
    label: "Pendiente de impuestos",
    minWidth: 150,
    render: (r) => <span className="font-mono text-xs">{formatMoney(r.pendienteImpuestos)}</span>,
  },
  {
    key: "totalPayWay",
    label: "Comisión PayWay",
    minWidth: 140,
    render: (r) => <span className="font-mono text-xs">{formatMoney(r.totalPayWay)}</span>,
  },
  {
    key: "totalMoliPay",
    label: "Neto MoliPay",
    minWidth: 140,
    render: (r) => (
      <span className="font-mono text-xs text-emerald-700">{formatMoney(r.totalMoliPay)}</span>
    ),
  },
  {
    key: "totalFinal",
    label: "Total a pagar",
    minWidth: 140,
    render: (r) => (
      <span className="font-mono font-semibold text-emerald-700">{formatMoney(r.totalFinal)}</span>
    ),
  },
];
