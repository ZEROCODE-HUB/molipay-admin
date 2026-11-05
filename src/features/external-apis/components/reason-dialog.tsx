import { applyServerErrors } from "@/shared/forms/apply-server-errors";
import { FieldError } from "@/shared/forms/field-error";
import { useZodForm } from "@/shared/forms/use-zod-form";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Label } from "@/shared/ui/form-controls";
import { reasonSchema } from "../external-apis.schema";

/**
 * Pide un motivo obligatorio y ejecuta la accion. Si falla, el error queda en el
 * dialogo (abierto) para reintentar; si sale bien, se cierra.
 */
export function ReasonDialog({
  open,
  title,
  description,
  submitLabel,
  placeholder,
  onSubmit,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  submitLabel: string;
  placeholder?: string;
  onSubmit: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const form = useZodForm(reasonSchema, { defaultValues: { reason: "" } });
  const { errors, isSubmitting } = form.formState;

  const close = () => {
    form.reset();
    onClose();
  };

  const submit = form.handleSubmit(async ({ reason }) => {
    try {
      await onSubmit(reason);
    } catch (e) {
      applyServerErrors(form, e);
      return;
    }
    close();
  });

  return (
    <FormDialog
      open={open}
      onClose={close}
      title={title}
      description={description}
      submitLabel={submitLabel}
      onSubmit={submit}
      isSubmitting={isSubmitting}
    >
      <div>
        <Label htmlFor="reason">Motivo (obligatorio)</Label>
        <textarea
          id="reason"
          className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder={placeholder}
          {...form.register("reason")}
        />
        <FieldError message={errors.reason?.message ?? errors.root?.server?.message} />
      </div>
    </FormDialog>
  );
}
