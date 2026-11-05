import { type PermissionDefinition,type PermissionModule } from "@/features/rbac/rbac.types";
import { type ActionColumn,type MatrixRow } from "./roles.types";

export const checkboxClass = "h-4 w-4 cursor-pointer accent-primary disabled:cursor-not-allowed";

export const sameSet = (a: Set<string>, b: Set<string>) =>
  a.size === b.size && [...a].every((x) => b.has(x));

export const ACTION_COLUMNS: { key: ActionColumn; label: string }[] = [
  { key: "read", label: "Ver" },
  { key: "create", label: "Crear" },
  { key: "update", label: "Editar" },
  { key: "delete", label: "Eliminar" },
  { key: "manage", label: "Gestionar" },
];

/** Accion del codigo (ultimo segmento) → columna. El resto va a "Otras acciones". */
export const ACTION_TO_COLUMN: Record<string, ActionColumn> = {
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
export const COLUMN_COUNT = ACTION_COLUMNS.length + 2;

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Nombre del recurso a partir de sus permisos ("Ver lotes" → "Lotes"). */
export function resourceLabel(permissions: PermissionDefinition[]): string {
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
export function buildMatrix(module: PermissionModule): MatrixRow[] {
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
