import type { FieldValues,Path,UseFormReturn } from "react-hook-form";
import { isAppError,userMessage } from "@/shared/lib/errors";

/** Clave del error general del formulario (no asociado a un campo). */
export const SERVER_ERROR = "root.server" as const;

/**
 * Lleva un error del servidor al formulario: al campo si el AppError trae `field`,
 * si no al error general (`root.server`). Nunca muestra el texto tecnico del proveedor.
 */
export function applyServerErrors<T extends FieldValues>(
  form: Pick<UseFormReturn<T, unknown, unknown>, "setError">,
  error: unknown,
): void {
  if (isAppError(error) && error.field) {
    form.setError(error.field as Path<T>, { type: "server", message: error.message });
    return;
  }
  form.setError(SERVER_ERROR, { type: "server", message: userMessage(error) });
}
