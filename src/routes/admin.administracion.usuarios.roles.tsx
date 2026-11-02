import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Copy, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, BtnOutline, BtnPrimary, Input, Label } from "@/components/portal-shell";
import { FormDialog } from "@/components/form-dialog";
import { RouteSkeleton } from "@/components/route-skeleton";
import { useCan } from "@/lib/permissions";
import type { PermissionCode } from "@/lib/permission-codes";
import {
  RBAC_QUERY_KEYS,
  cloneRole,
  deleteRole,
  fetchPermissionCatalog,
  fetchRolePermissions,
  fetchRoles,
  saveRole,
  type PermissionDefinition,
  type PermissionModule,
  type Role,
} from "@/lib/api/rbac";

export const Route = createFileRoute("/admin/administracion/usuarios/roles")({
  head: () => ({ meta: [{ title: "Roles y permisos — Admin Panel" }] }),
  component: RolesPage,
});

const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";
const checkboxClass = "h-4 w-4 cursor-pointer accent-primary disabled:cursor-not-allowed";

const sameSet = (a: Set<string>, b: Set<string>) =>
  a.size === b.size && [...a].every((x) => b.has(x));

// ---------------------------------------------------------------------------
// Matriz: una fila por recurso (modulo.recurso), columnas tipo CRUD
// ---------------------------------------------------------------------------

type ActionColumn = "read" | "create" | "update" | "delete" | "manage";

const ACTION_COLUMNS: { key: ActionColumn; label: string }[] = [
  { key: "read", label: "Ver" },
  { key: "create", label: "Crear" },
  { key: "update", label: "Editar" },
  { key: "delete", label: "Eliminar" },
  { key: "manage", label: "Gestionar" },
];

/** Accion del codigo (ultimo segmento) → columna. El resto va a "Otras acciones". */
const ACTION_TO_COLUMN: Record<string, ActionColumn> = {
  read: "read",
  view: "read",
  create: "create",
  invite: "create",
  upload: "create",
  update: "update",
  delete: "delete",
  deactivate: "delete",
  manage: "manage",
};

/** Recurso + columnas CRUD + "Otras acciones". */
const COLUMN_COUNT = ACTION_COLUMNS.length + 2;

type MatrixRow = {
  key: string;
  label: string;
  cells: Partial<Record<ActionColumn, PermissionDefinition>>;
  extras: PermissionDefinition[];
  permissions: PermissionDefinition[];
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Nombre del recurso a partir de sus permisos ("Ver lotes" → "Lotes"). */
function resourceLabel(permissions: PermissionDefinition[]): string {
  const read = permissions.find((p) => /\.(read|view)$/.test(p.code));
  if (read) return capitalize(read.name.replace(/^Ver\s+/i, ""));
  const words = permissions[0]!.name.split(/\s+/);
  return capitalize(words.length > 1 ? words.slice(1).join(" ") : words[0]!);
}

/**
 * Agrupa los permisos de un modulo por recurso. Un recurso con una sola accion
 * que no es "ver" (ej. "Cambiar estado") se muestra como accion extra de la fila
 * principal del modulo, para no sumar filas casi vacias.
 */
function buildMatrix(module: PermissionModule): MatrixRow[] {
  const groups = new Map<string, PermissionDefinition[]>();
  for (const permission of module.permissions) {
    const parts = permission.code.split(".");
    const resource = parts.length > 2 ? parts.slice(1, -1).join(".") : "";
    groups.set(resource, [...(groups.get(resource) ?? []), permission]);
  }

  const toRow = (resource: string, permissions: PermissionDefinition[]): MatrixRow => {
    const row: MatrixRow = {
      key: `${module.code}.${resource}`,
      label: resourceLabel(permissions),
      cells: {},
      extras: [],
      permissions: [...permissions],
    };
    for (const permission of permissions) {
      const column = ACTION_TO_COLUMN[permission.code.split(".").pop()!];
      if (column && !row.cells[column]) row.cells[column] = permission;
      else row.extras.push(permission);
    }
    return row;
  };

  const base = groups.has("") ? toRow("", groups.get("")!) : null;
  const rows: MatrixRow[] = base ? [base] : [];
  for (const [resource, permissions] of groups) {
    if (resource === "") continue;
    const lone = permissions.length === 1 && !/\.(read|view)$/.test(permissions[0]!.code);
    if (base && lone) {
      base.extras.push(permissions[0]!);
      base.permissions.push(permissions[0]!);
    } else {
      rows.push(toRow(resource, permissions));
    }
  }
  return rows;
}

function PermissionCheckbox({
  permission,
  checked,
  disabled,
  onChange,
}: {
  permission: PermissionDefinition;
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  const hint = [permission.name, permission.description, permission.isSensitive ? "Sensible" : null]
    .filter(Boolean)
    .join(" — ");
  return (
    <input
      type="checkbox"
      aria-label={permission.name}
      title={hint}
      className={`${checkboxClass} ${permission.isSensitive ? "accent-red-600" : ""}`}
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}

/** Checkbox con estado intermedio (algunas funcionalidades del modulo). */
function ModuleCheckbox({
  checked,
  indeterminate,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      className={checkboxClass}
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

// ---------------------------------------------------------------------------
// Dialogos
// ---------------------------------------------------------------------------

function RoleFormDialog({
  role,
  roles,
  onClose,
  onSaved,
}: {
  /** null = rol nuevo. */
  role: Role | null;
  roles: Role[];
  onClose: () => void;
  onSaved: (roleId: string) => void;
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [baseRoleId, setBaseRoleId] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (name.trim().length < 2 || saving) return;
    setSaving(true);
    try {
      let id: string;
      if (role) {
        id = await saveRole({
          id: role.id,
          name,
          description,
          permissions: await fetchRolePermissions(role.id),
        });
      } else if (baseRoleId) {
        id = await cloneRole(baseRoleId, name);
        if (description.trim()) {
          await saveRole({ id, name, description, permissions: await fetchRolePermissions(id) });
        }
      } else {
        id = await saveRole({ id: null, name, description, permissions: [] });
      }
      toast.success(role ? "Rol actualizado." : `Rol "${name.trim()}" creado.`);
      onSaved(id);
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title={role ? "Editar rol" : "Nuevo rol"}
      description={role ? undefined : "Un rol nuevo arranca sin permisos, o con los de otro rol."}
      onSubmit={submit}
      submitLabel={saving ? "Guardando…" : role ? "Guardar" : "Crear rol"}
      isSubmitting={saving}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="role-name">Nombre del rol</Label>
          <Input
            id="role-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Auditor"
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="role-description">Descripción (opcional)</Label>
          <Input
            id="role-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {!role && (
          <div>
            <Label htmlFor="role-base">Permisos iniciales</Label>
            <select
              id="role-base"
              className={selectClass}
              value={baseRoleId}
              onChange={(e) => setBaseRoleId(e.target.value)}
            >
              <option value="">Sin permisos</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  Copiar de {r.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </FormDialog>
  );
}

function DeleteRoleDialog({
  role,
  roles,
  onClose,
  onDeleted,
}: {
  role: Role;
  roles: Role[];
  onClose: () => void;
  onDeleted: () => void;
}) {
  const targets = roles.filter((r) => r.id !== role.id);
  const [reassignTo, setReassignTo] = useState(
    targets.find((r) => !r.isSuperadmin)?.id ?? targets[0]?.id ?? "",
  );
  const [deleting, setDeleting] = useState(false);

  const submit = async () => {
    setDeleting(true);
    try {
      const moved = await deleteRole(role.id, role.userCount > 0 ? reassignTo : null);
      toast.success(
        moved > 0 ? `Rol eliminado. ${moved} usuario(s) cambiaron de rol.` : "Rol eliminado.",
      );
      onDeleted();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title="Eliminar rol"
      description={`¿Eliminar el rol "${role.name}"? Esta acción no se puede deshacer.`}
      onSubmit={submit}
      submitLabel={deleting ? "Eliminando…" : "Eliminar"}
      isSubmitting={deleting}
    >
      {role.userCount > 0 ? (
        <div>
          <Label htmlFor="reassign-role">Tiene {role.userCount} usuario(s). Pasan al rol:</Label>
          <select
            id="reassign-role"
            className={selectClass}
            value={reassignTo}
            onChange={(e) => setReassignTo(e.target.value)}
          >
            {targets.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No tiene usuarios asignados.</p>
      )}
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// Pagina
// ---------------------------------------------------------------------------

function RolesPage() {
  const queryClient = useQueryClient();
  const { has } = useCan();
  const canManage = has("backoffice.roles.manage");

  const rolesQuery = useQuery({ queryKey: RBAC_QUERY_KEYS.roles, queryFn: fetchRoles });
  const catalogQuery = useQuery({
    queryKey: RBAC_QUERY_KEYS.catalog,
    queryFn: fetchPermissionCatalog,
    staleTime: 10 * 60_000,
  });
  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const catalog = useMemo<PermissionModule[]>(() => catalogQuery.data ?? [], [catalogQuery.data]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRole = roles.find((r) => r.id === selectedId) ?? roles[0] ?? null;

  const permissionsQuery = useQuery({
    queryKey: RBAC_QUERY_KEYS.rolePermissions(selectedRole?.id ?? ""),
    queryFn: () => fetchRolePermissions(selectedRole!.id),
    enabled: !!selectedRole && !selectedRole.isSuperadmin,
  });

  const allCodes = useMemo(
    () => catalog.flatMap((m) => m.permissions.map((p) => p.code)),
    [catalog],
  );
  const saved = useMemo(
    () => new Set<string>(selectedRole?.isSuperadmin ? allCodes : (permissionsQuery.data ?? [])),
    [selectedRole?.isSuperadmin, allCodes, permissionsQuery.data],
  );

  const [draft, setDraft] = useState<Set<string>>(new Set());
  useEffect(() => setDraft(new Set(saved)), [saved]);

  const readOnly = !canManage || !!selectedRole?.isSuperadmin;
  const dirty = !readOnly && !sameSet(draft, saved);
  const added = [...draft].filter((c) => !saved.has(c));
  const removed = [...saved].filter((c) => !draft.has(c));

  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [roleDialog, setRoleDialog] = useState<{ role: Role | null } | null>(null);
  const [toDelete, setToDelete] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);

  const matrix = useMemo(
    () => catalog.map((module) => ({ module, rows: buildMatrix(module) })),
    [catalog],
  );

  const term = search.trim().toLowerCase();
  const sections = useMemo(() => {
    if (!term) return matrix;
    return matrix
      .map(({ module, rows }) => ({
        module,
        rows: module.name.toLowerCase().includes(term)
          ? rows
          : rows.filter(
              (row) =>
                row.label.toLowerCase().includes(term) ||
                row.permissions.some(
                  (p) => p.name.toLowerCase().includes(term) || p.code.includes(term),
                ),
            ),
      }))
      .filter((section) => section.rows.length > 0);
  }, [matrix, term]);

  const setMany = (codes: string[], value: boolean) =>
    setDraft((prev) => {
      const next = new Set(prev);
      for (const code of codes) {
        if (value) next.add(code);
        else next.delete(code);
      }
      return next;
    });

  const toggleCollapsed = (code: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const selectRole = (id: string) => {
    if (id === selectedRole?.id) return;
    if (dirty && !window.confirm("Hay cambios sin guardar en este rol. ¿Descartarlos?")) return;
    setSelectedId(id);
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["rbac"] });

  const save = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await saveRole({
        id: selectedRole.id,
        name: selectedRole.name,
        description: selectedRole.description,
        permissions: [...draft] as PermissionCode[],
      });
      toast.success("Permisos guardados.");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const clone = async (role: Role) => {
    try {
      const id = await cloneRole(role.id, `${role.name} (copia)`);
      toast.success("Rol clonado.");
      await refresh();
      setSelectedId(id);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (rolesQuery.isLoading || catalogQuery.isLoading) return <RouteSkeleton />;
  if (rolesQuery.isError || catalogQuery.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {((rolesQuery.error ?? catalogQuery.error) as Error).message}
      </div>
    );
  }

  const searching = term.length > 0;

  return (
    <>
      <PageHeader
        title="Roles y permisos"
        description="Qué módulos y funcionalidades puede usar cada rol del backoffice."
      />

      {/* Roles */}
      <div className="mb-6 flex flex-wrap gap-2">
        {roles.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => selectRole(role.id)}
            title={`${role.userCount} usuario(s)`}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              selectedRole?.id === role.id
                ? "bg-primary text-primary-foreground"
                : "border bg-card hover:bg-muted"
            }`}
          >
            {role.name}
            <span
              className={`text-xs font-normal ${selectedRole?.id === role.id ? "opacity-80" : "text-muted-foreground"}`}
            >
              {role.userCount}
            </span>
          </button>
        ))}
        {canManage && (
          <button
            type="button"
            onClick={() => setRoleDialog({ role: null })}
            className="inline-flex items-center gap-1 rounded-lg border border-dashed px-4 py-2 text-sm font-semibold text-muted-foreground hover:border-solid hover:text-foreground"
          >
            <Plus size={14} /> Nuevo rol
          </button>
        )}
      </div>

      {selectedRole && (
        <>
          {/* Barra del rol */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{selectedRole.name}</h3>
                {canManage && !selectedRole.isSuperadmin && (
                  <button
                    type="button"
                    title="Editar nombre"
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setRoleDialog({ role: selectedRole })}
                  >
                    <Pencil size={13} />
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedRole.isSuperadmin
                  ? "Acceso total, incluidos los permisos que se agreguen en el futuro. No se edita."
                  : (selectedRole.description ?? `${draft.size} de ${allCodes.length} permisos`)}
                {!selectedRole.isSuperadmin && selectedRole.description
                  ? ` · ${draft.size} de ${allCodes.length} permisos`
                  : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  className="h-9 w-56 pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar permiso…"
                />
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-primary hover:underline"
                onClick={() =>
                  setCollapsed((prev) =>
                    prev.size === 0 ? new Set(catalog.map((m) => m.code)) : new Set(),
                  )
                }
              >
                {collapsed.size === 0 ? "Contraer todo" : "Expandir todo"}
              </button>
              {canManage && (
                <>
                  <BtnOutline onClick={() => void clone(selectedRole)}>
                    <Copy size={14} /> Clonar
                  </BtnOutline>
                  {!selectedRole.isSystem && (
                    <BtnOutline onClick={() => setToDelete(selectedRole)}>
                      <Trash2 size={14} /> Eliminar
                    </BtnOutline>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Matriz */}
          {/* Scroll propio: el encabezado (Ver, Crear, …) queda fijo al bajar. */}
          <div className="max-h-[calc(100vh-16rem)] min-h-80 overflow-auto rounded-lg border bg-card">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr>
                  <th className="sticky top-0 z-10 bg-muted shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)] px-4 py-3 text-left font-semibold">
                    Módulo / recurso
                  </th>
                  {ACTION_COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      className="sticky top-0 z-10 bg-muted shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)] w-20 px-2 py-3 text-center font-semibold"
                    >
                      {column.label}
                    </th>
                  ))}
                  <th className="sticky top-0 z-10 bg-muted shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)] px-4 py-3 text-left font-semibold">
                    Otras acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {permissionsQuery.isLoading ? (
                  <tr>
                    <td
                      colSpan={COLUMN_COUNT}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      <Loader2 size={16} className="mr-2 inline animate-spin" /> Cargando permisos…
                    </td>
                  </tr>
                ) : (
                  sections.map(({ module, rows }) => {
                    const codes = module.permissions.map((p) => p.code);
                    const grantedCount = codes.filter((c) => draft.has(c)).length;
                    const open = searching || !collapsed.has(module.code);
                    return (
                      <Fragment key={module.code}>
                        <tr
                          className="cursor-pointer bg-muted/30 hover:bg-muted/50"
                          onClick={() => toggleCollapsed(module.code)}
                        >
                          <td colSpan={COLUMN_COUNT} className="px-4 py-2">
                            <div className="flex items-center gap-2.5">
                              <ChevronRight
                                size={15}
                                className={`text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
                              />
                              <ModuleCheckbox
                                label={`Todo ${module.name}`}
                                checked={grantedCount === codes.length && codes.length > 0}
                                indeterminate={grantedCount > 0 && grantedCount < codes.length}
                                disabled={readOnly}
                                onChange={(value) => setMany(codes, value)}
                              />
                              <span className="font-semibold">{module.name}</span>
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {grantedCount}/{codes.length}
                              </span>
                            </div>
                          </td>
                        </tr>
                        {open &&
                          rows.map((row) => {
                            const rowCodes = row.permissions.map((p) => p.code);
                            const rowGranted = rowCodes.filter((c) => draft.has(c)).length;
                            return (
                              <tr key={row.key} className="hover:bg-muted/20">
                                <td className="py-2 pl-[3.25rem] pr-4">
                                  <label className="flex items-center gap-2.5">
                                    <ModuleCheckbox
                                      label={`Todo ${row.label}`}
                                      checked={rowGranted === rowCodes.length}
                                      indeterminate={rowGranted > 0 && rowGranted < rowCodes.length}
                                      disabled={readOnly}
                                      onChange={(value) => setMany(rowCodes, value)}
                                    />
                                    <span className="font-medium">{row.label}</span>
                                  </label>
                                </td>
                                {ACTION_COLUMNS.map((column) => {
                                  const permission = row.cells[column.key];
                                  return (
                                    <td key={column.key} className="px-2 py-2 text-center">
                                      {permission ? (
                                        <PermissionCheckbox
                                          permission={permission}
                                          checked={draft.has(permission.code)}
                                          disabled={readOnly}
                                          onChange={(value) => setMany([permission.code], value)}
                                        />
                                      ) : (
                                        <span className="text-muted-foreground/40">—</span>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="px-4 py-2">
                                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                                    {row.extras.map((permission) => (
                                      <label
                                        key={permission.code}
                                        className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap"
                                      >
                                        <PermissionCheckbox
                                          permission={permission}
                                          checked={draft.has(permission.code)}
                                          disabled={readOnly}
                                          onChange={(value) => setMany([permission.code], value)}
                                        />
                                        {permission.name}
                                      </label>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </Fragment>
                    );
                  })
                )}
                {!permissionsQuery.isLoading && sections.length === 0 && (
                  <tr>
                    <td
                      colSpan={COLUMN_COUNT}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Ningún permiso coincide con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Guardar */}
          {dirty ? (
            <div className="sticky bottom-4 z-10 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 shadow-md">
              <span className="text-sm">
                Cambios sin guardar
                <span className="ml-2 text-xs text-muted-foreground">
                  {added.length > 0 && <span className="text-emerald-700">+{added.length} </span>}
                  {removed.length > 0 && <span className="text-red-700">−{removed.length}</span>}
                </span>
              </span>
              <div className="flex gap-2">
                <BtnOutline onClick={() => setDraft(new Set(saved))} disabled={saving}>
                  Descartar
                </BtnOutline>
                <BtnPrimary onClick={() => void save()} disabled={saving}>
                  {saving && <Loader2 size={14} className="animate-spin" />} Guardar
                </BtnPrimary>
              </div>
            </div>
          ) : (
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                {readOnly && !selectedRole.isSuperadmin
                  ? "Solo lectura: no tenés permiso para gestionar roles."
                  : "Marcá los permisos y guardá. Los usuarios con este rol ven el cambio en segundos."}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked
                  readOnly
                  tabIndex={-1}
                  className="h-3.5 w-3.5 accent-red-600"
                />
                Permiso sensible · pasá el mouse sobre un casillero para ver qué permite
              </span>
            </p>
          )}
        </>
      )}

      {roleDialog && (
        <RoleFormDialog
          role={roleDialog.role}
          roles={roles}
          onClose={() => setRoleDialog(null)}
          onSaved={(id) => void refresh().then(() => setSelectedId(id))}
        />
      )}
      {toDelete && (
        <DeleteRoleDialog
          role={toDelete}
          roles={roles}
          onClose={() => setToDelete(null)}
          onDeleted={() => {
            setSelectedId(null);
            void refresh();
          }}
        />
      )}
    </>
  );
}
