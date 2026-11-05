import { Select } from "@/shared/ui/form-controls";
import { ServerCog,Database,Layers,Timer,Play,FileCog,RotateCw,Zap } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline } from "@/shared/ui/button";
import { FormDialog } from "@/shared/ui/form-dialog";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { toast } from "sonner";
import { proximoGrupo } from "@/features/system/integrations.rules";
import type { IntegrationsPageVm } from "./use-integrations-page";

export function IntegrationConfigModal({
  setShowLogs,
  setConfirmRunAll,
  setShowRunEspecifico,
  showLogs,
  logLevel,
  setLogLevel,
  logRetencion,
  setLogRetencion,
  showRunEspecifico,
  loginSeleccionado,
  setLoginSeleccionado,
  integrations,
  confirmRunAll,
}: Pick<
  IntegrationsPageVm,
  | "setShowLogs"
  | "setConfirmRunAll"
  | "setShowRunEspecifico"
  | "showLogs"
  | "logLevel"
  | "setLogLevel"
  | "logRetencion"
  | "setLogRetencion"
  | "showRunEspecifico"
  | "loginSeleccionado"
  | "setLoginSeleccionado"
  | "integrations"
  | "confirmRunAll"
>) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-300">
        Vista de desarrollador: información técnica de infraestructura. Se accede con permiso
        "gestor_integraciones" (lectura sobre este recurso).{" "}
        <span className="font-semibold">Nota:</span> métricas operativas (semáforo, última/próxima
        ejecución, conexiones) son datos de REFERENCIA (mock) — provendrían de un sistema de
        monitoreo/cron real que aún no existe.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <ServerCog size={18} className="text-moli-blue" />
            <h3 className="font-display font-semibold">Estado del Servicio</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Servicio</span>
              <span className="font-mono text-xs font-semibold">ms-login-providers</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Versión</span>
              <span className="font-mono text-xs">1.24.7</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Cron</span>
              <span className="font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Ejecutándose
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Database size={18} className="text-moli-blue" />
            <h3 className="font-display font-semibold">Conexiones</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Redis</span>
              <span className="font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Conectado
              </span>
            </div>
            <div className="font-mono text-[11px] text-muted-foreground -mt-2 pb-2 border-b">
              redis://10.116.0.7:6379
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Base de Datos</span>
              <span className="font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Conectada
              </span>
            </div>
            <div className="font-mono text-[11px] text-muted-foreground -mt-2 pb-2 border-b">
              postgres://10.116.0.7:5432/molipay
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Servicio de login</span>
              <span className="font-mono text-[11px] font-semibold">10.116.0.7:8083</span>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Layers size={18} className="text-moli-blue" />
              <h3 className="font-display font-semibold">Estadísticas paralelas</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Total de logins</span>
                <span className="font-semibold tabular-nums">6</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Grupos de ejecución</span>
                <span className="font-semibold tabular-nums">2</span>
              </div>
              <div className="py-2">
                <div className="text-muted-foreground">Próximo grupo a ejecutar</div>
                <div className="mt-2 rounded-lg bg-muted/50 p-3">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Timer size={14} className="text-moli-blue" /> Grupo A — en 45 s
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {proximoGrupo.map((l) => (
                      <span
                        key={l}
                        className="font-mono text-[11px] bg-card border border-border rounded px-1.5 py-0.5"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} className="text-moli-blue" />
            <h3 className="font-display font-semibold">Próxima ejecución</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">¿Ejecutaría ahora?</span>
              <Badge tone="warn">No — próxima corrida en 45 s</Badge>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Logins en paralelo</span>
              <span className="font-semibold tabular-nums">3</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <FileCog size={18} className="text-moli-blue" />
            <h3 className="font-display font-semibold">Controles técnicos</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <BtnOutline onClick={() => setShowLogs(true)}>
              <FileCog size={15} /> Configurar Logs
            </BtnOutline>
            <BtnOutline onClick={() => setConfirmRunAll(true)}>
              <Play size={15} /> Ejecutar Todos
            </BtnOutline>
            <BtnOutline onClick={() => setShowRunEspecifico(true)}>
              <Zap size={15} /> Ejecutar Específico
            </BtnOutline>
            <BtnOutline onClick={() => toast.success("Datos de integraciones actualizados")}>
              <RotateCw size={15} /> Actualizar Datos
            </BtnOutline>
          </div>
        </Card>
      </div>

      <FormDialog
        open={showLogs}
        onClose={() => setShowLogs(false)}
        title="Configurar Logs"
        description="Nivel de registro del servicio ms-login-providers."
        submitLabel="Guardar"
        onSubmit={() => {
          setShowLogs(false);
          toast.success(`Nivel de log actualizado a ${logLevel}`);
        }}
      >
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Nivel de log</label>
          <Select value={logLevel} onChange={(e) => setLogLevel(e.target.value)}>
            {["DEBUG", "INFO", "WARN", "ERROR"].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">
            Retención (días)
          </label>
          <Select value={logRetencion} onChange={(e) => setLogRetencion(e.target.value)}>
            {["3", "7", "15", "30"].map((n) => (
              <option key={n} value={n}>
                {n} días
              </option>
            ))}
          </Select>
        </div>
      </FormDialog>

      <FormDialog
        open={showRunEspecifico}
        onClose={() => setShowRunEspecifico(false)}
        title="Ejecutar Específico"
        description="Ejecutar manualmente un login configurado."
        submitLabel="Ejecutar"
        onSubmit={() => {
          setShowRunEspecifico(false);
          toast.success(`Ejecución manual iniciada para ${loginSeleccionado}`);
        }}
      >
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Login</label>
          <Select value={loginSeleccionado} onChange={(e) => setLoginSeleccionado(e.target.value)}>
            {integrations.map((i) => (
              <option key={i.id} value={i.id}>
                {i.id} — {i.name}
              </option>
            ))}
          </Select>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={confirmRunAll}
        onClose={() => setConfirmRunAll(false)}
        title="Ejecutar todos los logins"
        message="Se disparará una corrida manual de los 6 logins configurados. ¿Deseás continuar?"
        confirmLabel="Ejecutar todos"
        onConfirm={() => {
          toast.success("Corrida manual de todos los logins iniciada");
        }}
      />
    </div>
  );
}
