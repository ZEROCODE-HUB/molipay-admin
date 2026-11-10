import {
  addAttachment,
  confirmSimulation,
  getContra,
  quitarAttachment,
  sendAPayway,
  type Contra,
  type StatusContra,
  updateChargeback,
} from "@/features/payment-links/chargebacks.supabase";
import { useConfirm } from "@/shared/ui/confirm-provider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/features/rbac/rbac.hooks";
import { useRef, useState } from "react";
import {
  QK_ACRED,
  changeStatusChargeback,
  getChargebackRecupero,
} from "@/features/payment-links/credits.supabase";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { formatMoney } from "@/shared/lib/format";
import { getAttachmentSignedUrl } from "@/features/payment-links/chargeback-storage";

/** Cierre de la disputa: lo que significa para el comercio. */
const CLOSE_TEXT: Record<
  "Cerrado_acreditado" | "Cerrado_retenido",
  { title: string; message: string }
> = {
  Cerrado_acreditado: {
    title: "Ganó el comercio",
    message:
      "La disputa se resuelve a favor del comercio: se le devuelve lo retenido y se anula la deuda que no se haya recuperado. Si Payway ya lo había descontado, el reintegro llega en una liquidación posterior.",
  },
  Cerrado_retenido: {
    title: "Ganó el comprador",
    message: "El descuento queda definitivo: lo retenido al comercio no se devuelve.",
  },
};

/** Estado y acciones del detalle de un contracargo: el componente solo dibuja. */
export function useChargebacksDetail({ c: initial, onClose }: { c: Contra; onClose: () => void }) {
  const askConfirm = useConfirm();
  const qc = useQueryClient();
  const { can } = useCan();
  const canGestionar = can("modificar", "comercios");
  const canDelete = can("borrar", "comercios");

  // El detalle se lee del servidor: despues de una devolucion o un cambio de
  // estado se ve lo que quedo guardado, no la fila con la que se abrio.
  const fresh = useQuery({
    queryKey: ["contracargos", "detalle", initial.id],
    queryFn: () => getContra(initial.id),
    initialData: initial,
  });
  const c = fresh.data ?? initial;
  const status: StatusContra = c.estado;

  const [ticket, setTicket] = useState(initial.ticketPayway ?? "");
  const [doc, setDoc] = useState(initial.documentacion ?? "");
  const [resolucion, setResolucion] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const files = c.archivosAdjuntos;

  // Donde se desconto y si se recupero (vista v_contracargos_recupero).
  const recupero = useQuery({
    queryKey: [...QK_ACRED, "contracargo-recupero", c.id],
    queryFn: () => getChargebackRecupero(c.id),
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["contracargos"] });
    void qc.invalidateQueries({ queryKey: [...QK_ACRED, "contracargo-recupero", c.id] });
    void qc.invalidateQueries({ queryKey: ["lotes"] });
    void qc.invalidateQueries({ queryKey: ["lote-movimientos"] });
  };

  const dirtyNotes = ticket !== (c.ticketPayway ?? "") || doc !== (c.documentacion ?? "");

  const saveNotes = async () => {
    setSaving(true);
    try {
      await updateChargeback(c.id, { ticketPayway: ticket || null, documentacion: doc || null });
      toast.success("Notas guardadas");
      refresh();
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setSaving(false);
    }
  };

  /** Avanza la disputa. La plata la mueve la base (contracargo_cambiar_estado). */
  const transition = async (next: "En_mediacion" | "Cerrado_acreditado" | "Cerrado_retenido") => {
    if (next !== "En_mediacion") {
      const ok = await askConfirm({
        title: CLOSE_TEXT[next].title,
        message: `${CLOSE_TEXT[next].message} Contracargo de ${formatMoney(c.importe)}. No se puede deshacer.`,
        confirmLabel: "Cerrar contracargo",
        variant: next === "Cerrado_retenido" ? "danger" : "default",
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      if (dirtyNotes) {
        await updateChargeback(c.id, { ticketPayway: ticket || null, documentacion: doc || null });
      }
      await changeStatusChargeback(c.id, next, resolucion.trim() || undefined);
      setResolucion("");
      toast.success(next === "En_mediacion" ? "Mediación iniciada" : "Contracargo cerrado");
      refresh();
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const onConfirmSimulation = async () => {
    setSaving(true);
    try {
      const actualizado = await confirmSimulation(c.id);
      toast.success(
        actualizado.loteSugeridoId
          ? "Contracargo abierto. Se retiene al acreditar el lote de la venta (o del saldo si ya se acreditó)."
          : "Contracargo abierto. Sin venta vinculada: se descuenta cuando llegue en la liquidación de Payway.",
      );
      refresh();
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const onSubirFile = async (file: File) => {
    setUploading(true);
    try {
      await addAttachment(c, file);
      refresh();
      toast.success("Archivo adjunto");
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const onQuitarFile = async (path: string) => {
    if (
      !(await askConfirm({
        title: "Quitar archivo",
        message: "¿Quitar este archivo?",
        confirmLabel: "Quitar",
        variant: "danger",
      }))
    )
      return;
    try {
      await quitarAttachment(c, path);
      refresh();
    } catch (e) {
      toast.error(userMessage(e));
    }
  };

  const onSendPayway = async () => {
    try {
      await sendAPayway(c.id);
      toast.success("Marcado como enviado a PayWay");
      refresh();
    } catch (e) {
      toast.error(userMessage(e));
    }
  };

  const onVerFile = async (path: string) => {
    try {
      const url = await getAttachmentSignedUrl(path);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(userMessage(e));
    }
  };

  return {
    c,
    onClose,
    askConfirm,
    qc,
    canGestionar,
    canDelete,
    status,
    ticket,
    setTicket,
    doc,
    setDoc,
    resolucion,
    setResolucion,
    dirtyNotes,
    saving,
    files,
    uploading,
    fileInputRef,
    recupero,
    saveNotes,
    transition,
    onConfirmSimulation,
    onSubirFile,
    onQuitarFile,
    onSendPayway,
    onVerFile,
  };
}

export type ChargebacksDetailVm = ReturnType<typeof useChargebacksDetail>;
