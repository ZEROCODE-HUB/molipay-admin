import { z } from "zod";
import { emailSchema,requiredText } from "@/shared/validation/primitives";

const fullName = z.string().trim().min(2, "Ingresá el nombre completo (al menos 2 caracteres).");

export const inviteBackofficeUserSchema = z.object({
  fullName,
  email: emailSchema,
  roleId: requiredText("Elegí un rol."),
  /** Opcional: si queda vacío lo genera la Edge Function. */
  staffCode: z.string().trim().max(20, "Máximo 20 caracteres.").optional(),
});
export type InviteBackofficeUserFormValues = z.input<typeof inviteBackofficeUserSchema>;

export const editBackofficeUserSchema = z.object({
  fullName,
  roleId: requiredText("Elegí un rol."),
});
export type EditBackofficeUserFormValues = z.input<typeof editBackofficeUserSchema>;
