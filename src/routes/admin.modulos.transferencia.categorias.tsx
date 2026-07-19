import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader, Badge, BtnPrimary, BtnOutline, Input, Label } from "@/components/portal-shell";
import { FormDialog } from "@/components/form-dialog";

export const Route = createFileRoute("/admin/modulos/transferencia/categorias")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Códigos de categoría — Admin — Molly Money Life" },
      { name: "description", content: "Administración de códigos de categoría para organizaciones." },
    ],
  }),
});

type Categoria = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  estado: "activo" | "inactivo";
};

const initialData: Categoria[] = [
  { id: 1, codigo: "CAT-001", nombre: "Consorcio", descripcion: "Edificios residenciales y comerciales", estado: "activo" },
  { id: 2, codigo: "CAT-002", nombre: "Alquileres", descripcion: "Gestión de alquileres inmobiliarios", estado: "activo" },
  { id: 3, codigo: "CAT-003", nombre: "Microcrédito", descripcion: "Préstamos de bajo monto", estado: "activo" },
  { id: 4, codigo: "CAT-004", nombre: "Municipio", descripcion: "Entidades gubernamentales locales", estado: "activo" },
  { id: 5, codigo: "CAT-005", nombre: "Empresa", descripcion: "Personas jurídicas en general", estado: "activo" },
  { id: 6, codigo: "CAT-006", nombre: "Educación", descripcion: "Instituciones educativas", estado: "inactivo" },
  { id: 7, codigo: "CAT-007", nombre: "Salud", descripcion: "Clínicas y centros de salud", estado: "activo" },
  { id: 8, codigo: "CAT-008", nombre: "Comercio", descripcion: "Comercios minoristas", estado: "activo" },
  { id: 9, codigo: "CAT-009", nombre: "Transporte", descripcion: "Empresas de transporte", estado: "inactivo" },
  { id: 10, codigo: "CAT-010", nombre: "Servicios", descripcion: "Servicios profesionales", estado: "activo" },
];

function Page() {
  const [data, setData] = useState(initialData);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState<Categoria | null>(null);
  const [form, setForm] = useState({ codigo: "", nombre: "", descripcion: "" });

  const openNew = () => {
    setEditRow(null);
    setForm({ codigo: "", nombre: "", descripcion: "" });
    setDialogOpen(true);
  };

  const openEdit = (row: Categoria) => {
    setEditRow(row);
    setForm({ codigo: row.codigo, nombre: row.nombre, descripcion: row.descripcion });
    setDialogOpen(true);
  };

  const submit = () => {
    if (editRow) {
      setData((prev) =>
        prev.map((d) =>
          d.id === editRow.id ? { ...d, codigo: form.codigo, nombre: form.nombre, descripcion: form.descripcion } : d
        )
      );
    } else {
      const id = Math.max(...data.map((d) => d.id), 0) + 1;
      setData((prev) => [...prev, { id, ...form, estado: "activo" }]);
    }
    setDialogOpen(false);
  };

  const eliminar = (id: number) => {
    setData((prev) => prev.filter((d) => d.id !== id));
  };

  const columns: Column<Categoria>[] = [
    {
      key: "codigo",
      label: "Código",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono text-xs">{r.codigo}</span>,
    },
    {
      key: "nombre",
      label: "Nombre",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-semibold">{r.nombre}</span>,
    },
    {
      key: "descripcion",
      label: "Descripción",
      sortable: true,
      filterable: true,
      render: (r) => <span className="text-sm text-muted-foreground">{r.descripcion}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true, filterable: true,
      render: (r) => (
        <Badge tone={r.estado === "activo" ? "success" : "neutral"}>{r.estado}</Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Códigos de categoría"
        description="Administración de códigos de categoría para organizaciones."
        action={
          <BtnPrimary type="button" onClick={openNew}>
            + Nueva categoría
          </BtnPrimary>
        }
      />
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        pageSize={10}
        actions={(r) => (
          <div className="flex gap-1 justify-end">
            <BtnOutline type="button" className="h-7 text-xs px-2" onClick={() => openEdit(r)}>
              Editar
            </BtnOutline>
            <BtnOutline
              type="button"
              className="h-7 text-xs px-2 text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => eliminar(r.id)}
            >
              Eliminar
            </BtnOutline>
          </div>
        )}
      />
      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editRow ? "Editar categoría" : "Nueva categoría"}
        description={editRow ? "Modifique los datos de la categoría." : "Complete los datos para crear una nueva categoría."}
        onSubmit={submit}
        submitLabel={editRow ? "Guardar cambios" : "Crear categoría"}
      >
        <div>
          <Label htmlFor="cat-codigo">Código</Label>
          <Input
            id="cat-codigo"
            value={form.codigo}
            onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
            placeholder="CAT-XXX"
          />
        </div>
        <div>
          <Label htmlFor="cat-nombre">Nombre</Label>
          <Input
            id="cat-nombre"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            placeholder="Nombre de la categoría"
          />
        </div>
        <div>
          <Label htmlFor="cat-descripcion">Descripción</Label>
          <Input
            id="cat-descripcion"
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            placeholder="Descripción breve"
          />
        </div>
      </FormDialog>
    </>
  );
}
