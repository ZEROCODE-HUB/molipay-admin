import {
ArrowUpRight,
CheckCircle2,
Eye,
FileUp,
Gavel,
Receipt as ReceiptIcon,
} from "lucide-react";
import { type BatchCredit } from "@/infrastructure/supabase/legacy/types";
import { statusMostrado } from "@/features/payment-links/batches.rules";
import { type ActionItem } from "@/shared/ui/actions-dropdown";

export type BatchRowHandlers = {
  canManage: boolean;
  onDetail: (batch: BatchCredit) => void;
  onUploadCsv: (batch: BatchCredit) => void;
  onCredit: (batch: BatchCredit) => void;
  onReconcile: (batch: BatchCredit) => void;
  onChargeback: () => void;
};

export function batchRowActions(r: BatchCredit, h: BatchRowHandlers): ActionItem[] {
  const base: ActionItem[] = [
    {
      label: r.estado === "Acreditado" ? "Ver liquidación" : "Ver detalle",
      icon: Eye,
      onClick: () => h.onDetail(r),
    },
  ];
  if (r.estado === "Programado") {
    base.push({
      label: "Subir CSV",
      icon: FileUp,
      disabled: !h.canManage,
      onClick: () => h.onUploadCsv(r),
    });
  }
  if (r.estado === "Pendiente" && !r.legacy) {
    base.push({
      label: "Acreditar",
      icon: ArrowUpRight,
      disabled: !h.canManage || !r.elegible,
      onClick: () => {
        if (!h.canManage || !r.elegible) return;
        h.onCredit(r);
      },
    });
    if (r.subestado === "no_conciliado") {
      base.push({
        label: "Conciliar con la recaudadora",
        icon: CheckCircle2,
        disabled: !h.canManage,
        onClick: () => h.onReconcile(r),
      });
    }
  }
  if (statusMostrado(r) === "Contracargo") {
    base.push({
      label: "Ver contracargo",
      icon: Gavel,
      onClick: h.onChargeback,
    });
  }
  return base;
}

/** Boton principal segun estado: Subir CSV, Acreditar, Conciliar o Ver liquidacion. */
export function BatchRowButton({ r, h }: { r: BatchCredit; h: BatchRowHandlers }) {
  if (!h.canManage) return null;
  if (r.estado === "Programado") {
    return (
      <button
        onClick={() => h.onUploadCsv(r)}
        className="h-8 px-3 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-1"
      >
        <FileUp size={13} /> Subir CSV
      </button>
    );
  }
  if (r.estado === "Pendiente" && !r.legacy) {
    if (r.subestado === "no_conciliado") {
      return (
        <button
          onClick={() => h.onReconcile(r)}
          className="h-8 px-3 rounded-md text-xs font-semibold bg-card border text-foreground hover:bg-muted inline-flex items-center gap-1"
          title="Falta verificar que el neto entró a la recaudadora"
        >
          <CheckCircle2 size={13} /> Conciliar
        </button>
      );
    }
    return (
      <button
        onClick={() => h.onCredit(r)}
        disabled={!r.elegible}
        title={r.elegible ? undefined : (r.motivoNoElegible ?? undefined)}
        className="h-8 px-3 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1 disabled:opacity-50"
      >
        <CheckCircle2 size={13} /> Acreditar
      </button>
    );
  }
  if (r.estado === "Acreditado") {
    return (
      <button
        onClick={() => h.onDetail(r)}
        className="h-8 px-3 rounded-md text-xs font-semibold bg-card border text-foreground hover:bg-muted inline-flex items-center gap-1"
      >
        <ReceiptIcon size={13} /> Ver liquidación
      </button>
    );
  }
  return null;
}
