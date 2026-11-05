import { type CodeCategory } from "@/infrastructure/supabase/legacy/types";
import { useState } from "react";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Input,Label } from "@/shared/ui/form-controls";
import { type CategoryForm } from "@/features/merchants/merchant-category.types";

export function CategoryFormModal({
  categoria: category,
  onClose,
  onSave,
}: {
  categoria: CodeCategory | null;
  onClose: () => void;
  onSave: (form: CategoryForm) => void;
}) {
  const [form, setForm] = useState<CategoryForm>(() => ({
    codigo: category?.codigo ?? "",
    nombre: category?.nombre ?? "",
    descripcion: category?.descripcion ?? "",
  }));

  const save = () => {
    if (form.codigo.trim() === "" || form.nombre.trim() === "") return;
    onSave(form);
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title={category ? "Editar categoría" : "Nueva categoría"}
      description={
        category
          ? `Modificá los datos de la categoría ${category.codigo}.`
          : "Complete los datos para crear una nueva categoría."
      }
      onSubmit={save}
      submitLabel={category ? "Guardar cambios" : "Crear categoría"}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cat-codigo">Código</Label>
          <Input
            id="cat-codigo"
            value={form.codigo}
            onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
            placeholder="CAT-XXX"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Debe ser único: no puede coincidir con el código de otra categoría.
          </p>
        </div>
        <div>
          <Label htmlFor="cat-nombre">Nombre</Label>
          <Input
            id="cat-nombre"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            placeholder="Nombre de la categoría"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="cat-descripcion">Descripción</Label>
          <Input
            id="cat-descripcion"
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            placeholder="Descripción breve"
          />
        </div>
      </div>
    </FormDialog>
  );
}
