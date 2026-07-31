import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/portal-shell";
import { asignacionesIniciales, type AsignacionImpuesto } from "@/data/impuestos";

export const Route = createFileRoute("/admin/modulos/impuestos/usuarios")({
  head: () => ({ meta: [{ title: "Usuarios con Impuestos — Admin — Moli" }] }),
  component: Page,
});

function Page() {
  const columns: Column<AsignacionImpuesto>[] = [
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
      label: "Impuesto",
      sortable: true,
      filterable: true,
      render: (r) => r.impuesto,
    },
    {
      key: "tipo",
      label: "Tipo",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Porcentaje", "Fijo", "Otro"],
      render: (r) => r.tipo,
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
      render: (r) => r.fechaAsignacion,
    },
  ];

  return (
    <>
      <PageHeader
        title="Usuarios con Impuestos"
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
