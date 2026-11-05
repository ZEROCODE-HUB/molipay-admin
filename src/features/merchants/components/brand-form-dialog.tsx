import { FormDialog } from "@/shared/ui/form-dialog";
import { Input,Label,Select } from "@/shared/ui/form-controls";

import type { BrandsSectionVm } from "./use-brands-section";

export function BrandFormDialog({
  showForm,
  setShowForm,
  setEditing,
  editing,
  save,
  saving,
  formBrandId,
  brandsCatalog,
  setFormBrandId,
  setFormMethodKey,
  formBrandCustom,
  setFormBrandCustom,
  formMethodKey,
  formMolipay,
  setFormMolipay,
  formPayway,
  setFormPayway,
  net,
  formStatus,
  setFormStatus,
}: Pick<
  BrandsSectionVm,
  | "showForm"
  | "setShowForm"
  | "setEditing"
  | "editing"
  | "save"
  | "saving"
  | "formBrandId"
  | "brandsCatalog"
  | "setFormBrandId"
  | "setFormMethodKey"
  | "formBrandCustom"
  | "setFormBrandCustom"
  | "formMethodKey"
  | "formMolipay"
  | "setFormMolipay"
  | "formPayway"
  | "setFormPayway"
  | "net"
  | "formStatus"
  | "setFormStatus"
>) {
  return (
    <>
      {showForm && (
        <FormDialog
          open
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          title={editing ? "Editar bandera" : "Agregar bandera"}
          description={
            editing
              ? `Editando ${editing.bandera}`
              : "Seleccioná una bandera o ingresá texto libre."
          }
          onSubmit={save}
          submitLabel={saving ? "Guardando…" : editing ? "Guardar" : "Agregar"}
          isSubmitting={saving}
        >
          <div className="space-y-4">
            <div>
              <Label>Bandera</Label>
              <Select
                value={formBrandId}
                onChange={(e) => {
                  const selected = brandsCatalog.find(
                    (b: import("@/features/merchants/card-brands.supabase").Brand) =>
                      b.id === e.target.value,
                  );
                  setFormBrandId(e.target.value);
                  setFormMethodKey(selected?.metodoKey || "");
                }}
              >
                <option value="">Seleccionar…</option>
                {brandsCatalog.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}
                  </option>
                ))}
                <option value="__custom__">Otra (texto libre)…</option>
              </Select>
              {formBrandId === "__custom__" && (
                <Input
                  value={formBrandCustom}
                  onChange={(e) => setFormBrandCustom(e.target.value)}
                  placeholder="Ej: Naranja, Tarjeta Propia…"
                  className="mt-2"
                />
              )}
            </div>
            <div>
              <Label>Clave método pago</Label>
              <Input
                value={formMethodKey}
                onChange={(e) => setFormMethodKey(e.target.value)}
                placeholder="Ej: visa-cred, mc-deb, amex…"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Clave única del método de pago (visa-cred, mc-deb, amex, naranja, transferencia, qr)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>% Comisión MoliPay</Label>
                <Input
                  value={formMolipay}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^[0-9]*[.,]?[0-9]*$/.test(v)) setFormMolipay(v);
                  }}
                  placeholder="0.00"
                  className="font-mono"
                  inputMode="decimal"
                />
              </div>
              <div>
                <Label>% Comisión PayWay</Label>
                <Input
                  value={formPayway}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^[0-9]*[.,]?[0-9]*$/.test(v)) setFormPayway(v);
                  }}
                  placeholder="0.00"
                  className="font-mono"
                  inputMode="decimal"
                />
              </div>
            </div>
            <div className="rounded-md bg-muted px-3 py-2 flex justify-between text-sm">
              <span className="text-muted-foreground">% Neto (autocalculado)</span>
              <span className="font-mono font-semibold">{net.toFixed(2)}%</span>
            </div>
            <div>
              <Label>Estado</Label>
              <Select
                value={formStatus}
                onChange={(e) =>
                  setFormStatus(
                    e.target
                      .value as import("@/infrastructure/supabase/legacy/types").MerchantBrandStatus,
                  )
                }
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </Select>
            </div>
          </div>
        </FormDialog>
      )}
    </>
  );
}
