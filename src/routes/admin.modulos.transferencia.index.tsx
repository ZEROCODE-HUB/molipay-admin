import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Edit3, CheckCircle, XCircle, FileCheck } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PageHeader, Badge } from "@/components/portal-shell";

export const Route = createFileRoute("/admin/modulos/transferencia/")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Comercios — Admin — Molly Money Life" },
      { name: "description", content: "Gestión de comercios habilitados para pago con transferencia." },
    ],
  }),
});

type Comercio = {
  id: number;
  usuario: string;
  codigo: string;
  categoria: string;
  estado: "activo" | "suspendido" | "pendiente";
  nivel: string;
};

const data: Comercio[] = [
  { id: 1, usuario: "Consorcio Larrea 1200", codigo: "C-001", categoria: "Consorcio", estado: "activo", nivel: "Premium" },
  { id: 2, usuario: "Microcreditos del Sur", codigo: "C-002", categoria: "Microcrédito", estado: "activo", nivel: "Premium" },
  { id: 3, usuario: "Administradora Plaza", codigo: "C-003", categoria: "Alquileres", estado: "suspendido", nivel: "Básico" },
  { id: 4, usuario: "Municipalidad de Chivilcoy", codigo: "C-004", categoria: "Municipio", estado: "activo", nivel: "Enterprise" },
  { id: 5, usuario: "Pagos Express SRL", codigo: "C-005", categoria: "Empresa", estado: "suspendido", nivel: "Básico" },
  { id: 6, usuario: "Comercializadora ABC", codigo: "C-006", categoria: "Empresa", estado: "pendiente", nivel: "Básico" },
  { id: 7, usuario: "Consorcio Belgrano", codigo: "C-007", categoria: "Consorcio", estado: "activo", nivel: "Premium" },
  { id: 8, usuario: "Inmobiliaria del Centro", codigo: "C-008", categoria: "Alquileres", estado: "activo", nivel: "Estándar" },
  { id: 9, usuario: "Gimnasio FitLife", codigo: "C-009", categoria: "Comercio", estado: "activo", nivel: "Estándar" },
  { id: 10, usuario: "Colegio San Martín", codigo: "C-010", categoria: "Educación", estado: "pendiente", nivel: "Básico" },
  { id: 11, usuario: "Clínica Privada del Sur", codigo: "C-011", categoria: "Salud", estado: "activo", nivel: "Premium" },
  { id: 12, usuario: "Transporte Rápido SA", codigo: "C-012", categoria: "Transporte", estado: "activo", nivel: "Estándar" },
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
    if (selected.size === data.length) setSelected(new Set());
    else setSelected(new Set(data.map((d) => d.id)));
  };

  const getActions = (r: Comercio): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => {} },
    { label: "Editar", icon: Edit3, onClick: () => {} },
    ...(r.estado === "activo"
      ? [{ label: "Suspender", icon: XCircle, variant: "danger" as const, onClick: () => {} }]
      : [{ label: "Activar", icon: CheckCircle, onClick: () => {} }]
    ),
    ...(r.estado === "pendiente"
      ? [{ label: "Validar", icon: FileCheck, onClick: () => {} }]
      : []
    ),
  ];

  const columns: Column<Comercio>[] = [
    {
      key: "usuario",
      label: "Usuario",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-semibold">{r.usuario}</span>,
    },
    {
      key: "codigo",
      label: "Código",
      sortable: true,
      filterable: true,
      render: (r) => <span className="text-xs text-muted-foreground font-mono">{r.codigo}</span>,
    },
    {
      key: "categoria",
      label: "Categoría",
      sortable: true,
      filterable: true,
      render: (r) => r.categoria,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      render: (r) => {
        const tone = r.estado === "activo" ? "success" : r.estado === "suspendido" ? "danger" : "warn";
        return <Badge tone={tone}>{r.estado}</Badge>;
      },
    },
    {
      key: "nivel",
      label: "Nivel",
      sortable: true,
      render: (r) => r.nivel,
    },
  ];

  return (
    <>
      <PageHeader
        title="Comercios"
        description="Gestión de comercios habilitados para pago con transferencia."
      />
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        selection={{ selected, onToggle: toggle, onToggleAll: toggleAll }}
        pageSize={10}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />
    </>
  );
}
