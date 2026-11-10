import { useState } from "react";
import { toast } from "sonner";
import { resolverExcepciones } from "@/features/payment-links/credits.supabase";
import { MerchantPicker, errMsg } from "@/features/payment-links/components/credits-common";
import { FormDialog } from "@/shared/ui/form-dialog";
import { type Action } from "@/features/payment-links/exceptions.types";

export function ResolverDialog({
  dialogo: dialog,
  onClose,
  onHecho,
}: {
  dialogo: { accion: Action; ids: string[] } | null;
  onClose: () => void;
  onHecho: () => void;
}) {
  const [merchant, setMerchant] = useState("");
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const action = dialog?.accion;
  const title =
    action === "asignar"
      ? "Asignar comercio"
      : action === "no_corresponde"
        ? "Marcar como «No corresponde a MoliPay»"
        : "Aceptar diferencia con las ventas";

  const send = async () => {
    if (!dialog) return;
    if (action === "asignar" && !merchant) {
      toast.error("Elegí el comercio.");
      return;
    }
    if (action !== "asignar" && reason.trim().length < 3) {
      toast.error("El motivo es obligatorio.");
      return;
    }
    setSending(true);
    try {
      const r = await resolverExcepciones({
        ids: dialog.ids,
        accion: dialog.accion,
        comercioId: merchant || null,
        motivo: reason.trim() || null,
      });
      toast.success(
        action === "asignar"
          ? `${r.resueltos} renglón(es) asignado(s). Se crearon ${r.lotes_creados.length} lote(s) Pendiente.`
          : `${r.resueltos} renglón(es) resuelto(s).`,
      );
      setMerchant("");
      setReason("");
      onHecho();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <FormDialog
      open={!!dialog}
      onClose={onClose}
      title={title}
      description={`${dialog?.ids.length ?? 0} renglón(es) seleccionado(s).`}
      onSubmit={() => void send()}
      submitLabel="Confirmar"
      isSubmitting={sending}
    >
      <div className="space-y-3">
        {action === "asignar" && (
          <>
            <MerchantPicker
              value={merchant}
              onChange={(id) => setMerchant(id)}
              allowEmpty={false}
            />
            <p className="text-[11px] text-muted-foreground">
              El establecimiento queda guardado en la ficha del comercio: la próxima importación lo
              reconoce sola.
            </p>
          </>
        )}
        <div>
          <label className="text-xs font-semibold mb-1.5 block">
            Motivo {action === "asignar" ? "(opcional)" : "(obligatorio)"}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder={
              action === "aceptar" ? "Ej.: devolución neteada en el día, confirmada con Payway" : ""
            }
          />
        </div>
      </div>
    </FormDialog>
  );
}
