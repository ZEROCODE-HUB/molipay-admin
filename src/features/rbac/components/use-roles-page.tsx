import { useEffect,useMemo,useState } from "react";
import { toast } from "sonner";
import type { PermissionCode } from "../permission-codes";
import type { PermissionModule,Role } from "../rbac.types";
import {
useCan,
usePermissionCatalog,
useRoleActions,
useRolePermissions,
useRoles,
} from "../rbac.hooks";
import { userMessage } from "@/shared/lib/errors";
import { useConfirm } from "@/shared/ui/confirm-provider";
import { sameSet,buildMatrix } from "@/features/rbac/roles.rules";

/** Estado y acciones de RolesPage: el componente solo dibuja. */
export function useRolesPage() {
  const { has } = useCan();
  const roleActions = useRoleActions();
  const confirm = useConfirm();
  const canManage = has("backoffice.roles.manage");

  const rolesQuery = useRoles();
  const catalogQuery = usePermissionCatalog();
  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const catalog = useMemo<PermissionModule[]>(() => catalogQuery.data ?? [], [catalogQuery.data]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRole = roles.find((r) => r.id === selectedId) ?? roles[0] ?? null;

  const permissionsQuery = useRolePermissions(
    selectedRole?.id ?? null,
    !!selectedRole && !selectedRole.isSuperadmin,
  );

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

  const selectRole = async (id: string) => {
    if (id === selectedRole?.id) return;
    if (
      dirty &&
      !(await confirm({
        title: "Cambios sin guardar",
        message: "Hay cambios sin guardar en este rol. ¿Descartarlos?",
        confirmLabel: "Descartar",
        variant: "danger",
      }))
    )
      return;
    setSelectedId(id);
  };

  const refresh = roleActions.refresh;

  const save = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await roleActions.saveRole({
        id: selectedRole.id,
        name: selectedRole.name,
        description: selectedRole.description,
        permissions: [...draft] as PermissionCode[],
      });
      toast.success("Permisos guardados.");
      await refresh();
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const clone = async (role: Role) => {
    try {
      const id = await roleActions.cloneRole(role.id, `${role.name} (copia)`);
      toast.success("Rol clonado.");
      await refresh();
      setSelectedId(id);
    } catch (e) {
      toast.error(userMessage(e));
    }
  };
  return {
    has,
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
  };
}

export type RolesPageVm = ReturnType<typeof useRolesPage>;
