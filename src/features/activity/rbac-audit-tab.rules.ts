import {
type RbacAuditEntry,
type RbacAuditFilters,
type RbacAuditTable,
} from "@/features/activity/activity.types";
import { isAppError } from "@/shared/lib/errors";
import { type Description } from "./rbac-audit-tab.types";

export const TABLE_OPTIONS: { value: RbacAuditTable; label: string }[] = [
  { value: "roles", label: "Roles" },
  { value: "backoffice_users", label: "Rol de usuarios" },
  { value: "role_permissions", label: "Permisos por rol (detalle)" },
  { value: "permissions", label: "Catálogo de permisos" },
  { value: "permission_modules", label: "Módulos de permisos" },
];

/** Campos tecnicos que no aportan al leer un cambio. */
export const IGNORED_FIELDS = new Set(["updated_at", "created_at", "permissions_version"]);

/** Cuantos nombres de permisos se muestran en la fila antes de "y N más". */
export const INLINE_PERMISSIONS = 3;

export const OPERATION_TONE = {
  INSERT: "success",
  UPDATE: "warn",
  DELETE: "danger",
  EVENT: "neutral",
} as const;

export function str(data: Record<string, unknown> | null, key: string): string | null {
  const v = data?.[key];
  return v == null ? null : String(v);
}

export function list(data: Record<string, unknown> | null, key: string): string[] {
  const v = data?.[key];
  return Array.isArray(v) ? v.map(String) : [];
}

export function changedFields(e: RbacAuditEntry): string[] {
  if (e.operation !== "UPDATE" || !e.before || !e.after) return [];
  return Object.keys(e.after).filter(
    (k) => !IGNORED_FIELDS.has(k) && JSON.stringify(e.before?.[k]) !== JSON.stringify(e.after?.[k]),
  );
}

/** Nombre del rol: el que manda la base, o el guardado en la fila (rol borrado). */
export function roleName(e: RbacAuditEntry, id: string | null): string {
  if (!id) return "—";
  if (e.roleNames[id]) return e.roleNames[id];
  if (e.tableName === "roles" && id === e.rowId) {
    const saved = str(e.after, "name") ?? str(e.before, "name");
    if (saved) return saved;
  }
  return `rol eliminado (${id.slice(0, 8)})`;
}

export function permissionName(e: RbacAuditEntry, code: string): string {
  return e.permissionNames[code] ?? code;
}

export function summarize(e: RbacAuditEntry, codes: string[]): string {
  const names = codes.slice(0, INLINE_PERMISSIONS).map((c) => permissionName(e, c));
  const rest = codes.length - names.length;
  return names.join(", ") + (rest > 0 ? ` y ${rest} más` : "");
}

export function describe(e: RbacAuditEntry): Description {
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

export function actorLabel(e: RbacAuditEntry): string {
  return e.actorName ?? e.actorEmail ?? "Sistema (sin usuario)";
}

export function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (isAppError(error) && error.kind === "permission") {
    return "No tenés permiso para ver la auditoría de roles y permisos.";
  }
  return "No se pudo cargar la auditoría. Probá de nuevo.";
}

export const EMPTY_FILTERS: RbacAuditFilters = {};
