import { type Brand } from "@/features/merchants/card-brands.supabase";
import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/shared/ui/modal";
import { X } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { type MethodPaymentForm } from "@/features/merchants/payment-methods.types";
import { KINDS_METHOD,STATUSES } from "@/features/merchants/payment-methods.rules";

export function MethodPaymentModal({
  metodo: method,
  onClose,
  onSave,
  onDelete,
}: {
  metodo: Brand | null;
  onClose: () => void;
  onSave: (m: MethodPaymentForm) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(method?.nombre ?? "");
  const [kind, setKind] = useState(method?.tipo ?? KINDS_METHOD[0]);
  const [daysHabiles, setDaysHabiles] = useState(method?.diasHabilesAcreditacion ?? 1);
  const [status, setStatus] = useState(method?.estado ?? "Activo");

  const save = () => {
    if (name.trim() === "") {
      toast.error("El nombre es requerido");
      return;
    }
    onSave({
      id: method?.id,
      nombre: name.trim(),
      tipo: kind,
      diasHabiles: daysHabiles,
      estado: status,
    });
  };

  return (
    <Modal open onClose={onClose} size="custom" className="max-w-3xl">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex justify-between items-start z-10">
          <div>
            <h3 className="font-display text-lg font-semibold">
              {method ? "Editar método de pago" : "Crear método de pago"}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {method
                ? `Configuración del método de pago "${method.nombre}".`
                : "Complete los datos del nuevo método de pago."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Información general
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-4">
              <div>
                <Label htmlFor="mp-id">ID</Label>
                <Input id="mp-id" value={method?.id ?? "—"} readOnly className="bg-muted" />
              </div>
              <div>
                <Label htmlFor="mp-nombre">Nombre</Label>
                <Input
                  id="mp-nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Visa Débito"
                />
              </div>
              <div>
                <Label htmlFor="mp-tipo">Tipo</Label>
                <Select id="mp-tipo" value={kind} onChange={(e) => setKind(e.target.value)}>
                  {KINDS_METHOD.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="mp-dias">Días hábiles acreditación</Label>
                <Input
                  id="mp-dias"
                  type="number"
                  min={1}
                  value={daysHabiles}
                  onChange={(e) => setDaysHabiles(Number(e.target.value))}
                />
              </div>
            </div>
            {method && (
              <div className="mt-4">
                <Label htmlFor="mp-estado">Estado</Label>
                <Select
                  id="mp-estado"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as typeof status)}
                >
                  {STATUSES.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </Card>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex justify-between gap-2">
          <div>
            {method && onDelete && (
              <BtnOutline type="button" onClick={onDelete} className="text-red-600 hover:bg-red-50">
                Eliminar
              </BtnOutline>
            )}
          </div>
          <div className="flex gap-2">
            <BtnOutline type="button" onClick={onClose}>
              Cancelar
            </BtnOutline>
            <BtnPrimary type="button" onClick={save}>
              {method ? "Guardar" : "Crear método de pago"}
            </BtnPrimary>
          </div>
        </div>
      </div>
    </Modal>
  );
}
