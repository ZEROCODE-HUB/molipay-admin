import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Edit3, KeyRound, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/portal-shell";

type Staff = { nombre: string; apellido: string; email: string; estado: string; rol: string };

const mock: Staff[] = [
  { nombre: "María", apellido: "Rodríguez", email: "mrodriguez@molipay.com", estado: "Activo", rol: "Admin" },
  { nombre: "Luis", apellido: "Fernández", email: "lfernandez@molipay.com", estado: "Activo", rol: "Compliance" },
  { nombre: "Pedro", apellido: "Sánchez", email: "psanchez@molipay.com", estado: "Activo", rol: "Management" },
  { nombre: "Ana", apellido: "Martínez", email: "amartinez@molipay.com", estado: "Inactivo", rol: "Accounting" },
  { nombre: "Carlos", apellido: "López", email: "clopez@molipay.com", estado: "Activo", rol: "Reader" },
  { nombre: "Sofía", apellido: "García", email: "sgarcia@molipay.com", estado: "Activo", rol: "User" },
];

export const Route = createFileRoute("/admin/administracion/usuarios/")({
  head: () => [{ title: "Administración de personal — Admin Panel" }],
  component: Page,
});

function Page() {
  const [showNew, setShowNew] = useState(false);
  const columns: Column<Staff>[] = [
    { key: "nombre", label: "Nombre", sortable: true, filterable: true, render: (r) => r.nombre },
    { key: "apellido", label: "Apellido", sortable: true, filterable: true, render: (r) => r.apellido },
    { key: "email", label: "Email", sortable: true, filterable: true, render: (r) => r.email },
    { key: "estado", label: "Estado", sortable: true, filterable: true, render: (r) => <Badge tone={r.estado === "Activo" ? "success" : "neutral"}>{r.estado}</Badge> },
    { key: "rol", label: "Rol", sortable: true, filterable: true, render: (r) => r.rol },
  ];
  return (
    <>
      <PageHeader title="Administración de personal" description="Gestión de usuarios del backoffice" action={
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
          <Plus size={14} /> Nuevo usuario
        </button>
      } />
      <DataTable columns={columns} data={mock} keyExtractor={(r) => r.email} pageSize={10}
        actions={(r) => (
          <div className="flex gap-1">
            <button className="p-1.5 rounded hover:bg-muted" title="Editar"><Edit3 size={14} /></button>
            <button className="p-1.5 rounded hover:bg-muted" title="Contraseña"><KeyRound size={14} /></button>
          </div>
        )}
      />
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowNew(false)}>
          <div className="bg-card border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Nuevo usuario backoffice</h3>
              <button onClick={() => setShowNew(false)} className="p-1 hover:opacity-70"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              {["Nombre", "Apellido", "Email"].map((f) => (
                <div key={f}><label className="block text-xs font-semibold text-muted-foreground mb-1">{f}</label>
                  <input className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></div>
              ))}
              <div><label className="block text-xs font-semibold text-muted-foreground mb-1">Rol</label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40">
                  <option>Admin</option><option>Compliance</option><option>Management</option><option>Accounting</option><option>Reader</option><option>User</option>
                </select></div>
              <button className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">Crear usuario</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
