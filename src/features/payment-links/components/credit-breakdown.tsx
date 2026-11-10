import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { formatMoney } from "@/shared/lib/format";
import { getBatch } from "@/features/payment-links/batches.supabase";
import { esDelFile, netBatch } from "@/features/payment-links/batches.rules";

/**
 * Desglose de una acreditacion de lote (movimiento `ACR-<lote>`): del bruto
 * de Payway a lo que recibio el comercio. Los importes son los guardados.
 */
export function CreditBreakdown({ idTxn }: { idTxn: string }) {
  const batchId = idTxn.startsWith("ACR-") ? idTxn.slice(4) : null;
  const q = useQuery({
    queryKey: ["lote-acreditacion-desglose", batchId],
    queryFn: () => getBatch(batchId as string),
    enabled: !!batchId,
  });
  if (!batchId) return null;
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Cargando desglose…</p>;
  const b = q.data;
  if (q.isError || !b)
    return <p className="text-sm text-red-700">No se pudo cargar el lote de esta acreditación.</p>;

  const n = (v: number | string | null | undefined) => Number(v ?? 0);
  const file = esDelFile(b);
  const lines: [string, number][] = file
    ? [
        ["Costo de servicio Payway", n(b.costoServicioPayway)],
        ["Impuestos de Payway", n(b.impuestosPayway)],
        [`Tasa MoliPay (${n(b.tasaMolipayPct)}%)`, n(b.tasaMolipayMonto)],
        ["IVA sobre la tasa", n(b.ivaTasaMonto)],
        [`Cierre de lote (${n(b.comisionCierreLotePct)}%)`, n(b.comisionCierreLoteMonto)],
        ...b.impuestosDetalle.map((i): [string, number] => [
          `${i.nombre}${i.alicuota != null ? ` (${i.alicuota}%)` : ""}`,
          n(i.monto),
        ]),
        ["Retenido por contracargo", n(b.retencionContracargos)],
        ["Adelanto compensado", n(b.compensacionAdelantos)],
        ["Recupero de deuda", n(b.recuperacionDeuda)],
      ]
    : [["Descuentos estimados", n(b.importeBruto) - n(netBatch(b))]];

  return (
    <div className="mt-5 border-t pt-4 text-sm">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Por qué recibió este monto
        </h4>
        <Link
          to="/admin/comercios/link-pago/lotes"
          search={{ lote: b.id } as never}
          className="text-xs text-primary hover:underline"
        >
          Lote {b.codigo}
        </Link>
      </div>
      <dl className="space-y-1">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">
            Bruto liquidado · {b.bandera} · {b.cantidadOperaciones} op.
          </dt>
          <dd className="font-mono tabular-nums">{formatMoney(n(b.importeBruto))}</dd>
        </div>
        {lines
          .filter(([, v]) => v > 0)
          .map(([label, v]) => (
            <div key={label} className="flex justify-between">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-mono tabular-nums text-red-600">- {formatMoney(v)}</dd>
            </div>
          ))}
        <div className="flex justify-between font-semibold border-t pt-1.5 mt-1">
          <dt>{b.estado === "Acreditado" ? "Acreditado al comercio" : "Neto a acreditar"}</dt>
          <dd className="font-mono tabular-nums">{formatMoney(n(netBatch(b)))}</dd>
        </div>
      </dl>
    </div>
  );
}
