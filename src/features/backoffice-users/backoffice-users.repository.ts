import type {
BackofficeUserFilters,
BackofficeUserOption,
BackofficeUserPage,
InviteBackofficeUserInput,
} from "./backoffice-users.types";

type ReadOptions = { signal?: AbortSignal };

/**
 * Usuarios del backoffice. Las reglas (no editarte el rol, ultimo Admin, solo un
 * Admin toca a otro Admin) las aplican la RPC y las Edge Functions.
 */
export interface BackofficeUsersRepository {
  list(filters: BackofficeUserFilters, options?: ReadOptions): Promise<BackofficeUserPage>;
  listActiveOptions(options?: ReadOptions): Promise<BackofficeUserOption[]>;
  update(userId: string, fullName: string, roleId: string): Promise<void>;
  invite(
    input: InviteBackofficeUserInput,
  ): Promise<{ id: string; email: string; staffCode: string }>;
  /** Reenvia la invitacion (si nunca definio clave) o resetea la clave. */
  sendPasswordLink(userId: string): Promise<{ invitation: boolean }>;
  /** Activa o desactiva; desactivar ademas corta las sesiones abiertas. */
  setActive(userId: string, active: boolean): Promise<{ warning?: string }>;
}
