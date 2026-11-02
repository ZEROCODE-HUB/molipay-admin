import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  Power,
  PowerOff,
  Search,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Badge, BtnOutline, BtnPrimary, Input, Label } from "@/components/portal-shell";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { FormDialog } from "@/components/form-dialog";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Can, useCan, usePermissions } from "@/lib/permissions";
import { RBAC_QUERY_KEYS, fetchRoles, type Role } from "@/lib/api/rbac";
import {
  BACKOFFICE_USERS_QUERY_KEY,
  fetchBackofficeUsers,
  inviteBackofficeUser,
  sendPasswordLink,
  setBackofficeUserActive,
  updateBackofficeUser,
  type BackofficeUser,
  type BackofficeUserStatus,
} from "@/lib/api/backoffice-users";

export const Route = createFileRoute("/admin/administracion/usuarios/")({
  head: () => ({ meta: [{ title: "Usuarios backoffice — Admin Panel" }] }),
  component: BackofficeUsersPage,
});

const PAGE_SIZE = 20;

const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

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

const formatDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

// ---------------------------------------------------------------------------
// Dialogos
// ---------------------------------------------------------------------------

function InviteUserDialog({
  roles,
  onClose,
  onInvited,
}: {
  roles: Role[];
  onClose: () => void;
  onInvited: () => void;
}) {
  const { session } = usePermissions();
  const assignableRoles = roles.filter((r) => !r.isSuperadmin || session?.isSuperadmin);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState(
    assignableRoles.find((r) => !r.isSuperadmin)?.id ?? assignableRoles[0]?.id ?? "",
  );
  const [staffCode, setStaffCode] = useState("");
  const [sending, setSending] = useState(false);

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const valid = fullName.trim().length >= 2 && emailValid && !!roleId;

  const submit = async () => {
    if (!valid || sending) return;
    setSending(true);
    try {
      await inviteBackofficeUser({ fullName, email, roleId, staffCode });
      toast.success(`Invitación enviada a ${email.trim().toLowerCase()}.`);
      onInvited();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title="Invitar usuario"
      description="Le llega un email para definir su contraseña. Hasta que la defina no puede usar el panel."
      onSubmit={submit}
      submitLabel={sending ? "Enviando…" : "Enviar invitación"}
      isSubmitting={sending}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="invite-name">Nombre y apellido</Label>
          <Input
            id="invite-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@empresa.com"
          />
          {email && !emailValid && <p className="mt-1 text-xs text-red-600">Email inválido.</p>}
        </div>
        <div>
          <Label htmlFor="invite-role">Rol</Label>
          <select
            id="invite-role"
            className={selectClass}
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
          >
            {assignableRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.isSuperadmin ? " (acceso total)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="invite-code">Legajo (opcional)</Label>
          <Input
            id="invite-code"
            value={staffCode}
            onChange={(e) => setStaffCode(e.target.value)}
            placeholder="Se genera solo"
          />
        </div>
      </div>
    </FormDialog>
  );
}

function EditUserDialog({
  user,
  roles,
  onClose,
  onSaved,
}: {
  user: BackofficeUser;
  roles: Role[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { session } = usePermissions();
  const isSelf = session?.userId === user.id;
  const canTouchAdmin = !!session?.isSuperadmin;
  const assignableRoles = roles.filter(
    (r) => !r.isSuperadmin || canTouchAdmin || r.id === user.roleId,
  );
  const [fullName, setFullName] = useState(user.fullName);
  const [roleId, setRoleId] = useState(user.roleId);
  const [saving, setSaving] = useState(false);
  const roleLocked = isSelf || (user.roleIsSuperadmin && !canTouchAdmin);

  const submit = async () => {
    if (fullName.trim().length < 2 || saving) return;
    setSaving(true);
    try {
      await updateBackofficeUser(user.id, fullName, roleId);
      toast.success("Usuario actualizado.");
      onSaved();
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
      title="Editar usuario"
      description={user.email}
      onSubmit={submit}
      submitLabel={saving ? "Guardando…" : "Guardar"}
      isSubmitting={saving}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="edit-name">Nombre y apellido</Label>
          <Input id="edit-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="edit-role">Rol</Label>
          <select
            id="edit-role"
            className={selectClass}
            value={roleId}
            disabled={roleLocked}
            onChange={(e) => setRoleId(e.target.value)}
          >
            {assignableRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.isSuperadmin ? " (acceso total)" : ""}
              </option>
            ))}
          </select>
          {roleLocked && (
            <p className="mt-1 text-xs text-muted-foreground">
              {isSelf
                ? "No podés cambiar tu propio rol."
                : "Solo un Admin puede cambiar el rol de otro Admin."}
            </p>
          )}
        </div>
      </div>
    </FormDialog>
  );
}

type PendingAction = { kind: "password" | "deactivate" | "activate"; user: BackofficeUser };

function ConfirmActionDialog({
  action,
  onClose,
  onDone,
}: {
  action: PendingAction;
  onClose: () => void;
  onDone: () => void;
}) {
  const [running, setRunning] = useState(false);
  const { user, kind } = action;
  const isInvitation = kind === "password" && user.status === "invited";

  const copy = {
    password: isInvitation
      ? {
          title: "Reenviar invitación",
          body: `Se envía un nuevo email a ${user.email} para definir su contraseña.`,
          cta: "Reenviar",
        }
      : {
          title: "Resetear contraseña",
          body: `${user.fullName} queda sin acceso hasta definir una contraseña nueva con el link que le llega a ${user.email}.`,
          cta: "Resetear y enviar email",
        },
    deactivate: {
      title: "Desactivar usuario",
      body: `${user.fullName} pierde el acceso de inmediato (se cierran sus sesiones abiertas). Podés reactivarlo después.`,
      cta: "Desactivar",
    },
    activate: {
      title: "Activar usuario",
      body: `${user.fullName} vuelve a tener acceso con su rol actual.`,
      cta: "Activar",
    },
  }[kind];

  const run = async () => {
    setRunning(true);
    try {
      if (kind === "password") {
        await sendPasswordLink(user.id);
        toast.success(isInvitation ? "Invitación reenviada." : "Email de reseteo enviado.");
      } else {
        const result = await setBackofficeUserActive(user.id, kind === "activate");
        if (result.warning) toast.warning(result.warning);
        else toast.success(kind === "activate" ? "Usuario activado." : "Usuario desactivado.");
      }
      onDone();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title={copy.title}
      onSubmit={run}
      submitLabel={running ? "Procesando…" : copy.cta}
      isSubmitting={running}
    >
      <p className="text-sm text-muted-foreground">{copy.body}</p>
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// Pagina
// ---------------------------------------------------------------------------

function BackofficeUsersPage() {
  const queryClient = useQueryClient();
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
  const usersQuery = useQuery({
    queryKey: [...BACKOFFICE_USERS_QUERY_KEY, filters],
    queryFn: () => fetchBackofficeUsers(filters),
    placeholderData: keepPreviousData,
  });
  const rolesQuery = useQuery({ queryKey: RBAC_QUERY_KEYS.roles, queryFn: fetchRoles });
  const roles = rolesQuery.data ?? [];

  const [showInvite, setShowInvite] = useState(false);
  const [editing, setEditing] = useState<BackofficeUser | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: BACKOFFICE_USERS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: RBAC_QUERY_KEYS.roles });
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
        <div className="flex items-center justify-center rounded-xl border bg-card py-16 text-sm text-muted-foreground">
          <Loader2 size={16} className="mr-2 animate-spin" /> Cargando usuarios…
        </div>
      ) : usersQuery.isError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {(usersQuery.error as Error).message}
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
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {total} usuario(s) · página {page + 1} de {pages}
              </span>
              <div className="flex gap-2">
                <BtnOutline disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </BtnOutline>
                <BtnOutline disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
                  Siguiente
                </BtnOutline>
              </div>
            </div>
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
        <ConfirmActionDialog action={pending} onClose={() => setPending(null)} onDone={refresh} />
      )}
    </>
  );
}
