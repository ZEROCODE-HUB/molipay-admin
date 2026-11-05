import { type TaxAssignment } from "@/infrastructure/supabase/legacy/types";
import { type Subaccount } from "@/features/customers/subaccounts.supabase";
import { Eye } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { MOCK_TAXES_BY_COLLECT,formatTaxAmount } from "@/features/taxes/receivable-taxes.data";
import { ModalDialog } from "@/shared/ui/modal-dialog";
import { KpiCard } from "./customer-detail-parts";
import { MiniDashboard } from "./mini-dashboard";

import type { CustomerDetailPageVm } from "./use-customer-detail-page";

export function CustomerFeesTab({
  activeTab,
  subaccountsQuery,
  feesRealesQuery,
  taxesQuery,
  alertsQuery,
  blocksQuery,
  modulesQuery,
  modulesData,
  setFeeDetail,
  legajo,
  feeDetail,
}: Pick<
  CustomerDetailPageVm,
  | "activeTab"
  | "subaccountsQuery"
  | "feesRealesQuery"
  | "taxesQuery"
  | "alertsQuery"
  | "blocksQuery"
  | "modulesQuery"
  | "modulesData"
  | "setFeeDetail"
  | "legajo"
  | "feeDetail"
>) {
  return (
    <>
      {activeTab === "contexto" && (
        <section className="mt-6">
          <h2 className="font-display text-base font-semibold text-foreground mb-3">
            Contexto operativo
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <KpiCard
              label="CVUs"
              value={
                subaccountsQuery.isError
                  ? "Por definir"
                  : String(subaccountsQuery.data?.length ?? 0)
              }
            />
            <KpiCard
              label="Comisiones"
              value={
                feesRealesQuery.isError
                  ? "Por definir"
                  : String(
                      (feesRealesQuery.data?.rows ?? []).filter(
                        (c) => c.tipo === "Depósito" || c.tipo === "Retiro",
                      ).length,
                    )
              }
            />
            <KpiCard
              label="Impuestos"
              value={taxesQuery.isError ? "Por definir" : String(taxesQuery.rows.length)}
            />
            <KpiCard
              label="Alertas"
              value={alertsQuery.isError ? "Por definir" : String(alertsQuery.data?.length ?? 0)}
            />
            <KpiCard
              label="Bloqueos"
              value={blocksQuery.isError ? "Por definir" : String(blocksQuery.data?.length ?? 0)}
            />
            <KpiCard
              label="Módulos inferidos"
              value={modulesQuery.isError ? "Por definir" : String(modulesData.length)}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <MiniDashboard
              titulo="CVUs recientes"
              columnas={[
                {
                  label: "Nombre",
                  render: (s: Subaccount) => `${s.nombre} ${s.apellido}`.trim(),
                },
                { label: "Email", render: (s: Subaccount) => s.email },
                { label: "Estado", render: (s: Subaccount) => s.estado },
              ]}
              datos={(subaccountsQuery.data ?? []).slice(0, 10)}
            />
            <div className="rounded-lg border border-border p-4">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Últimas comisiones
              </h4>
              {(() => {
                const feesFiltradas = (feesRealesQuery.data?.rows ?? []).filter(
                  (c) => c.tipo === "Depósito" || c.tipo === "Retiro",
                );
                return feesFiltradas.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin comisiones registradas.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-left uppercase tracking-wide text-muted-foreground">
                          <th className="px-2 py-1.5">Operación</th>
                          <th className="px-2 py-1.5">Tipo</th>
                          <th className="px-2 py-1.5">Estado</th>
                          <th className="px-2 py-1.5 text-right">Detalle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feesFiltradas.slice(0, 10).map((c) => (
                          <tr key={c.id} className="border-b last:border-0">
                            <td className="px-2 py-1.5 font-mono">{c.operacion}</td>
                            <td className="px-2 py-1.5">{c.tipo}</td>
                            <td className="px-2 py-1.5">
                              <Badge tone={c.estado === "Habilitado" ? "success" : "neutral"}>
                                {c.estado}
                              </Badge>
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              <button
                                onClick={() => setFeeDetail(c)}
                                className="inline-flex items-center gap-1 h-6 px-2 rounded border text-[11px] hover:bg-accent"
                              >
                                <Eye size={11} /> Ver detalle
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
            <div className="rounded-lg border border-border p-4 mt-3">
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Comisiones Link de Pago / E-commerce
              </h4>
              <p className="text-[11px] text-muted-foreground mb-2">Se gestionan separadamente.</p>
              {(() => {
                const feesLink = (feesRealesQuery.data?.rows ?? []).filter(
                  (c) => c.tipo === "Link de pago" || c.tipo === "E-commerce",
                );
                return feesLink.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Sin comisiones de Link de Pago / E-commerce.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-left uppercase tracking-wide text-muted-foreground">
                          <th className="px-2 py-1.5">Tipo</th>
                          <th className="px-2 py-1.5">Porcentaje</th>
                          <th className="px-2 py-1.5">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feesLink.slice(0, 10).map((c) => (
                          <tr key={c.id} className="border-b last:border-0">
                            <td className="px-2 py-1.5">{c.tipo}</td>
                            <td className="px-2 py-1.5 font-mono">
                              {c.porcentaje != null
                                ? c.porcentaje + "%"
                                : c.montoFijo != null
                                  ? "$ " + c.montoFijo
                                  : "—"}
                            </td>
                            <td className="px-2 py-1.5">
                              <Badge tone={c.estado === "Habilitado" ? "success" : "neutral"}>
                                {c.estado}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
            <MiniDashboard
              titulo="Impuestos recientes"
              columnas={[
                {
                  label: "Impuesto",
                  render: (a: TaxAssignment) => a.impuesto?.nombre ?? a.impuestoId,
                },
                { label: "Estado", render: (a: TaxAssignment) => a.estado },
                { label: "Fecha", render: () => "—" },
              ]}
              datos={taxesQuery.rows.slice(0, 10)}
            />
            {(() => {
              const byCollect = MOCK_TAXES_BY_COLLECT.filter(
                (r) => r.legajo === legajo && r.estado === "pendiente",
              ).slice(0, 10);
              const fallback = byCollect.length
                ? byCollect
                : MOCK_TAXES_BY_COLLECT.filter((r) => r.estado === "pendiente").slice(0, 5);
              const rows = byCollect.length ? byCollect : fallback;
              return (
                <MiniDashboard
                  titulo="Impuestos por cobrar"
                  columnas={[
                    { label: "Impuesto", render: (r: (typeof rows)[number]) => r.impuesto },
                    {
                      label: "Lote",
                      render: (r: (typeof rows)[number]) => (
                        <span className="font-mono text-[11px]">{r.loteId}</span>
                      ),
                    },
                    { label: "Bandera", render: (r: (typeof rows)[number]) => r.bandera },
                    {
                      label: "Monto",
                      render: (r: (typeof rows)[number]) => (
                        <span className="font-mono">{formatTaxAmount(r.monto)}</span>
                      ),
                    },
                    { label: "Estado", render: (r: (typeof rows)[number]) => r.estado },
                  ]}
                  datos={rows}
                />
              );
            })()}
            <MiniDashboard
              titulo="Alertas y bloqueos recientes"
              columnas={[
                {
                  label: "Tipo",
                  render: (r: { tipo: string; parametro?: string }) => r.tipo || r.parametro || "—",
                },
                {
                  label: "Estado",
                  render: (r: { estado: string }) => r.estado ?? "—",
                },
                { label: "Fecha", render: (r: { fecha: string }) => r.fecha },
              ]}
              datos={[
                ...(alertsQuery.data ?? []).map((a) => ({
                  tipo: a.tipo,
                  parametro: undefined as string | undefined,
                  estado: a.estado,
                  fecha: a.fecha,
                })),
                ...(blocksQuery.data ?? []).map((b) => ({
                  tipo: b.parametro,
                  parametro: b.parametro,
                  estado: b.estado ?? "—",
                  fecha: "—",
                })),
              ].slice(0, 10)}
            />
          </div>
          {feeDetail && (
            <ModalDialog
              open={!!feeDetail}
              onClose={() => setFeeDetail(null)}
              title="Detalle de comisión"
              description={`${feeDetail.operacion} · ${feeDetail.tipo}`}
            >
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Operación</span>
                  <div className="font-mono font-semibold">{feeDetail.operacion}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo</span>
                  <div>{feeDetail.tipo}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Modalidad</span>
                  <div>{feeDetail.modalidad}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Estado</span>
                  <div>
                    <Badge tone={feeDetail.estado === "Habilitado" ? "success" : "neutral"}>
                      {feeDetail.estado}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Porcentaje</span>
                  <div className="font-mono">{feeDetail.porcentaje ?? "—"}%</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Monto fijo</span>
                  <div className="font-mono">
                    {feeDetail.montoFijo != null ? `$ ${feeDetail.montoFijo}` : "—"}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Descripción</span>
                  <div>{feeDetail.descripcion ?? "—"}</div>
                </div>
              </div>
            </ModalDialog>
          )}
        </section>
      )}
    </>
  );
}
