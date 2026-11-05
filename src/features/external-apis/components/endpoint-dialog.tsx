import { toast } from "sonner";
import { applyServerErrors } from "@/shared/forms/apply-server-errors";
import { FieldError } from "@/shared/forms/field-error";
import { useZodForm } from "@/shared/forms/use-zod-form";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { useExternalApiActions } from "../external-apis.hooks";
import { ENDPOINT_STATUS_LABEL } from "../external-apis.rules";
import { endpointSchema } from "../external-apis.schema";
import {
ENDPOINT_GROUPS,
ENDPOINT_STATUSES,
HTTP_METHODS,
type ApiEndpoint,
} from "../external-apis.types";

/** Alta (`endpoint` null) o edicion de un endpoint del catalogo. */
export function EndpointDialog({
  endpoint,
  onClose,
}: {
  endpoint: ApiEndpoint | null;
  onClose: () => void;
}) {
  const { createEndpoint, updateEndpoint } = useExternalApiActions();
  const form = useZodForm(endpointSchema, {
    defaultValues: {
      name: endpoint?.name ?? "",
      path: endpoint?.path ?? "",
      method: endpoint?.method ?? "GET",
      description: endpoint?.description ?? "",
      group: endpoint?.group ?? "Autenticación",
      status: endpoint?.status ?? "enabled",
      rec: endpoint?.rec ?? false,
    },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    const input = { ...values, description: values.description || null };
    try {
      if (endpoint) await updateEndpoint(endpoint.id, input);
      else await createEndpoint(input);
    } catch (e) {
      applyServerErrors(form, e);
      return;
    }
    toast.success(endpoint ? "Endpoint actualizado" : "Endpoint creado");
    onClose();
  });

  return (
    <FormDialog
      open
      onClose={onClose}
      title={endpoint ? "Editar endpoint" : "Nuevo endpoint"}
      description={
        endpoint
          ? `Configuración del endpoint "${endpoint.name}".`
          : "Completá los datos para crear un nuevo endpoint."
      }
      onSubmit={submit}
      submitLabel={endpoint ? "Guardar cambios" : "Crear endpoint"}
      size="lg"
      isSubmitting={isSubmitting}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="ep-name">Nombre del endpoint</Label>
          <Input id="ep-name" {...form.register("name")} />
          <FieldError message={errors.name?.message} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="ep-path">Path</Label>
          <Input id="ep-path" className="font-mono" {...form.register("path")} />
          <FieldError message={errors.path?.message} />
        </div>
        <div>
          <Label htmlFor="ep-method">Tipo de endpoint</Label>
          <Select id="ep-method" {...form.register("method")}>
            {HTTP_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ep-group">Grupo de endpoints</Label>
          <Select id="ep-group" {...form.register("group")}>
            {ENDPOINT_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="ep-desc">Descripción</Label>
          <Input id="ep-desc" {...form.register("description")} />
        </div>
        <div>
          <Label htmlFor="ep-status">Estado</Label>
          <Select id="ep-status" {...form.register("status")}>
            {ENDPOINT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ENDPOINT_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ep-rec">REC</Label>
          <Select
            id="ep-rec"
            {...form.register("rec", {
              setValueAs: (v: string | boolean) => v === true || v === "true",
            })}
          >
            <option value="true">Sí</option>
            <option value="false">No</option>
          </Select>
        </div>
      </div>
      {errors.root?.server && <p className="text-sm text-red-600">{errors.root.server.message}</p>}
    </FormDialog>
  );
}
