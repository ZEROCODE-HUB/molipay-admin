import { MOCK_TAXES_BY_COLLECT,formatTaxAmount } from "@/features/taxes/receivable-taxes.data";
import { CustomerSection } from "./customer-section";
import { TableTaxes } from "./table-taxes";

import type { CustomerDetailPageVm } from "./use-customer-detail-page";

export function CustomerTaxesTab({
  activeTab,
  taxesQuery,
  setTaxDetail,
  legajo,
}: Pick<CustomerDetailPageVm, "activeTab" | "taxesQuery" | "setTaxDetail" | "legajo">) {
  return (
    <>
      {activeTab === "impuestos" && (
        <>
          <CustomerSection
            titulo="Impuestos asignados"
            loading={taxesQuery.isLoading}
            error={taxesQuery.isError ? taxesQuery.error : null}
            onRetry={taxesQuery.refetch}
            vacio={taxesQuery.rows.length === 0}
          >
            <TableTaxes rows={taxesQuery.rows} onVerDetalles={(a) => setTaxDetail(a)} />
          </CustomerSection>
          {(() => {
            const mockForLegajo = MOCK_TAXES_BY_COLLECT.filter((r) => r.legajo === legajo);
            const pendings = mockForLegajo.filter((r) => r.estado === "pendiente");
            const paids = mockForLegajo.filter((r) => r.estado === "pagado");
            const fallbackPend = pendings.length
              ? pendings
              : MOCK_TAXES_BY_COLLECT.filter((r) => r.estado === "pendiente")
                  .slice(0, 2)
                  .map((r) => ({ ...r, legajo }));
            const fallbackPag = paids.length
              ? paids
              : MOCK_TAXES_BY_COLLECT.filter((r) => r.estado === "pagado")
                  .slice(0, 2)
                  .map((r) => ({ ...r, legajo }));
            const pendRows = pendings.length ? pendings : fallbackPend;
            const pagRows = paids.length ? paids : fallbackPag;
            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl border border-border bg-card p-4">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Impuestos pendientes de pago
                  </h4>
                  {pendRows.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sin pendientes.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-left uppercase tracking-wide text-muted-foreground">
                            <th className="px-2 py-1.5">Impuesto</th>
                            <th className="px-2 py-1.5">Lote</th>
                            <th className="px-2 py-1.5 text-right">Monto</th>
                            <th className="px-2 py-1.5">Bandera</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendRows.map((r) => (
                            <tr key={r.id} className="border-b last:border-0">
                              <td className="px-2 py-1.5 font-medium">{r.impuesto}</td>
                              <td className="px-2 py-1.5 font-mono">{r.loteId}</td>
                              <td className="px-2 py-1.5 text-right font-mono">
                                {formatTaxAmount(r.monto)}
                              </td>
                              <td className="px-2 py-1.5">{r.bandera}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Mock tasa variable → lote correspondiente
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Impuestos pagados
                  </h4>
                  {pagRows.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sin pagados.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-left uppercase tracking-wide text-muted-foreground">
                            <th className="px-2 py-1.5">Impuesto</th>
                            <th className="px-2 py-1.5">Lote</th>
                            <th className="px-2 py-1.5 text-right">Monto</th>
                            <th className="px-2 py-1.5">Fecha lote</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagRows.map((r) => (
                            <tr key={r.id} className="border-b last:border-0">
                              <td className="px-2 py-1.5 font-medium">{r.impuesto}</td>
                              <td className="px-2 py-1.5 font-mono">{r.loteId}</td>
                              <td className="px-2 py-1.5 text-right font-mono">
                                {formatTaxAmount(r.monto)}
                              </td>
                              <td className="px-2 py-1.5 font-mono">{r.fechaLote}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Detalle y lote correspondiente (mock)
                  </p>
                </div>
              </div>
            );
          })()}
        </>
      )}
    </>
  );
}
