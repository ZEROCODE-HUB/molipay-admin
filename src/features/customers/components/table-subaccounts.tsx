import { type Subaccount } from "@/features/customers/subaccounts.supabase";
import { Badge } from "@/shared/ui/badge";
import { CheckCircle,Eye,PauseCircle,PlayCircle,Trash2 } from "lucide-react";
import { formatMoney } from "@/shared/lib/format";
import { ActionsDropdown } from "@/shared/ui/actions-dropdown";

export function TableSubaccounts({
  rows,
  onVerDetalles: onVerDetails,
  onValidar: onValidate,
  onSuspender: onSuspend,
  onReactivar: onReactivate,
  onEliminar: onRemove,
}: {
  rows: Subaccount[];
  onVerDetalles: (s: Subaccount) => void;
  onValidar: (s: Subaccount) => void;
  onSuspender: (s: Subaccount) => void;
  onReactivar: (s: Subaccount) => void;
  onEliminar: (s: Subaccount) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Nombre</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">CVU</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium text-right">Saldo disp.</th>
            <th className="px-4 py-3 font-medium text-right">Retiros</th>
            <th className="px-4 py-3 font-medium text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="border-b border-border last:border-b-0">
              <td className="px-4 py-3">{`${s.nombre} ${s.apellido}`.trim()}</td>
              <td className="px-4 py-3">{s.email}</td>
              <td className="px-4 py-3 font-mono text-xs">{s.cbu ?? "—"}</td>
              <td className="px-4 py-3">{s.tipo}</td>
              <td className="px-4 py-3">
                <Badge tone={s.estado === "Activa" ? "success" : "neutral"}>{s.estado}</Badge>
                {s.validada && (
                  <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] text-emerald-600">
                    <CheckCircle size={11} /> Validada
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatMoney(s.saldoDisponible)}
              </td>
              <td className="px-4 py-3 text-right">
                {s.retirosHabilitados ? "Habilitados" : "Bloqueados"}
              </td>
              <td className="px-4 py-3 text-right">
                <ActionsDropdown
                  actions={[
                    { label: "Ver detalles", icon: Eye, onClick: () => onVerDetails(s) },
                    {
                      label: "Validar",
                      icon: CheckCircle,
                      onClick: () => onValidate(s),
                      disabled: s.validada,
                    },
                    {
                      label: "Suspender",
                      icon: PauseCircle,
                      onClick: () => onSuspend(s),
                      disabled: s.estado === "Pausada",
                    },
                    {
                      label: "Reactivar",
                      icon: PlayCircle,
                      onClick: () => onReactivate(s),
                      disabled: s.estado === "Activa",
                    },
                    {
                      label: "Eliminar",
                      icon: Trash2,
                      variant: "danger",
                      onClick: () => onRemove(s),
                    },
                  ]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
