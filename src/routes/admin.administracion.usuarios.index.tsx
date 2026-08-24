import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, Loader2, AlertTriangle, Inbox, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { Badge, Input, BtnPrimary } from "@/components/portal-shell";
import { listAdminUsers } from "@/lib/api/admin-users";
import { listRoles } from "@/lib/api/roles-permisos";
import type { AdminUser, Rol } from "@/lib/api/types";
import { crearAdminUser } from "@/lib/api/edge";
import { DataAccessError } from "@/lib/api/errors";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const PAGE_SIZE = 25;

export const Route = createFileRoute("/admin/administracion/usuarios/")({
  head: () => ({ meta: [{ title: "Administración de personal — Admin Panel" }] }),
  component: Page,
});

function fmtFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function Page() {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);
  const [detail, setDetail] = useState<AdminUser | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const rolesQ = useQuery({ queryKey: ["roles"], queryFn: listRoles });
  const roles = rolesQ.data ?? [];
  const rolNombre = new Map<string, string>(roles.map((r) => [r.id, r.nombre]));

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["admin-users", page, search],
    queryFn: () => listAdminUsers({ page, pageSize: PAGE_SIZE, search: search || undefined }),
  });

  const rows: AdminUser[] = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const createMut = useMutation({
    mutationFn: (vars: {
      nombre: string;
      email: string;
      legajo: string;
      password: string;
      rolId: string;
    }) => crearAdminUser(vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setShowNew(false);
      setSaveError(null);
    },
    onError: (e) =>
      setSaveError(e instanceof DataAccessError ? e.message : "Error al crear usuario"),
  });

  const { can } = useCan();
  const puedeCrear = can("crear", "usuarios_backoffice");

  const getActions = (r: AdminUser): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setDetail(r) },
  ];

  const columns: Column<AdminUser>[] = [
    { key: "legajo", label: "Legajo", sortable: true, filterable: true, render: (r) => r.legajo },
    { key: "nombre", label: "Nombre", sortable: true, filterable: true, render: (r) => r.nombre },
    { key: "email", label: "Email", sortable: true, filterable: true, render: (r) => r.email },
    {
      key: "rolId",
      label: "Rol",
      sortable: true,
      filterable: false,
      render: (r) => rolNombre.get(r.rolId) ?? r.rolId,
    },
    {
      key: "activo",
      label: "Estado",
      sortable: true,
      filterable: false,
      render: (r) => (
        <Badge tone={r.activo ? "success" : "neutral"}>{r.activo ? "Activo" : "Inactivo"}</Badge>
      ),
    },
    {
      key: "created_at",
      label: "Creado",
      sortable: true,
      filterable: false,
      render: (r) => fmtFecha(r.createdAt),
    },
  ];

  const err = error instanceof DataAccessError ? error : null;

  return (
    <PermissionGuard recurso="usuarios_backoffice">
      <PageHeader
        title="Administración de personal"
        description="Gestión de usuarios del backoffice (datos reales de la base de datos)."
        action={
          <button
            onClick={() => {
              setSaveError(null);
              setShowNew(true);
            }}
            disabled={!puedeCrear}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={14} /> Nuevo usuario
          </button>
        }
      />

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Buscar</label>
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(0);
            }}
            placeholder="Legajo, email o nombre…"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
          <Loader2 size={16} className="mr-2 animate-spin" /> Cargando usuarios…
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
          <AlertTriangle size={28} />
          <p className="font-semibold">
            {err?.permission
              ? "No tenés permiso para ver esto"
              : "Ocurrió un error al cargar los usuarios"}
          </p>
          <p>{err?.message ?? "Error desconocido"}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Reintentar
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          <Inbox size={28} />
          <p>No hay usuarios que coincidan con la búsqueda.</p>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={rows}
            keyExtractor={(r) => r.id}
            pageSize={PAGE_SIZE}
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
          />
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>
              {total > 0 ? `${total} usuario(s) · ` : ""}página {page + 1} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 0 || isFetching}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="inline-flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page + 1 >= totalPaginas || isFetching}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}

      {detail && (
        <FormDialog
          open={!!detail}
          onClose={() => setDetail(null)}
          title="Detalle del usuario"
          description={`${detail.nombre} · ${detail.legajo}`}
          onSubmit={() => setDetail(null)}
          submitLabel="Cerrar"
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Nombre:</span>{" "}
              <span className="font-medium">{detail.nombre}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Legajo:</span>{" "}
              <span className="font-medium">{detail.legajo}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Email:</span>{" "}
              <span className="font-medium">{detail.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Rol:</span>{" "}
              <span className="font-medium">{rolNombre.get(detail.rolId) ?? detail.rolId}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Estado:</span>{" "}
              <span className="font-medium">{detail.activo ? "Activo" : "Inactivo"}</span>
            </div>
          </div>
        </FormDialog>
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
              <h3 className="font-display font-semibold">Nuevo usuario backoffice</h3>
              <button onClick={() => setShowNew(false)} className="p-1 hover:opacity-70">
                <X size={18} />
              </button>
            </div>

            {rolesQ.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 size={16} className="animate-spin" /> Cargando roles…
              </div>
            ) : (
              <NewUserForm
                roles={roles}
                submitting={createMut.isPending}
                error={saveError}
                onSubmit={(vars) => createMut.mutate(vars)}
                onCancel={() => setShowNew(false)}
              />
            )}
          </div>
        </div>
      )}
    </PermissionGuard>
  );
}

function NewUserForm({
  roles,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  roles: Rol[];
  submitting: boolean;
  error: string | null;
  onSubmit: (vars: {
    nombre: string;
    email: string;
    legajo: string;
    password: string;
    rolId: string;
  }) => void;
  onCancel: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [legajo, setLegajo] = useState("");
  const [password, setPassword] = useState("");
  const [rolId, setRolId] = useState(roles[0]?.id ?? "");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!nombre.trim() || !email.trim() || !password.trim() || !rolId) return;
        onSubmit({
          nombre: nombre.trim(),
          email: email.trim(),
          legajo: legajo.trim(),
          password,
          rolId,
        });
      }}
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">Nombre</label>
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">Email</label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">Legajo</label>
        <Input value={legajo} onChange={(e) => setLegajo(e.target.value)} placeholder="Opcional" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">Contraseña</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">Rol</label>
        <select
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          value={rolId}
          onChange={(e) => setRolId(e.target.value)}
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-10 rounded-md border border-input bg-card text-sm font-semibold hover:bg-accent"
        >
          Cancelar
        </button>
        <BtnPrimary type="submit" disabled={submitting || !rolId} className="flex-1">
          {submitting ? "Creando…" : "Crear usuario"}
        </BtnPrimary>
      </div>
    </form>
  );
}
