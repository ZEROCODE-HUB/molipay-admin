import { type TaxAssignment } from "@/infrastructure/supabase/legacy/types";
import { Badge } from "@/shared/ui/badge";
import { fmtDate,operationLabel } from "@/features/customers/customer-detail.rules";
import { RateAsignada } from "./customer-detail-parts";
import { ActionsMenu } from "./actions-menu";

export function TableTaxes({
  rows,
  onVerDetalles: onVerDetails,
}: {
  rows: TaxAssignment[];
  onVerDetalles?: (a: TaxAssignment) => void;
}) {
  const withActions = Boolean(onVerDetails);
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Impuesto</th>
            <th className="px-4 py-3 font-medium">Código</th>
            <th className="px-4 py-3 font-medium">Operación</th>
            <th className="px-4 py-3 font-medium">Alícuota</th>
            <th className="px-4 py-3 font-medium">Fecha asignación</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            {withActions && <th className="px-4 py-3 font-medium text-right">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className="border-b border-border last:border-b-0">
              <td className="px-4 py-3">{a.impuesto?.nombre ?? a.impuestoId}</td>
              <td className="px-4 py-3 font-mono text-xs">{a.impuesto?.codigo ?? "—"}</td>
              <td className="px-4 py-3">{operationLabel(a)}</td>
              <td className="px-4 py-3">
                <RateAsignada a={a} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{fmtDate(a.fechaAsignacion)}</td>
              <td className="px-4 py-3">
                <Badge tone={a.estado === "Activo" ? "success" : "neutral"}>{a.estado}</Badge>
              </td>
              {withActions && (
                <td className="px-4 py-3 text-right">
                  <ActionsMenu
                    items={
                      onVerDetails
                        ? [{ label: "Ver detalles", onClick: () => onVerDetails(a) }]
                        : []
                    }
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
