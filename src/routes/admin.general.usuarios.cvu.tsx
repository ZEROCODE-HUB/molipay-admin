import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Plus, Eye, Edit3, XCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { BtnPrimary, BtnOutline, Badge, Input } from "@/components/portal-shell";
import { FormDialog } from "@/components/form-dialog";

export const Route = createFileRoute("/admin/general/usuarios/cvu")({
  head: () => ({
    meta: [
      { title: "Usuarios con CVU — Usuarios — Admin Molly" },
      { name: "description", content: "Usuarios con Cuenta Virtual habilitada en la plataforma." },
    ],
  }),
  component: CvuPage,
});

type CvuUser = {
  legajo: string;
  correo: string;
  nombre: string;
  apellido: string;
  cvu: string;
  alias: string;
  estado: "activo" | "inactivo" | "pendiente";
};

const data: CvuUser[] = [
  { legajo: "CVU-001", correo: "juan.perez@email.com", nombre: "Juan Carlos", apellido: "Pérez", cvu: "0000003100087654321012", alias: "juan.perez", estado: "activo" },
  { legajo: "CVU-002", correo: "maria.lopez@email.com", nombre: "María Elena", apellido: "López", cvu: "0000003100087654321023", alias: "maria.lopez", estado: "activo" },
  { legajo: "CVU-003", correo: "carlos.m@email.com", nombre: "Carlos Alberto", apellido: "Martínez", cvu: "0000003100087654321034", alias: "carlos.mtz", estado: "inactivo" },
  { legajo: "CVU-004", correo: "ana.garcia@email.com", nombre: "Ana Sofía", apellido: "García", cvu: "0000003100087654321045", alias: "ana.garcia", estado: "activo" },
  { legajo: "CVU-005", correo: "pedro.rodriguez@email.com", nombre: "Pedro Antonio", apellido: "Rodríguez", cvu: "0000003100087654321056", alias: "pedro.rod", estado: "pendiente" },
  { legajo: "CVU-006", correo: "lucia.mendoza@email.com", nombre: "Lucía Belén", apellido: "Mendoza", cvu: "0000003100087654321067", alias: "lucia.mend", estado: "activo" },
  { legajo: "CVU-007", correo: "gabriel.rios@email.com", nombre: "Gabriel Esteban", apellido: "Ríos", cvu: "0000003100087654321078", alias: "gabriel.rios", estado: "activo" },
  { legajo: "CVU-008", correo: "valentina.castro@email.com", nombre: "Valentina", apellido: "Castro", cvu: "0000003100087654321089", alias: "vale.castro", estado: "inactivo" },
  { legajo: "CVU-009", correo: "diego.fernandez@email.com", nombre: "Diego Martín", apellido: "Fernández", cvu: "0000003100087654321090", alias: "diego.fer", estado: "activo" },
];

const estadoBadge = (e: CvuUser["estado"]) => {
  const map = {
    activo: { label: "Activo", tone: "success" as const },
    inactivo: { label: "Inactivo", tone: "danger" as const },
    pendiente: { label: "Pendiente", tone: "warn" as const },
  };
  const m = map[e];
  return <Badge tone={m.tone}>{m.label}</Badge>;
};

function CvuPage() {
  const [showNuevoCvu, setShowNuevoCvu] = useState(false);

  const getActions = (_: CvuUser): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => {} },
    { label: "Editar", icon: Edit3, onClick: () => {} },
    ...(_.estado === "inactivo"
      ? [{ label: "Activar", icon: Eye, onClick: () => {} }]
      : [{ label: "Desactivar", icon: XCircle, variant: "danger" as const, onClick: () => {} }]
    ),
  ];

  return (
    <>
      <PageHeader
        title="Usuarios con CVU"
        description="Usuarios que poseen una Cuenta Virtual habilitada."
        action={
          <div className="flex gap-2">
            <BtnOutline>
              <Download size={16} />
              Descargar CSV
            </BtnOutline>
            <BtnPrimary onClick={() => setShowNuevoCvu(true)}>
              <Plus size={16} />
              Nuevo CVU
            </BtnPrimary>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.legajo}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />

      <FormDialog
        open={showNuevoCvu}
        onClose={() => setShowNuevoCvu(false)}
        title="Nuevo CVU"
        description="Crear una nueva Cuenta Virtual sincronizada con COELSA."
        onSubmit={() => setShowNuevoCvu(false)}
        submitLabel="Crear CVU"
      >
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Email del usuario</label>
          <Input placeholder="usuario@email.com" />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Alias</label>
          <Input placeholder="mi.alias" />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Tipo de cuenta</label>
          <select className="w-full h-10 px-3 rounded-md border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring">
            <option>Cuenta individual</option>
            <option>Cuenda compartida</option>
          </select>
        </div>
      </FormDialog>
    </>
  );
}

const columns: Column<CvuUser>[] = [
  { key: "legajo", label: "Legajo", render: (r) => r.legajo },
  { key: "correo", label: "Correo", render: (r) => r.correo },
  { key: "nombre", label: "Nombre", render: (r) => r.nombre },
  { key: "apellido", label: "Apellido", render: (r) => r.apellido },
  { key: "cvu", label: "CVU", render: (r) => r.cvu },
  { key: "alias", label: "Alias", render: (r) => r.alias },
  {
    key: "estado",
    label: "Estado",
    render: (row) => estadoBadge(row.estado),
  },
];
