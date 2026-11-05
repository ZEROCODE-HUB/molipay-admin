import type { PermissionCode } from "./permission-codes";
import type { PermissionModule,Role,RoleInput,SessionPermissions } from "./rbac.types";

type ReadOptions = { signal?: AbortSignal };

/**
 * Operaciones de roles y permisos. La base valida cada escritura
 * (backoffice.roles.manage) y la audita en rbac_audit_log.
 */
export interface RbacRepository {
  /** null si la sesion no es de un usuario del backoffice. */
  getMyPermissions(options?: ReadOptions): Promise<SessionPermissions | null>;
  listPermissionModules(options?: ReadOptions): Promise<PermissionModule[]>;
  listRoles(options?: ReadOptions): Promise<Role[]>;
  listRolePermissions(roleId: string, options?: ReadOptions): Promise<PermissionCode[]>;
  /** Crea o actualiza el rol y reemplaza su set de permisos (atomico). Devuelve el id. */
  saveRole(input: RoleInput): Promise<string>;
  cloneRole(roleId: string, name: string): Promise<string>;
  /** Si el rol tiene usuarios, pasan a `reassignTo`. Devuelve cuantos se movieron. */
  deleteRole(roleId: string, reassignTo: string | null): Promise<number>;
}
