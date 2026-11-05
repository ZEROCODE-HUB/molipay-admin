import { Ban } from "lucide-react";
import { FieldGrid,KpiCard,SectionCard } from "./customer-detail-parts";

import type { CustomerDetailPageVm } from "./use-customer-detail-page";

export function CustomerIdentificationTab({
  activeTab,
  subaccountsQuery,
  feesQuery,
  taxesQuery,
  documentsSummaryQuery,
  validationsQuery,
  compliance,
  setExemptionOpen,
  personal,
}: Pick<
  CustomerDetailPageVm,
  | "activeTab"
  | "subaccountsQuery"
  | "feesQuery"
  | "taxesQuery"
  | "documentsSummaryQuery"
  | "validationsQuery"
  | "compliance"
  | "setExemptionOpen"
  | "personal"
>) {
  return (
    <>
      {activeTab === "identificacion" && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SectionCard title="Resumen de productos">
              <ul className="space-y-1.5">
                <li className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Cuentas bancarias</span>
                  <span className="font-semibold tabular-nums">
                    {subaccountsQuery.data ? subaccountsQuery.data.length : "—"}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">CVUs</span>
                  <span className="font-semibold tabular-nums">
                    {subaccountsQuery.data?.length ?? "—"}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Comisiones</span>
                  <span className="font-semibold tabular-nums">
                    {feesQuery.data ? feesQuery.data.length : "—"}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Impuestos</span>
                  <span className="font-semibold tabular-nums">{taxesQuery.rows.length}</span>
                </li>
              </ul>
            </SectionCard>

            <KpiCard
              label="Documentos cargados"
              value={String(documentsSummaryQuery.data?.length ?? 0)}
            />
            <KpiCard
              label="Validaciones auto KYC"
              value={String(validationsQuery.data?.length ?? 0)}
            />
            <KpiCard
              label="PEP"
              value={compliance.find((c) => c.label === "PEP")?.valor ?? "No"}
              tone="muted"
            />
          </div>

          <SectionCard
            title="Identificación"
            actions={
              <button
                type="button"
                onClick={() => setExemptionOpen(true)}
                className="inline-flex items-center gap-1.5 h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
              >
                <Ban size={13} /> Eximir créditos
              </button>
            }
          >
            <FieldGrid campos={personal} />
          </SectionCard>
        </>
      )}
    </>
  );
}
