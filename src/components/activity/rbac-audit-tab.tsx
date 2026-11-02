import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Minus, Plus, RefreshCw, X } from "lucide-react";
import { Badge, BtnOutline, Input } from "@/components/portal-shell";
import { ModalDialog } from "@/components/modal-dialog";
import {
  ACTIVITY_QUERY_KEYS,
  fetchRbacAudit,
  type RbacAuditCursor,
  type RbacAuditEntry,
  type RbacAuditFilters,
  type RbacAuditTable,
} from "@/lib/api/security-events";
import { DataAccessError } from "@/lib/api/errors";
import {
  ActivityTable,
  DetailRow,
  FilterField,
  JsonBlock,
  type ActivityColumn,
} from "./activity-ui";
import { SELECT_CLASS, formatDateTime } from "./activity-format";

const TABLE_OPTIONS: { value: RbacAuditTable; label: string }[] = [
  { value: "roles", label: "Roles" },
  { value: "backoffice_users", label: "Rol de usuarios" },
  { value: "role_permissions", label: "Permisos por rol (detalle)" },
  { value: "permissions", label: "Catálogo de permisos" },
  { value: "permission_modules", label: "Módulos de permisos" },
];

/** Campos tecnicos que no aportan al leer un cambio. */
const IGNORED_FIELDS = new Set(["updated_at", "created_at", "permissions_version"]);

/** Cuantos nombres de permisos se muestran en la fila antes de "y N más". */
const INLINE_PERMISSIONS = 3;

type Tone = "success" | "danger" | "warn" | "neutral";
type Description = { action: string; subject: string; tone: Tone };

const OPERATION_TONE = {
  INSERT: "success",
  UPDATE: "warn",
  DELETE: "danger",
  EVENT: "neutral",
} as const;

function str(data: Record<string, unknown> | null, key: string): string | null {
  const v = data?.[key];
  return v == null ? null : String(v);
}

function list(data: Record<string, unknown> | null, key: string): string[] {
  const v = data?.[key];
  return Array.isArray(v) ? v.map(String) : [];
}

function changedFields(e: RbacAuditEntry): string[] {
  if (e.operation !== "UPDATE" || !e.before || !e.after) return [];
  return Object.keys(e.after).filter(
    (k) => !IGNORED_FIELDS.has(k) && JSON.stringify(e.before?.[k]) !== JSON.stringify(e.after?.[k]),
  );
}

/** Nombre del rol: el que manda la base, o el guardado en la fila (rol borrado). */
function roleName(e: RbacAuditEntry, id: string | null): string {
  if (!id) return "—";
  if (e.roleNames[id]) return e.roleNames[id];
  if (e.tableName === "roles" && id === e.rowId) {
    const saved = str(e.after, "name") ?? str(e.before, "name");
    if (saved) return saved;
  }
  return `rol eliminado (${id.slice(0, 8)})`;
}

function permissionName(e: RbacAuditEntry, code: string): string {
  return e.permissionNames[code] ?? code;
}

function summarize(e: RbacAuditEntry, codes: string[]): string {
  const names = codes.slice(0, INLINE_PERMISSIONS).map((c) => permissionName(e, c));
  const rest = codes.length - names.length;
  return names.join(", ") + (rest > 0 ? ` y ${rest} más` : "");
}

function describe(e: RbacAuditEntry): Description {
  const tone = OPERATION_TONE[e.operation];
  const data = e.after ?? e.before;
  switch (e.tableName) {
    case "roles": {
      const name = roleName(e, e.rowId);
      if (e.event === "role.permissions_set") {
        const added = list(e.after, "added");
        const removed = list(e.after, "removed");
        const parts = [
          added.length > 0 && `agregó ${summarize(e, added)}`,
          removed.length > 0 && `quitó ${summarize(e, removed)}`,
        ].filter(Boolean);
        const action =
          added.length > 0 && removed.length === 0
            ? "Concedió permisos"
            : removed.length > 0 && added.length === 0
              ? "Revocó permisos"
              : "Cambió los permisos";
        return {
          action,
          subject: `Rol ${name}: ${parts.join(" · ") || "sin cambios"}`,
          tone: removed.length > 0 ? "danger" : "success",
        };
      }
      if (e.event === "role.deleted") {
        const moved = Number(e.after?.users_moved ?? 0);
        const target = str(e.after, "moved_to");
        return {
          action: "Eliminó el rol",
          subject:
            moved > 0
              ? `${str(e.after, "name") ?? name} · ${moved} usuario(s) pasaron a ${roleName(e, target)}`
              : (str(e.after, "name") ?? name),
          tone: "danger",
        };
      }
      if (e.operation === "INSERT") return { action: "Creó el rol", subject: name, tone };
      if (e.operation === "DELETE") return { action: "Eliminó el rol", subject: name, tone };
      const fields = changedFields(e).map((k) =>
        k === "name" ? `nombre: ${str(e.before, k)} → ${str(e.after, k)}` : k,
      );
      return { action: "Modificó el rol", subject: `${name} · ${fields.join(", ")}`, tone };
    }
    case "role_permissions": {
      const code = str(data, "permission_code") ?? "";
      const subject = `${permissionName(e, code)} · rol ${roleName(e, str(data, "role_id"))}`;
      return e.operation === "INSERT"
        ? { action: "Concedió un permiso", subject, tone }
        : { action: "Revocó un permiso", subject, tone };
    }
    case "backoffice_users": {
      const email = str(data, "email") ?? "usuario";
      if (e.operation === "EVENT")
        return { action: `Evento ${e.event ?? ""}`.trim(), subject: email, tone };
      if (e.operation === "INSERT")
        return {
          action: "Asignó un rol (alta)",
          subject: `${email} → ${roleName(e, str(e.after, "role_id"))}`,
          tone,
        };
      if (e.operation === "DELETE")
        return {
          action: "Quitó el rol (baja)",
          subject: `${email} (${roleName(e, str(e.before, "role_id"))})`,
          tone,
        };
      return {
        action: "Cambió el rol",
        subject: `${email}: ${roleName(e, str(e.before, "role_id"))} → ${roleName(e, str(e.after, "role_id"))}`,
        tone,
      };
    }
    case "permissions":
    case "permission_modules": {
      const what = e.tableName === "permissions" ? "permiso" : "módulo";
      const code = str(data, "code") ?? e.rowId ?? "";
      const label = str(data, "name") ? `${str(data, "name")} (${code})` : code;
      if (e.operation === "INSERT")
        return { action: `Agregó un ${what} al catálogo`, subject: label, tone };
      if (e.operation === "DELETE")
        return { action: `Eliminó un ${what} del catálogo`, subject: label, tone };
      return {
        action: `Modificó un ${what} del catálogo`,
        subject: `${label} · ${changedFields(e).join(", ")}`,
        tone,
      };
    }
    default:
      return { action: `${e.operation} ${e.tableName}`, subject: e.rowId ?? "", tone };
  }
}

function actorLabel(e: RbacAuditEntry): string {
  return e.actorName ?? e.actorEmail ?? "Sistema (sin usuario)";
}

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof DataAccessError && error.permission) {
    return "No tenés permiso para ver la auditoría de roles y permisos.";
  }
  return "No se pudo cargar la auditoría. Probá de nuevo.";
}

function PermissionList({
  entry,
  codes,
  kind,
}: {
  entry: RbacAuditEntry;
  codes: string[];
  kind: "added" | "removed";
}) {
  if (codes.length === 0) return null;
  const added = kind === "added";
  return (
    <div className="mt-4">
      <div
        className={`mb-1.5 flex items-center gap-1.5 text-xs font-semibold ${
          added ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
        }`}
      >
        {added ? <Plus size={13} /> : <Minus size={13} />}
        {added ? "Permisos concedidos" : "Permisos revocados"} ({codes.length})
      </div>
      <ul className="divide-y rounded-md border">
        {codes.map((code) => (
          <li key={code} className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm">
            <span>{permissionName(entry, code)}</span>
            <span className="font-mono text-[11px] text-muted-foreground">{code}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FieldChanges({ entry, fields }: { entry: RbacAuditEntry; fields: string[] }) {
  return (
    <div className="mt-4 overflow-hidden rounded-md border">
      <table className="w-full text-xs">
        <thead className="bg-muted text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Campo</th>
            <th className="px-3 py-2">Antes</th>
            <th className="px-3 py-2">Después</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((k) => {
            const isRole = k === "role_id";
            const before = isRole
              ? roleName(entry, str(entry.before, k))
              : JSON.stringify(entry.before?.[k]);
            const after = isRole
              ? roleName(entry, str(entry.after, k))
              : JSON.stringify(entry.after?.[k]);
            return (
              <tr key={k} className="border-t">
                <td className="px-3 py-2 font-mono">{isRole ? "rol" : k}</td>
                <td className="px-3 py-2 font-mono text-red-700 dark:text-red-400">{before}</td>
                <td className="px-3 py-2 font-mono text-emerald-700 dark:text-emerald-400">
                  {after}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const EMPTY_FILTERS: RbacAuditFilters = {};

export function RbacAuditTab() {
  const [filters, setFilters] = useState<RbacAuditFilters>(EMPTY_FILTERS);
  const [detail, setDetail] = useState<RbacAuditEntry | null>(null);

  const query = useInfiniteQuery({
    queryKey: ACTIVITY_QUERY_KEYS.rbacAudit(filters),
    queryFn: ({ pageParam }) => fetchRbacAudit(filters, pageParam),
    initialPageParam: null as RbacAuditCursor | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const rows = useMemo(() => query.data?.pages.flatMap((p) => p.rows) ?? [], [query.data]);

  const update = (patch: Partial<RbacAuditFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const hasFilters = Object.values(filters).some(Boolean);

  const columns: ActivityColumn<RbacAuditEntry>[] = [
    {
      key: "createdAt",
      label: "Fecha y hora",
      className: "whitespace-nowrap",
      render: (e) => (
        <span className="font-mono text-xs tabular-nums">{formatDateTime(e.createdAt)}</span>
      ),
    },
    {
      key: "actor",
      label: "Quién",
      render: (e) => (
        <div className="max-w-56">
          <div className="truncate">{actorLabel(e)}</div>
          {e.actorName && e.actorEmail && (
            <div className="truncate text-[11px] text-muted-foreground">{e.actorEmail}</div>
          )}
        </div>
      ),
    },
    {
      key: "action",
      label: "Cambio",
      className: "whitespace-nowrap",
      render: (e) => {
        const d = describe(e);
        return <Badge tone={d.tone}>{d.action}</Badge>;
      },
    },
    {
      key: "subject",
      label: "Detalle",
      render: (e) => <div className="line-clamp-2 max-w-xl">{describe(e).subject}</div>,
    },
  ];

  const detailDescription = detail ? describe(detail) : null;
  const detailFields = detail ? changedFields(detail) : [];
  const isPermissionSet = detail?.event === "role.permissions_set";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <FilterField label="Qué cambió">
          <select
            className={SELECT_CLASS}
            value={filters.table ?? ""}
            onChange={(ev) => update({ table: (ev.target.value || null) as RbacAuditTable | null })}
          >
            <option value="">Todo (sin detalle por permiso)</option>
            {TABLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Desde">
          <Input
            type="date"
            value={filters.from ?? ""}
            onChange={(ev) => update({ from: ev.target.value || null })}
            className="w-40"
          />
        </FilterField>
        <FilterField label="Hasta">
          <Input
            type="date"
            value={filters.to ?? ""}
            onChange={(ev) => update({ to: ev.target.value || null })}
            className="w-40"
          />
        </FilterField>
        {hasFilters && (
          <BtnOutline onClick={() => setFilters(EMPTY_FILTERS)}>
            <X size={14} /> Limpiar
          </BtnOutline>
        )}
        <BtnOutline onClick={() => query.refetch()} title="Actualizar" aria-label="Actualizar">
          <RefreshCw
            size={14}
            className={query.isFetching && !query.isFetchingNextPage ? "animate-spin" : ""}
          />
        </BtnOutline>
      </div>

      <ActivityTable
        columns={columns}
        rows={rows}
        rowKey={(e) => e.id}
        onRowClick={setDetail}
        loading={query.isPending}
        error={errorMessage(query.error)}
        emptyMessage={
          hasFilters ? "No hay cambios con esos filtros." : "Todavía no hay cambios registrados."
        }
        hasMore={!!query.hasNextPage}
        loadingMore={query.isFetchingNextPage}
        onLoadMore={() => query.fetchNextPage()}
      />

      {detail && detailDescription && (
        <ModalDialog
          open
          onClose={() => setDetail(null)}
          title={detailDescription.action}
          description={detailDescription.subject}
          size="lg"
        >
          <DetailRow label="Fecha y hora">{formatDateTime(detail.createdAt)}</DetailRow>
          <DetailRow label="Quién">
            {actorLabel(detail)}
            {detail.actorEmail && detail.actorName && (
              <div className="text-xs text-muted-foreground">{detail.actorEmail}</div>
            )}
          </DetailRow>
          {(detail.tableName === "roles" || detail.tableName === "role_permissions") && (
            <DetailRow label="Rol">
              {roleName(
                detail,
                detail.tableName === "roles"
                  ? detail.rowId
                  : str(detail.after ?? detail.before, "role_id"),
              )}
            </DetailRow>
          )}

          {isPermissionSet ? (
            <>
              <PermissionList entry={detail} codes={list(detail.after, "added")} kind="added" />
              <PermissionList entry={detail} codes={list(detail.after, "removed")} kind="removed" />
            </>
          ) : detailFields.length > 0 ? (
            <FieldChanges entry={detail} fields={detailFields} />
          ) : (
            <div className="mt-4">
              <div className="mb-1.5 text-xs font-semibold text-muted-foreground">Datos</div>
              <JsonBlock value={detail.after ?? detail.before} />
            </div>
          )}

          <div className="mt-4 text-[11px] text-muted-foreground">
            Registro técnico: <span className="font-mono">{detail.tableName}</span> ·{" "}
            <span className="font-mono">
              {detail.operation}
              {detail.event ? ` · ${detail.event}` : ""}
            </span>
          </div>
        </ModalDialog>
      )}
    </div>
  );
}
