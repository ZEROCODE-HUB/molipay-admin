import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Users, Activity, ShieldAlert, TrendingDown, CheckCircle2, XCircle, Eye } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PageHeader, Card, Stat, Badge, BtnOutline } from "@/components/portal-shell";

export const Route = createFileRoute("/admin/configuracion/")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Gestor de Logins — Admin — Molly Money Life" },
      { name: "description", content: "Gestión de inicios de sesión y actividad de usuarios." },
    ],
  }),
});

type LoginActivity = {
  id: number;
  usuario: string;
  email: string;
  ip: string;
  fecha: string;
  estado: "éxito" | "fallo";
};

const loginData: LoginActivity[] = [
  { id: 1, usuario: "Empresa Demo SA", email: "admin@demo.com", ip: "192.168.1.10", fecha: "17/07/2026 09:15", estado: "éxito" },
  { id: 2, usuario: "Microcreditos del Sur", email: "ops@microcreditos.com", ip: "190.210.33.45", fecha: "17/07/2026 09:02", estado: "éxito" },
  { id: 3, usuario: "Pagos Express SRL", email: "soporte@pagos-express.com", ip: "201.132.78.12", fecha: "17/07/2026 08:55", estado: "fallo" },
  { id: 4, usuario: "Administradora Plaza", email: "admin@admplaza.com", ip: "186.124.56.89", fecha: "17/07/2026 08:30", estado: "éxito" },
  { id: 5, usuario: "Consorcio Larrea 1200", email: "tesoreria@larrea1200.com", ip: "190.45.67.23", fecha: "17/07/2026 08:12", estado: "éxito" },
  { id: 6, usuario: "Comercializadora ABC", email: "contable@comercabc.com", ip: "200.89.12.34", fecha: "17/07/2026 07:55", estado: "fallo" },
  { id: 7, usuario: "Municipalidad de Chivilcoy", email: "cobranzas@chivilcoy.gov.ar", ip: "181.67.90.11", fecha: "17/07/2026 07:30", estado: "éxito" },
  { id: 8, usuario: "Desconocido", email: "bot@malicious.com", ip: "45.33.22.156", fecha: "17/07/2026 07:15", estado: "fallo" },
  { id: 9, usuario: "Inmobiliaria del Centro", email: "admin@inmocentro.com", ip: "190.123.45.67", fecha: "17/07/2026 06:45", estado: "éxito" },
  { id: 10, usuario: "Clínica Privada del Sur", email: "sys@clinicapr.com", ip: "192.168.2.50", fecha: "17/07/2026 06:20", estado: "éxito" },
  { id: 11, usuario: "Colegio San Martín", email: "admisiones@sanmartin.edu", ip: "186.78.34.90", fecha: "16/07/2026 23:10", estado: "fallo" },
  { id: 12, usuario: "Gimnasio FitLife", email: "caja@fitlife.com", ip: "190.210.11.22", fecha: "16/07/2026 22:30", estado: "fallo" },
];

function Page() {
  const [selected, setSelected] = useState<Set<string | number>>(new Set());

  const toggle = (id: string | number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === loginData.length) setSelected(new Set());
    else setSelected(new Set(loginData.map((d) => d.id)));
  };

  const getActions = (r: LoginActivity): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => {} },
  ];

  const columns: Column<LoginActivity>[] = [
    {
      key: "usuario",
      label: "Usuario",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-semibold">{r.usuario}</span>,
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      filterable: true,
      render: (r) => <span className="text-xs text-muted-foreground">{r.email}</span>,
    },
    {
      key: "ip",
      label: "IP",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono text-xs">{r.ip}</span>,
    },
    {
      key: "fecha",
      label: "Fecha",
      sortable: true,
      render: (r) => r.fecha,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {r.estado === "éxito" ? (
            <CheckCircle2 size={14} className="text-primary" />
          ) : (
            <XCircle size={14} className="text-red-500" />
          )}
          <Badge tone={r.estado === "éxito" ? "success" : "danger"}>{r.estado}</Badge>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Gestor de Logins"
        description="Monitoreo de inicios de sesión y métricas de acceso."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Total de usuarios" value="312" sub="registrados" />
        <Stat label="Usuarios activos hoy" value="48" sub="últimas 24 h" />
        <Stat label="Intentos de login fallidos (24h)" value="7" sub="3 bloqueados" />
        <Stat label="Tasa de error" value="4.2%" sub="últimos 7 días" />
      </div>

      <Card className="mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users size={20} className="text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Usuarios únicos hoy</div>
              <div className="text-lg font-semibold">36</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Activity size={20} className="text-amber-600" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Sesiones activas</div>
              <div className="text-lg font-semibold">12</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <ShieldAlert size={20} className="text-red-600" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">IPs bloqueadas</div>
              <div className="text-lg font-semibold">3</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <TrendingDown size={20} className="text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Tiempo promedio</div>
              <div className="text-lg font-semibold">2.4 s</div>
            </div>
          </div>
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={loginData}
        keyExtractor={(r) => r.id}
        selection={{ selected, onToggle: toggle, onToggleAll: toggleAll }}
        pageSize={10}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />
    </>
  );
}
