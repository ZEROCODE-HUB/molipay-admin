import { LoadingBlock } from "@/shared/ui/loading-block";
import { useIntegrationsPage } from "@/features/system/components/use-integrations-page";
import { AlertTriangle,ShieldCheck } from "lucide-react";
import { healthMeta } from "@/features/system/integrations.rules";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { IntegrationConfigModal } from "@/features/system/components/integration-config-modal";

export function IntegrationsPage() {
  const vm = useIntegrationsPage();
  const { devMode, isLoading, isError, isEmpty, integrationsUI } = vm;

  if (!devMode) {
    if (isLoading) {
      return <LoadingBlock label="Cargando integraciones…" />;
    }
    if (isError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
          <AlertTriangle size={28} />
          <div>
            <p className="font-semibold">Error al cargar integraciones</p>
          </div>
        </div>
      );
    }
    if (isEmpty) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          <ShieldCheck size={28} />
          <p>No hay integraciones configuradas.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {integrationsUI.map((i) => {
          const meta = healthMeta[i.salud];
          const Icon = meta.icon;
          return (
            <Card key={i.id} className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-base text-foreground truncate">
                    {i.nombre}
                  </h3>
                  <div className="font-mono text-[11px] text-muted-foreground mt-0.5 truncate">
                    {i.id}
                  </div>
                </div>
                <Icon
                  size={22}
                  className={
                    i.salud === "ok"
                      ? "text-emerald-500 shrink-0"
                      : i.salud === "warning"
                        ? "text-amber-500 shrink-0"
                        : "text-red-500 shrink-0"
                  }
                />
              </div>

              <Badge tone={meta.tone} className="w-fit">
                {meta.label}
              </Badge>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
                    Última ejecución
                  </div>
                  <div className="font-mono text-xs tabular-nums mt-1">{i.ultimaEjecucion}</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
                    Próxima ejecución
                  </div>
                  <div className="font-mono text-xs tabular-nums mt-1">{i.proximaEjecucion}</div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs text-muted-foreground">Ejecuciones totales</span>
                <span className="font-display text-lg font-semibold tabular-nums">
                  {i.ejecuciones.toLocaleString()}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <PermissionGuard recurso="gestor_integraciones">
      <IntegrationConfigModal {...vm} />
    </PermissionGuard>
  );
}
