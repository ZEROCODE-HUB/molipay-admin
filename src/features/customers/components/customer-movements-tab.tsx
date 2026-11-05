import { formatMoney } from "@/shared/lib/format";
import { MovementsLinesTable } from "@/features/movements/components/movement-lines-table";

import type { CustomerDetailPageVm } from "./use-customer-detail-page";

export function CustomerMovementsTab({
  activeTab,
  balanceAvailable,
  subaccountsQuery,
  balanceHeld,
  customer,
}: Pick<
  CustomerDetailPageVm,
  "activeTab" | "balanceAvailable" | "subaccountsQuery" | "balanceHeld" | "customer"
>) {
  return (
    <>
      {activeTab === "movimientos" && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Saldo disponible
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {formatMoney(balanceAvailable)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {subaccountsQuery.data?.length ?? 0} subcuenta(s)
                {subaccountsQuery.isLoading ? " (cargando…)" : ""}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Saldo retenido
              </p>
              <p
                className={`mt-2 text-2xl font-semibold tabular-nums ${balanceHeld > 0 ? "text-amber-700" : ""}`}
              >
                {formatMoney(balanceHeld)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Depósitos retenidos por bloqueos y reservas en curso
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Saldo total
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {formatMoney(balanceAvailable + balanceHeld)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Disponible + retenido</p>
            </div>
          </div>
          <MovementsLinesTable legajo={customer.legajo} embedded />
        </div>
      )}
    </>
  );
}
