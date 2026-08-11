import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Ban } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader, Badge } from "@/components/portal-shell";

export const Route = createFileRoute("/admin/comercios/apis/restricciones")({
  component: Page,
  head: () => ({
    meta: [{ title: "APIs externas — Restricciones — Admin — Moli" }],
  }),
});

type Restriccion = {
  id: number;
  email: string;
  legajo: string;
  nombreCompleto: string;
  estado: "Restringiendo" | "No restringiendo";
  fechaCreacion: string;
  fechaExpiracion: string;
};

const dataInicial: Restriccion[] = [
  {
    id: 1,
    email: "usuario1@correo.com",
    legajo: "1001",
    nombreCompleto: "Juan Pérez",
    estado: "Restringiendo",
    fechaCreacion: "2026-03-01 10:12",
    fechaExpiracion: "2026-09-01",
  },
  {
    id: 2,
    email: "usuario2@correo.com",
    legajo: "1002",
    nombreCompleto: "María López",
    estado: "Restringiendo",
    fechaCreacion: "2026-04-15 14:30",
    fechaExpiracion: "2026-10-15",
  },
  {
    id: 3,
    email: "usuario3@correo.com",
    legajo: "1003",
    nombreCompleto: "Carlos Gómez",
    estado: "No restringiendo",
    fechaCreacion: "2026-05-02 09:05",
    fechaExpiracion: "2026-11-02",
  },
  {
    id: 4,
    email: "usuario4@correo.com",
    legajo: "1004",
    nombreCompleto: "Romina Díaz",
    estado: "Restringiendo",
    fechaCreacion: "2026-06-10 16:45",
    fechaExpiracion: "2026-12-10",
  },
];

function Page() {
  const [data, setData] = useState<Restriccion[]>(dataInicial);

  const remover = (id: number) => {
    setData((prev) => prev.filter((r) => r.id !== id));
  };

  const columns: Column<Restriccion>[] = [
    {
      key: "email",
      label: "Email",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-medium">{r.email}</span>,
    },
    {
      key: "legajo",
      label: "Legajo",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono tabular-nums text-xs">#{r.legajo}</span>,
    },
    {
      key: "nombreCompleto",
      label: "Nombre completo",
      sortable: true,
      filterable: true,
      render: (r) => r.nombreCompleto,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Restringiendo", "No restringiendo"],
      render: (r) => (
        <Badge tone={r.estado === "Restringiendo" ? "danger" : "neutral"}>{r.estado}</Badge>
      ),
    },
    {
      key: "fechaCreacion",
      label: "Fecha de creación",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono tabular-nums">{r.fechaCreacion}</span>,
    },
    {
      key: "fechaExpiracion",
      label: "Fecha de expiración",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono tabular-nums">{r.fechaExpiracion}</span>,
    },
  ];

  return (
    <>
      <PageHeader title="Restricciones" description="Restricciones de usuarios de API." />
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        pageSize={10}
        actions={(r) => (
          <button
            type="button"
            onClick={() => remover(r.id)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:underline"
          >
            <Ban size={14} /> Remover
          </button>
        )}
      />
    </>
  );
}
