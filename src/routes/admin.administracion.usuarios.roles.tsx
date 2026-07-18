import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, X, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge, BtnPrimary, BtnOutline } from "@/components/portal-shell";

type Permiso = { recurso: string; leer: boolean; modificar: boolean; crear: boolean; borrar: boolean };
type Rol = { id: string; nombre: string; permisos: Permiso[] };

const recursos = ["Usuarios", "Movimientos", "Alertas", "Soporte", "Backoffice", "Reportes", "Registros", "Módulos", "Configuración", "Incidentes"];

const rolesIniciales: Rol[] = [
  { id: "1", nombre: "Admin", permisos: recursos.map((r) => ({ recurso: r, leer: true, modificar: true, crear: true, borrar: true })) },
  { id: "2", nombre: "Compliance", permisos: recursos.map((r) => ({ recurso: r, leer: true, modificar: r === "Alertas" || r === "Usuarios", crear: false, borrar: false })) },
  { id: "3", nombre: "Management", permisos: recursos.map((r) => ({ recurso: r, leer: true, modificar: r !== "Configuración", crear: r === "Reportes" || r === "Incidentes", borrar: false })) },
  { id: "4", nombre: "Accounting", permisos: recursos.map((r) => ({ recurso: r, leer: r === "Movimientos" || r === "Reportes" || r === "Registros", modificar: false, crear: false, borrar: false })) },
  { id: "5", nombre: "Reader", permisos: recursos.map((r) => ({ recurso: r, leer: true, modificar: false, crear: false, borrar: false })) },
  { id: "6", nombre: "User", permisos: recursos.map((r) => ({ recurso: r, leer: false, modificar: false, crear: false, borrar: false })) },
];

export const Route = createFileRoute("/admin/administracion/usuarios/roles")({
  head: () => [{ title: "Roles y permisos — Admin Panel" }],
  component: Page,
});

function Page() {
  const [roles, setRoles] = useState<Rol[]>(rolesIniciales);
  const [selectedRol, setSelectedRol] = useState(rolesIniciales[0].id);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");

  const current = roles.find((r) => r.id === selectedRol)!;

  const togglePermiso = (recurso: string, permiso: keyof Permiso) => {
    setRoles((prev) => prev.map((r) => r.id === selectedRol ? { ...r, permisos: r.permisos.map((p) => p.recurso === recurso ? { ...p, [permiso]: !p[permiso] } : p) } : r));
  };

  const addRol = () => {
    if (!newName.trim()) return;
    const newRol: Rol = { id: String(Date.now()), nombre: newName, permisos: recursos.map((r) => ({ recurso: r, leer: false, modificar: false, crear: false, borrar: false })) };
    setRoles((prev) => [...prev, newRol]);
    setSelectedRol(newRol.id);
    setNewName("");
    setShowNew(false);
  };

  const deleteRol = (id: string) => {
    setRoles((prev) => prev.filter((r) => r.id !== id));
    if (selectedRol === id) setSelectedRol(roles[0]?.id ?? "");
  };

  return (
    <>
      <PageHeader title="Roles y permisos" description="Gestión dinámica de roles y permisos por recurso" />

      <div className="flex flex-wrap gap-2 mb-6">
        {roles.map((r) => (
          <button key={r.id} onClick={() => setSelectedRol(r.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              selectedRol === r.id ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"
            }`}>
            {r.nombre}
            {r.nombre !== "Admin" && <Trash2 size={12} className="opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); deleteRol(r.id); }} />}
          </button>
        ))}
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-dashed text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-solid">
          <Plus size={14} /> Nuevo rol
        </button>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left font-semibold py-3 px-4">Recurso</th>
              <th className="text-center font-semibold py-3 px-2">Leer</th>
              <th className="text-center font-semibold py-3 px-2">Modificar</th>
              <th className="text-center font-semibold py-3 px-2">Crear</th>
              <th className="text-center font-semibold py-3 px-2">Borrar</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {current.permisos.map((p) => (
              <tr key={p.recurso} className="hover:bg-muted/30">
                <td className="py-3 px-4 font-medium">{p.recurso}</td>
                {(["leer", "modificar", "crear", "borrar"] as const).map((perm) => (
                  <td key={perm} className="text-center py-3 px-2">
                    <input type="checkbox" checked={p[perm]} onChange={() => togglePermiso(p.recurso, perm)}
                      className="accent-primary w-4 h-4 cursor-pointer" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowNew(false)}>
          <div className="bg-card border rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Nuevo rol</h3>
              <button onClick={() => setShowNew(false)} className="p-1 hover:opacity-70"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Nombre del rol</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej: Auditor"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
              </div>
              <BtnPrimary onClick={addRol} className="w-full">Crear rol</BtnPrimary>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
