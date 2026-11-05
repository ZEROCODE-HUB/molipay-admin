import { Badge } from "@/shared/ui/badge";
import { statusLabel, statusTone } from "@/features/customers/customer-detail.rules";

import type { CustomerDetailPageVm } from "./use-customer-detail-page";

export function CustomerActionBar({
  customer,
  canUpdate,
  setConfirmAction,
  changeStatusHomologado,
  can,
  setActiveTab,
}: Pick<
  CustomerDetailPageVm,
  "customer" | "canUpdate" | "setConfirmAction" | "changeStatusHomologado" | "can" | "setActiveTab"
>) {
  return (
    <div className="min-w-0 mt-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-xl md:text-2xl font-semibold tracking-tight text-foreground truncate">
          {customer.nombre}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5 truncate">
          {customer.legajo} · {customer.correo}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          tone={
            (statusTone[customer.estado] ?? "neutral") as "success" | "danger" | "warn" | "neutral"
          }
        >
          {statusLabel[customer.estado] ?? customer.estado}
        </Badge>
        {(() => {
          const norm = (customer.estado as string).toLowerCase();
          const isRegistered = norm === "registrado";
          const isPreactivado = norm === "preactivado";
          const isActivado = norm === "activado" || norm === "activo";
          const isSuspendido = norm === "suspendido";
          const isTerminal =
            norm === "deshabilitado" || norm === "eliminado" || norm === "rechazado";
          return (
            <>
              {isRegistered && canUpdate && customer.tipoPersona === "juridica" && (
                <button
                  type="button"
                  onClick={() => setActiveTab("onboarding")}
                  className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Revisar onboarding
                </button>
              )}
              {isRegistered && canUpdate && customer.tipoPersona !== "juridica" && (
                <button
                  type="button"
                  onClick={() =>
                    setConfirmAction({
                      title: "Aprobar documentación",
                      message: `¿Aprobar la documentación de ${customer.nombre}? Pasará a Preactivado.`,
                      confirmLabel: "Aprobar",
                      variant: "default",
                      onConfirm: () => {
                        setConfirmAction(null);
                        void changeStatusHomologado(customer, "aprobar");
                      },
                    })
                  }
                  className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
                >
                  Aprobar documentación
                </button>
              )}
              {isPreactivado && canUpdate && (
                <button
                  type="button"
                  onClick={() =>
                    setConfirmAction({
                      title: "Activar usuario",
                      message: `¿Activar a ${customer.nombre}? Requiere CVU y comisión cargados.`,
                      confirmLabel: "Activar",
                      variant: "default",
                      onConfirm: () => {
                        setConfirmAction(null);
                        void changeStatusHomologado(customer, "activar");
                      },
                    })
                  }
                  className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
                >
                  Activar
                </button>
              )}
              {isActivado && canUpdate && (
                <button
                  type="button"
                  onClick={() =>
                    setConfirmAction({
                      title: "Suspender cliente",
                      message: `¿Suspender a ${customer.nombre}? Se conservará su historial.`,
                      confirmLabel: "Suspender",
                      variant: "danger",
                      onConfirm: () => {
                        setConfirmAction(null);
                        void changeStatusHomologado(customer, "suspender");
                      },
                    })
                  }
                  className="inline-flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground hover:bg-accent"
                >
                  Suspender
                </button>
              )}
              {isSuspendido && canUpdate && (
                <button
                  type="button"
                  onClick={() =>
                    setConfirmAction({
                      title: "Reactivar cliente",
                      message: `¿Reactivar a ${customer.nombre}?`,
                      confirmLabel: "Reactivar",
                      variant: "default",
                      onConfirm: () => {
                        setConfirmAction(null);
                        void changeStatusHomologado(customer, "reactivar");
                      },
                    })
                  }
                  className="inline-flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground hover:bg-accent"
                >
                  Reactivar
                </button>
              )}
              {!isTerminal && canUpdate && (
                <button
                  type="button"
                  onClick={() =>
                    setConfirmAction({
                      title: "Deshabilitar usuario",
                      message: `¿Deshabilitar a ${customer.nombre}? Se cancelará su CVU y se conservará el historial (auditoría BCRA).`,
                      confirmLabel: "Deshabilitar",
                      variant: "danger",
                      onConfirm: () => {
                        setConfirmAction(null);
                        void changeStatusHomologado(customer, "deshabilitar");
                      },
                    })
                  }
                  className="inline-flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground hover:bg-accent"
                >
                  Deshabilitar
                </button>
              )}
              {!isTerminal && (
                <button
                  type="button"
                  disabled={!can("borrar", "usuarios")}
                  onClick={() =>
                    setConfirmAction({
                      title: "Eliminar usuario",
                      message: `¿Eliminar a ${customer.nombre}? Solo permitido si nunca tuvo movimientos.`,
                      confirmLabel: "Eliminar",
                      variant: "danger",
                      onConfirm: () => {
                        setConfirmAction(null);
                        void changeStatusHomologado(customer, "eliminar");
                      },
                    })
                  }
                  className="inline-flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
                >
                  Eliminar
                </button>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
