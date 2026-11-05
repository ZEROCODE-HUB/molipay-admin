import { ErrorNotice } from "@/shared/ui/error-notice";
import { useRolesPage } from "@/features/rbac/components/use-roles-page";
import { RouteSkeleton } from "@/shared/ui/route-skeleton";
import { userMessage } from "@/shared/lib/errors";
import { PageHeader } from "@/shared/ui/page-header";
import { ChevronRight,Copy,Loader2,Pencil,Plus,Search,Trash2 } from "lucide-react";
import { Input } from "@/shared/ui/form-controls";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Fragment } from "react";
import { ACTION_COLUMNS,COLUMN_COUNT } from "@/features/rbac/roles.rules";
import { ModuleCheckbox,PermissionCheckbox } from "./roles-parts";
import { RoleFormDialog } from "./role-form-dialog";
import { DeleteRoleDialog } from "./delete-role-dialog";

// ---------------------------------------------------------------------------
// Pagina
// ---------------------------------------------------------------------------

export function RolesPage() {
  const vm = useRolesPage();
  const {
    canManage,
    rolesQuery,
    catalogQuery,
    roles,
    catalog,
    setSelectedId,
    selectedRole,
    permissionsQuery,
    allCodes,
    saved,
    draft,
    setDraft,
    readOnly,
    dirty,
    added,
    removed,
    search,
    setSearch,
    collapsed,
    setCollapsed,
    roleDialog,
    setRoleDialog,
    toDelete,
    setToDelete,
    saving,
    term,
    sections,
    setMany,
    toggleCollapsed,
    selectRole,
    refresh,
    save,
    clone,
  } = vm;

  if (rolesQuery.isLoading || catalogQuery.isLoading) return <RouteSkeleton />;
  if (rolesQuery.isError || catalogQuery.isError) {
    return (
      <ErrorNotice icon={false}>{userMessage(rolesQuery.error ?? catalogQuery.error)}</ErrorNotice>
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
