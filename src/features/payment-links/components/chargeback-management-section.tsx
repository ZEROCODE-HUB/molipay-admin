import { Select } from "@/shared/ui/form-controls";
import { deleteChargeback,type StatusContra } from "@/features/payment-links/chargebacks.supabase";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { FileText,Ticket } from "lucide-react";
import { formatMoney } from "@/shared/lib/format";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Link } from "@tanstack/react-router";
import { CheckCircleIcon } from "./chargebacks-parts";
import { STATUS_LABEL,STATUS_OPTIONS_UI } from "@/features/payment-links/chargebacks.rules";

import type { ChargebacksDetailVm } from "./use-chargebacks-detail";

export function ChargebackManagementSection({
  status,
  setStatus,
  canGestionar,
  c,
  recupero,
  ticket,
  setTicket,
  doc,
  setDoc,
  resolucion,
  setResolucion,
  onConfirmSimulation,
  saving,
  canDelete,
  askConfirm,
  qc,
  onClose,
  save,
}: Pick<
  ChargebacksDetailVm,
  | "status"
  | "setStatus"
  | "canGestionar"
  | "c"
  | "recupero"
  | "ticket"
  | "setTicket"
  | "doc"
  | "setDoc"
  | "resolucion"
  | "setResolucion"
  | "onConfirmSimulation"
  | "saving"
  | "canDelete"
  | "askConfirm"
  | "qc"
  | "onClose"
  | "save"
>) {
  return (
    <Card className="p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Gestión
      </h4>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold">Estado</label>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusContra)}
            className="mt-1"
            disabled={!canGestionar}
          >
            {STATUS_OPTIONS_UI.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
          {status === "En_mediación" && !c.fechaLimite && (
            <p className="text-xs text-muted-foreground mt-1">
              Al guardar se calculará el plazo (10 días hábiles).
            </p>
          )}
          {status === "Simulado" && (
            <p className="text-xs text-blue-600 mt-1">Simulación — sin impacto en caja ni lotes.</p>
          )}
          {status === "Cerrado_retenido" && (
            <p className="text-xs text-muted-foreground mt-1">
              Gana el comprador. El importe ya lo descontó Payway en su liquidación (renglón
              negativo del archivo): no se descuenta de nuevo.
            </p>
          )}
        </div>

        {recupero.data && (
          <div className="rounded-md border px-3 py-2 text-xs space-y-0.5">
            <div className="font-semibold">Descuento y recupero</div>
            <div>
              Estado:{" "}
              <Badge
                tone={
                  recupero.data.estado_recupero === "Recuperado" ||
                  recupero.data.estado_recupero === "Descontado" ||
                  recupero.data.estado_recupero === "Liberado"
                    ? "success"
                    : recupero.data.estado_recupero === "Pendiente de recuperar"
                      ? "danger"
                      : recupero.data.estado_recupero === "Retención programada" ||
                          recupero.data.estado_recupero === "Retenido"
                        ? "warn"
                        : "neutral"
                }
              >
                {recupero.data.estado_recupero}
              </Badge>
            </div>
            {recupero.data.lote_venta_codigo && (
              <div>
                Lote de la venta:{" "}
                <span className="font-mono">{recupero.data.lote_venta_codigo}</span>
                {recupero.data.lote_venta_estado ? ` (${recupero.data.lote_venta_estado})` : ""}
              </div>
            )}
            {recupero.data.retencion_estado === "pendiente" && (
              <div className="text-amber-700">
                Se retiene {formatMoney(c.importe)} al acreditar el lote de la venta.
              </div>
            )}
            {recupero.data.retenido_monto > 0 && (
              <div>
                Retenido al comercio: {formatMoney(recupero.data.retenido_monto)}
                {recupero.data.retencion_lote_codigo
                  ? ` (lote ${recupero.data.retencion_lote_codigo})`
                  : " (del saldo)"}
              </div>
            )}
            {recupero.data.retencion_estado === "aplicado_payway" && (
              <div className="text-muted-foreground">
                Lo retenido cubrió el descuento que hizo Payway: no se cobró dos veces.
              </div>
            )}
            {recupero.data.retencion_estado === "liberado" && (
              <div className="text-emerald-700">
                Resuelto a favor del comercio: se le devolvió lo retenido.
              </div>
            )}
            <div>
              Lote donde se descontó:{" "}
              {recupero.data.lote_descuento_id ? (
                <Link
                  to="/admin/comercios/link-pago/lotes"
                  search={{ lote: recupero.data.lote_descuento_id }}
                  className="font-mono text-primary hover:underline"
                >
                  {recupero.data.lote_descuento_codigo}
                </Link>
              ) : (
                "todavía no llegó en el archivo de Payway"
              )}
            </div>
            {recupero.data.pendiente_recuperar > 0 && (
              <div>Pendiente de recuperar: {formatMoney(recupero.data.pendiente_recuperar)}</div>
            )}
          </div>
        )}

        <div>
          <label className="text-xs font-semibold flex items-center gap-1">
            <Ticket size={12} /> Ticket PayWay
          </label>
          <input
            value={ticket}
            onChange={(e) => setTicket(e.target.value)}
            placeholder="Ej: PW-TKT-88421"
            className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm font-mono"
            disabled={!canGestionar}
          />
        </div>
        <div>
          <label className="text-xs font-semibold flex items-center gap-1">
            <FileText size={12} /> Documentación (notas)
          </label>
          <textarea
            value={doc}
            onChange={(e) => setDoc(e.target.value)}
            rows={3}
            placeholder="Comprobante, factura, KYC, entrega…"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            disabled={!canGestionar}
          />
        </div>
        <div>
          <label className="text-xs font-semibold">Resolución</label>
          <textarea
            value={resolucion}
            onChange={(e) => setResolucion(e.target.value)}
            rows={2}
            placeholder="Cómo se resolvió…"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            disabled={!canGestionar}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          {c.esSimulacion && canGestionar && (
            <button
              type="button"
              onClick={onConfirmSimulation}
              disabled={saving}
              className="h-9 px-3 rounded-md bg-blue-600 text-white text-sm inline-flex items-center gap-1.5"
            >
              <CheckCircleIcon /> Confirmar simulación
            </button>
          )}
          {c.esSimulacion && canDelete && (
            <button
              type="button"
              onClick={async () => {
                if (
                  !(await askConfirm({
                    title: "Eliminar simulación",
                    message: "¿Eliminar esta simulación?",
                    confirmLabel: "Eliminar",
                    variant: "danger",
                  }))
                )
                  return;
                try {
                  await deleteChargeback(c.id);
                  qc.invalidateQueries({ queryKey: ["contracargos"] });
                  onClose();
                } catch (e) {
                  toast.error(userMessage(e));
                }
              }}
              className="h-9 px-3 rounded-md border border-red-200 text-red-600 text-sm"
            >
              Eliminar simulación
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3 rounded-md border bg-card text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !canGestionar}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {saving && (
              <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            Guardar
          </button>
        </div>
      </div>
    </Card>
  );
}
