import { ChargebackSummary } from "./chargeback-summary";
import { ChargebackMediationSection } from "./chargeback-mediation-section";
import { ChargebackManagementSection } from "./chargeback-management-section";
import { ChargebackSaleSection } from "./chargeback-sale-section";
import { ChargebackRefundSection } from "./chargeback-refund-section";
import { ChargebackMoneyCard } from "./chargeback-money-card";
import { useChargebacksDetail } from "./use-chargebacks-detail";
import { Modal } from "@/shared/ui/modal";
import { type Contra } from "@/features/payment-links/chargebacks.supabase";
import { AlertTriangle, Check, Clock, ExternalLink, X } from "lucide-react";
import { formatMoney } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { STATUS_LABEL, chargebackStep, tone } from "@/features/payment-links/chargebacks.rules";
import { PlazoMediacion } from "./chargebacks-parts";

const STEPS = ["Abierto", "En mediación", "Resolución"];

/** Abierto → En mediación → Resolución (ganado o perdido). */
function Stepper({ c }: { c: Contra }) {
  const current = chargebackStep(c.estado);
  const won = c.estado === "Cerrado_acreditado";
  const lost = c.estado === "Cerrado_retenido";
  return (
    <ol className="flex items-center gap-2 text-xs">
      {STEPS.map((label, i) => {
        const done = i < current || (i === current && (won || lost));
        const active = i === current && !done;
        const finalLabel = i === 2 && won ? "Ganado" : i === 2 && lost ? "Perdido" : label;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                i === 2 && lost
                  ? "border-red-600 bg-red-600 text-white"
                  : done
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground"
              }`}
            >
              {i === 2 && lost ? <X size={12} /> : done ? <Check size={12} /> : i + 1}
            </span>
            <span className={active || done ? "font-semibold" : "text-muted-foreground"}>
              {finalLabel}
            </span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Detalle (modal de gestión)
// ---------------------------------------------------------------------------

export function Detail(props: { c: Contra; onClose: () => void }) {
  const vm = useChargebacksDetail(props);
  const { c, onClose, status } = vm;

  return (
    <Modal open onClose={onClose} size="custom" className="max-w-4xl">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 space-y-3 border-b bg-card px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
                <AlertTriangle
                  size={18}
                  className={c.esSimulacion ? "text-blue-600" : "text-red-600"}
                />
                <span className="truncate">{c.comercioNombre}</span>
                <Badge tone={tone(c.estado)}>{STATUS_LABEL[c.estado]}</Badge>
                {c.tipo === "devolucion" && <Badge tone="neutral">Devolución</Badge>}
              </h3>
              <p className="text-sm text-muted-foreground">
                Legajo <span className="font-mono">{c.comercioLegajo}</span> · Contracargo{" "}
                <span className="font-mono">{c.id.slice(0, 8)}</span>
                {c.urlOrigen && (
                  <>
                    {" "}
                    ·{" "}
                    <a
                      href={c.urlOrigen}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 text-primary hover:underline"
                    >
                      link de pago <ExternalLink size={10} />
                    </a>
                  </>
                )}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-right">
                <div className="text-[11px] text-muted-foreground">Reclamado</div>
                <div className="font-mono text-lg font-semibold text-red-600">
                  -{formatMoney(c.importe)}
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1.5 hover:bg-muted"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          {c.esSimulacion ? (
            <div className="flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              <Clock size={13} /> Simulación: confirmala para que se registre y se retenga al
              comercio.
            </div>
          ) : (
            <Stepper c={c} />
          )}
          {status === "En_mediación" && (
            <PlazoMediacion fechaLimite={c.fechaLimite} enviadoAt={c.enviadoPaywayAt} />
          )}
        </div>

        <div className="space-y-4 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <ChargebackSummary {...vm} />
            <ChargebackMoneyCard {...vm} />
          </div>

          {/* Contracargo del archivo diario: de que venta es */}
          {c.loteDescuentoId && !c.esSimulacion && <ChargebackSaleSection c={c} />}

          {/* Documentacion de la mediacion */}
          <ChargebackMediationSection {...vm} />

          {/* Acciones de la etapa */}
          <ChargebackManagementSection {...vm} />

          {/* Devolver al comprador por la API de Payway */}
          {c.pagoId && !c.esSimulacion && <ChargebackRefundSection c={c} />}
        </div>
      </div>
    </Modal>
  );
}
