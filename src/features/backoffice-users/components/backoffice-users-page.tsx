import { Pagination } from "@/shared/ui/pagination";
import { LoadingBlock } from "@/shared/ui/loading-block";
import { selectClass } from "@/shared/ui/field-classes";
import { userMessage } from "@/shared/lib/errors";
import { useEffect,useState } from "react";
import {
KeyRound,
Mail,
Pencil,
Power,
PowerOff,
Search,
ShieldCheck,
UserPlus,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { Badge } from "@/shared/ui/badge";
import { BtnPrimary } from "@/shared/ui/button";
import { Input,Label } from "@/shared/ui/form-controls";
import { DataTable,type Column } from "@/shared/ui/data-table";
import { ActionsDropdown,type ActionItem } from "@/shared/ui/actions-dropdown";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { formatDateTime } from "@/shared/lib/format";
import { useBackofficeUserActions,useBackofficeUsers } from "../backoffice-users.hooks";
import type { BackofficeUser,BackofficeUserStatus } from "../backoffice-users.types";
import { EditUserDialog } from "./edit-user-dialog";
import { InviteUserDialog } from "./invite-user-dialog";
import { UserActionDialog,type UserAction } from "./user-action-dialog";
import { Can } from "@/features/rbac/access-gate";
import { useCan,usePermissions,useRoles,useRoleActions } from "@/features/rbac/rbac.hooks";

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<BackofficeUserStatus, string> = {
  invited: "Invitado",
  active: "Activo",
  inactive: "Inactivo",
};
const STATUS_TONE: Record<BackofficeUserStatus, "warn" | "success" | "neutral"> = {
  invited: "warn",
  active: "success",
  inactive: "neutral",
};

// ---------------------------------------------------------------------------
// Pagina
// ---------------------------------------------------------------------------

export function BackofficeUsersPage() {
  const { has } = useCan();
  const { session } = usePermissions();

  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [roleId, setRoleId] = useState("");
  const [status, setStatus] = useState<BackofficeUserStatus | "">("");
  useEffect(() => setPage(0), [search, roleId, status]);

  const filters = {
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    roleId: roleId || undefined,
    status: status || undefined,
  };
  const usersQuery = useBackofficeUsers(filters);
  const userActions = useBackofficeUserActions();
  const rolesQuery = useRoles();
  const { refresh: refreshRoles } = useRoleActions();
  const roles = rolesQuery.data ?? [];

  const [showInvite, setShowInvite] = useState(false);
  const [editing, setEditing] = useState<BackofficeUser | null>(null);
  const [pending, setPending] = useState<UserAction | null>(null);

  const refresh = () => {
    void userActions.refresh();
    void refreshRoles();
  };

  // Solo las acciones permitidas (las demas no se muestran).
  const actionsFor = (user: BackofficeUser): ActionItem[] => {
    const isSelf = user.id === session?.userId;
    const items: ActionItem[] = [];
    if (has("backoffice.users.update"))
      items.push({ label: "Editar", icon: Pencil, onClick: () => setEditing(user) });
    if (user.isActive && user.status === "invited" && has("backoffice.users.invite")) {
      items.push({
        label: "Reenviar invitación",
        icon: Mail,
        onClick: () => setPending({ kind: "password", user }),
      });
    }
    if (user.isActive && user.status === "active" && has("backoffice.users.update")) {
      items.push({
        label: "Resetear contraseña",
        icon: KeyRound,
        onClick: () => setPending({ kind: "password", user }),
      });
    }
    if (has("backoffice.users.deactivate") && !isSelf) {
      items.push(
        user.isActive
          ? {
              label: "Desactivar",
              icon: PowerOff,
              variant: "danger",
              onClick: () => setPending({ kind: "deactivate", user }),
            }
          : {
              label: "Activar",
              icon: Power,
              onClick: () => setPending({ kind: "activate", user }),
            },
      );
    }
    return items;
  };

  const columns: Column<BackofficeUser>[] = [
    {
      key: "user",
      label: "Usuario",
      render: (u) => (
        <div className="leading-tight">
          <div className="font-medium">
            {u.fullName}
            {u.id === session?.userId && (
              <span className="ml-1.5 text-[11px] text-muted-foreground">(vos)</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{u.email}</div>
        </div>
      ),
    },
    {
      key: "staffCode",
      label: "Legajo",
      render: (u) => <span className="font-mono text-xs">{u.staffCode}</span>,
    },
    {
      key: "role",
      label: "Rol",
      render: (u) =>
        u.roleIsSuperadmin ? (
          <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            <ShieldCheck size={12} /> {u.roleName}
          </span>
        ) : (
          <Badge tone="neutral">{u.roleName}</Badge>
        ),
    },
    {
      key: "status",
      label: "Estado",
      render: (u) => <Badge tone={STATUS_TONE[u.status]}>{STATUS_LABEL[u.status]}</Badge>,
    },
    {
      key: "lastLogin",
      label: "Último acceso",
      render: (u) => <span className="text-xs">{formatDateTime(u.lastLoginAt)}</span>,
    },
    {
      key: "createdAt",
      label: "Alta",
      render: (u) => <span className="text-xs">{formatDateTime(u.createdAt)}</span>,
    },
  ];

  const total = usersQuery.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Usuarios backoffice"
        description="Personas con acceso al panel. El alta es por invitación y el acceso lo define su rol."
        action={
          <Can permission="backoffice.users.invite">
            <BtnPrimary onClick={() => setShowInvite(true)} disabled={roles.length === 0}>
              <UserPlus size={14} /> Invitar usuario
            </BtnPrimary>
          </Can>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Label htmlFor="users-search">Buscar</Label>
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="users-search"
              className="pl-8"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Nombre, email o legajo…"
            />
          </div>
        </div>
        <div className="min-w-[180px]">
          <Label htmlFor="users-role">Rol</Label>
          <select
            id="users-role"
            className={selectClass}
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
          >
            <option value="">Todos los roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px]">
          <Label htmlFor="users-status">Estado</Label>
          <select
            id="users-status"
            className={selectClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as BackofficeUserStatus | "")}
          >
            <option value="">Todos</option>
            <option value="active">Activos</option>
            <option value="invited">Invitados</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
      </div>

      {usersQuery.isLoading ? (
        <LoadingBlock label="Cargando usuarios…" />
      ) : usersQuery.isError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {userMessage(usersQuery.error)}
        </p>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={usersQuery.data?.rows ?? []}
            keyExtractor={(u) => u.id}
            pageSize={PAGE_SIZE}
            showGlobalFilter={false}
            showDownloadButton={false}
            emptyMessage="No hay usuarios con esos filtros."
            actions={(u) => {
              const items = actionsFor(u);
              return items.length > 0 ? <ActionsDropdown actions={items} /> : null;
            }}
          />
          {pages > 1 && (
            <Pagination
              variant="compact"
              page={page + 1}
              totalPages={pages}
              total={total}
              countLabel="usuario(s)"
              onPageChange={(p) => setPage(p - 1)}
            />
          )}
        </>
      )}

      {showInvite && (
        <InviteUserDialog roles={roles} onClose={() => setShowInvite(false)} onInvited={refresh} />
      )}
      {editing && (
        <EditUserDialog
          user={editing}
          roles={roles}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
      {pending && (
        <UserActionDialog action={pending} onClose={() => setPending(null)} onDone={refresh} />
      )}
    </>
  );
}
