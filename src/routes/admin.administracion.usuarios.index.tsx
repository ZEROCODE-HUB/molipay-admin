import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Edit3, KeyRound, Eye, X, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { Badge, Input } from "@/components/portal-shell";

type Staff = { nombre: string; apellido: string; email: string; estado: string; rol: string };

const initialData: Staff[] = [
  {
    nombre: "María",
    apellido: "Rodríguez",
    email: "mrodriguez@molipay.com",
    estado: "Activo",
    rol: "Admin",
  },
  {
    nombre: "Luis",
    apellido: "Fernández",
    email: "lfernandez@molipay.com",
    estado: "Activo",
    rol: "Compliance",
  },
  {
    nombre: "Pedro",
    apellido: "Sánchez",
    email: "psanchez@molipay.com",
    estado: "Activo",
    rol: "Management",
  },
  {
    nombre: "Ana",
    apellido: "Martínez",
    email: "amartinez@molipay.com",
    estado: "Inactivo",
    rol: "Accounting",
  },
  {
    nombre: "Carlos",
    apellido: "López",
    email: "clopez@molipay.com",
    estado: "Activo",
    rol: "Reader",
  },
  {
    nombre: "Sofía",
    apellido: "García",
    email: "sgarcia@molipay.com",
    estado: "Activo",
    rol: "User",
  },
];

export const Route = createFileRoute("/admin/administracion/usuarios/")({
  head: () => ({ meta: [{ title: "Administración de personal — Admin Panel" }] }),
  component: Page,
});

function Page() {
  const [data, setData] = useState(initialData);
  const [showNew, setShowNew] = useState(false);
  const [viewing, setViewing] = useState<Staff | null>(null);
  const [editTarget, setEditTarget] = useState<Staff | null>(null);
  const [pwTarget, setPwTarget] = useState<Staff | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const getActions = (r: Staff): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setViewing(r) },
    { label: "Editar", icon: Edit3, onClick: () => setEditTarget({ ...r }) },
    { label: "Cambiar contraseña", icon: KeyRound, onClick: () => setPwTarget(r) },
    {
      label: "Eliminar",
      icon: Trash2,
      variant: "danger" as const,
      onClick: () =>
        setConfirmAction({
          title: "Eliminar usuario",
          message: `¿Estás seguro de eliminar a ${r.nombre} ${r.apellido}?`,
          confirmLabel: "Eliminar",
          variant: "danger",
          onConfirm: () => setData((prev) => prev.filter((u) => u.email !== r.email)),
        }),
    },
  ];

  const columns: Column<Staff>[] = [
    { key: "nombre", label: "Nombre", sortable: true, filterable: true, render: (r) => r.nombre },
    {
      key: "apellido",
      label: "Apellido",
      sortable: true,
      filterable: true,
      render: (r) => r.apellido,
    },
    { key: "email", label: "Email", sortable: true, filterable: true, render: (r) => r.email },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      filterable: "enum", filterOptions: ["Activo", "Inactivo"],
      render: (r) => <Badge tone={r.estado === "Activo" ? "success" : "neutral"}>{r.estado}</Badge>,
    },
    { key: "rol", label: "Rol", sortable: true, filterable: "enum", filterOptions: ["Admin", "Compliance", "Management", "Accounting", "Reader", "User"], render: (r) => r.rol },
  ];

  return (
    <>
      <PageHeader
        title="Administración de personal"
        description="Gestión de usuarios del backoffice"
        action={
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
          >
            <Plus size={14} /> Nuevo usuario
          </button>
        }
      />
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.email}
        pageSize={10}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />

      {viewing && (
        <FormDialog
          open={!!viewing}
          onClose={() => setViewing(null)}
          title="Detalle del usuario"
          description={`${viewing.nombre} ${viewing.apellido}`}
          onSubmit={() => setViewing(null)}
          submitLabel="Cerrar"
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Nombre:</span>{" "}
              <span className="font-medium">{viewing.nombre}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Apellido:</span>{" "}
              <span className="font-medium">{viewing.apellido}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Email:</span>{" "}
              <span className="font-medium">{viewing.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Estado:</span>{" "}
              <span className="font-medium">{viewing.estado}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Rol:</span>{" "}
              <span className="font-medium">{viewing.rol}</span>
            </div>
          </div>
        </FormDialog>
      )}

      {editTarget && (
        <FormDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          title="Editar usuario"
          description={`${editTarget.nombre} ${editTarget.apellido}`}
          onSubmit={() => {
            setData((prev) => prev.map((u) => (u.email === editTarget.email ? editTarget : u)));
            setEditTarget(null);
          }}
          submitLabel="Guardar cambios"
        >
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Nombre</label>
            <Input
              value={editTarget.nombre}
              onChange={(e) => setEditTarget({ ...editTarget, nombre: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Apellido</label>
            <Input
              value={editTarget.apellido}
              onChange={(e) => setEditTarget({ ...editTarget, apellido: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Email</label>
            <Input
              value={editTarget.email}
              onChange={(e) => setEditTarget({ ...editTarget, email: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Rol</label>
            <select
              className="w-full h-10 rounded-md border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-ring/40"
              value={editTarget.rol}
              onChange={(e) => setEditTarget({ ...editTarget, rol: e.target.value })}
            >
              <option>Admin</option>
              <option>Compliance</option>
              <option>Management</option>
              <option>Accounting</option>
              <option>Reader</option>
              <option>User</option>
            </select>
          </div>
        </FormDialog>
      )}

      {pwTarget && (
        <FormDialog
          open={!!pwTarget}
          onClose={() => setPwTarget(null)}
          title="Cambiar contraseña"
          description={`${pwTarget.nombre} ${pwTarget.apellido}`}
          onSubmit={() => setPwTarget(null)}
          submitLabel="Actualizar contraseña"
        >
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">
              Nueva contraseña
            </label>
            <Input type="password" placeholder="••••••••" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">
              Confirmar contraseña
            </label>
            <Input type="password" placeholder="••••••••" />
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

      {showNew && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowNew(false)}
        >
          <div
            className="bg-card border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Nuevo usuario backoffice</h3>
              <button onClick={() => setShowNew(false)} className="p-1 hover:opacity-70">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              {["Nombre", "Apellido", "Email"].map((f) => (
                <div key={f}>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    {f}
                  </label>
                  <input className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Rol
                </label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40">
                  <option>Admin</option>
                  <option>Compliance</option>
                  <option>Management</option>
                  <option>Accounting</option>
                  <option>Reader</option>
                  <option>User</option>
                </select>
              </div>
              <button className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
                Crear usuario
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
