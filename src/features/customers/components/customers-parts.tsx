import { type RiskPLD } from "@/features/customers/customers.supabase";
import { AlertOctagon } from "lucide-react";
import { type Column } from "@/shared/ui/data-table";
import { LEGAJO_TOOLTIP,LegajoCell } from "@/shared/ui/legajo-label";
import { Badge } from "@/shared/ui/badge";
import { SHOW_PLAFT_COLUMNS } from "@/app/feature-flags";
import { type User } from "@/features/customers/customers.types";
import { PLAFT_KEYS } from "@/features/customers/customers.rules";

// --- Helpers de presentación para las columnas nuevas ---------------------

export function RiskBadge({
  nivel: level,
  motivo: reason,
}: {
  nivel: RiskPLD | null;
  motivo?: string | null;
}) {
  if (!level) {
    return (
      <span
        title="Cliente sin evaluación PLAFT vigente. Pendiente de revisión."
        className="inline-flex items-center gap-1 text-xs text-muted-foreground italic"
      >
        <AlertOctagon size={12} className="text-muted-foreground" />
        Sin evaluar
      </span>
    );
  }
  const tone =
    level === "bajo"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : level === "medio"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : level === "alto"
          ? "bg-orange-100 text-orange-800 border-orange-200"
          : "bg-red-100 text-red-800 border-red-200";
  const label = level.charAt(0).toUpperCase() + level.slice(1);
  return (
    <span
      title={reason ?? `Nivel de riesgo PLAFT: ${label}`}
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${tone}`}
    >
      {label}
    </span>
  );
}

export function KycBadge({ completo }: { completo: boolean }) {
  return completo ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium bg-emerald-100 text-emerald-800 border-emerald-200">
      ✓ Validado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium bg-amber-100 text-amber-800 border-amber-200">
      Pendiente
    </span>
  );
}

export function ProfileConsumo({
  pct,
  limite: limit,
}: {
  pct: number | null;
  limite: number | null;
}) {
  if (pct == null) {
    return (
      <span
        className="text-xs text-muted-foreground italic"
        title="Sin límite operativo configurado"
      >
        —
      </span>
    );
  }
  const tone =
    pct >= 90
      ? "bg-red-500"
      : pct >= 75
        ? "bg-amber-500"
        : pct >= 50
          ? "bg-yellow-500"
          : "bg-emerald-500";
  const fmtLimit = limit
    ? new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(limit)
    : null;
  return (
    <div className="flex flex-col gap-0.5 min-w-[100px]">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{pct}%</span>
        {fmtLimit && <span>${fmtLimit}</span>}
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full ${tone} transition-all`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

export const columns: Column<User>[] = [
  {
    key: "legajo",
    label: "Legajo",
    hint: LEGAJO_TOOLTIP,
    filterable: true,
    minWidth: 110,
    render: (row) => <LegajoCell legajo={row.legajo} />,
  },
  {
    key: "cuit",
    label: "CUIT",
    filterable: true,
    minWidth: 130,
    render: (row) => (
      <span className="font-mono text-xs tabular-nums" title={`Legajo: ${row.legajo}`}>
        {row.cuitFormatted}
      </span>
    ),
  },
  {
    key: "nombres",
    label: "Cliente / Usuario",
    filterable: true,
    minWidth: 200,
    maxWidth: 320,
    render: (row) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{row.nombres}</span>
        <span className="text-xs text-muted-foreground">{row.correo}</span>
      </div>
    ),
  },
  {
    key: "estadoLabel",
    label: "Estado",
    minWidth: 120,
    render: (row) => (
      <Badge tone={row.estadoTone as "success" | "warn" | "danger" | "neutral"}>
        {row.estadoLabel}
      </Badge>
    ),
  },
  {
    key: "kycCompleto",
    label: "KYC",
    minWidth: 110,
    render: (row) => <KycBadge completo={row.kycCompleto} />,
  },
  {
    key: "riesgo",
    label: "Riesgo PLAFT",
    minWidth: 130,
    render: (row) => <RiskBadge nivel={row.riesgo} motivo={row.riesgoMotivo} />,
  },
  {
    key: "esPep",
    label: "PEP",
    minWidth: 70,
    render: (row) =>
      row.esPep ? (
        <span className="inline-flex items-center justify-center w-7 h-5 rounded-md border text-xs font-semibold bg-red-100 text-red-800 border-red-200">
          Sí
        </span>
      ) : (
        <span className="text-xs text-muted-foreground text-center w-7 inline-block">No</span>
      ),
  },
  {
    key: "cvuCount",
    label: "CVUs",
    minWidth: 80,
    render: (row) => (
      <span
        className={`text-xs font-medium tabular-nums ${row.cvuCount > 0 ? "text-foreground" : "text-muted-foreground"}`}
      >
        {row.cvuCount} {row.cvuCount === 1 ? "CVU" : "CVUs"}
      </span>
    ),
  },
  {
    key: "consumoMensualPct",
    label: "Perfil",
    minWidth: 140,
    render: (row) => (
      <ProfileConsumo pct={row.consumoMensualPct} limite={row.limiteTransferencia} />
    ),
  },
  {
    key: "fechaRegistro",
    label: "Fecha de registro",
    minWidth: 130,
    render: (row) => <span className="font-mono tabular-nums">{row.fechaRegistro}</span>,
  },
];
export const visibleColumns: Column<User>[] = SHOW_PLAFT_COLUMNS
  ? columns
  : columns.filter((c) => !PLAFT_KEYS.has(String(c.key)));
