import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Eye, Edit3, XCircle, RotateCcw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { UserModal } from "@/components/user-modal";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { BtnPrimary, BtnOutline, Badge } from "@/components/portal-shell";

export const Route = createFileRoute("/admin/general/usuarios/")({
  head: () => ({
    meta: [
      { title: "Personas físicas — Usuarios — Admin Molly" },
      { name: "description", content: "Gestión de personas físicas registradas en la plataforma." },
    ],
  }),
  component: PersonasFisicasPage,
});

type Usuario = {
  legajo: string;
  correo: string;
  nombres: string;
  apellidos: string;
  estado: "activo" | "suspendido" | "pendiente";
  fechaRegistro: string;
};

const data: Usuario[] = [
  { legajo: "USR-001", correo: "juan.perez@email.com", nombres: "Juan Carlos", apellidos: "Pérez González", estado: "activo", fechaRegistro: "12/01/2024" },
  { legajo: "USR-002", correo: "maria.lopez@email.com", nombres: "María Elena", apellidos: "López Fernández", estado: "activo", fechaRegistro: "23/02/2024" },
  { legajo: "USR-003", correo: "carlos.martinez@email.com", nombres: "Carlos Alberto", apellidos: "Martínez Ruiz", estado: "suspendido", fechaRegistro: "05/03/2024" },
  { legajo: "USR-004", correo: "ana.garcia@email.com", nombres: "Ana Sofía", apellidos: "García Díaz", estado: "activo", fechaRegistro: "18/04/2024" },
  { legajo: "USR-005", correo: "pedro.rodriguez@email.com", nombres: "Pedro Antonio", apellidos: "Rodríguez Silva", estado: "pendiente", fechaRegistro: "30/05/2024" },
  { legajo: "USR-006", correo: "lucia.mendoza@email.com", nombres: "Lucía Belén", apellidos: "Mendoza Torres", estado: "activo", fechaRegistro: "14/06/2024" },
  { legajo: "USR-007", correo: "gabriel.rios@email.com", nombres: "Gabriel Esteban", apellidos: "Ríos Morales", estado: "activo", fechaRegistro: "02/07/2024" },
  { legajo: "USR-008", correo: "valentina.castro@email.com", nombres: "Valentina Alejandra", apellidos: "Castro Vega", estado: "suspendido", fechaRegistro: "19/08/2024" },
  { legajo: "USR-009", correo: "diego.fernandez@email.com", nombres: "Diego Martín", apellidos: "Fernández Acosta", estado: "pendiente", fechaRegistro: "11/09/2024" },
  { legajo: "USR-010", correo: "florencia.dominguez@email.com", nombres: "Florencia Beatriz", apellidos: "Domínguez Páez", estado: "activo", fechaRegistro: "25/10/2024" },
  { legajo: "USR-011", correo: "andres.molina@email.com", nombres: "Andrés Sebastián", apellidos: "Molina Rivas", estado: "activo", fechaRegistro: "07/11/2024" },
  { legajo: "USR-012", correo: "camila.sosa@email.com", nombres: "Camila Andrea", apellidos: "Sosa Guzmán", estado: "suspendido", fechaRegistro: "15/12/2024" },
];

const estadoBadge = (e: Usuario["estado"]) => {
  const map: Record<string, { label: string; tone: "success" | "warn" | "danger" }> = {
    activo: { label: "Activo", tone: "success" },
    suspendido: { label: "Suspendido", tone: "danger" },
    pendiente: { label: "Pendiente", tone: "warn" },
  };
  const m = map[e];
  return <Badge tone={m.tone}>{m.label}</Badge>;
};

function PersonasFisicasPage() {
  const [editing, setEditing] = useState<Usuario | null>(null);

  const getActions = (row: Usuario): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setEditing(row) },
    { label: "Editar", icon: Edit3, onClick: () => {} },
    ...(row.estado === "suspendido"
      ? [{ label: "Reactivar", icon: RotateCcw, onClick: () => {} }]
      : [{ label: "Suspender", icon: XCircle, onClick: () => {} }]
    ),
    { label: "Eliminar", icon: Trash2, variant: "danger" as const, onClick: () => {} },
  ];

  return (
    <>
      <PageHeader
        title="Personas físicas"
        description="Usuarios individuales registrados en la plataforma."
        action={
          <BtnOutline>
            <Download size={16} />
            Descargar CSV
          </BtnOutline>
        }
      />

      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.legajo}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />

      {editing && (
        <UserModal
          open={!!editing}
          onClose={() => setEditing(null)}
          user={editing as any}
        />
      )}
    </>
  );
}

const columns: Column<Usuario>[] = [
  { key: "legajo", label: "Legajo", render: (row) => row.legajo },
  { key: "correo", label: "Correo", render: (row) => row.correo },
  { key: "nombres", label: "Nombres", render: (row) => row.nombres },
  { key: "apellidos", label: "Apellidos", render: (row) => row.apellidos },
  {
    key: "estado",
    label: "Estado",
    render: (row) => estadoBadge(row.estado),
  },
  { key: "fechaRegistro", label: "Fecha de registro", render: (row) => row.fechaRegistro },
];
