import { fmtPct,type Desglose } from "@/shared/lib/fee-schedule";
import { formatMoney } from "@/shared/lib/format";
import { type Column } from "@/shared/ui/data-table";
import { LEGAJO_TOOLTIP,LegajoCell } from "@/shared/ui/legajo-label";
import { Badge } from "@/shared/ui/badge";
import { type Fee } from "@/features/customers/customer-fees.types";
import { KINDS_FEE_USERS } from "@/features/customers/customer-fees.rules";

export function DesglosePreview({ desglose }: { desglose: Desglose }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5 text-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Desglose del cobro (sobre $ 100.000 de operación)
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Comisión</span>
        <span className="font-mono tabular-nums">{formatMoney(desglose.comision)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Impuesto ({desglose.porcentajeImpuesto}%)</span>
        <span className="font-mono tabular-nums">{formatMoney(desglose.impuesto)}</span>
      </div>
      <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
        <span>Monto cobrado al cliente</span>
        <span className="font-mono tabular-nums">{formatMoney(desglose.total)}</span>
      </div>
    </div>
  );
}

export const columns: Column<Fee>[] = [
  {
    key: "legajo",
    label: "Legajo",
    hint: LEGAJO_TOOLTIP,
    filterable: true,
    render: (r) => <LegajoCell legajo={r.legajo} />,
  },
  { key: "correo", label: "Usuario", filterable: true, render: (r) => r.correo },
  {
    key: "cvu",
    label: "Alcance / CVU",
    minWidth: 220,
    render: (r) =>
      r.subcuentaId ? (
        <div className="flex flex-col gap-0.5">
          <Badge tone="warn">CVU</Badge>
          <span className="font-mono tabular-nums text-xs">{r.cvu ?? "CVU sin número"}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          <Badge tone="neutral">Toda la cuenta</Badge>
          <span className="text-[11px] text-muted-foreground">Respaldo de todos sus CVU</span>
        </div>
      ),
  },
  {
    key: "cuit",
    label: "CUIT",
    render: (r) => <span className="font-mono tabular-nums">{r.cuit}</span>,
  },
  {
    key: "operacion",
    label: "Código de operación",
    filterable: true,
    render: (r) => <span className="font-mono tabular-nums">{r.operacion}</span>,
  },
  {
    key: "tipo",
    label: "Operación",
    filterable: "enum",
    filterOptions: [...KINDS_FEE_USERS],
    render: (r) => r.tipo,
  },
  {
    key: "modalidad",
    label: "Modalidad",
    filterable: "enum",
    filterOptions: ["Fijo", "Porcentaje"],
    render: (r) => r.modalidad,
  },
  {
    key: "porcentaje",
    label: "% Comisión",
    render: (r) => (
      <span className="font-mono tabular-nums">
        {r.modalidad === "Porcentaje" ? fmtPct(r.porcentaje ?? 0) : "—"}
      </span>
    ),
  },
  {
    key: "montoFijo",
    label: "Monto fijo",
    render: (r) => (
      <span className="font-mono tabular-nums">
        {r.modalidad === "Fijo" ? formatMoney(r.montoFijo ?? 0) : "—"}
      </span>
    ),
  },
  {
    key: "porcentajeImpuesto",
    label: "% Impuesto (IVA)",
    render: (r) => <span className="font-mono tabular-nums">{fmtPct(r.porcentajeImpuesto)}</span>,
  },
  {
    key: "estado",
    label: "Estado",
    filterable: "enum",
    filterOptions: ["Habilitado", "Deshabilitado"],
    render: (row) => (
      <Badge tone={row.estado === "Habilitado" ? "success" : "danger"}>
        {row.estado === "Habilitado" ? "Habilitado" : "Deshabilitado"}
      </Badge>
    ),
  },
  { key: "descripcion", label: "Descripción", filterable: true, render: (r) => r.descripcion },
];
