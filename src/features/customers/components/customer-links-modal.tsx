import { Inbox } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { formatMoney } from "@/shared/lib/format";
import { ModalDialog } from "@/shared/ui/modal-dialog";

import type { CustomerDetailPageVm } from "./use-customer-detail-page";

export function CustomerLinksModal({
  linksOpen,
  setLinksOpen,
  linksPaymentQuery,
  linksPayment,
}: Pick<
  CustomerDetailPageVm,
  "linksOpen" | "setLinksOpen" | "linksPaymentQuery" | "linksPayment"
>) {
  return (
    <ModalDialog
      open={linksOpen}
      onClose={() => setLinksOpen(false)}
      title="Links de pago"
      description="Comercios vinculados y sus links de pago."
    >
      {linksPaymentQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : linksPayment.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-8 text-sm text-muted-foreground">
          <Inbox size={22} />
          <p>Sin links de pago vinculados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {linksPayment.map((l) => (
            <div key={l.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{l.comercio_nombre}</span>
                {l.estado && (
                  <Badge tone={l.estado === "Activo" ? "success" : "neutral"}>{l.estado}</Badge>
                )}
              </div>
              {l.url && (
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-xs font-medium text-primary break-all"
                >
                  {l.url}
                </a>
              )}
              {l.monto != null && (
                <p className="mt-1 text-xs text-muted-foreground">Monto: {formatMoney(l.monto)}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </ModalDialog>
  );
}
