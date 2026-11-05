import { type Resolver } from "@/infrastructure/supabase/legacy/types";
import { useState } from "react";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Input,Label } from "@/shared/ui/form-controls";
import { type ResolverForm } from "@/features/external-apis/resolvers.types";

export function ResolverFormModal({
  resolver,
  onClose,
  onSave,
}: {
  resolver: Resolver | null;
  onClose: () => void;
  onSave: (form: ResolverForm) => void;
}) {
  const [form, setForm] = useState<ResolverForm>(() => ({
    nombre: resolver?.nombre ?? "",
    cuit: resolver?.cuit ?? "",
    nombreReverso: resolver?.nombreReverso ?? "",
    formatoWeb: resolver?.formatoWeb ?? "",
    pcpId: resolver?.pcpId ?? "",
    idPcp: resolver?.idPcp ?? "",
    url: resolver?.url ?? "",
    token: resolver?.token ?? "",
    asHeader: resolver?.asHeader ?? false,
    soa: resolver?.soa ?? false,
  }));

  const cuitValid = /^\d{11}$/.test(form.cuit.replace(/[\s-]/g, ""));

  const save = () => {
    if (form.nombre.trim() === "" || !cuitValid) return;
    onSave({ ...form, cuit: form.cuit.replace(/[\s-]/g, "") });
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title={resolver ? "Editar resolver" : "Alta nuevo resolver"}
      description={
        resolver
          ? `Configuración del resolver "${resolver.nombre}".`
          : "Complete los datos para crear un nuevo resolver."
      }
      onSubmit={save}
      submitLabel={resolver ? "Guardar cambios" : "Crear resolver"}
      size="lg"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="res-nombre">Nombre</Label>
          <Input
            id="res-nombre"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="res-cuit">CUIT (11 dígitos)</Label>
          <Input
            id="res-cuit"
            value={form.cuit}
            onChange={(e) => setForm((f) => ({ ...f, cuit: e.target.value }))}
            placeholder="30123456780"
          />
          {form.cuit && !cuitValid && (
            <p className="text-[11px] text-red-600 mt-1 text-xs">El CUIT debe tener 11 dígitos.</p>
          )}
        </div>
        <div>
          <Label htmlFor="res-reverso">Nombre Reverso</Label>
          <Input
            id="res-reverso"
            value={form.nombreReverso}
            onChange={(e) => setForm((f) => ({ ...f, nombreReverso: e.target.value }))}
            placeholder="com.ejemplo.app"
          />
        </div>
        <div>
          <Label htmlFor="res-formato-web">Formato web</Label>
          <Input
            id="res-formato-web"
            value={form.formatoWeb}
            onChange={(e) => setForm((f) => ({ ...f, formatoWeb: e.target.value }))}
            placeholder="https://..."
          />
        </div>
        <div>
          <Label htmlFor="res-pcp-id">PCP ID</Label>
          <Input
            id="res-pcp-id"
            value={form.pcpId}
            onChange={(e) => setForm((f) => ({ ...f, pcpId: e.target.value }))}
            placeholder="PCP-XXXX"
          />
        </div>
        <div>
          <Label htmlFor="res-id-pcp">ID del PCP</Label>
          <Input
            id="res-id-pcp"
            value={form.idPcp}
            onChange={(e) => setForm((f) => ({ ...f, idPcp: e.target.value }))}
            placeholder="0001"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="res-url">URL</Label>
          <Input
            id="res-url"
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="https://..."
          />
          <p className="text-xs text-muted-foreground mt-1">Si no se coloca URL, no llevará IEP.</p>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="res-token">Token</Label>
          <Input
            id="res-token"
            value={form.token}
            onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="accent-primary h-4 w-4"
            checked={form.asHeader}
            onChange={(e) => setForm((f) => ({ ...f, asHeader: e.target.checked }))}
          />
          As header
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="accent-primary h-4 w-4"
            checked={form.soa}
            onChange={(e) => setForm((f) => ({ ...f, soa: e.target.checked }))}
          />
          SOA
        </label>
      </div>
    </FormDialog>
  );
}
