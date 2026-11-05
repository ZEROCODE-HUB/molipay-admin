import { Search } from "lucide-react";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { FormDialog } from "@/shared/ui/form-dialog";
import type { SubaccountKind } from "@/features/customers/subaccounts.supabase";
import { KIND_SUBACCOUNT_META } from "@/features/customers/customer-cvu.rules";
import type { CustomerCvuPageVm } from "./use-customer-cvu-page";

export function NewCvuDialog({
  showNew,
  setShowNew,
  create,
  saving,
  formSearch,
  setFormSearch,
  setFormOpen,
  setFormEmail,
  formOpen,
  customersOpt,
  formAlias,
  setFormAlias,
  formKind,
  setFormKind,
}: Pick<
  CustomerCvuPageVm,
  | "showNew"
  | "setShowNew"
  | "create"
  | "saving"
  | "formSearch"
  | "setFormSearch"
  | "setFormOpen"
  | "setFormEmail"
  | "formOpen"
  | "customersOpt"
  | "formAlias"
  | "setFormAlias"
  | "formKind"
  | "setFormKind"
>) {
  return (
    <FormDialog
      open={showNew}
      onClose={() => setShowNew(false)}
      title="Nuevo CVU"
      description="Crear CVU asociado a un usuario existente (búsqueda rápida por email, funciona con miles)."
      onSubmit={create}
      submitLabel={saving ? "Creando..." : "Crear CVU"}
    >
      <div className="relative">
        <Label>Email del usuario</Label>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            value={formSearch}
            onChange={(e) => {
              setFormSearch(e.target.value);
              setFormOpen(true);
              setFormEmail(e.target.value);
            }}
            onFocus={() => setFormOpen(true)}
            onBlur={() => setTimeout(() => setFormOpen(false), 150)}
            placeholder="Buscar por email, legajo o nombre..."
            className="pl-9"
            autoComplete="off"
          />
        </div>
        {formOpen && (customersOpt?.length ?? 0) > 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-md border bg-card shadow-lg max-h-60 overflow-auto">
            {(customersOpt ?? []).map((c) => (
              <button
                key={c.legajo}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setFormEmail(c.correo);
                  setFormSearch(c.correo);
                  setFormOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex flex-col"
              >
                <span className="font-medium">{c.correo}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {c.legajo} · {c.nombre}
                </span>
              </button>
            ))}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground mt-1">
          Seleccioná un email de la lista (20 resultados, server-side). Funciona para PF y PJ.
        </p>
      </div>
      <div>
        <Label>Alias (opcional)</Label>
        <Input
          value={formAlias}
          onChange={(e) => setFormAlias(e.target.value)}
          placeholder="mi.alias (se genera automático si vacío)"
        />
      </div>
      <div>
        <Label>Tipo de cuenta</Label>
        <Select value={formKind} onChange={(e) => setFormKind(e.target.value as SubaccountKind)}>
          {(Object.keys(KIND_SUBACCOUNT_META) as SubaccountKind[]).map((t) => (
            <option key={t} value={t}>
              {KIND_SUBACCOUNT_META[t].label}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-xs text-muted-foreground">
          Operativa: saldo líquido para retiros y transferencias. Recaudación: cobros / ventas.
          Garantías: contracargos y retenciones. Sueldos: nómina y pagos a empleados.
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Se generará un CVU de 22 dígitos y alias, y se guardará como subcuenta. Aparecerá en el
        detalle del usuario en Subcuentas y CVUs recientes.
      </p>
    </FormDialog>
  );
}
