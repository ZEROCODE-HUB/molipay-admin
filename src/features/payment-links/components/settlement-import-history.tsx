import { Link } from "@tanstack/react-router";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Amount, date, errMsg } from "@/features/payment-links/components/credits-common";
import { formatDateTime } from "@/shared/lib/format";

import type { SettlementsPageVm } from "./use-settlements-page";

export function SettlementImportHistory({ history }: Pick<SettlementsPageVm, "history">) {
  return (
    <Card className="mt-6">
      <h3 className="text-sm font-semibold mb-3">Últimas importaciones</h3>
      {history.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : history.isError ? (
        <p className="text-sm text-red-700">{errMsg(history.error)}</p>
      ) : (history.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no se importó ningún archivo.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="text-left">
                <th className="py-1.5 pr-3">Fecha de carga</th>
                <th className="py-1.5 pr-3">Archivo</th>
                <th className="py-1.5 pr-3">Rango</th>
                <th className="py-1.5 pr-3 text-right">Lotes</th>
                <th className="py-1.5 pr-3 text-right">Excepciones</th>
                <th className="py-1.5 pr-3 text-right">Neto</th>
                <th className="py-1.5">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(history.data ?? []).map((i) => (
                <tr key={i.id}>
                  <td className="py-1.5 pr-3 text-xs">{formatDateTime(i.created_at)}</td>
                  <td className="py-1.5 pr-3 text-xs">
                    <Link
                      to="/admin/comercios/link-pago/lotes"
                      search={{ importacion: i.id }}
                      className="text-primary hover:underline"
                    >
                      {i.archivo_nombre}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-3 text-xs">
                    {date(i.rango_desde)} – {date(i.rango_hasta)}
                  </td>
                  <td className="py-1.5 pr-3 text-right font-mono text-xs">
                    {i.resumen?.lotes_creados ?? "—"}
                  </td>
                  <td className="py-1.5 pr-3 text-right font-mono text-xs">
                    {i.resumen?.excepciones ?? "—"}
                  </td>
                  <td className="py-1.5 pr-3 text-right text-xs">
                    <Amount v={i.resumen?.totales?.neto ?? 0} />
                  </td>
                  <td className="py-1.5 text-xs">
                    <Badge tone={(i.resumen?.excepciones ?? 0) > 0 ? "warn" : "success"}>
                      {i.observaciones ?? i.estado}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
