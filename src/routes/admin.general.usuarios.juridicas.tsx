import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Eye, Edit3, XCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { UserModal, type UserData, type UserStatus } from "@/components/user-modal";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { BtnOutline, Badge, Input } from "@/components/portal-shell";

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
};

const initialData: Juridica[] = [
  {
    legajo: "JUR-001",
    correo: "info@constructoraalpha.com",
    razonSocial: "Constructora Alpha SA",
    tipo: "SA",
    estado: "Activado",
    fechaRegistro: "10/01/2024",
    subcuentas: 5,
  },
  {
    legajo: "JUR-002",
    correo: "admin@comercializadorabeta.com",
    razonSocial: "Comercializadora Beta SRL",
    tipo: "SRL",
    estado: "Registrado",
    fechaRegistro: "22/02/2024",
    subcuentas: 2,
  },
  {
    legajo: "JUR-003",
    correo: "contacto@serviciosgamma.com",
    razonSocial: "Servicios Gamma SA",
    tipo: "SA",
    estado: "Pre-activado",
    fechaRegistro: "14/03/2024",
    subcuentas: 3,
  },
  {
    legajo: "JUR-004",
    correo: "ventas@distribuidoradelta.com",
    razonSocial: "Distribuidora Delta SRL",
    tipo: "SRL",
    estado: "En progreso",
    fechaRegistro: "05/04/2024",
    subcuentas: 1,
  },
  {
    legajo: "JUR-005",
    correo: "info@logisticaepsilon.com",
    razonSocial: "Logística Epsilon SA",
    tipo: "SA",
    estado: "Pendiente de verificación de email",
    fechaRegistro: "19/05/2024",
    subcuentas: 0,
  },
  {
    legajo: "JUR-006",
    correo: "admin@techzeta.com",
    razonSocial: "Tech Zeta SRL",
    tipo: "SRL",
    estado: "Activado",
    fechaRegistro: "01/06/2024",
    subcuentas: 7,
  },
  {
    legajo: "JUR-007",
    correo: "contacto@alimentoseta.com",
    razonSocial: "Alimentos Eta SA",
    tipo: "SA",
    estado: "Pendiente de aprobación",
    fechaRegistro: "28/07/2024",
    subcuentas: 0,
  },
  {
    legajo: "JUR-008",
    correo: "info@industriatheta.com",
    razonSocial: "Industria Theta SRL",
    tipo: "SRL",
    estado: "Activado",
    fechaRegistro: "15/08/2024",
    subcuentas: 4,
  },
  {
    legajo: "JUR-009",
    correo: "gerencia@comercioiota.com",
    razonSocial: "Comercio Iota SA",
    tipo: "SA",
    estado: "En progreso",
    fechaRegistro: "03/09/2024",
    subcuentas: 1,
  },
  {
    legajo: "JUR-010",
    correo: "admin@transporteskappa.com",
    razonSocial: "Transportes Kappa SRL",
    tipo: "SRL",
    estado: "Registrado",
    fechaRegistro: "20/10/2024",
    subcuentas: 0,
  },
];

const toUserData = (j: Juridica): UserData => ({
  id: j.legajo,
  status: "active",
  legajo: j.legajo,
  email: j.correo,
  tipoCuenta: "Empresarial",
  cantidadCuentasBancarias: 3,
  cantidadCuentasVirtuales: 2,
  nombre: j.razonSocial,
  apellido: "-",
  cuit: "30-12345678-9",
  genero: "-",
  ocupacion: "Empresa",
  origenFondos: "Actividad comercial",
  direccion: "Av. Industrial",
  numeroDireccion: "500",
  ciudad: "CABA",
  estadoProvincia: "Buenos Aires",
  codigoPostal: "C1104",
  fechaNacimiento: "-",
  cuitEmpresa: j.razonSocial.includes("SA") ? "30-87654321-0" : "30-87654321-1",
  tipoEmpresa: j.tipo,
  nombreLegal: j.razonSocial,
  nombreComercial: j.razonSocial,
  fechaInscripcion: j.fechaRegistro,
  pep: "No",
  subcuentas: Array.from({ length: j.subcuentas }, (_, i) => ({
    id: `SUB-${j.legajo}-${i + 1}`,
    alias: `sub.${(j.razonSocial.split(" ")[0] ?? "empresa").toLowerCase()}.${i + 1}`,
    cvu: `0000003100087654321${String(i + 1).padStart(4, "0")}`,
    saldo: `$ ${(Math.random() * 500000 + 10000).toFixed(2)}`,
    estado: "activa",
  })),
  documentos: [
    {
      id: "doc-1",
      tipo: "id_frente",
      url: "https://placehold.co/400x600/1a1a2e/e0e0e0?text=DNI+Frente",
      label: "ID Frente",
    },
    {
      id: "doc-2",
      tipo: "id_dorso",
      url: "https://placehold.co/400x600/16213e/e0e0e0?text=DNI+Dorso",
      label: "ID Dorso",
    },
    {
      id: "doc-4",
      tipo: "selfie",
      url: "https://placehold.co/400x600/1a1a2e/e0e0e0?text=Selfie",
      label: "Selfie",
    },
  ],
});

function JuridicasPage() {
  const [data, setData] = useState<Juridica[]>(initialData);
  const [viewing, setViewing] = useState<Juridica | null>(null);
  const [editTarget, setEditTarget] = useState<Juridica | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const getActions = (row: Juridica): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setViewing(row) },
    { label: "Editar", icon: Edit3, onClick: () => setEditTarget({ ...row }) },
    {
      label: "Suspender",
      icon: XCircle,
      variant: "danger",
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
  ];

  return (
    <>
      <PageHeader
        title="Personas jurídicas"
        description="Empresas y organizaciones registradas en la plataforma."
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

      {viewing && (
        <UserModal
          open={!!viewing}
          onClose={() => setViewing(null)}
          user={viewing ? toUserData(viewing) : null}
        />
      )}

      {editTarget && (
        <FormDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          title="Editar persona jurídica"
          description={`Editando a ${editTarget.razonSocial}`}
          onSubmit={() => {
            setData((prev) => prev.map((j) => (j.legajo === editTarget.legajo ? editTarget : j)));
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
            <label className="text-xs font-semibold text-foreground mb-1.5 block">
              Razón Social
            </label>
            <Input
              value={editTarget.razonSocial}
              onChange={(e) => setEditTarget({ ...editTarget, razonSocial: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Tipo</label>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring"
              value={editTarget.tipo}
              onChange={(e) =>
                setEditTarget({ ...editTarget, tipo: e.target.value as "SA" | "SRL" })
              }
            >
              <option value="SA">SA</option>
              <option value="SRL">SRL</option>
            </select>
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

const columns: Column<Juridica>[] = [
  { key: "legajo", label: "Legajo", filterable: true, render: (r) => r.legajo },
  { key: "correo", label: "Correo", filterable: true, render: (r) => r.correo },
  { key: "razonSocial", label: "Razón Social", filterable: true, render: (r) => r.razonSocial },
  { key: "tipo", label: "Tipo", filterable: true, render: (r) => r.tipo },
  {
    key: "estado",
    label: "Estado", filterable: true,
    render: (row) => <Badge tone={toneMap[row.estado] ?? "neutral"}>{row.estado}</Badge>,
  },
  { key: "fechaRegistro", label: "Fecha de registro", filterable: true, render: (r) => r.fechaRegistro },
  { key: "subcuentas", label: "Subcuentas", filterable: true, render: (r) => r.subcuentas },
];
