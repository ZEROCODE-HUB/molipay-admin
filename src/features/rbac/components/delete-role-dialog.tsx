import { type Role } from "@/features/rbac/rbac.types";
import { useState } from "react";
import { useRoleActions } from "@/features/rbac/rbac.hooks";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Label } from "@/shared/ui/form-controls";
import { selectClass } from "@/shared/ui/field-classes";

export function DeleteRoleDialog({
  role,
  roles,
  onClose,
  onDeleted,
}: {
  role: Role;
  roles: Role[];
  onClose: () => void;
  onDeleted: () => void;
}) {
  const targets = roles.filter((r) => r.id !== role.id);
  const [reassignTo, setReassignTo] = useState(
    targets.find((r) => !r.isSuperadmin)?.id ?? targets[0]?.id ?? "",
  );
  const [deleting, setDeleting] = useState(false);
  const { deleteRole } = useRoleActions();

  const submit = async () => {
    setDeleting(true);
    try {
      const moved = await deleteRole(role.id, role.userCount > 0 ? reassignTo : null);
      toast.success(
        moved > 0 ? `Rol eliminado. ${moved} usuario(s) cambiaron de rol.` : "Rol eliminado.",
      );
      onDeleted();
      onClose();
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title="Eliminar rol"
      description={`¿Eliminar el rol "${role.name}"? Esta acción no se puede deshacer.`}
      onSubmit={submit}
      submitLabel={deleting ? "Eliminando…" : "Eliminar"}
      isSubmitting={deleting}
    >
      {role.userCount > 0 ? (
        <div>
          <Label htmlFor="reassign-role">Tiene {role.userCount} usuario(s). Pasan al rol:</Label>
          <select
            id="reassign-role"
            className={selectClass}
            value={reassignTo}
            onChange={(e) => setReassignTo(e.target.value)}
          >
            {targets.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No tiene usuarios asignados.</p>
      )}
    </FormDialog>
  );
}
