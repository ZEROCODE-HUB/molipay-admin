import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QK_ACRED, listExecutions, saveSelection } from "@/features/payment-links/credits.supabase";
import { useEffect, useState } from "react";
import { Card } from "@/shared/ui/card";
import { formatDateTime } from "@/shared/lib/format";
import { Amount, date } from "@/features/payment-links/components/credits-common";
import { Badge } from "@/shared/ui/badge";
import { XCircle } from "lucide-react";
import { Results } from "./results";

export function AdvanceHistory({ ejecucionId: executionId }: { ejecucionId?: string }) {
  const navigate = useNavigate({ from: "/admin/comercios/link-pago/ejecucion" });
  const q = useQuery({
    queryKey: [...QK_ACRED, "ejecuciones"],
    queryFn: () => listExecutions(100),
  });
  const [reint, setReint] = useState<string[] | null>(null);

  useEffect(() => {
    if (reint) {
      // Reintentar desde el historial abre una ejecucion nueva con esos lotes.
      saveSelection(reint);
      void navigate({ search: {} });
    }
  }, [reint, navigate]);

  return (
    <div className="space-y-4">
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr className="text-left">
              <th className="px-3 py-2">N°</th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Fecha de acreditación</th>
              <th className="px-3 py-2 text-right">Lotes</th>
              <th className="px-3 py-2 text-right">Acreditados</th>
              <th className="px-3 py-2 text-right">Con error</th>
              <th className="px-3 py-2 text-right">Omitidos</th>
              <th className="px-3 py-2 text-right">Neto</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {(q.data ?? []).map((e) => (
              <tr key={e.id} className={e.id === executionId ? "bg-primary/5" : ""}>
                <td className="px-3 py-2 font-mono text-xs">#{e.numero}</td>
                <td className="px-3 py-2 text-xs">{formatDateTime(e.created_at)}</td>
                <td className="px-3 py-2 text-xs">{date(e.fecha_acreditacion)}</td>
                <td className="px-3 py-2 text-right">{e.totales?.lotes ?? "—"}</td>
                <td className="px-3 py-2 text-right">{e.totales?.acreditados ?? 0}</td>
                <td className="px-3 py-2 text-right">{e.totales?.errores ?? 0}</td>
                <td className="px-3 py-2 text-right">{e.totales?.omitidos ?? 0}</td>
                <td className="px-3 py-2 text-right">
                  <Amount v={e.totales?.neto_acreditado ?? 0} />
                </td>
                <td className="px-3 py-2">
                  {e.estado === "completada" ? (
                    <Badge tone="success">Completada</Badge>
                  ) : e.estado === "completada_con_errores" ? (
                    <Badge tone="warn">Completada con errores</Badge>
                  ) : (
                    <Badge tone="neutral">En curso</Badge>
                  )}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => void navigate({ search: { ejecucion: e.id } })}
                  >
                    Ver resultados
                  </button>
                </td>
              </tr>
            ))}
            {!q.isLoading && (q.data ?? []).length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                  Todavía no hay ejecuciones.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      {executionId && <Results ejecucionId={executionId} onReintentar={(ids) => setReint(ids)} />}
      {!executionId && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <XCircle size={12} /> Un lote con error queda Pendiente y se puede reintentar: un error no
          deshace los demás.
        </p>
      )}
    </div>
  );
}
