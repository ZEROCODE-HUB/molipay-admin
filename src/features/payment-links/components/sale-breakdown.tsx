import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { formatMoney } from "@/shared/lib/format";
import { userMessage } from "@/shared/lib/errors";
import { getSaleBreakdown } from "@/features/payment-links/batches.supabase";

const CC_LABEL: Record<string, string> = {
  Abierto: "abierto",
  En_mediacion: "en mediación",
  Cerrado_acreditado: "ganado",
  Cerrado_retenido: "perdido",
};

/**
 * Desglose de una venta de Link de Pago: su parte de los descuentos del lote
 * y lo que le queda al comercio. Lo calcula la base (venta_desglose).
 */
export function SaleBreakdown({ idTxn }: { idTxn: string }) {
  const q = useQuery({
    queryKey: ["venta-desglose", idTxn],
    queryFn: () => getSaleBreakdown(idTxn),
  });
  if (q.isLoading) return <p className="mt-5 text-sm text-muted-foreground">Cargando desglose…</p>;
  if (q.isError)
    return (
      <p className="mt-5 text-sm text-red-700">
        {userMessage(q.error, "No se pudo cargar el desglose")}
      </p>
    );
  const d = q.data;
  if (!d) return null;
  const cc = d.contracargo;

  return (
    <div className="mt-5 border-t pt-4 text-sm">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Por qué recibe este monto
        </h4>
        {d.lote && (
          <Link
            to="/admin/comercios/link-pago/lotes"
            search={{ lote: d.lote.id } as never}
            className="text-xs text-primary hover:underline"
          >
            Lote {d.lote.codigo}
          </Link>
        )}
      </div>
      {cc && (
        <p className="mb-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">
          {cc.tipo === "devolucion"
            ? "Devolución"
            : `Contracargo ${CC_LABEL[cc.estado] ?? cc.estado}`}{" "}
          por {formatMoney(Number(cc.importe))}
        </p>
      )}
      {!d.lote ? (
        <p className="text-xs text-muted-foreground">
          Payway todavía no liquidó esta venta: los descuentos se conocen cuando llega el archivo.
        </p>
      ) : (
        <dl className="space-y-1">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Importe de la venta</dt>
            <dd className="font-mono tabular-nums">{formatMoney(Number(d.monto))}</dd>
          </div>
          {(d.lineas ?? []).map((x) => (
            <div key={x.concepto} className="flex justify-between">
              <dt className="text-muted-foreground">{x.concepto}</dt>
              <dd className="font-mono tabular-nums text-red-600">
                - {formatMoney(Number(x.monto))}
              </dd>
            </div>
          ))}
          {Number(d.contracargo_retenido ?? 0) > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Retenido por contracargo</dt>
              <dd className="font-mono tabular-nums text-red-600">
                - {formatMoney(Number(d.contracargo_retenido))}
              </dd>
            </div>
          )}
          {Number(d.adelanto_compensado ?? 0) > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Adelanto de esta venta</dt>
              <dd className="font-mono tabular-nums text-red-600">
                - {formatMoney(Number(d.adelanto_compensado))}
              </dd>
            </div>
          )}
          <div className="flex justify-between font-semibold border-t pt-1.5 mt-1">
            <dt>{d.estado === "Acreditado" ? "Neto acreditado" : "Neto a acreditar"}</dt>
            <dd className="font-mono tabular-nums">{formatMoney(Number(d.neto ?? 0))}</dd>
          </div>
          <p className="pt-1 text-[11px] text-muted-foreground">
            Payway liquida por lote: los descuentos son la parte proporcional de esta venta en el
            lote ({d.lote.ventas} venta{d.lote.ventas === 1 ? "" : "s"}).
            {Number(d.otros_del_lote ?? 0) > 0 &&
              ` Además el lote descontó ${formatMoney(Number(d.otros_del_lote))} de adelantos o deudas que no son de una venta.`}
          </p>
        </dl>
      )}
    </div>
  );
}
