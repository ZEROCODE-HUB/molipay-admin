import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/portal-shell";
import { asignacionesIniciales, type AsignacionImpuesto } from "@/data/impuestos";

export const Route = createFileRoute("/admin/comercios/impuestos/usuarios")({
  head: () => ({ meta: [{ title: "Usuarios con impuestos — Admin — Moli" }] }),
  component: Page,
});

function Page() {
  const columns: Column<AsignacionImpuesto>[] = [
    {
      key: "legajo",
      label: "Legajo",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums text-xs">#{r.legajo}</span>,
    },
    {
      key: "usuario",
      label: "Usuario",
      sortable: true,
      filterable: true,
      render: (r) => r.usuario,
    },
    {
      key: "nombreCompleto",
      label: "Nombre completo",
      sortable: true,
      filterable: true,
      render: (r) => r.nombreCompleto,
    },
    {
      key: "impuesto",
      label: "Impuesto aplicado",
      sortable: true,
      filterable: true,
      render: (r) => r.impuesto,
    },
    {
      key: "tipo",
      label: "Tipo de impuesto",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Porcentaje", "Fijo", "Otro"],
      render: (r) => r.tipo,
    },
    {
      key: "monto",
      label: "Monto",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.monto}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Activo", "Inactivo"],
      render: (r) => <Badge tone={r.estado === "Activo" ? "success" : "neutral"}>{r.estado}</Badge>,
    },
    {
      key: "fechaAsignacion",
      label: "Fecha de asignación",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono tabular-nums">{r.fechaAsignacion}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Usuarios con impuestos"
        description="Historial de asignaciones de impuestos a usuarios."
      />
      <DataTable
        columns={columns}
        data={asignacionesIniciales}
        keyExtractor={(r) => `${r.usuario}-${r.impuesto}`}
        pageSize={10}
      />
    </>
  );
}
