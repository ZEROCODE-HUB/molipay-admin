import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, AlertTriangle, XCircle, Activity } from "lucide-react";
import { PageHeader, Card, Stat, Badge } from "@/components/portal-shell";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/admin/modulos/")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Salud de módulos — Admin — Molly Money Life" },
      { name: "description", content: "Estado operativo de todos los módulos de la plataforma." },
    ],
  }),
});

type ModuleStatus = {
  name: string;
  status: "operativo" | "degradado" | "caído";
  latency: string;
};

const modules: ModuleStatus[] = [
  { name: "API Pública", status: "operativo", latency: "120 ms" },
  { name: "Procesador CVU", status: "operativo", latency: "210 ms" },
  { name: "QR Realtime", status: "operativo", latency: "85 ms" },
  { name: "Webhooks", status: "degradado", latency: "640 ms" },
  { name: "Conciliación Batch", status: "operativo", latency: "—" },
  { name: "Módulo de Pagos", status: "operativo", latency: "95 ms" },
  { name: "KYC/KYB", status: "caído", latency: "—" },
  { name: "Notificaciones", status: "operativo", latency: "45 ms" },
  { name: "Módulo de Impuestos", status: "operativo", latency: "150 ms" },
  { name: "Transferencias", status: "degradado", latency: "380 ms" },
];

function StatusIcon({ status }: { status: ModuleStatus["status"] }) {
  if (status === "operativo") return <CheckCircle2 size={18} className="text-primary" />;
  if (status === "degradado") return <AlertTriangle size={18} className="text-amber-500" />;
  return <XCircle size={18} className="text-red-500" />;
}

function statusBadgeTone(status: ModuleStatus["status"]): "success" | "warn" | "danger" {
  if (status === "operativo") return "success";
  if (status === "degradado") return "warn";
  return "danger";
}

function Page() {
  const operativos = modules.filter((m) => m.status === "operativo").length;
  const degradados = modules.filter((m) => m.status === "degradado").length;
  const caidos = modules.filter((m) => m.status === "caído").length;

  return (
    <>
      <PageHeader
        title="Salud de módulos"
        description="Estado operativo de todos los módulos de la plataforma."
        action={
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <Activity size={14} className="text-primary" /> Última actualización: hace 2 min
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Stat label="Módulos totales" value={String(modules.length)} />
        <Stat label="Operativos" value={String(operativos)} sub={`${Math.round((operativos / modules.length) * 100)}%`} />
        <Stat label="Degradados" value={String(degradados)} sub={`${Math.round((degradados / modules.length) * 100)}%`} />
        <Stat label="Caídos" value={String(caidos)} sub={`${Math.round((caidos / modules.length) * 100)}%`} />
        <Stat label="Latencia promedio" value="215 ms" sub="últimos 5 min" />
      </div>

      <Card>
        <div className="space-y-1">
          {modules.map((m) => (
            <div key={m.name} className="flex items-center justify-between py-2.5 border-b last:border-0">
              <div className="flex items-center gap-3">
                <StatusIcon status={m.status} />
                <span className="font-medium text-sm">{m.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-mono">{m.latency}</span>
                <Badge tone={statusBadgeTone(m.status)}>{m.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
