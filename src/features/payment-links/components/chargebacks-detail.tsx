import { ChargebackSummary } from "./chargeback-summary";
import { ChargebackMediationSection } from "./chargeback-mediation-section";
import { ChargebackManagementSection } from "./chargeback-management-section";
import { useChargebacksDetail } from "./use-chargebacks-detail";
import { Modal } from "@/shared/ui/modal";
import { type Contra } from "@/features/payment-links/chargebacks.supabase";
import { AlertTriangle,ArrowRight,Calendar,Clock,ExternalLink,Link2,X } from "lucide-react";
import { formatMoney } from "@/shared/lib/format";
import { Card } from "@/shared/ui/card";
import { PlazoMediacion } from "./chargebacks-parts";

// ---------------------------------------------------------------------------
// Detalle (modal de gestión)
// ---------------------------------------------------------------------------

export function Detail(props: { c: Contra; onClose: () => void }) {
  const vm = useChargebacksDetail(props);
  const { c, onClose, status } = vm;

  return (
    <Modal open onClose={onClose} size="custom" className="max-w-3xl">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start z-10">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <AlertTriangle
                size={18}
                className={c.esSimulacion ? "text-blue-600" : "text-red-600"}
              />
              Contracargo {c.id.slice(0, 8)}…
            </h3>
            <p className="text-sm text-muted-foreground">
              {c.comercioNombre} · {c.comercioLegajo}
              {c.clienteLegajo && (
                <>
                  {" "}
                  · Legajo cliente <span className="font-mono">{c.clienteLegajo}</span>
                </>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Simulación: mostrar impacto antes de confirmar */}
          {c.esSimulacion && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm">
              <div className="font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                <Clock size={14} /> Simulación — estos valores aún no están aplicados
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {c.impactoNeto != null && (
                  <div>
                    <span className="text-blue-600">Descuento neto:</span>{" "}
                    <span className="font-mono font-semibold">{formatMoney(c.impactoNeto)}</span>
                  </div>
                )}
                {c.impactoSaldo != null && (
                  <div>
                    <span className="text-blue-600">Saldo commerce:</span>{" "}
                    <span className="font-mono font-semibold">{formatMoney(c.impactoSaldo)}</span>
                  </div>
                )}
                {c.impactoTasa != null && (
                  <div>
                    <span className="text-blue-600">Tasa MoliPay:</span>{" "}
                    <span className="font-mono">{c.impactoTasa}%</span>
                  </div>
                )}
                {c.impactoCierre != null && (
                  <div>
                    <span className="text-blue-600">Cierre lote:</span>{" "}
                    <span className="font-mono">{formatMoney(c.impactoCierre)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Flujo */}
          <div className="rounded-lg bg-muted/40 border px-3 py-2 text-xs flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold">Flujo:</span>
            <span>Visa</span> <ArrowRight size={12} /> <span>PayWay</span> <ArrowRight size={12} />{" "}
            <span>MoliPay</span> <ArrowRight size={12} /> <span>comprador</span>
          </div>

          {/* Link original */}
          {(c.urlOrigen || c.linkId) && (
            <Card className="p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <Link2 size={12} /> Link de pago original
              </h4>
              {c.urlOrigen ? (
                <a
                  href={c.urlOrigen}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-primary underline break-all inline-flex items-center gap-1"
                >
                  {c.urlOrigen} <ExternalLink size={10} />
                </a>
              ) : (
                <p className="text-xs text-muted-foreground font-mono">
                  ID link: {c.linkId || "—"}
                </p>
              )}
            </Card>
          )}

          {/* Datos del contracargo + PayWay */}
          <ChargebackSummary {...vm} />

          {/* Plazo de mediación (solo si En_mediación) */}
          {status === "En_mediación" && (
            <Card className="p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <Calendar size={12} /> Plazo de mediación
              </h4>
              <PlazoMediacion fechaLimite={c.fechaLimite} enviadoAt={c.enviadoPaywayAt} />
            </Card>
          )}

          {/* Adjuntos */}
          <ChargebackMediationSection {...vm} />

          {/* Gestión */}
          <ChargebackManagementSection {...vm} />
        </div>
      </div>
    </Modal>
  );
}
