import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Edit3, XCircle, RotateCcw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { Badge } from "@/components/portal-shell";
import { LegajoCell, LEGAJO_TOOLTIP } from "@/components/legajo-label";

export const Route = createFileRoute("/admin/general/usuarios/")({
  head: () => ({
    meta: [
      { title: "Personas físicas — Usuarios — Admin Molly" },
      { name: "description", content: "Gestión de personas físicas registradas en la plataforma." },
    ],
  }),
  component: PersonasFisicasPage,
});

type EstadoUsuario =
  | "Pendiente de verificación de email"
  | "Registrado"
  | "Activado"
  | "Pre-activado"
  | "En progreso"
  | "Pendiente de aprobación"
  | "Suspendido"
  | "Rechazado"
  | "Deshabilitado";

type Usuario = {
  legajo: string;
  correo: string;
  nombres: string;
  apellidos: string;
  estado: EstadoUsuario;
  fechaRegistro: string;
};

const initialData: Usuario[] = [
  {
    legajo: "LPF-0001",
    correo: "juan.perez@email.com",
    nombres: "Juan Carlos",
    apellidos: "Pérez González",
    estado: "Activado",
    fechaRegistro: "12/01/2024",
  },
  {
    legajo: "LPF-0002",
    correo: "maria.lopez@email.com",
    nombres: "María Elena",
    apellidos: "López Fernández",
    estado: "Activado",
    fechaRegistro: "23/02/2024",
  },
  {
    legajo: "LPF-0021",
    correo: "carlos.martinez@email.com",
    nombres: "Carlos Alberto",
    apellidos: "Martínez Ruiz",
    estado: "Suspendido",
    fechaRegistro: "05/03/2024",
  },
  {
    legajo: "LPF-0022",
    correo: "ana.garcia@email.com",
    nombres: "Ana Sofía",
    apellidos: "García Díaz",
    estado: "Registrado",
    fechaRegistro: "18/04/2024",
  },
  {
    legajo: "LPF-0023",
    correo: "pedro.rodriguez@email.com",
    nombres: "Pedro Antonio",
    apellidos: "Rodríguez Silva",
    estado: "Pendiente de verificación de email",
    fechaRegistro: "30/05/2024",
  },
  {
    legajo: "LPF-0033",
    correo: "lucia.mendoza@email.com",
    nombres: "Lucía Belén",
    apellidos: "Mendoza Torres",
    estado: "Activado",
    fechaRegistro: "14/06/2024",
  },
  {
    legajo: "LPF-0034",
    correo: "gabriel.rios@email.com",
    nombres: "Gabriel Esteban",
    apellidos: "Ríos Morales",
    estado: "En progreso",
    fechaRegistro: "02/07/2024",
  },
  {
    legajo: "LPF-0035",
    correo: "valentina.castro@email.com",
    nombres: "Valentina Alejandra",
    apellidos: "Castro Vega",
    estado: "Suspendido",
    fechaRegistro: "19/08/2024",
  },
  {
    legajo: "LPF-0036",
    correo: "diego.fernandez@email.com",
    nombres: "Diego Martín",
    apellidos: "Fernández Acosta",
    estado: "Pendiente de aprobación",
    fechaRegistro: "11/09/2024",
  },
  {
    legajo: "LPF-0037",
    correo: "florencia.dominguez@email.com",
    nombres: "Florencia Beatriz",
    apellidos: "Domínguez Páez",
    estado: "Pre-activado",
    fechaRegistro: "25/10/2024",
  },
  {
    legajo: "LPF-0038",
    correo: "andres.molina@email.com",
    nombres: "Andrés Sebastián",
    apellidos: "Molina Rivas",
    estado: "Activado",
    fechaRegistro: "07/11/2024",
  },
  {
    legajo: "LPF-0039",
    correo: "camila.sosa@email.com",
    nombres: "Camila Andrea",
    apellidos: "Sosa Guzmán",
    estado: "Deshabilitado",
    fechaRegistro: "15/12/2024",
  },
];

const estadoBadge = (e: Usuario["estado"]) => {
  const map: Record<string, { label: string; tone: "success" | "warn" | "danger" | "neutral" }> = {
    Activado: { label: "Activado", tone: "success" },
    Registrado: { label: "Registrado", tone: "neutral" },
    "Pre-activado": { label: "Pre-activado", tone: "warn" },
    "En progreso": { label: "En progreso", tone: "warn" },
    "Pendiente de verificación de email": {
      label: "Pendiente de verificación de email",
      tone: "warn",
    },
    "Pendiente de aprobación": { label: "Pendiente de aprobación", tone: "danger" },
    Suspendido: { label: "Suspendido", tone: "danger" },
    Rechazado: { label: "Rechazado", tone: "danger" },
    Deshabilitado: { label: "Deshabilitado", tone: "neutral" },
  };
  const m = map[e] ?? { label: e, tone: "neutral" as const };
  return <Badge tone={m.tone}>{m.label}</Badge>;
};

function PersonasFisicasPage() {
  const [data, setData] = useState<Usuario[]>(initialData);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const navigate = useNavigate();

  const verDetalle = (row: Usuario) =>
    navigate({ to: "/admin/general/usuarios/$legajo", params: { legajo: row.legajo } });

  const getActions = (row: Usuario): ActionItem[] => [
    { label: "Ver / Editar", icon: Edit3, onClick: () => verDetalle(row) },
    ...(row.estado === "Suspendido"
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
                    prev.map((u) => (u.legajo === row.legajo ? { ...u, estado: "Activado" } : u)),
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
                    prev.map((u) => (u.legajo === row.legajo ? { ...u, estado: "Suspendido" } : u)),
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
      />

      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.legajo}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />

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
  {
    key: "legajo",
    label: "Legajo",
    hint: LEGAJO_TOOLTIP,
    filterable: true,
    render: (row) => <LegajoCell legajo={row.legajo} />,
  },
  { key: "correo", label: "Usuario", filterable: true, render: (row) => row.correo },
  { key: "nombres", label: "Nombres", filterable: true, render: (row) => row.nombres },
  { key: "apellidos", label: "Apellidos", filterable: true, render: (row) => row.apellidos },
  {
    key: "estado",
    label: "Estado",
    filterable: "enum",
    filterOptions: [
      "Pendiente de verificación de email",
      "Registrado",
      "Activado",
      "Pre-activado",
      "En progreso",
      "Pendiente de aprobación",
      "Suspendido",
      "Rechazado",
      "Deshabilitado",
    ],
    render: (row) => estadoBadge(row.estado),
  },
  {
    key: "fechaRegistro",
    label: "Fecha de registro",
    filterable: "date",
    render: (row) => <span className="font-mono tabular-nums">{row.fechaRegistro}</span>,
  },
];
