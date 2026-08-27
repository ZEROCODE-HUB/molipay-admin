import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Eye, Edit3, XCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BtnPrimary, Badge, Input } from "@/components/portal-shell";
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
  cbk: string;
  alias: string;
  estado: "Habilitado" | "Deshabilitado" | "Suspendido";
};

const initialData: CvuUser[] = [
  {
    legajo: "LPF-20123456789",
    correo: "juan.perez@email.com",
    nombre: "Juan Carlos",
    apellido: "Pérez",
    cvu: "0000003100087654321012",
    cbk: "CBK-3100087654321012",
    alias: "juan.perez",
    estado: "Habilitado",
  },
  {
    legajo: "LPF-27234567890",
    correo: "maria.lopez@email.com",
    nombre: "María Elena",
    apellido: "López",
    cvu: "0000003100087654321023",
    cbk: "CBK-3100087654321023",
    alias: "maria.lopez",
    estado: "Habilitado",
  },
  {
    legajo: "LPF-20345678901",
    correo: "carlos.m@email.com",
    nombre: "Carlos Alberto",
    apellido: "Martínez",
    cvu: "0000003100087654321034",
    cbk: "CBK-3100087654321034",
    alias: "carlos.mtz",
    estado: "Deshabilitado",
  },
  {
    legajo: "LPF-27456789012",
    correo: "ana.garcia@email.com",
    nombre: "Ana Sofía",
    apellido: "García",
    cvu: "0000003100087654321045",
    cbk: "CBK-3100087654321045",
    alias: "ana.garcia",
    estado: "Habilitado",
  },
  {
    legajo: "LPF-20567890123",
    correo: "pedro.rodriguez@email.com",
    nombre: "Pedro Antonio",
    apellido: "Rodríguez",
    cvu: "0000003100087654321056",
    cbk: "CBK-3100087654321056",
    alias: "pedro.rod",
    estado: "Suspendido",
  },
  {
    legajo: "LPF-27678901234",
    correo: "lucia.mendoza@email.com",
    nombre: "Lucía Belén",
    apellido: "Mendoza",
    cvu: "0000003100087654321067",
    cbk: "CBK-3100087654321067",
    alias: "lucia.mend",
    estado: "Habilitado",
  },
  {
    legajo: "LPF-20789012345",
    correo: "gabriel.rios@email.com",
    nombre: "Gabriel Esteban",
    apellido: "Ríos",
    cvu: "0000003100087654321078",
    cbk: "CBK-3100087654321078",
    alias: "gabriel.rios",
    estado: "Habilitado",
  },
  {
    legajo: "LPF-27890123456",
    correo: "valentina.castro@email.com",
    nombre: "Valentina",
    apellido: "Castro",
    cvu: "0000003100087654321089",
    cbk: "CBK-3100087654321089",
    alias: "vale.castro",
    estado: "Deshabilitado",
  },
  {
    legajo: "LPF-27901234567",
    correo: "diego.fernandez@email.com",
    nombre: "Diego Martín",
    apellido: "Fernández",
    cvu: "0000003100087654321090",
    cbk: "CBK-3100087654321090",
    alias: "diego.fer",
    estado: "Habilitado",
  },
];

const estadoBadge = (e: CvuUser["estado"]) => {
  const map = {
    Habilitado: { label: "Habilitado", tone: "success" as const },
    Deshabilitado: { label: "Deshabilitado", tone: "danger" as const },
    Suspendido: { label: "Suspendido", tone: "warn" as const },
  };
  const m = map[e];
  return <Badge tone={m.tone}>{m.label}</Badge>;
};

function CvuPage() {
  const [data, setData] = useState<CvuUser[]>(initialData);
  const [showNuevoCvu, setShowNuevoCvu] = useState(false);
  const [viewing, setViewing] = useState<CvuUser | null>(null);
  const [editTarget, setEditTarget] = useState<CvuUser | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const getActions = (row: CvuUser): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setViewing(row) },
    { label: "Editar", icon: Edit3, onClick: () => setEditTarget({ ...row }) },
    ...(row.estado === "Deshabilitado"
      ? [
          {
            label: "Habilitar",
            icon: Eye,
            onClick: () =>
              setConfirmAction({
                title: "Habilitar CVU",
                message: `¿Estás seguro de habilitar el CVU de ${row.nombre} ${row.apellido}?`,
                confirmLabel: "Habilitar",
                variant: "default",
                onConfirm: () =>
                  setData((prev) =>
                    prev.map((u) => (u.legajo === row.legajo ? { ...u, estado: "Habilitado" } : u)),
                  ),
              }),
          },
        ]
      : [
          {
            label: "Deshabilitar",
            icon: XCircle,
            variant: "danger" as const,
            onClick: () =>
              setConfirmAction({
                title: "Deshabilitar CVU",
                message: `¿Estás seguro de deshabilitar el CVU de ${row.nombre} ${row.apellido}?`,
                confirmLabel: "Deshabilitar",
                variant: "danger",
                onConfirm: () =>
                  setData((prev) =>
                    prev.map((u) =>
                      u.legajo === row.legajo ? { ...u, estado: "Deshabilitado" } : u,
                    ),
                  ),
              }),
          },
        ]),
  ];

  return (
    <>
      <PageHeader
        title="Usuarios con CVU"
        description="Usuarios que poseen una Cuenta Virtual habilitada."
        action={
          <BtnPrimary onClick={() => setShowNuevoCvu(true)}>
            <Plus size={16} />
            Nuevo CVU
          </BtnPrimary>
        }
      />

      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.legajo}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />

      {viewing && (
        <FormDialog
          open={!!viewing}
          onClose={() => setViewing(null)}
          title="Detalle de CVU"
          description={`CVU de ${viewing.nombre} ${viewing.apellido}`}
          onSubmit={() => setViewing(null)}
          submitLabel="Cerrar"
        >
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Legajo:</span>{" "}
              <span className="font-medium font-mono tabular-nums">{viewing.legajo}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Correo:</span>{" "}
              <span className="font-medium">{viewing.correo}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Nombre:</span>{" "}
              <span className="font-medium">{viewing.nombre}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Apellido:</span>{" "}
              <span className="font-medium">{viewing.apellido}</span>
            </div>
            <div>
              <span className="text-muted-foreground">CVU:</span>{" "}
              <span className="font-medium font-mono tabular-nums">{viewing.cvu}</span>
            </div>
            <div>
              <span className="text-muted-foreground">CBK:</span>{" "}
              <span className="font-medium font-mono tabular-nums">{viewing.cbk}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Alias:</span>{" "}
              <span className="font-medium">{viewing.alias}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Estado:</span>{" "}
              <span className="font-medium">{viewing.estado}</span>
            </div>
          </div>
        </FormDialog>
      )}

      {editTarget && (
        <FormDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          title="Editar CVU"
          description={`Editando CVU de ${editTarget.nombre} ${editTarget.apellido}`}
          onSubmit={() => {
            setData((prev) => prev.map((u) => (u.legajo === editTarget.legajo ? editTarget : u)));
            setEditTarget(null);
          }}
          submitLabel="Guardar cambios"
        >
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Alias</label>
            <Input
              value={editTarget.alias}
              onChange={(e) => setEditTarget({ ...editTarget, alias: e.target.value })}
            />
          </div>
        </FormDialog>
      )}

      <FormDialog
        open={showNuevoCvu}
        onClose={() => setShowNuevoCvu(false)}
        title="Nuevo CVU"
        description="Crear una nueva Cuenta Virtual sincronizada con COELSA."
        onSubmit={() => setShowNuevoCvu(false)}
        submitLabel="Crear CVU"
      >
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">
            Email del usuario
          </label>
          <Input placeholder="usuario@email.com" />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Alias</label>
          <Input placeholder="mi.alias" />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">
            Tipo de cuenta
          </label>
          <select className="w-full h-10 px-3 rounded-md border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring">
            <option>Cuenta individual</option>
            <option>Cuenda compartida</option>
          </select>
        </div>
      </FormDialog>

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

const columns: Column<CvuUser>[] = [
  { key: "legajo", label: "Legajo", filterable: true, render: (r) => <span className="font-mono tabular-nums">{r.legajo}</span> },
  { key: "correo", label: "Usuario", filterable: true, render: (r) => r.correo },
  { key: "nombre", label: "Nombre", filterable: true, render: (r) => r.nombre },
  { key: "apellido", label: "Apellido", filterable: true, render: (r) => r.apellido },
  { key: "cvu", label: "CVU", filterable: true, render: (r) => <span className="font-mono tabular-nums">{r.cvu}</span> },
  { key: "cbk", label: "CBK", filterable: true, render: (r) => <span className="font-mono tabular-nums">{r.cbk}</span> },
  { key: "alias", label: "Alias", filterable: true, render: (r) => r.alias },
  {
    key: "estado",
    label: "Estado",
    filterable: "enum",
    filterOptions: ["Habilitado", "Deshabilitado", "Suspendido"],
    render: (row) => estadoBadge(row.estado),
  },
];
