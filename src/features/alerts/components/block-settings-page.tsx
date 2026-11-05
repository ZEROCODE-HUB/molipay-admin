import { ErrorNotice } from "@/shared/ui/error-notice";
import { GeneralBlockParameters } from "./general-block-parameters";
import { UserBlockParameters } from "./user-block-parameters";
import { useBlockSettingsPage } from "./use-block-settings-page";
import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { FormDialog } from "@/shared/ui/form-dialog";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { SmvmCard } from "./smvm-card";
import { CustomerParamFields } from "./customer-param-fields";

export function BlockSettingsPage() {
  const vm = useBlockSettingsPage();
  const {
    generales,
    dialog,
    setDialog,
    draft,
    setDraft,
    errDraft,
    saving,
    viendo,
    setViendo,
    deleting,
    setDeleting,
    saveDraft,
    remove,
  } = vm;

  return (
    <>
      <PageHeader
        title="Parámetros de bloqueos"
        description="Umbrales que activan bloqueo automático de cuenta hasta revisión de compliance"
      />

      <div className="bg-moli-red-light border border-moli-red/20 rounded-lg p-4 mb-6 flex gap-3 max-w-2xl">
        <ShieldAlert size={18} className="text-moli-red shrink-0 mt-0.5" />
        <div className="text-sm text-moli-red-dark">
          <strong>Importante:</strong> Un <strong>bloqueo</strong> suspende la cuenta
          automáticamente al cumplirse el umbral. La cuenta queda bloqueada hasta que compliance la
          revise y la reactive manualmente.
        </div>
      </div>

      <SmvmCard />

      <GeneralBlockParameters {...vm} />

      <UserBlockParameters {...vm} />

      {dialog && (
        <FormDialog
          open
          onClose={() => setDialog(null)}
          title={
            dialog === "nuevo"
              ? "Agregar nuevos parámetros de usuario"
              : "Editar parámetros de usuario"
          }
          description={
            dialog === "nuevo"
              ? "Configure umbrales de depósitos para un usuario"
              : `Editando parámetros de ${draft.correo}`
          }
          onSubmit={() => void saveDraft()}
          submitLabel={saving ? "Guardando…" : dialog === "nuevo" ? "Agregar" : "Guardar cambios"}
        >
          {errDraft && <ErrorNotice className="mb-3">{errDraft}</ErrorNotice>}
          <CustomerParamFields
            draft={draft}
            onChange={setDraft}
            editando={dialog === "editar"}
            generales={generales}
          />
        </FormDialog>
      )}

      {viendo && (
        <FormDialog
          open
          onClose={() => setViendo(null)}
          title="Detalle de parámetros de usuario"
          description={`Parámetros de ${viendo.correo}`}
          onSubmit={() => setViendo(null)}
          submitLabel="Cerrar"
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Legajo:</span>{" "}
              <span className="font-mono tabular-nums font-medium">{viendo.legajo}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Usuario:</span>{" "}
              <span className="font-medium">{viendo.correo}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Nombre:</span>{" "}
              <span className="font-medium">{viendo.nombre}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Actualizado:</span>{" "}
              <span className="font-medium">
                {new Date(viendo.updatedAt).toLocaleString("es-AR")}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Salarios mínimos por persona:</span>{" "}
              <span className="font-mono tabular-nums font-medium">
                {viendo.individualMinWages ?? `General (${generales.persona ?? "—"})`}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Salarios mínimos por empresa:</span>{" "}
              <span className="font-mono tabular-nums font-medium">
                {viendo.companyMinWages ?? `General (${generales.empresa ?? "—"})`}
              </span>
            </div>
          </div>
        </FormDialog>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Eliminar parámetros individuales"
        message={`El cliente ${deleting?.legajo ?? ""} volverá a usar los umbrales generales. ¿Continuar?`}
        confirmLabel="Eliminar"
        variant="danger"
      />
    </>
  );
}
