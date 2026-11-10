import { deleteChargeback } from "@/features/payment-links/chargebacks.supabase";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { CheckCircle2, FileText, Gavel, Ticket, XCircle } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { CheckCircleIcon } from "./chargebacks-parts";

import type { ChargebacksDetailVm } from "./use-chargebacks-detail";

const fieldClass =
  "mt-1 w-full rounded-md border bg-background px-3 text-sm disabled:bg-muted/40 disabled:text-muted-foreground";

/** Notas de la disputa y la accion que corresponde a la etapa. */
export function ChargebackManagementSection({
  status,
  canGestionar,
  c,
  ticket,
  setTicket,
  doc,
  setDoc,
  resolucion,
  setResolucion,
  dirtyNotes,
  saveNotes,
  transition,
  onConfirmSimulation,
  saving,
  canDelete,
  askConfirm,
  qc,
  onClose,
}: Pick<
  ChargebacksDetailVm,
  | "status"
  | "canGestionar"
  | "c"
  | "ticket"
  | "setTicket"
  | "doc"
  | "setDoc"
  | "resolucion"
  | "setResolucion"
  | "dirtyNotes"
  | "saveNotes"
  | "transition"
  | "onConfirmSimulation"
  | "saving"
  | "canDelete"
  | "askConfirm"
  | "qc"
  | "onClose"
>) {
  const closed = status === "Cerrado_acreditado" || status === "Cerrado_retenido";
  const mediating = status === "En_mediación";
  const editable = canGestionar && !closed && !c.esSimulacion;

  return (
    <Card className="space-y-3 p-4">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Gavel size={12} /> Gestión de la disputa
      </h4>

      {c.esSimulacion ? (
        <p className="text-sm text-blue-700">
          Simulación: no mueve plata ni lotes hasta que la confirmes.
        </p>
      ) : closed ? (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            status === "Cerrado_acreditado"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {status === "Cerrado_acreditado"
            ? "Ganó el comercio: se le devolvió lo retenido."
            : c.tipo === "devolucion"
              ? "Devuelto al comprador por API de Payway: el descuento quedó definitivo."
              : "Ganó el comprador: el descuento quedó definitivo."}
          {c.resolucion && (
            <p className="mt-1 whitespace-pre-line text-xs opacity-80">{c.resolucion}</p>
          )}
        </div>
      ) : null}

      {!c.esSimulacion && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold">
              <Ticket size={12} /> Ticket Payway
            </label>
            <input
              value={ticket}
              onChange={(e) => setTicket(e.target.value)}
              placeholder="Ej: PW-TKT-88421"
              className={`${fieldClass} h-9 font-mono`}
              disabled={!editable}
            />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold">
              <FileText size={12} /> Notas de la documentación
            </label>
            <input
              value={doc}
              onChange={(e) => setDoc(e.target.value)}
              placeholder="Comprobante, factura, entrega, KYC…"
              className={`${fieldClass} h-9`}
              disabled={!editable}
            />
          </div>
        </div>
      )}

      {editable && (
        <div>
          <label className="text-xs font-semibold">Nota de resolución (opcional)</label>
          <textarea
            value={resolucion}
            onChange={(e) => setResolucion(e.target.value)}
            rows={2}
            placeholder={
              mediating ? "Cómo se resolvió con la marca…" : "Notas al iniciar la mediación…"
            }
            className={`${fieldClass} py-2`}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
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
                void qc.invalidateQueries({ queryKey: ["contracargos"] });
                onClose();
              } catch (e) {
                toast.error(userMessage(e));
              }
            }}
            className="h-9 rounded-md border border-red-200 px-3 text-sm text-red-600"
          >
            Eliminar simulación
          </button>
        )}
        {c.esSimulacion && canGestionar && (
          <button
            type="button"
            onClick={onConfirmSimulation}
            disabled={saving}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm text-white disabled:opacity-50"
          >
            <CheckCircleIcon /> Confirmar simulación
          </button>
        )}

        {editable && dirtyNotes && (
          <button
            type="button"
            onClick={() => void saveNotes()}
            disabled={saving}
            className="h-9 rounded-md border bg-card px-3 text-sm disabled:opacity-50"
          >
            Guardar notas
          </button>
        )}
        {editable && status === "Abierto" && (
          <button
            type="button"
            onClick={() => void transition("En_mediacion")}
            disabled={saving}
            className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Iniciar mediación
          </button>
        )}
        {editable && (
          <>
            <button
              type="button"
              onClick={() => void transition("Cerrado_retenido")}
              disabled={saving}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              <XCircle size={14} /> Perdido
            </button>
            <button
              type="button"
              onClick={() => void transition("Cerrado_acreditado")}
              disabled={saving}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 size={14} /> Ganado
            </button>
          </>
        )}
      </div>
    </Card>
  );
}
