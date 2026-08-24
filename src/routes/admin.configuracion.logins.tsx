import { createFileRoute } from "@tanstack/react-router";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader, Badge } from "@/components/portal-shell";
import { useIntegraciones } from "@/hooks/useIntegraciones";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import type { Integracion } from "@/lib/api/types";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export const Route = createFileRoute("/admin/configuracion/logins")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Logins configurados — Admin — Moli" },
      { name: "description", content: "Logins de integraciones configurados en la plataforma." },
    ],
  }),
});

type Salud = "ok" | "warning" | "error";

const saludMeta: Record<
  Salud,
  { label: string; tone: "success" | "warn" | "danger"; icon: typeof CheckCircle2 }
> = {
  ok: { label: "Funcionando correctamente", tone: "success", icon: CheckCircle2 },
  warning: { label: "Ejecución reciente con demoras", tone: "warn", icon: AlertTriangle },
  error: { label: "Última ejecución fallida", tone: "danger", icon: XCircle },
};

// Mock data for operational metrics — ⚠️ datos de REFERENCIA (mock)
// Provenientes de un sistema de monitoreo/cron real que aún no existe.
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

const mockTiempoRestante: Record<string, string> = {
  "pct:wondersoft": "02:41",
  "pds:pago_mis_cuentas": "00:12",
  "bank.bdc_conecta": "05:44",
  "cpf:coelsa_cpf": "08:01",
  "pct:coelsa_cvu": "05:33",
  "pct:coelsa_debin": "00:51",
};

const mockEjecuciones: Record<string, number> = {
  "pct:wondersoft": 12480,
  "pds:pago_mis_cuentas": 8931,
  "bank.bdc_conecta": 4572,
  "cpf:coelsa_cpf": 21003,
  "pct:coelsa_cvu": 20177,
  "pct:coelsa_debin": 18954,
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
  salud: Salud;
};

function Page() {
  const {
    rows: integraciones,
    isLoading,
    isError,
    isEmpty,
  } = useIntegraciones({
    page: 0,
    pageSize: 100,
  });

  const buildUI = (i: Integracion): LoginConfig => ({
    nombre: i.id,
    negocio: i.nombre,
    programacion: mockProgramacion[i.id] ?? "—",
    ultimaEjecucion: mockUltimaEjecucion[i.id] ?? "—",
    proximaEjecucion: mockProximaEjecucion[i.id] ?? "—",
    tiempoRestante: mockTiempoRestante[i.id] ?? "—",
    ejecuciones: mockEjecuciones[i.id] ?? 0,
    salud: mockSalud[i.id] ?? "ok",
  });

  const loginsConfigurados = integraciones.map(buildUI);

  const saludMeta: Record<
    Salud,
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
        const meta = saludMeta[r.salud];
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
