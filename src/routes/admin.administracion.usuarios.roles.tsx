import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Trash2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { BtnPrimary, BtnOutline } from "@/components/portal-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataAccessError } from "@/lib/api/errors";
import {
  listRoles,
  listRecursos,
  getPermisosByRol,
  upsertPermiso,
  upsertRol,
  deleteRol,
} from "@/lib/api/roles-permisos";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import type { Permiso } from "@/lib/api/types";

type PermField = "puedeLeer" | "puedeCrear" | "puedeModificar" | "puedeBorrar";
const CAMPOS: { field: PermField; label: string }[] = [
  { field: "puedeLeer", label: "Leer" },
  { field: "puedeModificar", label: "Modificar" },
  { field: "puedeCrear", label: "Crear" },
  { field: "puedeBorrar", label: "Borrar" },
];

export const Route = createFileRoute("/admin/administracion/usuarios/roles")({
  head: () => ({ meta: [{ title: "Roles y permisos — Admin Panel" }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const [selectedRol, setSelectedRol] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const rolesQ = useQuery({ queryKey: ["roles"], queryFn: listRoles });
  const recursosQ = useQuery({ queryKey: ["recursos"], queryFn: listRecursos });
  const permisosQ = useQuery({
    queryKey: ["permisos", selectedRol],
    queryFn: () => getPermisosByRol(selectedRol as string),
    enabled: !!selectedRol,
  });

  const roles = rolesQ.data ?? [];
  const recursos = recursosQ.data ?? [];
  // Mapa recursoId -> Permiso para el rol seleccionado.
  const permisosByRecurso = new Map<string, Permiso>(
    (permisosQ.data ?? []).map((p) => [p.recursoId, p]),
  );

  const rolActivo = selectedRol ?? roles[0]?.id ?? null;

  const toggleMut = useMutation({
    mutationFn: (vars: { recursoId: string; field: PermField }) => {
      const actual = permisosByRecurso.get(vars.recursoId);
      const next: Permiso = {
        id: actual?.id ?? "",
        rolId: rolActivo as string,
        recursoId: vars.recursoId,
        puedeLeer: actual?.puedeLeer ?? false,
        puedeCrear: actual?.puedeCrear ?? false,
        puedeModificar: actual?.puedeModificar ?? false,
        puedeBorrar: actual?.puedeBorrar ?? false,
        [vars.field]: !(actual?.[vars.field] ?? false),
      };
      return upsertPermiso(next);
    },
    onSuccess: () => {
      setSaveError(null);
      qc.invalidateQueries({ queryKey: ["permisos", rolActivo] });
    },
    onError: (e) => setSaveError(e instanceof DataAccessError ? e.message : "Error al guardar"),
  });

  const createMut = useMutation({
    mutationFn: (nombre: string) => upsertRol({ nombre }),
    onSuccess: (rol) => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      setSelectedRol(rol.id);
      setNewName("");
      setShowNew(false);
    },
    onError: (e) => setSaveError(e instanceof DataAccessError ? e.message : "Error al crear rol"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteRol(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      if (selectedRol === confirmDelete) setSelectedRol(null);
      setConfirmDelete(null);
    },
    onError: (e) =>
      setSaveError(e instanceof DataAccessError ? e.message : "Error al eliminar rol"),
  });

  const current = roles.find((r) => r.id === rolActivo);

  const { can } = useCan();
  const puedeCrear = can("crear", "roles_permisos");
  const puedeModificar = can("modificar", "roles_permisos");
  const puedeBorrar = can("borrar", "roles_permisos");

  return (
    <PermissionGuard recurso="roles_permisos">
      <PageHeader
        title="Roles y permisos"
        description="Gestión de roles y permisos por recurso (conectado a la base de datos)."
      />

      {(rolesQ.isLoading || recursosQ.isLoading) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 size={16} className="animate-spin" /> Cargando…
        </div>
      )}

      {!rolesQ.isLoading && roles.length === 0 && (
        <p className="text-sm text-muted-foreground py-8">No hay roles cargados.</p>
      )}

      {roles.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setSelectedRol(r.id);
                  setSaveError(null);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  rolActivo === r.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border hover:bg-muted"
                }`}
              >
                {r.nombre}
                {r.nombre !== "Admin" && (
                  <Trash2
                    size={12}
                    className={`opacity-60 hover:opacity-100 ${
                      puedeBorrar ? "" : "opacity-30 cursor-not-allowed"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!puedeBorrar) return;
                      setConfirmDelete(r.id);
                    }}
                  />
                )}
              </button>
            ))}
            <button
              onClick={() => setShowNew(true)}
              disabled={!puedeCrear}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-dashed text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-solid disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={14} /> Nuevo rol
            </button>
          </div>

          {saveError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {saveError}
            </div>
          )}

          <div className="bg-card border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left font-semibold py-3 px-4">Recurso</th>
                  {CAMPOS.map((c) => (
                    <th key={c.field} className="text-center font-semibold py-3 px-2">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {recursos.map((rec) => {
                  const p = permisosByRecurso.get(rec.id);
                  return (
                    <tr key={rec.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">
                        {rec.nombre}
                        {rec.modulo ? (
                          <span className="ml-2 text-xs text-muted-foreground">{rec.modulo}</span>
                        ) : null}
                      </td>
                      {CAMPOS.map((c) => {
                        const checked = !!(p?.[c.field] ?? false);
                        return (
                          <td key={c.field} className="text-center py-3 px-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={toggleMut.isPending || !puedeModificar}
                              onChange={() =>
                                toggleMut.mutate({ recursoId: rec.id, field: c.field })
                              }
                              className="accent-primary w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {current && (
        <p className="mt-3 text-xs text-muted-foreground">
          Editando permisos del rol <span className="font-semibold">{current.nombre}</span>. Los
          cambios se guardan al instante.
        </p>
      )}

      {showNew && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowNew(false)}
        >
          <div
            className="bg-card border rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold">Nuevo rol</h3>
              <button onClick={() => setShowNew(false)} className="p-1 hover:opacity-70">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Nombre del rol
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej: Auditor"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
              <BtnPrimary
                onClick={() => newName.trim() && createMut.mutate(newName.trim())}
                disabled={createMut.isPending || !newName.trim()}
                className="w-full"
              >
                {createMut.isPending ? "Creando…" : "Crear rol"}
              </BtnPrimary>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar rol"
        message="¿Estás seguro de eliminar este rol? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => confirmDelete && deleteMut.mutate(confirmDelete)}
      />
    </PermissionGuard>
  );
}
