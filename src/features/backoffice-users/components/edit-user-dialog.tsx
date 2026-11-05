import { toast } from "sonner";
import type { Role } from "@/features/rbac/rbac.types";
import { usePermissions } from "@/features/rbac/rbac.hooks";
import { applyServerErrors } from "@/shared/forms/apply-server-errors";
import { FieldError } from "@/shared/forms/field-error";
import { useZodForm } from "@/shared/forms/use-zod-form";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { useBackofficeUserActions } from "../backoffice-users.hooks";
import { editBackofficeUserSchema } from "../backoffice-users.schema";
import type { BackofficeUser } from "../backoffice-users.types";

/** Editar nombre y rol. La RPC vuelve a validar las reglas (propio rol, ultimo Admin). */
export function EditUserDialog({
  user,
  roles,
  onClose,
  onSaved,
}: {
  user: BackofficeUser;
  roles: Role[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { session } = usePermissions();
  const { update } = useBackofficeUserActions();
  const isSelf = session?.userId === user.id;
  const canTouchAdmin = !!session?.isSuperadmin;
  const assignableRoles = roles.filter(
    (r) => !r.isSuperadmin || canTouchAdmin || r.id === user.roleId,
  );
  const roleLocked = isSelf || (user.roleIsSuperadmin && !canTouchAdmin);

  const form = useZodForm(editBackofficeUserSchema, {
    defaultValues: { fullName: user.fullName, roleId: user.roleId },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async ({ fullName, roleId }) => {
    try {
      await update(user.id, fullName, roleId);
    } catch (error) {
      applyServerErrors(form, error);
      return;
    }
    toast.success("Usuario actualizado.");
    onSaved();
    onClose();
  });

  return (
    <FormDialog
      open
      onClose={onClose}
      title="Editar usuario"
      description={user.email}
      onSubmit={() => void submit()}
      submitLabel={isSubmitting ? "Guardando…" : "Guardar"}
      isSubmitting={isSubmitting}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="edit-name">Nombre y apellido</Label>
          <Input id="edit-name" {...form.register("fullName")} aria-invalid={!!errors.fullName} />
          <FieldError message={errors.fullName?.message} />
        </div>
        <div>
          <Label htmlFor="edit-role">Rol</Label>
          <Select id="edit-role" {...form.register("roleId")} disabled={roleLocked}>
            {assignableRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.isSuperadmin ? " (acceso total)" : ""}
              </option>
            ))}
          </Select>
          {roleLocked && (
            <p className="mt-1 text-xs text-muted-foreground">
              {isSelf
                ? "No podés cambiar tu propio rol."
                : "Solo un Admin puede cambiar el rol de otro Admin."}
            </p>
          )}
        </div>
      </div>
      <FieldError message={errors.root?.server?.message} />
    </FormDialog>
  );
}
