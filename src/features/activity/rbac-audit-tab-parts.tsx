import { type RbacAuditEntry } from "@/features/activity/activity.types";
import { Minus,Plus } from "lucide-react";
import { permissionName,roleName,str } from "./rbac-audit-tab.rules";

export function PermissionList({
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

export function FieldChanges({ entry, fields }: { entry: RbacAuditEntry; fields: string[] }) {
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
