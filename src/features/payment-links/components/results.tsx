import {
QK_ACRED,
itemsDeExecution,
type ResultExecution,
} from "@/features/payment-links/credits.supabase";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Amount,date } from "@/features/payment-links/components/credits-common";
import { BtnOutline } from "@/shared/ui/button";
import { RotateCcw } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Results({
  ejecucionId: executionId,
  onReintentar,
  resumen: summary,
}: {
  ejecucionId: string;
  onReintentar?: (ids: string[]) => void;
  resumen?: ResultExecution;
}) {
  const q = useQuery({
    queryKey: [...QK_ACRED, "ejecucion-items", executionId],
    queryFn: () => itemsDeExecution(executionId),
  });
  const [filter, setFilter] = useState<"" | "acreditado" | "error" | "omitido">("");
  const [reint, setReint] = useState<Set<string>>(new Set());
  const items = (q.data ?? []).filter((i) => !filter || i.resultado === filter);
  const account = (r: string) => (q.data ?? []).filter((i) => i.resultado === r).length;

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Resultados</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge tone="success">Acreditados: {account("acreditado")}</Badge>
          <Badge tone="danger">Con error: {account("error")}</Badge>
          <Badge tone="neutral">Omitidos: {account("omitido")}</Badge>
          {summary && (
            <span>
              Neto acreditado: <Amount v={summary.neto_acreditado} strong />
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Todos los resultados</option>
          <option value="acreditado">Acreditado</option>
          <option value="error">Error</option>
          <option value="omitido">Omitido</option>
        </select>
        {onReintentar && (
          <BtnOutline onClick={() => onReintentar([...reint])} disabled={reint.size === 0}>
            <RotateCcw size={14} /> Reintentar seleccionados ({reint.size})
          </BtnOutline>
        )}
      </div>
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="text-left">
                <th className="py-1.5 pr-2 w-8" />
                <th className="py-1.5 pr-3">Lote</th>
                <th className="py-1.5 pr-3">Bandera</th>
                <th className="py-1.5 pr-3">Fecha de pago</th>
                <th className="py-1.5 pr-3 text-right">Neto</th>
                <th className="py-1.5 pr-3">Resultado</th>
                <th className="py-1.5">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="py-1.5 pr-2">
                    {i.resultado !== "acreditado" && onReintentar && (
                      <input
                        type="checkbox"
                        checked={reint.has(i.lote_id)}
                        onChange={() =>
                          setReint((s) => {
                            const n = new Set(s);
                            if (n.has(i.lote_id)) n.delete(i.lote_id);
                            else n.add(i.lote_id);
                            return n;
                          })
                        }
                      />
                    )}
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-xs">
                    <Link
                      to="/admin/comercios/link-pago/lotes"
                      search={{ lote: i.lote_id }}
                      className="text-primary hover:underline"
                    >
                      {i.lote?.codigo ?? i.lote_id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-3 text-xs">{i.lote?.bandera}</td>
                  <td className="py-1.5 pr-3 text-xs">{date(i.lote?.fecha)}</td>
                  <td className="py-1.5 pr-3 text-right">
                    {i.neto_acreditar != null ? <Amount v={i.neto_acreditar} /> : "—"}
                  </td>
                  <td className="py-1.5 pr-3">
                    {i.resultado === "acreditado" ? (
                      <Badge tone="success">Acreditado</Badge>
                    ) : i.resultado === "error" ? (
                      <Badge tone="danger">Error</Badge>
                    ) : (
                      <Badge tone="neutral">Omitido</Badge>
                    )}
                  </td>
                  <td className="py-1.5 text-xs text-muted-foreground">{i.motivo ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
