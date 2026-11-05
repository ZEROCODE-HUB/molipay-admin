import {
QK_ACRED,
salesDeBatch,
type BatchDelDay,
} from "@/features/payment-links/credits.supabase";
import { useQuery } from "@tanstack/react-query";
import { Amount,errMsg } from "@/features/payment-links/components/credits-common";
import { formatDateTime } from "@/shared/lib/format";
import { STATUSES_DAY } from "@/features/payment-links/credit-calendar.rules";

export function RowBatch({
  l,
  abierto: open,
  onToggle,
  onApertura: onBreakdown,
}: {
  l: BatchDelDay;
  abierto: boolean;
  onToggle: () => void;
  onApertura: () => void;
}) {
  const sales = useQuery({
    queryKey: [...QK_ACRED, "lote-ventas", l.id],
    queryFn: () => salesDeBatch(l.id),
    enabled: open,
  });
  const e = STATUSES_DAY.find((x) => x.k === l.estado_dia)!;
  return (
    <>
      <tr className="border-t">
        <td className="px-4 py-1.5">{l.bandera}</td>
        <td className="px-4 py-1.5 font-mono text-xs">
          {l.codigo}
          {l.legacy && <span className="ml-1 text-[10px] text-muted-foreground">(histórico)</span>}
        </td>
        <td className="px-4 py-1.5 text-right font-mono">{l.cantidad_operaciones}</td>
        <td className="px-4 py-1.5 text-right">
          <Amount v={l.bruto} />
        </td>
        <td className="px-4 py-1.5 text-right">
          <Amount v={l.neto} strong />
        </td>
        <td className="px-4 py-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
            <span className={`h-2 w-2 rounded-full ${e.color}`} />
            <span className={e.texto}>{e.singular}</span>
          </span>
          {l.estado === "Pendiente" && l.motivo && (
            <div className="text-[10px] text-muted-foreground">{l.motivo}</div>
          )}
        </td>
        <td className="px-4 py-1.5 whitespace-nowrap text-right">
          <button
            type="button"
            className="text-xs text-primary hover:underline mr-3"
            onClick={onToggle}
          >
            {open ? "Ocultar operaciones" : "Ver operaciones"}
          </button>
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={onBreakdown}
          >
            Apertura
          </button>
        </td>
      </tr>
      {open && (
        <tr className="bg-muted/20">
          <td colSpan={7} className="px-4 py-2">
            {sales.isLoading ? (
              <p className="text-xs text-muted-foreground">Cargando operaciones…</p>
            ) : sales.isError ? (
              <p className="text-xs text-red-700">{errMsg(sales.error)}</p>
            ) : (sales.data ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Sin operaciones vinculadas a este lote.
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="text-left">
                    <th className="py-1 pr-3">Fecha de venta</th>
                    <th className="py-1 pr-3">Operación</th>
                    <th className="py-1 pr-3">Cuotas</th>
                    <th className="py-1 text-right">Bruto</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(sales.data ?? []).map((v) => (
                    <tr key={v.id}>
                      <td className="py-1 pr-3">{formatDateTime(v.fecha)}</td>
                      <td className="py-1 pr-3 font-mono">{v.id_txn}</td>
                      <td className="py-1 pr-3">{v.cuotas ?? 1}</td>
                      <td className="py-1 text-right">
                        <Amount v={v.monto_operacion} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
