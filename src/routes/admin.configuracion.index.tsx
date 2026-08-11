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
} from "lucide-react";
import { Card, Badge, BtnOutline } from "@/components/portal-shell";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useDeveloperMode } from "@/hooks/use-developer-mode";
import { toast } from "sonner";

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

type Integracion = {
  id: string;
  nombre: string;
  salud: Salud;
  ultimaEjecucion: string;
  proximaEjecucion: string;
  ejecuciones: number;
};

const integraciones: Integracion[] = [
  {
    id: "pct:wondersoft",
    nombre: "Wondersoft (QR)",
    salud: "ok",
    ultimaEjecucion: "11/08/2026 08:00",
    proximaEjecucion: "11/08/2026 08:15",
    ejecuciones: 12480,
  },
  {
    id: "pds:pago_mis_cuentas",
    nombre: "Pago Mis Cuentas",
    salud: "ok",
    ultimaEjecucion: "11/08/2026 07:55",
    proximaEjecucion: "11/08/2026 08:10",
    ejecuciones: 8931,
  },
  {
    id: "bank.bdc_conecta",
    nombre: "BDC Conecta",
    salud: "warning",
    ultimaEjecucion: "11/08/2026 07:30",
    proximaEjecucion: "11/08/2026 08:00",
    ejecuciones: 4572,
  },
  {
    id: "cpf:coelsa_cpf",
    nombre: "Coelsa — CPF",
    salud: "ok",
    ultimaEjecucion: "11/08/2026 08:05",
    proximaEjecucion: "11/08/2026 08:20",
    ejecuciones: 21003,
  },
  {
    id: "pct:coelsa_cvu",
    nombre: "Coelsa — CVU",
    salud: "ok",
    ultimaEjecucion: "11/08/2026 08:02",
    proximaEjecucion: "11/08/2026 08:17",
    ejecuciones: 20177,
  },
  {
    id: "pct:coelsa_debin",
    nombre: "Coelsa — DEBIN",
    salud: "error",
    ultimaEjecucion: "11/08/2026 07:45",
    proximaEjecucion: "11/08/2026 08:10",
    ejecuciones: 18954,
  },
];

const saludMeta: Record<
  Salud,
  { label: string; tone: "success" | "warn" | "danger"; icon: typeof CheckCircle2 }
> = {
  ok: { label: "Funcionando correctamente", tone: "success", icon: CheckCircle2 },
  warning: { label: "Ejecución reciente con demoras", tone: "warn", icon: AlertTriangle },
  error: { label: "Última ejecución fallida", tone: "danger", icon: XCircle },
};

const proximoGrupo = ["pct:wondersoft", "pds:pago_mis_cuentas", "cpf:coelsa_cpf"];

function Page() {
  const { devMode } = useDeveloperMode();

  const [showLogs, setShowLogs] = useState(false);
  const [logNivel, setLogNivel] = useState("INFO");
  const [logRetencion, setLogRetencion] = useState("7");
  const [showEjecutarEspecifico, setShowEjecutarEspecifico] = useState(false);
  const [loginSeleccionado, setLoginSeleccionado] = useState(integraciones[0].id);
  const [confirmEjecutarTodos, setConfirmEjecutarTodos] = useState(false);

  if (!devMode) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {integraciones.map((i) => {
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
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-300">
        Vista de desarrollador: información técnica de infraestructura. Se accede con el rol
        Developer (lectura sobre este recurso).{" "}
        <span className="font-semibold">Pregunta abierta:</span> ¿esta vista vive dentro del panel
        (protegida por rol) o se separa en un portal técnico? — pendiente de confirmación.
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
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Nivel de log</label>
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
  );
}
