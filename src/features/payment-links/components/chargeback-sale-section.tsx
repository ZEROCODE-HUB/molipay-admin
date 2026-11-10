import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  identifySale,
  listSaleCandidates,
  type Contra,
} from "@/features/payment-links/chargebacks.supabase";
import { useCan } from "@/features/rbac/rbac.hooks";
import { formatDateTime, formatMoney } from "@/shared/lib/format";
import { userMessage } from "@/shared/lib/errors";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

/**
 * Contracargo que llegó en el archivo diario por lote: Payway no dice de qué venta
 * es. El operador la elige entre las del comercio y la marca. La plata ya la cobra
 * el lote negativo; acá solo se identifica la venta.
 */
export function ChargebackSaleSection({ c }: { c: Contra }) {
  const qc = useQueryClient();
  const { can } = useCan();
  const canEdit = can("modificar", "comercios");
  const closed = c.estado === "Cerrado_acreditado" || c.estado === "Cerrado_retenido";
  const [linked, setLinked] = useState<string | null>(c.siteTransactionId);
  const [choosing, setChoosing] = useState(!c.movimientoId);

  const candidates = useQuery({
    queryKey: ["contracargos", "candidatas", c.id],
    queryFn: () => listSaleCandidates(c.id),
    enabled: choosing && !closed,
  });

  const link = useMutation({
    mutationFn: (transactionId: string | null) => identifySale(c.id, transactionId),
    onSuccess: (_, transactionId) => {
      const sale = candidates.data?.find((x) => x.transactionId === transactionId);
      setLinked(transactionId ? (sale?.siteTransactionId ?? transactionId) : null);
      setChoosing(!transactionId);
      toast.success(transactionId ? "Venta identificada" : "Venta quitada");
      void qc.invalidateQueries({ queryKey: ["contracargos"] });
    },
    onError: (e) => toast.error(userMessage(e, "No se pudo identificar la venta")),
  });

  return (
    <Card className="space-y-3 p-4">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Search size={12} /> Venta del contracargo
      </h4>
      <p className="text-xs text-muted-foreground">
        Llegó en el archivo diario como un renglón negativo del lote, sin el número de venta. El
        descuento ya lo cobra ese lote; identificá la venta para poder mediar el reclamo.
      </p>

      {linked && !choosing ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-emerald-50 px-3 py-2 text-sm">
          <span className="flex items-center gap-1.5 text-emerald-800">
            <CheckCircle2 size={14} /> Venta <span className="font-mono">{linked}</span>
          </span>
          {canEdit && !closed && (
            <BtnOutline className="h-8 px-2 text-xs" onClick={() => setChoosing(true)}>
              Cambiar
            </BtnOutline>
          )}
        </div>
      ) : closed ? (
        <p className="text-sm text-muted-foreground">Cerrado sin venta identificada.</p>
      ) : candidates.isPending ? (
        <div className="h-16 animate-pulse rounded-md bg-muted" />
      ) : candidates.isError ? (
        <p className="text-sm text-red-700">{userMessage(candidates.error)}</p>
      ) : (candidates.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay ventas del comercio de esa marca por {formatMoney(c.importe)} o más, sin otro
          contracargo, hasta la fecha del lote.
        </p>
      ) : (
        <div className="max-h-64 divide-y overflow-auto rounded-md border text-sm">
          {(candidates.data ?? []).map((s) => (
            <div
              key={s.transactionId}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{formatMoney(s.monto)}</span>
                  {s.exacto && <Badge tone="success">Mismo importe</Badge>}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {formatDateTime(s.fecha)} · {s.bandera ?? "—"} ·{" "}
                  <span className="font-mono">
                    {s.siteTransactionId ?? s.transactionId.slice(0, 8)}
                  </span>
                  {s.loteCodigo && (
                    <>
                      {" "}
                      · lote {s.loteCodigo} ({s.loteEstado})
                    </>
                  )}
                </div>
              </div>
              {canEdit && (
                <BtnOutline
                  className="h-8 shrink-0 px-2 text-xs"
                  disabled={link.isPending}
                  onClick={() => link.mutate(s.transactionId)}
                >
                  Es esta
                </BtnOutline>
              )}
            </div>
          ))}
        </div>
      )}

      {choosing && linked && canEdit && !closed && (
        <div className="flex gap-2">
          <BtnOutline className="h-8 px-2 text-xs" onClick={() => setChoosing(false)}>
            Mantener la actual
          </BtnOutline>
          <BtnOutline
            className="h-8 px-2 text-xs"
            disabled={link.isPending}
            onClick={() => link.mutate(null)}
          >
            Quitar la venta
          </BtnOutline>
        </div>
      )}
    </Card>
  );
}
