import { createFileRoute } from "@tanstack/react-router";
import { DataTable, type Column } from "@/components/data-table";

export const Route = createFileRoute("/admin/configuracion/logins")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Logins configurados — Admin — Moli" },
      { name: "description", content: "Logins de integraciones configurados en la plataforma." },
    ],
  }),
});

type LoginConfig = {
  nombre: string;
  negocio: string;
  programacion: string;
  ultimaEjecucion: string;
  proximaEjecucion: string;
  tiempoRestante: string;
  ejecuciones: number;
};

const loginsConfigurados: LoginConfig[] = [
  {
    nombre: "pct:wondersoft",
    negocio: "Wondersoft (QR)",
    programacion: "*/15 * * * *",
    ultimaEjecucion: "11/08/2026 08:00",
    proximaEjecucion: "11/08/2026 08:15",
    tiempoRestante: "02:41",
    ejecuciones: 12480,
  },
  {
    nombre: "pds:pago_mis_cuentas",
    negocio: "Pago Mis Cuentas",
    programacion: "*/15 * * * *",
    ultimaEjecucion: "11/08/2026 07:55",
    proximaEjecucion: "11/08/2026 08:10",
    tiempoRestante: "00:12",
    ejecuciones: 8931,
  },
  {
    nombre: "bank.bdc_conecta",
    negocio: "BDC Conecta",
    programacion: "*/30 * * * *",
    ultimaEjecucion: "11/08/2026 07:30",
    proximaEjecucion: "11/08/2026 08:00",
    tiempoRestante: "05:44",
    ejecuciones: 4572,
  },
  {
    nombre: "cpf:coelsa_cpf",
    negocio: "Coelsa — CPF",
    programacion: "*/15 * * * *",
    ultimaEjecucion: "11/08/2026 08:05",
    proximaEjecucion: "11/08/2026 08:20",
    tiempoRestante: "08:01",
    ejecuciones: 21003,
  },
  {
    nombre: "pct:coelsa_cvu",
    negocio: "Coelsa — CVU",
    programacion: "*/15 * * * *",
    ultimaEjecucion: "11/08/2026 08:02",
    proximaEjecucion: "11/08/2026 08:17",
    tiempoRestante: "05:33",
    ejecuciones: 20177,
  },
  {
    nombre: "pct:coelsa_debin",
    negocio: "Coelsa — DEBIN",
    programacion: "*/15 * * * *",
    ultimaEjecucion: "11/08/2026 07:45",
    proximaEjecucion: "11/08/2026 08:10",
    tiempoRestante: "00:51",
    ejecuciones: 18954,
  },
];

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
];

function Page() {
  return (
    <div className="space-y-2">
      <h3 className="font-display font-semibold text-lg">Logins Configurados</h3>
      <DataTable
        columns={columns}
        data={loginsConfigurados}
        keyExtractor={(r) => r.nombre}
        pageSize={10}
      />
    </div>
  );
}
