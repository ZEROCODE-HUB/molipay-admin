import { type Role } from "@/features/rbac/rbac.types";
import { useState } from "react";
import { useRoleActions } from "@/features/rbac/rbac.hooks";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Input,Label } from "@/shared/ui/form-controls";
import { selectClass } from "@/shared/ui/field-classes";

// ---------------------------------------------------------------------------
// Dialogos
// ---------------------------------------------------------------------------

export function RoleFormDialog({
  role,
  roles,
  onClose,
  onSaved,
}: {
  /** null = rol nuevo. */
  role: Role | null;
  roles: Role[];
  onClose: () => void;
  onSaved: (roleId: string) => void;
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [baseRoleId, setBaseRoleId] = useState("");
  const [saving, setSaving] = useState(false);
  const { saveRole, cloneRole, getRolePermissions } = useRoleActions();

  const submit = async () => {
    if (name.trim().length < 2 || saving) return;
    setSaving(true);
    try {
      let id: string;
      if (role) {
        id = await saveRole({
          id: role.id,
          name,
          description,
          permissions: await getRolePermissions(role.id),
        });
      } else if (baseRoleId) {
        id = await cloneRole(baseRoleId, name);
        if (description.trim()) {
          await saveRole({ id, name, description, permissions: await getRolePermissions(id) });
        }
      } else {
        id = await saveRole({ id: null, name, description, permissions: [] });
      }
      toast.success(role ? "Rol actualizado." : `Rol "${name.trim()}" creado.`);
      onSaved(id);
      onClose();
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title={role ? "Editar rol" : "Nuevo rol"}
      description={role ? undefined : "Un rol nuevo arranca sin permisos, o con los de otro rol."}
      onSubmit={submit}
      submitLabel={saving ? "Guardando…" : role ? "Guardar" : "Crear rol"}
      isSubmitting={saving}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="role-name">Nombre del rol</Label>
          <Input
            id="role-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Auditor"
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="role-description">Descripción (opcional)</Label>
          <Input
            id="role-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {!role && (
          <div>
            <Label htmlFor="role-base">Permisos iniciales</Label>
            <select
              id="role-base"
              className={selectClass}
              value={baseRoleId}
              onChange={(e) => setBaseRoleId(e.target.value)}
            >
              <option value="">Sin permisos</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  Copiar de {r.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </FormDialog>
  );
}
