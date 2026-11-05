import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { useBackofficeUserActions } from "../backoffice-users.hooks";
import type { BackofficeUser } from "../backoffice-users.types";

export type UserAction = { kind: "password" | "deactivate" | "activate"; user: BackofficeUser };

/** Confirmacion de reenviar invitacion / resetear clave / activar / desactivar. */
export function UserActionDialog({
  action,
  onClose,
  onDone,
}: {
  action: UserAction;
  onClose: () => void;
  onDone: () => void;
}) {
  const { sendPasswordLink, setActive } = useBackofficeUserActions();
  const { user, kind } = action;
  const isInvitation = kind === "password" && user.status === "invited";

  const copy = {
    password: isInvitation
      ? {
          title: "Reenviar invitación",
          body: `Se envía un nuevo email a ${user.email} para definir su contraseña.`,
          cta: "Reenviar",
        }
      : {
          title: "Resetear contraseña",
          body: `${user.fullName} queda sin acceso hasta definir una contraseña nueva con el link que le llega a ${user.email}.`,
          cta: "Resetear y enviar email",
        },
    deactivate: {
      title: "Desactivar usuario",
      body: `${user.fullName} pierde el acceso de inmediato (se cierran sus sesiones abiertas). Podés reactivarlo después.`,
      cta: "Desactivar",
    },
    activate: {
      title: "Activar usuario",
      body: `${user.fullName} vuelve a tener acceso con su rol actual.`,
      cta: "Activar",
    },
  }[kind];

  const run = async () => {
    try {
      if (kind === "password") {
        await sendPasswordLink(user.id);
        toast.success(isInvitation ? "Invitación reenviada." : "Email de reseteo enviado.");
      } else {
        const result = await setActive(user.id, kind === "activate");
        if (result.warning) toast.warning(result.warning);
        else toast.success(kind === "activate" ? "Usuario activado." : "Usuario desactivado.");
      }
      onDone();
    } catch (error) {
      toast.error(userMessage(error));
      // El dialogo queda abierto para reintentar o cancelar.
      throw error;
    }
  };

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={run}
      title={copy.title}
      message={copy.body}
      confirmLabel={copy.cta}
      variant={kind === "deactivate" ? "danger" : "default"}
    />
  );
}
