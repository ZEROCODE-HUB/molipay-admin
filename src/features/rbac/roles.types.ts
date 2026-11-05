import { type PermissionDefinition } from "@/features/rbac/rbac.types";

// ---------------------------------------------------------------------------
// Matriz: una fila por recurso (modulo.recurso), columnas tipo CRUD
// ---------------------------------------------------------------------------

export type ActionColumn = "read" | "create" | "update" | "delete" | "manage";

export type MatrixRow = {
  key: string;
  label: string;
  cells: Partial<Record<ActionColumn, PermissionDefinition>>;
  extras: PermissionDefinition[];
  permissions: PermissionDefinition[];
};
