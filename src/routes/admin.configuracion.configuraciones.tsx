import { createFileRoute } from "@tanstack/react-router";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/portal-shell";

export const Route = createFileRoute("/admin/configuracion/configuraciones")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Configuraciones de login — Admin — Moli" },
      { name: "description", content: "Configuraciones de los logins de las integraciones." },
    ],
  }),
});

type ConfiguracionLogin = { nombre: string; url: string; metodo: string };

const configuraciones: ConfiguracionLogin[] = [
  { nombre: "pct:wondersoft", url: "https://wondersoft.providers.ar/ws/login", metodo: "POST" },
  {
    nombre: "pds:pago_mis_cuentas",
    url: "https://api.pagomiscuentas.com/v2/auth/login",
    metodo: "POST",
  },
  {
    nombre: "bank.bdc_conecta",
    url: "http://10.116.0.7:8083/ms-login-providers/login",
    metodo: "POST",
  },
  { nombre: "cpf:coelsa_cpf", url: "https://coelsa.com.ar/cpf/ws/login", metodo: "POST" },
  { nombre: "pct:coelsa_cvu", url: "https://coelsa.com.ar/cvu/ws/login", metodo: "POST" },
  { nombre: "pct:coelsa_debin", url: "https://coelsa.com.ar/debin/ws/login", metodo: "POST" },
];

const columns: Column<ConfiguracionLogin>[] = [
  {
    key: "nombre",
    label: "Nombre",
    sortable: true,
    filterable: true,
    render: (r) => <span className="font-mono text-xs font-semibold">{r.nombre}</span>,
  },
  {
    key: "url",
    label: "URL",
    sortable: true,
    filterable: true,
    render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.url}</span>,
  },
  {
    key: "metodo",
    label: "Método",
    sortable: true,
    filterable: "enum",
    filterOptions: ["GET", "POST", "PUT", "PATCH"],
    render: (r) => <Badge tone="neutral">{r.metodo}</Badge>,
  },
];

function Page() {
  return (
    <div className="space-y-2">
      <h3 className="font-display font-semibold text-lg">Configuraciones de Login</h3>
      <DataTable
        columns={columns}
        data={configuraciones}
        keyExtractor={(r) => r.nombre}
        pageSize={10}
      />
    </div>
  );
}
