import { Modal } from "@/shared/ui/modal";
import { type Exemption } from "@/features/taxes/exemptions.supabase";
import { X } from "lucide-react";
import { BtnOutline } from "@/shared/ui/button";
import { Field,SituacionBadge } from "./debits-credits-parts";
import { dateHour,openCertificate } from "@/features/taxes/debits-credits.rules";

export function DetailExemption({ e, onClose }: { e: Exemption; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} size="custom" className="max-w-2xl">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b px-6 py-4 flex justify-between items-start">
          <div>
            <h3 className="font-display text-lg font-semibold">
              Exención {e.impuestoCodigo} · {e.direccion}
            </h3>
            <p className="text-sm text-muted-foreground">
              {e.clienteNombre ?? "Sin cliente vinculado"} ·{" "}
              <span className="font-mono">{e.cuit}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Field label="Estado">
            <SituacionBadge e={e} />
          </Field>
          <Field label="Impuesto">
            {e.impuestoNombre}{" "}
            <span className="font-mono text-xs text-muted-foreground">({e.impuestoCodigo})</span>
          </Field>
          <Field label="Tipo">{e.tipo}</Field>
          <Field label="Dirección">{e.direccion}</Field>
          <Field label="Vigencia desde">{dateHour(e.desde)}</Field>
          <Field label="Vigencia hasta">{e.hasta ? dateHour(e.hasta) : "Sin vencimiento"}</Field>
          <Field label="Cliente">
            {e.clienteLegajo ? <span className="font-mono">{e.clienteLegajo}</span> : "—"}
          </Field>
          <Field label="Email">{e.email ?? "—"}</Field>
          <Field label="Código de autorización">{e.codigoAutorizacion ?? "—"}</Field>
          <Field label="Certificado">
            {e.certificado ? (
              <button
                type="button"
                className="text-primary underline"
                onClick={() => openCertificate(e.certificado!)}
              >
                Ver certificado
              </button>
            ) : (
              "—"
            )}
          </Field>
          <div className="sm:col-span-2">
            <Field label="Motivo">{e.motivo ?? "—"}</Field>
          </div>
          <Field label="Alta">{dateHour(e.createdAt)}</Field>
          <Field label="Actualización">{dateHour(e.updatedAt)}</Field>
          {e.bajaAt && (
            <div className="sm:col-span-2">
              <Field label="Baja">
                {dateHour(e.bajaAt)} · {e.bajaMotivo}
              </Field>
            </div>
          )}
        </div>
        <div className="border-t px-6 py-3 flex justify-end">
          <BtnOutline onClick={onClose}>Cerrar</BtnOutline>
        </div>
      </div>
    </Modal>
  );
}
