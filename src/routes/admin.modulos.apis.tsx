import { createFileRoute } from "@tanstack/react-router";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader, Badge } from "@/components/portal-shell";

export const Route = createFileRoute("/admin/modulos/apis")({
  component: Page,
  head: () => ({
    meta: [
      { title: "APIs externas — Admin — Molly Money Life" },
      { name: "description", content: "Integraciones con APIs externas de la plataforma." },
    ],
  }),
});

// Evaluar si este detalle técnico debe vivir aquí o en un panel técnico separado (Sección 7).

type ApiIntegration = {
  id: number;
  usuario: string;
  estado: "conectado" | "desconectado" | "error" | "pendiente";
  endpoints: string;
  restricciones: string;
};

const data: ApiIntegration[] = [
  { id: 1, usuario: "AFIP", estado: "conectado", endpoints: "/factura, /padron", restricciones: "150 req/min" },
  { id: 2, usuario: "BCRA", estado: "conectado", endpoints: "/cotizacion, /estadisticas", restricciones: "60 req/min" },
  { id: 3, usuario: "ARCA", estado: "conectado", endpoints: "/recaudacion, /deuda", restricciones: "100 req/min" },
  { id: 4, usuario: "Renaper", estado: "error", endpoints: "/persona", restricciones: "30 req/min" },
  { id: 5, usuario: "UIF", estado: "conectado", endpoints: "/reporte, /consulta", restricciones: "20 req/min" },
  { id: 6, usuario: "Banco Nación", estado: "desconectado", endpoints: "/transferencia, /saldo", restricciones: "—" },
  { id: 7, usuario: "Mercado Pago", estado: "conectado", endpoints: "/pago, /reembolso", restricciones: "200 req/min" },
  { id: 8, usuario: "Nosis", estado: "pendiente", endpoints: "/score, /identidad", restricciones: "—" },
];

function statusBadgeTone(estado: ApiIntegration["estado"]): "success" | "danger" | "warn" | "neutral" {
  if (estado === "conectado") return "success";
  if (estado === "error") return "danger";
  if (estado === "desconectado") return "warn";
  return "neutral";
}

function Page() {
  const columns: Column<ApiIntegration>[] = [
    {
      key: "usuario",
      label: "Usuario",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-semibold">{r.usuario}</span>,
    },
    {
      key: "estado",
      label: "Estado de integración",
      sortable: true, filterable: "enum", filterOptions: ["conectado", "desconectado", "error", "pendiente"],
      render: (r) => <Badge tone={statusBadgeTone(r.estado)}>{r.estado}</Badge>,
    },
    {
      key: "endpoints",
      label: "Endpoints",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono text-xs">{r.endpoints}</span>,
    },
    {
      key: "restricciones",
      label: "Restricciones",
      sortable: true, filterable: true,
      render: (r) => <span className="text-muted-foreground">{r.restricciones}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="APIs externas"
        description="Integraciones con servicios externos de la plataforma."
      />
      <DataTable columns={columns} data={data} keyExtractor={(r) => r.id} pageSize={10} />
    </>
  );
}
