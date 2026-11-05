import type { Health } from "@/features/system/integrations.rules";
import { mockExecutions } from "@/features/system/integrations.rules";
import { mockProximaExecution } from "@/features/system/integrations.rules";
import { mockUltimaExecution } from "@/features/system/integrations.rules";
import { mockHealth } from "@/features/system/integrations.rules";
import { DataTable,type Column } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";
import { Badge } from "@/shared/ui/badge";
import { useIntegrations } from "../integrations.hooks";
import type { Integration } from "../integrations.types";
import { CheckCircle2,AlertTriangle,XCircle } from "lucide-react";
import { PermissionGuard } from "@/features/rbac/access-gate";

const mockTiempoRestante: Record<string, string> = {
  "pct:wondersoft": "02:41",
  "pds:pago_mis_cuentas": "00:12",
  "bank.bdc_conecta": "05:44",
  "cpf:coelsa_cpf": "08:01",
  "pct:coelsa_cvu": "05:33",
  "pct:coelsa_debin": "00:51",
};

const mockProgramacion: Record<string, string> = {
  "pct:wondersoft": "*/15 * * * *",
  "pds:pago_mis_cuentas": "*/15 * * * *",
  "bank.bdc_conecta": "*/30 * * * *",
  "cpf:coelsa_cpf": "*/15 * * * *",
  "pct:coelsa_cvu": "*/15 * * * *",
  "pct:coelsa_debin": "*/15 * * * *",
};

type LoginConfig = {
  nombre: string;
  negocio: string;
  programacion: string;
  ultimaEjecucion: string;
  proximaEjecucion: string;
  tiempoRestante: string;
  ejecuciones: number;
  salud: Health;
};

export function IntegrationLoginsPage() {
  const { rows: integrations } = useIntegrations({
    page: 0,
    pageSize: 100,
  });

  const buildUI = (i: Integration): LoginConfig => ({
    nombre: i.id,
    negocio: i.name,
    programacion: mockProgramacion[i.id] ?? "—",
    ultimaEjecucion: mockUltimaExecution[i.id] ?? "—",
    proximaEjecucion: mockProximaExecution[i.id] ?? "—",
    tiempoRestante: mockTiempoRestante[i.id] ?? "—",
    ejecuciones: mockExecutions[i.id] ?? 0,
    salud: mockHealth[i.id] ?? "ok",
  });

  const loginsConfigurados = integrations.map(buildUI);

  const healthMeta: Record<
    Health,
    { label: string; tone: "success" | "warn" | "danger"; icon: typeof CheckCircle2 }
  > = {
    ok: { label: "Funcionando correctamente", tone: "success", icon: CheckCircle2 },
    warning: { label: "Ejecución reciente con demoras", tone: "warn", icon: AlertTriangle },
    error: { label: "Última ejecución fallida", tone: "danger", icon: XCircle },
  };

  const columns: Column<LoginConfig>[] = [
    {
      key: "nombre",
      label: "Nombre",
      sortable: true,
      filterable: true,
      render: (r) => (
        <div>
          <div className="font-mono text-xs font-semibold">{r.nombre}</div>
          <div className="text-[11px] text-muted-foreground">{r.negocio}</div>
        </div>
      ),
    },
    {
      key: "programacion",
      label: "Programación",
      sortable: true,
      render: (r) => <span className="font-mono text-xs">{r.programacion}</span>,
    },
    {
      key: "ultimaEjecucion",
      label: "Última ejecución",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono text-xs tabular-nums">{r.ultimaEjecucion}</span>,
    },
    {
      key: "proximaEjecucion",
      label: "Próxima ejecución",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono text-xs tabular-nums">{r.proximaEjecucion}</span>,
    },
    {
      key: "tiempoRestante",
      label: "Tiempo restante",
      sortable: true,
      render: (r) => <span className="font-mono text-xs tabular-nums">{r.tiempoRestante}</span>,
    },
    {
      key: "ejecuciones",
      label: "Ejecuciones",
      sortable: true,
      render: (r) => (
        <span className="font-semibold tabular-nums">{r.ejecuciones.toLocaleString()}</span>
      ),
    },
    {
      key: "salud",
      label: "Estado",
      sortable: true,
      render: (r) => {
        const meta = healthMeta[r.salud];
        return (
          <Badge tone={meta.tone} className="gap-1">
            <meta.icon size={12} />
            {meta.label}
          </Badge>
        );
      },
    },
  ];

  return (
    <PermissionGuard recurso="gestor_integraciones">
      <div className="space-y-2">
        <PageHeader
          title="Logins configurados"
          description="Logins de integraciones configurados en la plataforma. Métricas operativas (semáforo, última/próxima ejecución, tiempo restante) son datos de REFERENCIA (mock) — provendrían de un sistema de monitoreo/cron real."
        />
        <DataTable
          columns={columns}
          data={loginsConfigurados}
          keyExtractor={(r) => r.nombre}
          pageSize={10}
          showDownloadButton={false}
        />
      </div>
    </PermissionGuard>
  );
}
