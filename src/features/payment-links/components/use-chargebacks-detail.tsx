import {
addAttachment,
confirmSimulation,
quitarAttachment,
sendAPayway,
statusUiToDb,
type Contra,
type StatusContra,
updateChargeback,
} from "@/features/payment-links/chargebacks.supabase";
import { useConfirm } from "@/shared/ui/confirm-provider";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/features/rbac/rbac.hooks";
import { useRef,useState } from "react";
import {
QK_ACRED,
changeStatusChargeback,
listChargebacksRecupero,
} from "@/features/payment-links/credits.supabase";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { getAttachmentSignedUrl } from "@/features/payment-links/chargeback-storage";

/** Estado y acciones de ChargebacksDetail: el componente solo dibuja. */
export function useChargebacksDetail({ c, onClose }: { c: Contra; onClose: () => void }) {
  const askConfirm = useConfirm();
  const qc = useQueryClient();
  const { can } = useCan();
  const canGestionar = can("modificar", "comercios");
  const canDelete = can("borrar", "comercios");

  const [status, setStatus] = useState<StatusContra>(c.estado);
  const [ticket, setTicket] = useState(c.ticketPayway ?? "");
  const [doc, setDoc] = useState(c.documentacion ?? "");
  const [resolucion, setResolucion] = useState(c.resolucion ?? "");
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState(c.archivosAdjuntos);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Donde se desconto y si se recupero (vista v_contracargos_recupero).
  const recupero = useQuery({
    queryKey: [...QK_ACRED, "contracargo-recupero", c.id],
    queryFn: async () => (await listChargebacksRecupero()).find((x) => x.id === c.id) ?? null,
  });

  const save = async () => {
    setSaving(true);
    try {
      // El dinero no se mueve aca: el descuento llega por el renglon negativo
      // del archivo de Payway. Descontarlo ademas a mano lo cobraba dos veces.
      // Los cambios de estado de la mediacion pasan por la RPC.
      const change = status !== c.estado;
      if (change && status !== "Simulado" && c.estado !== "Simulado") {
        await changeStatusChargeback(c.id, statusUiToDb(status), resolucion || undefined);
        await updateChargeback(c.id, {
          ticketPayway: ticket || null,
          documentacion: doc || null,
        });
      } else {
        await updateChargeback(c.id, {
          estado: status,
          ticketPayway: ticket || null,
          documentacion: doc || null,
          resolucion: resolucion || null,
          esSimulacion: status === "Simulado",
        });
      }
      toast.success("Contracargo actualizado");
      qc.invalidateQueries({ queryKey: ["contracargos"] });
      qc.invalidateQueries({ queryKey: ["lotes"] });
      onClose();
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
      qc.invalidateQueries({ queryKey: ["contracargos"] });
      onClose();
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const onSubirFile = async (file: File) => {
    setUploading(true);
    try {
      const r = await addAttachment(c, file);
      setFiles(r.contra.archivosAdjuntos);
      qc.invalidateQueries({ queryKey: ["contracargos"] });
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
      const actualizado = await quitarAttachment(c, path);
      setFiles(actualizado.archivosAdjuntos);
      qc.invalidateQueries({ queryKey: ["contracargos"] });
    } catch (e) {
      toast.error(userMessage(e));
    }
  };

  const onSendPayway = async () => {
    try {
      const r = await sendAPayway(c.id);
      toast.success("Marcado como enviado a PayWay");
      qc.invalidateQueries({ queryKey: ["contracargos"] });
      // refrescar el modal: re-leemos del server
      qc.setQueryData(["contracargos"], (old: unknown) => old); // noop, sólo para forzar re-render abajo
      onClose();
      // Reabrimos con el contra actualizado
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["contracargos"] });
      }, 100);
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
    setStatus,
    ticket,
    setTicket,
    doc,
    setDoc,
    resolucion,
    setResolucion,
    saving,
    files,
    uploading,
    fileInputRef,
    recupero,
    save,
    onConfirmSimulation,
    onSubirFile,
    onQuitarFile,
    onSendPayway,
    onVerFile,
  };
}

export type ChargebacksDetailVm = ReturnType<typeof useChargebacksDetail>;
