import { z } from "zod";
import { emailSchema } from "@/shared/validation/primitives";
import { passwordRules } from "./password-policy";

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Ingresá tu contraseña."),
});
export type LoginInput = z.output<typeof loginSchema>;

/** Nueva clave segun la politica del backoffice (no puede contener el email). */
export const createSetPasswordSchema = (email: string | null) =>
  z
    .object({
      password: z.string(),
      confirmation: z.string(),
    })
    .superRefine(({ password, confirmation }, ctx) => {
      const failed = passwordRules(password, email).filter((rule) => !rule.ok);
      if (failed.length > 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message: failed[0].label });
      }
      if (confirmation !== password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["confirmation"],
          message: "Las contraseñas no coinciden.",
        });
      }
    });
export type SetPasswordInput = z.output<ReturnType<typeof createSetPasswordSchema>>;
