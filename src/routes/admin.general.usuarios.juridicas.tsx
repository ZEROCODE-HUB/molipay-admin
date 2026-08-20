import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Edit3, XCircle, RotateCcw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { Badge } from "@/components/portal-shell";
import { LegajoCell, LEGAJO_TOOLTIP } from "@/components/legajo-label";

export const Route = createFileRoute("/admin/general/usuarios/juridicas")({
  head: () => ({
    meta: [
      { title: "Personas jurídicas — Usuarios — Admin Molly" },
      {
        name: "description",
        content: "Gestión de personas jurídicas registradas en la plataforma.",
      },
    ],
  }),
  component: JuridicasPage,
});

type Juridica = {
  legajo: string;
  correo: string;
  razonSocial: string;
  tipo: "SA" | "SRL";
  estado: string;
  fechaRegistro: string;
  subcuentas: number;
};

const toneMap: Record<string, "success" | "warn" | "danger" | "neutral"> = {
  Activado: "success",
  Registrado: "neutral",
  "Pre-activado": "warn",
  "En progreso": "warn",
  "Pendiente de verificación de email": "warn",
  "Pendiente de aprobación": "danger",
  Suspendido: "danger",
  Rechazado: "danger",
  Deshabilitado: "neutral",
};

const initialData: Juridica[] = [
  {
    legajo: "LPJ-0101",
    correo: "info@constructoraalpha.com",
    razonSocial: "Constructora Alpha SA",
    tipo: "SA",
    estado: "Activado",
    fechaRegistro: "10/01/2024",
    subcuentas: 5,
  },
  {
    legajo: "LPJ-0102",
    correo: "admin@comercializadorabeta.com",
    razonSocial: "Comercializadora Beta SRL",
    tipo: "SRL",
    estado: "Registrado",
    fechaRegistro: "22/02/2024",
    subcuentas: 2,
  },
  {
    legajo: "LPJ-0103",
    correo: "contacto@serviciosgamma.com",
    razonSocial: "Servicios Gamma SA",
    tipo: "SA",
    estado: "Pre-activado",
    fechaRegistro: "14/03/2024",
    subcuentas: 3,
  },
  {
    legajo: "LPJ-0104",
    correo: "ventas@distribuidoradelta.com",
    razonSocial: "Distribuidora Delta SRL",
    tipo: "SRL",
    estado: "En progreso",
    fechaRegistro: "05/04/2024",
    subcuentas: 1,
  },
  {
    legajo: "LPJ-0105",
    correo: "info@logisticaepsilon.com",
    razonSocial: "Logística Epsilon SA",
    tipo: "SA",
    estado: "Pendiente de verificación de email",
    fechaRegistro: "19/05/2024",
    subcuentas: 0,
  },
  {
    legajo: "LPJ-0106",
    correo: "admin@techzeta.com",
    razonSocial: "Tech Zeta SRL",
    tipo: "SRL",
    estado: "Activado",
    fechaRegistro: "01/06/2024",
    subcuentas: 7,
  },
  {
    legajo: "LPJ-0107",
    correo: "contacto@alimentoseta.com",
    razonSocial: "Alimentos Eta SA",
    tipo: "SA",
    estado: "Pendiente de aprobación",
    fechaRegistro: "28/07/2024",
    subcuentas: 0,
  },
  {
    legajo: "LPJ-0108",
    correo: "info@industriatheta.com",
    razonSocial: "Industria Theta SRL",
    tipo: "SRL",
    estado: "Activado",
    fechaRegistro: "15/08/2024",
    subcuentas: 4,
  },
  {
    legajo: "LPJ-0109",
    correo: "gerencia@comercioiota.com",
    razonSocial: "Comercio Iota SA",
    tipo: "SA",
    estado: "En progreso",
    fechaRegistro: "03/09/2024",
    subcuentas: 1,
  },
  {
    legajo: "LPJ-0110",
    correo: "admin@transporteskappa.com",
    razonSocial: "Transportes Kappa SRL",
    tipo: "SRL",
    estado: "Registrado",
    fechaRegistro: "20/10/2024",
    subcuentas: 0,
  },
];

function JuridicasPage() {
  const [data, setData] = useState<Juridica[]>(initialData);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const navigate = useNavigate();

  const verDetalle = (row: Juridica) =>
    navigate({ to: "/admin/general/usuarios/$legajo", params: { legajo: row.legajo } });

  const getActions = (row: Juridica): ActionItem[] => [
    { label: "Ver / Editar", icon: Edit3, onClick: () => verDetalle(row) },
    ...(row.estado === "Suspendido"
      ? [
          {
            label: "Reactivar",
            icon: RotateCcw,
            onClick: () =>
              setConfirmAction({
                title: "Reactivar persona jurídica",
                message: `¿Estás seguro de reactivar a ${row.razonSocial}?`,
                confirmLabel: "Reactivar",
                variant: "default",
                onConfirm: () =>
                  setData((prev) =>
                    prev.map((j) => (j.legajo === row.legajo ? { ...j, estado: "Activado" } : j)),
                  ),
              }),
          },
        ]
      : [
          {
            label: "Suspender",
            icon: XCircle,
            variant: "danger" as const,
            onClick: () =>
              setConfirmAction({
                title: "Suspender persona jurídica",
                message: `¿Estás seguro de suspender a ${row.razonSocial}?`,
                confirmLabel: "Suspender",
                variant: "danger",
                onConfirm: () =>
                  setData((prev) =>
                    prev.map((j) => (j.legajo === row.legajo ? { ...j, estado: "Suspendido" } : j)),
                  ),
              }),
          },
        ]),
    {
      label: "Borrar",
      icon: Trash2,
      variant: "danger" as const,
      onClick: () =>
        setConfirmAction({
          title: "Borrar persona jurídica",
          message: `¿Estás seguro de borrar a ${row.razonSocial}? Esta acción no se puede deshacer.`,
          confirmLabel: "Borrar",
          variant: "danger",
          onConfirm: () => setData((prev) => prev.filter((j) => j.legajo !== row.legajo)),
        }),
    },
  ];

  return (
    <>
      <PageHeader
        title="Personas jurídicas"
        description="Empresas y organizaciones registradas en la plataforma."
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

const columns: Column<Juridica>[] = [
  {
    key: "legajo",
    label: "Legajo",
    hint: LEGAJO_TOOLTIP,
    filterable: true,
    render: (r) => <LegajoCell legajo={r.legajo} />,
  },
  { key: "correo", label: "Usuario", filterable: true, render: (r) => r.correo },
  { key: "razonSocial", label: "Razón Social", filterable: true, render: (r) => r.razonSocial },
  {
    key: "tipo",
    label: "Tipo",
    filterable: "enum",
    filterOptions: ["SA", "SRL"],
    render: (r) => r.tipo,
  },
  {
    key: "estado",
    label: "Estado",
    filterable: "enum",
    filterOptions: [
      "Activado",
      "Registrado",
      "Pre-activado",
      "En progreso",
      "Pendiente de verificación de email",
      "Pendiente de aprobación",
      "Suspendido",
      "Rechazado",
      "Deshabilitado",
    ],
    render: (row) => <Badge tone={toneMap[row.estado] ?? "neutral"}>{row.estado}</Badge>,
  },
  {
    key: "fechaRegistro",
    label: "Fecha de registro",
    filterable: "date",
    render: (r) => <span className="font-mono tabular-nums">{r.fechaRegistro}</span>,
  },
  {
    key: "subcuentas",
    label: "Subcuentas",
    render: (r) => <span className="font-mono tabular-nums">{r.subcuentas}</span>,
  },
];
