import { Modal } from "@/shared/ui/modal";
import { type BatchCredit } from "@/infrastructure/supabase/legacy/types";
import { useQuery } from "@tanstack/react-query";
import { listAdvancesByMerchant } from "@/features/payment-links/advances.supabase";
import { Store,Wallet } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { formatMoney } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { type SummaryMerchant } from "@/features/payment-links/batches.types";
import {
netBatch,
parseDateLocal,
statusMostrado,
tone,
} from "@/features/payment-links/batches.rules";

export function MerchantDetailModal({
  data,
  lotes: batches,
  onClose,
}: {
  data: SummaryMerchant;
  lotes: BatchCredit[];
  onClose: () => void;
}) {
  const { data: advances, isLoading: advancesLoading } = useQuery({
    queryKey: ["adelantos", data.comercioId],
    queryFn: () => listAdvancesByMerchant(data.comercioId),
  });
  const batchesDelMerchant = batches.filter((l) => l.comercioId === data.comercioId);
  return (
    <Modal open onClose={onClose} size="custom" className="max-w-3xl">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div>
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <Store size={18} /> {data.comercio}
            </h3>
            <p className="text-sm font-mono text-muted-foreground">
              {data.legajo} · {data.cantidadLotes} lotes · {data.cantidadOps} ops
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            ✕
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Total pendiente de acreditar</div>
              <div className="font-mono font-semibold mt-1">
                {formatMoney(data.pendienteAcreditar)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Máximo adelantable{" "}
                {data.totalContracargo
                  ? `— contracargo ${formatMoney(data.totalContracargo)} descontado`
                  : ""}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Pendiente de impuestos</div>
              <div className="font-mono font-semibold mt-1">
                {formatMoney(data.pendienteImpuestos)}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Comisión total PayWay</div>
              <div className="font-mono font-semibold mt-1">{formatMoney(data.totalPayWay)}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Neto MoliPay</div>
              <div className="font-mono font-semibold mt-1 text-emerald-700">
                {formatMoney(data.totalMoliPay)}
              </div>
            </Card>
            {data.totalContracargo > 0 && (
              <Card className="p-3 border-red-200 bg-red-50">
                <div className="text-xs text-red-700">Contracargo retenido</div>
                <div className="font-mono font-semibold mt-1 text-red-600">
                  - {formatMoney(data.totalContracargo)}
                </div>
                <div className="text-[11px] text-red-600">Restado del total a acreditar</div>
              </Card>
            )}
            <Card className={`p-3 ${data.totalContracargo > 0 ? "" : "col-span-2"}`}>
              <div className="text-xs text-muted-foreground">Total a pagar al comercio</div>
              <div className="font-mono font-semibold mt-1 text-emerald-700">
                {formatMoney(data.totalFinal)}
              </div>
            </Card>
          </div>
          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Lotes por bandera de este comercio ({batchesDelMerchant.length})
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-2 py-1.5">Lote</th>
                    <th className="px-2 py-1.5">Bandera</th>
                    <th className="px-2 py-1.5">Fecha</th>
                    <th className="px-2 py-1.5 text-right">Importe a acreditar</th>
                    <th className="px-2 py-1.5">Estado</th>
                    {batchesDelMerchant.some((l) => (l.contracargoMonto ?? 0) > 0) && (
                      <th className="px-2 py-1.5 text-right">Contracargo</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {batchesDelMerchant.map((l) => {
                    const contra = l.contracargoMonto ?? 0;
                    return (
                      <tr key={l.id} className="border-b last:border-0">
                        <td className="px-2 py-1.5 font-mono">{l.codigo}</td>
                        <td className="px-2 py-1.5">
                          <span className="inline-flex rounded-full border px-2 py-0.5 text-[11px] bg-muted/50">
                            {l.bandera}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 font-mono">
                          {parseDateLocal(l.fecha).toLocaleDateString("es-AR")}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          {formatMoney(netBatch(l))}
                        </td>
                        <td className="px-2 py-1.5">
                          <Badge tone={tone(statusMostrado(l))}>{statusMostrado(l)}</Badge>
                        </td>
                        {batchesDelMerchant.some((x) => (x.contracargoMonto ?? 0) > 0) && (
                          <td className="px-2 py-1.5 text-right font-mono text-red-600">
                            {contra ? `- ${formatMoney(contra)}` : "—"}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
              <Wallet size={12} /> Adelantos
            </h4>
            {advancesLoading ? (
              <p className="text-sm text-muted-foreground">Cargando adelantos…</p>
            ) : !advances || advances.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin solicitudes de adelanto para este comercio.
              </p>
            ) : (
              <div className="space-y-3">
                {advances.map((a) => (
                  <div key={a.id} className="rounded-lg border px-3 py-2 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Estado</span>
                      <Badge
                        tone={
                          a.estado === "Pendiente"
                            ? "warn"
                            : a.estado === "Aprobado" || a.estado === "Acreditado"
                              ? "success"
                              : a.estado === "Rechazado"
                                ? "danger"
                                : "neutral"
                        }
                      >
                        {a.estado}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Monto solicitado</span>
                      <span className="font-mono font-semibold">
                        {formatMoney(a.montoSolicitado)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Plazo</span>
                      <span className="font-mono">
                        {a.plazoAdelantadoDias}d / {a.plazoOriginalDias}d ·{" "}
                        {a.tasaInteresPct != null ? `${a.tasaInteresPct}%` : "tasa pendiente"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Solicitado {new Date(a.fechaSolicitud).toLocaleDateString("es-AR")}
                      {a.fechaResolucion
                        ? ` · Resuelto ${new Date(a.fechaResolucion).toLocaleDateString("es-AR")}`
                        : ""}
                    </div>
                    {a.montoPorAcreditar != null && a.montoPorAcreditar > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Monto por acreditar</span>
                        <span className="font-mono font-semibold text-amber-700">
                          {formatMoney(a.montoPorAcreditar)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Modal>
  );
}
