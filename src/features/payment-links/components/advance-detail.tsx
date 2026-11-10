import { AdvanceSummarySection } from "./advance-summary-section";
import { AdvanceManagementSection } from "./advance-management-section";
import { useAdvanceDetail } from "./use-advance-detail";
import { Modal } from "@/shared/ui/modal";
import { formatMoney } from "@/shared/lib/format";
import { Banknote, Wallet } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { type AdvanceUI } from "@/features/payment-links/advances.types";
import { label, shortId, tone } from "@/features/payment-links/advances.rules";

export function AdvanceDetail(props: {
  a: AdvanceUI;
  onClose: () => void;
  onSave: (u: AdvanceUI) => void;
  onAcreditado: () => void;
}) {
  const vm = useAdvanceDetail(props);
  const { a, onClose, cap, amountCredit, pool, poolInsuficiente, readOnly } = vm;

  return (
    <Modal open onClose={onClose} size="custom" className="max-w-2xl">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <Wallet size={18} /> Adelanto {shortId(a.fullId)}
            </h3>
            <p className="text-sm text-muted-foreground">
              {a.comercio} · {a.legajo}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={tone(a.estado)}>{label(a.estado)}</Badge>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
              ✕
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="text-sm">
            Operación: <span className="font-semibold">{a.operacion}</span>
          </div>
          {/* Tope disponible: banner contextual sólo en Pendiente/Aprobado */}
          {cap != null && (
            <div className="rounded-lg border bg-amber-50 border-amber-200 px-3 py-2 text-xs text-amber-800 flex items-center justify-between">
              <span>
                Tope disponible del comercio:{" "}
                <span className="font-mono font-semibold">{formatMoney(cap)}</span>
              </span>
              <span className="text-amber-700">
                Importe solicitado:{" "}
                <span className="font-mono font-semibold">{formatMoney(a.importeSolicitado)}</span>
              </span>
            </div>
          )}

          {/* Recaudadora de Payway: banner solo cuando el adelanto está
              Aceptado (es el único caso donde se Acredita y se mueve
              plata). */}
          {a.estado === "Aceptado" && pool && (
            <div
              className={
                "rounded-lg border px-3 py-2 text-xs flex items-center justify-between " +
                (poolInsuficiente
                  ? "bg-red-50 border-red-300 text-red-800"
                  : "bg-sky-50 border-sky-200 text-sky-800")
              }
            >
              <span className="flex items-center gap-3">
                <span>
                  Pendiente de acreditar:{" "}
                  <span className="font-mono font-semibold">
                    {formatMoney(pool.poolRecaudacionTotal)}
                  </span>
                </span>
                <span>
                  Adelantos sin compensar:{" "}
                  <span className="font-mono font-semibold">
                    {formatMoney(pool.adelantosEnCurso)}
                  </span>
                </span>
                <span>
                  Cupo disponible:{" "}
                  <span className="font-mono font-semibold">
                    {formatMoney(pool.cupoDisponiblePool)}
                  </span>
                </span>
              </span>
              {poolInsuficiente && (
                <span className="font-semibold">
                  ⚠ La recaudadora no alcanza para acreditar {formatMoney(amountCredit)}
                </span>
              )}
            </div>
          )}

          <AdvanceSummarySection {...vm} />

          {/* Acciones según estado */}
          <AdvanceManagementSection {...vm} />

          {readOnly && (
            <Card className="p-4 text-sm text-muted-foreground">
              {a.estado === "Acreditado" || a.estado === "Compensado" ? (
                <p>
                  Este adelanto ya fue acreditado. Los fondos se depositaron en la subcuenta{" "}
                  <span className="font-mono">Operativa</span> del legajo{" "}
                  <span className="font-mono">{a.legajo}</span> el {a.fechaAcreditacion}.{" "}
                  {a.estado === "Compensado"
                    ? "Ya se descontó todo de sus liquidaciones siguientes."
                    : `Compensado hasta ahora: ${formatMoney(a.compensado ?? 0)}; se descuenta solo de sus próximos lotes.`}
                </p>
              ) : a.estado === "Rechazado" ? (
                <p>Este adelanto fue rechazado.</p>
              ) : (
                <p>
                  Este adelanto fue cancelado por el comercio. No se pueden revertir las acciones.
                </p>
              )}
            </Card>
          )}

          {/* Detalle del movimiento de saldo — sólo visible si ya se acreditó */}
          {(a.estado === "Acreditado" || a.estado === "Compensado") && a.fechaAcreditacion && (
            <Card className="p-4 border-l-4 border-l-emerald-500">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <Banknote size={14} className="text-emerald-600" /> Movimiento de saldo
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Adelantado (recaudadora de Payway)</div>
                <div className="font-mono text-red-600 text-right">
                  - {formatMoney(amountCredit)}
                </div>
                <div className="text-muted-foreground">Descuento ({a.tasaInteresPct ?? 0}%)</div>
                <div className="font-mono text-red-600 text-right">
                  - {formatMoney(a.descuento ?? 0)}
                </div>
                <div className="text-muted-foreground font-semibold">Neto a Operativa</div>
                <div className="font-mono text-emerald-700 text-right font-semibold">
                  + {formatMoney(a.netoARecibir ?? 0)}
                </div>
                <div className="text-muted-foreground">Compensado con lotes</div>
                <div className="font-mono text-right">{formatMoney(a.compensado ?? 0)}</div>
                <div className="text-muted-foreground">Pendiente de compensar</div>
                <div className="font-mono text-right font-semibold">
                  {formatMoney(Math.max(0, amountCredit - (a.compensado ?? 0)))}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Modal>
  );
}
