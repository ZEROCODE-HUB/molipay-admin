import { Badge } from "@/shared/ui/badge";
import { type SubaccountKind } from "@/features/customers/subaccounts.supabase";
import { Wallet } from "lucide-react";
import { type Column } from "@/shared/ui/data-table";
import { LEGAJO_TOOLTIP,LegajoCell } from "@/shared/ui/legajo-label";
import { formatCuit } from "@/features/customers/customers.supabase";
import { KIND_SUBACCOUNT_META } from "@/features/customers/customer-cvu.rules";

export function statusBadge(e: string) {
  const map: Record<string, { label: string; tone: "success" | "danger" | "warn" | "neutral" }> = {
    Activa: { label: "Habilitado", tone: "success" },
    Pausada: { label: "Deshabilitado", tone: "danger" },
    Habilitado: { label: "Habilitado", tone: "success" },
    Deshabilitado: { label: "Deshabilitado", tone: "danger" },
    Suspendido: { label: "Suspendido", tone: "warn" },
  };
  const m = map[e] ?? { label: e, tone: "neutral" as const };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function kindSubaccountBadge(kind: SubaccountKind) {
  const meta = KIND_SUBACCOUNT_META[kind] ?? { label: kind, icon: Wallet };
  const Icon = meta.icon;
  const tone =
    kind === "Operativa"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : kind === "Recaudacion"
        ? "bg-blue-100 text-blue-800 border-blue-200"
        : kind === "Garantias"
          ? "bg-amber-100 text-amber-800 border-amber-200"
          : "bg-purple-100 text-purple-800 border-purple-200";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium ${tone}`}
    >
      <Icon size={12} />
      {meta.label}
    </span>
  );
}

export const columns: Column<any>[] = [
  {
    key: "_legajo",
    label: "Legajo",
    hint: LEGAJO_TOOLTIP,
    filterable: true,
    render: (r) => (
      <div className="flex flex-col">
        <LegajoCell legajo={r._legajo} />
        <span className="text-[11px] text-muted-foreground font-mono">{formatCuit(r._cuit)}</span>
      </div>
    ),
  },
  { key: "_correo", label: "Usuario", filterable: true, render: (r) => r._correo },
  { key: "_nombre", label: "Nombre", filterable: true, render: (r) => r._nombre },
  { key: "_apellido", label: "Apellido", filterable: true, render: (r) => r._apellido },
  {
    key: "_tipo",
    label: "Tipo",
    minWidth: 140,
    filterable: true,
    render: (r) => kindSubaccountBadge(r._tipo),
  },
  {
    key: "_cvu",
    label: "CVU",
    filterable: true,
    render: (r) =>
      r._cvu && r._cvu !== "—" ? (
        <span className="font-mono tabular-nums">{r._cvu}</span>
      ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-amber-300 bg-amber-50 text-amber-800 text-[11px] font-medium">
          Pendiente de asignación
        </span>
      ),
  },
  {
    key: "_cbk",
    label: "CBK",
    render: (r) => <span className="font-mono tabular-nums">{r._cbk}</span>,
  },
  { key: "_alias", label: "Alias", render: (r) => r._alias },
  { key: "_estado", label: "Estado", render: (row) => statusBadge(row._estado) },
  {
    key: "_fechaAlta",
    label: "Fecha de alta",
    render: (r) => <span className="font-mono tabular-nums text-xs">{r._fechaAlta}</span>,
  },
];
