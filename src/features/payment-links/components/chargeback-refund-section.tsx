import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  listRefunds,
  requestRefund,
  type Contra,
  type Refund,
} from "@/features/payment-links/chargebacks.supabase";
import { useCan } from "@/features/rbac/rbac.hooks";
import { formatDateTime, formatMoney } from "@/shared/lib/format";
import { userMessage } from "@/shared/lib/errors";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { useConfirm } from "@/shared/ui/confirm-provider";
import { Input } from "@/shared/ui/form-controls";

const STATUS: Record<
  Refund["estado"],
  { label: string; tone: "success" | "warn" | "danger" | "neutral" }
> = {
  solicitada: { label: "Pedida", tone: "neutral" },
  enviada: { label: "Enviada a Payway", tone: "warn" },
  incierta: { label: "Sin respuesta de Payway", tone: "warn" },
  aprobada: { label: "Aprobada", tone: "success" },
  rechazada: { label: "Rechazada", tone: "danger" },
};

/**
 * Devolucion al comprador por la API de Payway (POST /payments/{id}/refunds).
 * Con el contracargo abierto, la devolucion lo cierra perdido: el comercio ya
 * paga por la retencion del contracargo y no se le cobra dos veces.
 */
export function ChargebackRefundSection({ c }: { c: Contra }) {
  const qc = useQueryClient();
  const askConfirm = useConfirm();
  const { can } = useCan();
  const open = c.estado === "Abierto" || c.estado === "En_mediación";
  const canRefund = can("modificar", "comercios") && open;
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const refunds = useQuery({
    queryKey: ["contracargos", "devoluciones", c.pagoId],
    queryFn: () => listRefunds(c.pagoId),
  });
  const pending = (refunds.data?.devoluciones ?? []).some((d) =>
    ["solicitada", "enviada", "incierta"].includes(d.estado),
  );
  const left = Math.max(0, (refunds.data?.montoVenta ?? 0) - (refunds.data?.devuelto ?? 0));

  const send = useMutation({
    mutationFn: (monto: number | null) =>
      requestRefund({ pagoId: c.pagoId, contraId: c.id, monto, motivo: reason.trim() }),
    onSuccess: (r) => {
      const d = r.detalle;
      const description = d
        ? [
            `${d.total ? "Total" : "Parcial"} · ${formatMoney(d.monto)} · pago Payway ${d.paywayPaymentId}`,
            d.refundId && `ID de devolución: ${d.refundId}`,
            d.paywayStatus && `Estado Payway: ${d.paywayStatus}`,
            d.motivo && `Motivo: ${d.motivo}`,
            d.requestId && `Ref.: ${d.requestId}`,
          ]
            .filter(Boolean)
            .join("\n")
        : undefined;
      const opts = { description, duration: 10000, className: "whitespace-pre-line" };
      if (r.estado === "aprobada") toast.success(r.message || "Devolución aprobada por Payway", opts);
      else if (r.estado === "rechazada") toast.error(r.message || "Payway rechazó la devolución", opts);
      else toast.warning(r.message || "Payway no respondió: se confirma sola", opts);
      setAmount("");
      setReason("");
    },
    onError: (e) => toast.error(userMessage(e, "No se pudo pedir la devolución")),
    onSettled: () => void qc.invalidateQueries({ queryKey: ["contracargos"] }),
  });

  const submit = async () => {
    const raw = amount.trim().replace(/\./g, "").replace(",", ".");
    const monto = raw ? Number(raw) : null;
    if (monto != null && (!Number.isFinite(monto) || monto <= 0 || monto > left)) {
      toast.error(`Ingresá un monto entre $0,01 y ${formatMoney(left)}`);
      return;
    }
    if (!reason.trim()) {
      toast.error("Indicá el motivo de la devolución");
      return;
    }
    const ok = await askConfirm({
      title: "Devolver al comprador",
      message:
        `Se le devuelven ${formatMoney(monto ?? left)} al comprador por la API de Payway y el contracargo queda cerrado perdido. ` +
        "Ojo: el banco también le reintegra por el contracargo; si Payway descuenta las dos cosas, se paga dos veces. Esto no se puede deshacer.",
      confirmLabel: "Devolver",
      variant: "danger",
    });
    if (ok) send.mutate(monto);
  };

  return (
    <Card className="space-y-3 p-4">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <RotateCcw size={12} /> Devolución al comprador
      </h4>

      {refunds.isPending ? (
        <div className="h-10 animate-pulse rounded-md bg-muted" />
      ) : refunds.isError ? (
        <p className="text-sm text-red-700">{userMessage(refunds.error)}</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Venta {formatMoney(refunds.data.montoVenta)} · devuelto{" "}
            {formatMoney(refunds.data.devuelto)}
          </p>
          {refunds.data.devoluciones.length > 0 && (
            <ul className="divide-y rounded-md border text-sm">
              {refunds.data.devoluciones.map((d) => (
                <li key={d.id} className="flex items-start justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <div className="font-mono font-semibold">{formatMoney(d.monto)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(d.createdAt)} ·{" "}
                      {d.origen === "payway" ? "Informada por Payway" : d.motivo}
                    </div>
                    {d.error && <div className="text-xs text-red-700">{d.error}</div>}
                  </div>
                  <Badge tone={STATUS[d.estado].tone}>{STATUS[d.estado].label}</Badge>
                </li>
              ))}
            </ul>
          )}

          {canRefund && !pending && left > 0 && (
            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Total (${formatMoney(left)})`}
                  inputMode="decimal"
                  className="h-9 text-sm sm:w-44"
                  aria-label="Monto a devolver"
                />
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Motivo"
                  className="h-9 flex-1 text-sm"
                  aria-label="Motivo de la devolución"
                />
                <BtnOutline
                  className="h-9 shrink-0 px-3 text-xs"
                  disabled={send.isPending}
                  onClick={() => void submit()}
                >
                  {send.isPending ? "Enviando…" : "Devolver"}
                </BtnOutline>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Vacío devuelve el total. El contracargo se cierra perdido y el comercio no paga dos
                veces.
              </p>
            </div>
          )}
          {pending && (
            <p className="text-xs text-amber-700">
              Hay una devolución esperando a Payway: se confirma sola cuando el polling consulta el
              pago.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
