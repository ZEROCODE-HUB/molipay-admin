import type { PermissionCode } from "./permission-codes";

/** Permisos de la sesion actual (RPC my_permissions). */
export type SessionPermissions = {
  userId: string;
  fullName: string;
  email: string;
  staffCode: string;
  isActive: boolean;
  roleId: string;
  roleName: string;
  isSuperadmin: boolean;
  mustChangePassword: boolean;
  version: number;
  codes: PermissionCode[];
};

export type PermissionDefinition = {
  code: PermissionCode;
  moduleCode: string;
  name: string;
  description: string | null;
  isSensitive: boolean;
};

export type PermissionModule = {
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  permissions: PermissionDefinition[];
};

export type Role = {
  id: string;
  name: string;
  description: string | null;
  isSuperadmin: boolean;
  isSystem: boolean;
  userCount: number;
  updatedAt: string;
};

export type RoleInput = {
  /** null = rol nuevo. */
  id: string | null;
  name: string;
  description: string | null;
  permissions: PermissionCode[];
};

export type PermissionsStatus =
  /** Todavia no hay datos (primer ingreso sin cache). */
  | "loading"
  /** Hay permisos (aunque se esten revalidando). */
  | "ready"
  /** Sin sesion. */
  | "anonymous"
  /** Sesion valida pero no es usuario del backoffice. */
  | "not_staff"
  | "error";

/** Accion del esquema viejo (recurso + accion), para useCan().can. */
export type LegacyAction = "leer" | "crear" | "modificar" | "borrar";
