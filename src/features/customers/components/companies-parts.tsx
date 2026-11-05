import { type Column } from "@/shared/ui/data-table";
import { LEGAJO_TOOLTIP,LegajoCell } from "@/shared/ui/legajo-label";
import { Building2,Store } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { type JuridicaRow } from "@/features/customers/companies.types";

export const columns: Column<JuridicaRow>[] = [
  {
    key: "legajo",
    label: "Legajo",
    hint: LEGAJO_TOOLTIP,
    filterable: true,
    minWidth: 110,
    render: (r) => <LegajoCell legajo={r.legajo} />,
  },
  {
    key: "cuit",
    label: "CUIT",
    filterable: true,
    minWidth: 130,
    render: (r) => (
      <span className="font-mono text-xs tabular-nums" title={`Legajo: ${r.legajo}`}>
        {r.cuitFormatted}
      </span>
    ),
  },
  {
    key: "razonSocial",
    label: "Razón social / Fantasía",
    filterable: true,
    minWidth: 220,
    maxWidth: 360,
    render: (r) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground" title={r.razonSocial}>
          {r.razonSocial}
        </span>
        {r.nombreFantasia ? (
          <span className="text-xs italic text-muted-foreground">*{r.nombreFantasia}*</span>
        ) : null}
        <span className="text-xs text-muted-foreground">{r.correo}</span>
      </div>
    ),
  },
  {
    key: "tipoLabel",
    label: "Tipo",
    minWidth: 80,
    render: (r) => (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-border bg-card text-xs font-semibold">
        <Building2 size={12} className="text-muted-foreground" />
        {r.tipoLabel}
      </span>
    ),
  },
  {
    key: "estadoLabel",
    label: "Estado",
    minWidth: 120,
    render: (r) => <Badge tone={r.estadoTone}>{r.estadoLabel}</Badge>,
  },
  {
    key: "esPep",
    label: "PEP",
    minWidth: 70,
    render: (r) =>
      r.esPep ? (
        <span className="inline-flex items-center justify-center w-7 h-5 rounded-md border text-xs font-semibold bg-red-100 text-red-800 border-red-200">
          Sí
        </span>
      ) : (
        <span className="text-xs text-muted-foreground text-center w-7 inline-block">No</span>
      ),
  },
  {
    key: "comerciosCount",
    label: "Comercios / CVUs",
    minWidth: 160,
    render: (r) => (
      <div className="flex items-center gap-3 text-xs font-medium tabular-nums">
        <span
          className={`inline-flex items-center gap-1 ${r.comerciosCount > 0 ? "text-foreground" : "text-muted-foreground"}`}
          title="Comercios asociados"
        >
          <Store size={12} />
          {r.comerciosCount} {r.comerciosCount === 1 ? "Comercio" : "Comercios"}
        </span>
        <span className="text-muted-foreground/50">·</span>
        <span
          className={`inline-flex items-center gap-1 ${r.cvuCount > 0 ? "text-foreground" : "text-muted-foreground"}`}
          title="CVUs / Subcuentas"
        >
          {r.cvuCount} {r.cvuCount === 1 ? "CVU" : "CVUs"}
        </span>
      </div>
    ),
  },
  {
    key: "fechaRegistro",
    label: "Fecha de registro",
    minWidth: 130,
    render: (r) => <span className="font-mono tabular-nums">{r.fechaRegistro}</span>,
  },
];
