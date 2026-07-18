import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Eye, Edit3, XCircle, RotateCcw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { UserModal, type UserData, type UserStatus } from "@/components/user-modal";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { BtnPrimary, BtnOutline, Badge, Input } from "@/components/portal-shell";

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

const initialData: Usuario[] = [
  {
    legajo: "USR-001",
    correo: "juan.perez@email.com",
    nombres: "Juan Carlos",
    apellidos: "Pérez González",
    estado: "activo",
    fechaRegistro: "12/01/2024",
  },
  {
    legajo: "USR-002",
    correo: "maria.lopez@email.com",
    nombres: "María Elena",
    apellidos: "López Fernández",
    estado: "activo",
    fechaRegistro: "23/02/2024",
  },
  {
    legajo: "USR-003",
    correo: "carlos.martinez@email.com",
    nombres: "Carlos Alberto",
    apellidos: "Martínez Ruiz",
    estado: "suspendido",
    fechaRegistro: "05/03/2024",
  },
  {
    legajo: "USR-004",
    correo: "ana.garcia@email.com",
    nombres: "Ana Sofía",
    apellidos: "García Díaz",
    estado: "activo",
    fechaRegistro: "18/04/2024",
  },
  {
    legajo: "USR-005",
    correo: "pedro.rodriguez@email.com",
    nombres: "Pedro Antonio",
    apellidos: "Rodríguez Silva",
    estado: "pendiente",
    fechaRegistro: "30/05/2024",
  },
  {
    legajo: "USR-006",
    correo: "lucia.mendoza@email.com",
    nombres: "Lucía Belén",
    apellidos: "Mendoza Torres",
    estado: "activo",
    fechaRegistro: "14/06/2024",
  },
  {
    legajo: "USR-007",
    correo: "gabriel.rios@email.com",
    nombres: "Gabriel Esteban",
    apellidos: "Ríos Morales",
    estado: "activo",
    fechaRegistro: "02/07/2024",
  },
  {
    legajo: "USR-008",
    correo: "valentina.castro@email.com",
    nombres: "Valentina Alejandra",
    apellidos: "Castro Vega",
    estado: "suspendido",
    fechaRegistro: "19/08/2024",
  },
  {
    legajo: "USR-009",
    correo: "diego.fernandez@email.com",
    nombres: "Diego Martín",
    apellidos: "Fernández Acosta",
    estado: "pendiente",
    fechaRegistro: "11/09/2024",
  },
  {
    legajo: "USR-010",
    correo: "florencia.dominguez@email.com",
    nombres: "Florencia Beatriz",
    apellidos: "Domínguez Páez",
    estado: "activo",
    fechaRegistro: "25/10/2024",
  },
  {
    legajo: "USR-011",
    correo: "andres.molina@email.com",
    nombres: "Andrés Sebastián",
    apellidos: "Molina Rivas",
    estado: "activo",
    fechaRegistro: "07/11/2024",
  },
  {
    legajo: "USR-012",
    correo: "camila.sosa@email.com",
    nombres: "Camila Andrea",
    apellidos: "Sosa Guzmán",
    estado: "suspendido",
    fechaRegistro: "15/12/2024",
  },
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

const statusMap: Record<Usuario["estado"], UserStatus> = {
  activo: "active",
  suspendido: "blocked",
  pendiente: "pending",
};

const toUserData = (u: Usuario): UserData => ({
  id: u.legajo,
  nombre: `${u.nombres} ${u.apellidos}`,
  email: u.correo,
  telefono: "-",
  dni: "-",
  status: statusMap[u.estado],
  subcuentas: [],
  documentos: [],
});

function PersonasFisicasPage() {
  const [data, setData] = useState<Usuario[]>(initialData);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [editTarget, setEditTarget] = useState<Usuario | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const getActions = (row: Usuario): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setEditing(row) },
    { label: "Editar", icon: Edit3, onClick: () => setEditTarget({ ...row }) },
    ...(row.estado === "suspendido"
      ? [
          {
            label: "Reactivar",
            icon: RotateCcw,
            onClick: () =>
              setConfirmAction({
                title: "Reactivar usuario",
                message: `¿Estás seguro de reactivar a ${row.nombres} ${row.apellidos}?`,
                confirmLabel: "Reactivar",
                variant: "default",
                onConfirm: () =>
                  setData((prev) =>
                    prev.map((u) => (u.legajo === row.legajo ? { ...u, estado: "activo" } : u)),
                  ),
              }),
          },
        ]
      : [
          {
            label: "Suspender",
            icon: XCircle,
            onClick: () =>
              setConfirmAction({
                title: "Suspender usuario",
                message: `¿Estás seguro de suspender a ${row.nombres} ${row.apellidos}?`,
                confirmLabel: "Suspender",
                variant: "danger",
                onConfirm: () =>
                  setData((prev) =>
                    prev.map((u) => (u.legajo === row.legajo ? { ...u, estado: "suspendido" } : u)),
                  ),
              }),
          },
        ]),
    {
      label: "Eliminar",
      icon: Trash2,
      variant: "danger" as const,
      onClick: () =>
        setConfirmAction({
          title: "Eliminar usuario",
          message: `¿Estás seguro de eliminar a ${row.nombres} ${row.apellidos}? Esta acción no se puede deshacer.`,
          confirmLabel: "Eliminar",
          variant: "danger",
          onConfirm: () => setData((prev) => prev.filter((u) => u.legajo !== row.legajo)),
        }),
    },
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
          user={editing ? toUserData(editing) : null}
        />
      )}

      {editTarget && (
        <FormDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          title="Editar usuario"
          description={`Editando a ${editTarget.nombres} ${editTarget.apellidos}`}
          onSubmit={() => {
            setData((prev) => prev.map((u) => (u.legajo === editTarget.legajo ? editTarget : u)));
            setEditTarget(null);
          }}
          submitLabel="Guardar cambios"
        >
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Correo</label>
            <Input
              value={editTarget.correo}
              onChange={(e) => setEditTarget({ ...editTarget, correo: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Nombres</label>
            <Input
              value={editTarget.nombres}
              onChange={(e) => setEditTarget({ ...editTarget, nombres: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Apellidos</label>
            <Input
              value={editTarget.apellidos}
              onChange={(e) => setEditTarget({ ...editTarget, apellidos: e.target.value })}
            />
          </div>
        </FormDialog>
      )}

      {confirmAction && (
        <ConfirmDialog
          open={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel}
          variant={confirmAction.variant}
          onConfirm={confirmAction.onConfirm}
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
