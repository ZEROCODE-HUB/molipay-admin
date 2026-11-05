import {
LEVELS_MERCHANT,
STATUSES_MERCHANT,
type CodeCategory,
type CustomerSelect,
type LevelMerchant,
type Merchant,
type StatusMerchant,
} from "@/infrastructure/supabase/legacy/types";
import { type BackofficeUserOption } from "@/features/backoffice-users/backoffice-users.types";
import { useState } from "react";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useCustomersForSelect } from "@/features/merchants/merchants.hooks";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { Search } from "lucide-react";
import { LabelHelp } from "./merchants-parts";
import { BrandsSection } from "./brands-section";

export function MerchantFormModal({
  comercio: merchant,
  clientes: customers,
  categorias: categories,
  adminUsers,
  onClose,
  onSave,
  isSaving,
}: {
  comercio: Merchant | null;
  clientes: CustomerSelect[];
  categorias: CodeCategory[];
  adminUsers: Pick<BackofficeUserOption, "id" | "fullName" | "email">[];
  onClose: () => void;
  onSave: (input: {
    clienteLegajo: string;
    usuario: string;
    nombreComercio: string | null;
    categoriaId: number | null;
    nivel: LevelMerchant;
    estado: StatusMerchant;
    ejecutivoResponsableId: string | null;
    siteId: string | null;
  }) => void;
  isSaving?: boolean;
}) {
  const [customerLegajo, setCustomerLegajo] = useState(merchant?.legajo ?? "");
  const [user, setUser] = useState(merchant?.usuario ?? "");
  const [nameMerchant, setNameMerchant] = useState(merchant?.nombreComercio ?? "");
  const [categoryId, setCategoryId] = useState(
    merchant?.categoriaId != null ? String(merchant.categoriaId) : "",
  );
  const [level, setLevel] = useState<LevelMerchant>(merchant?.nivel ?? "Pequeño");
  const [status, setStatus] = useState<StatusMerchant>(
    merchant?.estado ?? "Pendiente de aprobación",
  );
  const [ejecutivoId, setEjecutivoId] = useState(merchant?.ejecutivoResponsableId ?? "");
  const [siteId, setSiteId] = useState(merchant?.siteId ?? "");

  const customerSeleccionado = customers.find((c) => c.legajo === customerLegajo) ?? null;

  // Combobox con búsqueda server-side (debounce 350ms, limit 20)
  const [customerSearchInput, setCustomerSearchInput] = useState("");
  const debouncedCustomerSearch = useDebouncedValue(customerSearchInput, 350);
  const { data: customersFiltrados } = useCustomersForSelect(
    merchant ? undefined : debouncedCustomerSearch,
  );
  const customersOptionsRaw = merchant ? customers : (customersFiltrados ?? customers);
  const customersOptions = [...(customersOptionsRaw ?? [])].sort((a, b) =>
    (a.legajo ?? "").localeCompare(b.legajo ?? ""),
  );
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const save = () => {
    if (!customerLegajo) return;
    onSave({
      clienteLegajo: customerLegajo,
      usuario: user.trim() || (customerSeleccionado?.correo ?? ""),
      nombreComercio: nameMerchant.trim() || null,
      categoriaId: categoryId ? Number(categoryId) : null,
      nivel: level,
      estado: status,
      ejecutivoResponsableId: ejecutivoId || null,
      siteId: siteId.trim() || null,
    });
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title={merchant ? "Editar comercio" : "Nuevo comercio"}
      description={
        merchant
          ? `Modificá los datos del comercio ${merchant.usuario}.`
          : "Asociá un cliente existente a un nuevo comercio."
      }
      onSubmit={save}
      submitLabel={isSaving ? "Guardando…" : merchant ? "Guardar cambios" : "Crear comercio"}
      isSubmitting={isSaving}
      size="xl"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <LabelHelp
            htmlFor="gc-cliente"
            hint="El cliente se elige de la lista de clientes ya cargada. No se puede escribir uno nuevo a mano."
          >
            Cliente (legajo)
          </LabelHelp>
          {merchant ? (
            <Input
              id="gc-cliente"
              value={`${customerSeleccionado?.nombre ?? merchant.legajo} · ${merchant.legajo}`}
              disabled
            />
          ) : (
            <div className="relative">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <Input
                  id="gc-cliente"
                  value={customerSearchInput}
                  onChange={(e) => {
                    setCustomerSearchInput(e.target.value);
                    setComboboxOpen(true);
                    if (!e.target.value.trim()) setCustomerLegajo("");
                  }}
                  onFocus={() => setComboboxOpen(true)}
                  onBlur={() => setTimeout(() => setComboboxOpen(false), 150)}
                  placeholder="Buscar por nombre, legajo o correo…"
                  className="pl-9"
                  autoComplete="off"
                />
              </div>
              {comboboxOpen && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-input bg-card shadow-lg max-h-60 overflow-auto">
                  {(customersOptions ?? []).length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      {debouncedCustomerSearch
                        ? "Sin resultados."
                        : "Escribí para buscar (máx. 20 resultados)."}
                    </div>
                  ) : (
                    (customersOptions ?? []).map((c) => (
                      <button
                        key={c.legajo}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setCustomerLegajo(c.legajo);
                          setCustomerSearchInput(`${c.nombre} · ${c.legajo}`);
                          setUser(c.correo);
                          setComboboxOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-accent flex flex-col ${
                          c.legajo === customerLegajo ? "bg-accent" : ""
                        }`}
                      >
                        <span className="font-medium">{c.nombre}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {c.legajo} · {c.correo}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
              {customerLegajo && customerSeleccionado && (
                <p className="text-xs text-muted-foreground mt-1">
                  Seleccionado: <span className="font-mono">{customerSeleccionado.legajo}</span> ·{" "}
                  {customerSeleccionado.correo}
                </p>
              )}
            </div>
          )}
        </div>
        {customerSeleccionado && (
          <div className="sm:col-span-2">
            <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Datos del cliente (solo lectura)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-muted-foreground">CUIT / CUIL</span>
                  <Input
                    value={customerSeleccionado.cuit ?? "—"}
                    disabled
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Razón Social / Nombre</span>
                  <Input value={customerSeleccionado.nombre} disabled className="text-sm" />
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="sm:col-span-2">
          <LabelHelp
            htmlFor="gc-usuario"
            hint="Se completa solo con el correo del cliente elegido."
          >
            Usuario (email)
          </LabelHelp>
          <Input
            id="gc-usuario"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="email@dominio.com"
            disabled={!merchant && !!customerSeleccionado}
          />
        </div>
        <div className="sm:col-span-2">
          <LabelHelp
            htmlFor="gc-nombre-comercio"
            hint="Es el nombre que ve el cliente cuando paga con Link de Pago o QR."
          >
            Nombre del comercio
          </LabelHelp>
          <Input
            id="gc-nombre-comercio"
            value={nameMerchant}
            onChange={(e) => setNameMerchant(e.target.value)}
            placeholder="Ej: Kiosco Central, Distribuidora Delta"
          />
        </div>
        <div className="sm:col-span-2">
          <LabelHelp
            htmlFor="gc-site-id"
            hint="Es el número que Payway le asignó a este comercio (también llamado “site id”) para reconocer sus cobros y liquidaciones. Lo entrega el equipo de Payway al dar de alta el comercio."
          >
            Nro. de Establecimiento (Payway)
          </LabelHelp>
          <Input
            id="gc-site-id"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            placeholder="Ej: 12345"
            className="font-mono"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="gc-categoria">Código de categoría</Label>
          <Select
            id="gc-categoria"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.codigo} · {c.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="gc-nivel">Nivel</Label>
          <Select
            id="gc-nivel"
            value={level}
            onChange={(e) => setLevel(e.target.value as LevelMerchant)}
          >
            {LEVELS_MERCHANT.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="gc-estado">Estado</Label>
          <Select
            id="gc-estado"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusMerchant)}
          >
            {STATUSES_MERCHANT.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="gc-ejecutivo">Ejecutivo responsable</Label>
          <Select
            id="gc-ejecutivo"
            value={ejecutivoId}
            onChange={(e) => setEjecutivoId(e.target.value)}
          >
            <option value="">Sin asignar</option>
            {adminUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} · {u.email}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {merchant && (
        <div className="mt-6 border-t border-border pt-5">
          <BrandsSection comercioId={merchant.id} />
        </div>
      )}
      {!merchant && (
        <p className="text-xs text-muted-foreground mt-4 border rounded-lg bg-muted/30 px-3 py-2">
          Las banderas se configuran luego de crear el comercio, desde el detalle o edición.
        </p>
      )}
    </FormDialog>
  );
}
