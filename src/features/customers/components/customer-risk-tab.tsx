import { Activity,Ban,Pencil,ShieldAlert } from "lucide-react";
import { formatMoney } from "@/shared/lib/format";
import { ProfileTransaccionalCustomerCard } from "@/features/alerts/components/customer-monitoring-cards";
import { UmbralBlockCustomerCard } from "@/features/alerts/components/umbral-block-customer-card";
import { AlertsTable } from "@/features/alerts/components/alerts-table";
import { BlocksTable } from "@/features/alerts/components/blocks-table";
import { SectionCard } from "./customer-detail-parts";

import type { CustomerDetailPageVm } from "./use-customer-detail-page";

export function CustomerRiskTab({
  activeTab,
  setEditRiskOpen,
  riskEffective,
  evaluacionesAnteriores,
  customer,
  setEditProfileOpen,
  setRiskSub,
  riskSub,
  setNewBlock,
}: Pick<
  CustomerDetailPageVm,
  | "activeTab"
  | "setEditRiskOpen"
  | "riskEffective"
  | "evaluacionesAnteriores"
  | "customer"
  | "setEditProfileOpen"
  | "setRiskSub"
  | "riskSub"
  | "setNewBlock"
>) {
  return (
    <>
      {activeTab === "riesgo" && (
        <SectionCard title="Riesgo y monitoreo">
          {/* === PLAFT: Nivel de Riesgo + Perfil Transaccional === */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
            {/* Tarjeta 1: Nivel de Riesgo PLAFT */}
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <ShieldAlert size={13} /> Nivel de riesgo PLAFT
                </div>
                <button
                  type="button"
                  onClick={() => setEditRiskOpen(true)}
                  className="inline-flex items-center gap-1 h-8 rounded-md border border-input px-2 text-xs font-medium text-foreground hover:bg-accent"
                >
                  <Pencil size={12} /> {riskEffective ? "Reevaluar" : "Asignar"}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={
                    riskEffective?.nivel === "bajo"
                      ? "px-2.5 py-1 rounded-md border text-sm font-semibold bg-emerald-100 text-emerald-800 border-emerald-200"
                      : riskEffective?.nivel === "medio"
                        ? "px-2.5 py-1 rounded-md border text-sm font-semibold bg-amber-100 text-amber-800 border-amber-200"
                        : riskEffective?.nivel === "alto"
                          ? "px-2.5 py-1 rounded-md border text-sm font-semibold bg-orange-100 text-orange-800 border-orange-200"
                          : riskEffective?.nivel === "critico"
                            ? "px-2.5 py-1 rounded-md border text-sm font-semibold bg-red-100 text-red-800 border-red-200"
                            : "px-2.5 py-1 rounded-md border text-sm font-semibold bg-muted text-muted-foreground border-border"
                  }
                >
                  {riskEffective ? riskEffective.nivel.toUpperCase() : "Sin evaluar"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Vigente desde:{" "}
                  {riskEffective
                    ? new Date(riskEffective.vigente_desde).toLocaleDateString("es-AR")
                    : "—"}
                </div>
              </div>
              <p className="mt-3 text-xs text-foreground">
                {riskEffective?.motivo ??
                  "El cliente no tiene evaluación de riesgo vigente. Completá una evaluación inicial."}
              </p>
              {evaluacionesAnteriores.length > 0 && (
                <details className="mt-3">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    Historial ({evaluacionesAnteriores.length} evaluación(es) anterior(es))
                  </summary>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {evaluacionesAnteriores.slice(0, 5).map((e) => (
                      <li key={e.id}>
                        <span className="font-medium text-foreground">{e.nivel.toUpperCase()}</span>
                        {" · "}
                        {new Date(e.created_at).toLocaleDateString("es-AR")}
                        {" — "}
                        {e.motivo.length > 60 ? `${e.motivo.slice(0, 60)}…` : e.motivo}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>

            <ProfileTransaccionalCustomerCard legajo={customer.legajo} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
            <UmbralBlockCustomerCard legajo={customer.legajo} tipoPersona={customer.tipoPersona} />

            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Activity size={13} /> Límites operativos declarados
                </div>
                <button
                  type="button"
                  onClick={() => setEditProfileOpen(true)}
                  className="inline-flex items-center gap-1 h-8 rounded-md border border-input px-2 text-xs font-medium text-foreground hover:bg-accent"
                >
                  <Pencil size={12} /> Editar
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">
                    Monto máx. transferencia
                  </div>
                  <div className="text-sm font-semibold tabular-nums">
                    {customer.limiteTransferencia != null
                      ? formatMoney(customer.limiteTransferencia)
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">
                    Ops. diarias máx.
                  </div>
                  <div className="text-sm font-semibold tabular-nums">
                    {customer.limiteOpsDiarias ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">
                    Monto diario máx.
                  </div>
                  <div className="text-sm font-semibold tabular-nums">
                    {customer.limiteMontoDiario != null
                      ? formatMoney(customer.limiteMontoDiario)
                      : "—"}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Datos declarados en la ficha. El motor de alertas usa el perfil transaccional
                esperado y las reglas de Parámetros de alertas/bloqueos.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border mb-4">
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setRiskSub("alertas")}
                className={`px-3 py-2 text-xs font-semibold rounded-t-md ${
                  riskSub === "alertas"
                    ? "bg-primary/10 text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                Alertas
              </button>
              <button
                type="button"
                onClick={() => setRiskSub("bloqueos")}
                className={`px-3 py-2 text-xs font-semibold rounded-t-md ${
                  riskSub === "bloqueos"
                    ? "bg-primary/10 text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                Bloqueos
              </button>
            </div>
            {riskSub === "bloqueos" && (
              <button
                type="button"
                onClick={() => setNewBlock(true)}
                className="mb-1 inline-flex items-center gap-1 h-8 rounded-md border border-input px-2.5 text-xs font-medium text-foreground hover:bg-accent"
              >
                <Ban size={12} /> Bloquear cuenta
              </button>
            )}
          </div>
          {riskSub === "alertas" ? (
            <AlertsTable legajo={customer.legajo} />
          ) : (
            <BlocksTable legajo={customer.legajo} />
          )}
        </SectionCard>
      )}
    </>
  );
}
