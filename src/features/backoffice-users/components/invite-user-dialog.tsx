import { toast } from "sonner";
import type { Role } from "@/features/rbac/rbac.types";
import { usePermissions } from "@/features/rbac/rbac.hooks";
import { applyServerErrors } from "@/shared/forms/apply-server-errors";
import { FieldError } from "@/shared/forms/field-error";
import { useZodForm } from "@/shared/forms/use-zod-form";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { useBackofficeUserActions } from "../backoffice-users.hooks";
import { inviteBackofficeUserSchema } from "../backoffice-users.schema";

/** Alta por invitacion: le llega un email para definir su contraseña. */
export function InviteUserDialog({
  roles,
  onClose,
  onInvited,
}: {
  roles: Role[];
  onClose: () => void;
  onInvited: () => void;
}) {
  const { session } = usePermissions();
  const { invite } = useBackofficeUserActions();
  // Solo un Admin puede invitar a otro Admin (la Edge Function lo vuelve a validar).
  const assignableRoles = roles.filter((r) => !r.isSuperadmin || session?.isSuperadmin);
  const form = useZodForm(inviteBackofficeUserSchema, {
    defaultValues: {
      fullName: "",
      email: "",
      roleId: assignableRoles.find((r) => !r.isSuperadmin)?.id ?? assignableRoles[0]?.id ?? "",
      staffCode: "",
    },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    try {
      await invite(values);
    } catch (error) {
      applyServerErrors(form, error);
      return;
    }
    toast.success(`Invitación enviada a ${values.email}.`);
    onInvited();
    onClose();
  });

  return (
    <FormDialog
      open
      onClose={onClose}
      title="Invitar usuario"
      description="Le llega un email para definir su contraseña. Hasta que la defina no puede usar el panel."
      onSubmit={() => void submit()}
      submitLabel={isSubmitting ? "Enviando…" : "Enviar invitación"}
      isSubmitting={isSubmitting}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="invite-name">Nombre y apellido</Label>
          <Input
            id="invite-name"
            {...form.register("fullName")}
            aria-invalid={!!errors.fullName}
            autoFocus
          />
          <FieldError message={errors.fullName?.message} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            {...form.register("email")}
            aria-invalid={!!errors.email}
            placeholder="nombre@empresa.com"
          />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <Label htmlFor="invite-role">Rol</Label>
          <Select id="invite-role" {...form.register("roleId")} aria-invalid={!!errors.roleId}>
            {assignableRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.isSuperadmin ? " (acceso total)" : ""}
              </option>
            ))}
          </Select>
          <FieldError message={errors.roleId?.message} />
        </div>
        <div>
          <Label htmlFor="invite-code">Legajo (opcional)</Label>
          <Input id="invite-code" {...form.register("staffCode")} placeholder="Se genera solo" />
          <FieldError message={errors.staffCode?.message} />
        </div>
      </div>
      <FieldError message={errors.root?.server?.message} />
    </FormDialog>
  );
}
