import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ServerCog,
  Database,
  Layers,
  Timer,
  Play,
  FileCog,
  RotateCw,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { Card, Badge, BtnOutline } from "@/components/portal-shell";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useDeveloperMode } from "@/hooks/use-developer-mode";
import { toast } from "sonner";
import { useIntegraciones } from "@/hooks/useIntegraciones";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import type { Integracion } from "@/lib/api/types";

export const Route = createFileRoute("/admin/configuracion/")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Gestor de Integraciones — Admin — Moli" },
      { name: "description", content: "Estado y gestión de las integraciones de la plataforma." },
    ],
  }),
});

type Salud = "ok" | "warning" | "error";

type IntegracionUI = {
  id: string;
  nombre: string;
  proveedor: string;
  salud: Salud;
  ultimaEjecucion: string;
  proximaEjecucion: string;
  ejecuciones: number;
};

const saludMeta: Record<
  Salud,
  { label: string; tone: "success" | "warn" | "danger"; icon: typeof CheckCircle2 }
> = {
  ok: { label: "Funcionando correctamente", tone: "success", icon: CheckCircle2 },
  warning: { label: "Ejecución reciente con demoras", tone: "warn", icon: AlertTriangle },
  error: { label: "Última ejecución fallida", tone: "danger", icon: XCircle },
};

const proximoGrupo = ["pct:wondersoft", "pds:pago_mis_cuentas", "cpf:coelsa_cpf"];

// Mock data for operational metrics (semáforo + métricas operativas)
// ⚠️ Estos datos son MOCK de referencia — provendrían de un sistema de monitoreo real
// No hay tabla de métricas operativas en BD; pendiente de sistema de monitoreo/cron real.
const mockSalud: Record<string, Salud> = {
  "pct:wondersoft": "ok",
  "pds:pago_mis_cuentas": "ok",
  "bank.bdc_conecta": "warning",
  "cpf:coelsa_cpf": "ok",
  "pct:coelsa_cvu": "ok",
  "pct:coelsa_debin": "error",
};

const mockUltimaEjecucion: Record<string, string> = {
  "pct:wondersoft": "11/08/2026 08:00",
  "pds:pago_mis_cuentas": "11/08/2026 07:55",
  "bank.bdc_conecta": "11/08/2026 07:30",
  "cpf:coelsa_cpf": "11/08/2026 08:05",
  "pct:coelsa_cvu": "11/08/2026 08:02",
  "pct:coelsa_debin": "11/08/2026 07:45",
};

const mockProximaEjecucion: Record<string, string> = {
  "pct:wondersoft": "11/08/2026 08:15",
  "pds:pago_mis_cuentas": "11/08/2026 08:10",
  "bank.bdc_conecta": "11/08/2026 08:00",
  "cpf:coelsa_cpf": "11/08/2026 08:20",
  "pct:coelsa_cvu": "11/08/2026 08:17",
  "pct:coelsa_debin": "11/08/2026 08:10",
};

const mockEjecuciones: Record<string, number> = {
  "pct:wondersoft": 12480,
  "pds:pago_mis_cuentas": 8931,
  "bank.bdc_conecta": 4572,
  "cpf:coelsa_cpf": 21003,
  "pct:coelsa_cvu": 20177,
  "pct:coelsa_debin": 18954,
};

function Page() {
  const { devMode } = useDeveloperMode();
  const { can } = useCan();
  const {
    rows: integraciones,
    isLoading,
    isError,
    isEmpty,
  } = useIntegraciones({
    page: 0,
    pageSize: 100,
  });

  const [showLogs, setShowLogs] = useState(false);
  const [logNivel, setLogNivel] = useState("INFO");
  const [logRetencion, setLogRetencion] = useState("7");
  const [showEjecutarEspecifico, setShowEjecutarEspecifico] = useState(false);
  const [loginSeleccionado, setLoginSeleccionado] = useState("pct:wondersoft");
  const [confirmEjecutarTodos, setConfirmEjecutarTodos] = useState(false);

  const buildUI = (i: Integracion): IntegracionUI => ({
    id: i.id,
    nombre: i.nombre,
    proveedor: i.proveedor,
    salud: mockSalud[i.id] ?? "ok",
    ultimaEjecucion: mockUltimaEjecucion[i.id] ?? "—",
    proximaEjecucion: mockProximaEjecucion[i.id] ?? "—",
    ejecuciones: mockEjecuciones[i.id] ?? 0,
  });

  const integracionesUI = integraciones.map(buildUI);

  if (!devMode) {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando integraciones…
        </div>
      );
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
        {integracionesUI.map((i) => {
          const meta = saludMeta[i.salud];
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
              <BtnOutline onClick={() => setConfirmEjecutarTodos(true)}>
                <Play size={15} /> Ejecutar Todos
              </BtnOutline>
              <BtnOutline onClick={() => setShowEjecutarEspecifico(true)}>
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
            toast.success(`Nivel de log actualizado a ${logNivel}`);
          }}
        >
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">
              Nivel de log
            </label>
            <select
              value={logNivel}
              onChange={(e) => setLogNivel(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            >
              {["DEBUG", "INFO", "WARN", "ERROR"].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">
              Retención (días)
            </label>
            <select
              value={logRetencion}
              onChange={(e) => setLogRetencion(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            >
              {["3", "7", "15", "30"].map((n) => (
                <option key={n} value={n}>
                  {n} días
                </option>
              ))}
            </select>
          </div>
        </FormDialog>

        <FormDialog
          open={showEjecutarEspecifico}
          onClose={() => setShowEjecutarEspecifico(false)}
          title="Ejecutar Específico"
          description="Ejecutar manualmente un login configurado."
          submitLabel="Ejecutar"
          onSubmit={() => {
            setShowEjecutarEspecifico(false);
            toast.success(`Ejecución manual iniciada para ${loginSeleccionado}`);
          }}
        >
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Login</label>
            <select
              value={loginSeleccionado}
              onChange={(e) => setLoginSeleccionado(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            >
              {integraciones.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.id} — {i.nombre}
                </option>
              ))}
            </select>
          </div>
        </FormDialog>

        <ConfirmDialog
          open={confirmEjecutarTodos}
          onClose={() => setConfirmEjecutarTodos(false)}
          title="Ejecutar todos los logins"
          message="Se disparará una corrida manual de los 6 logins configurados. ¿Deseás continuar?"
          confirmLabel="Ejecutar todos"
          onConfirm={() => toast.success("Corrida manual de todos los logins iniciada")}
        />
      </div>
    </PermissionGuard>
  );
}
