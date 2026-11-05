import { createContext } from "react";
import type { PermissionCode } from "./permission-codes";
import type { PermissionsStatus,SessionPermissions } from "./rbac.types";

export type PermissionsContextValue = {
  status: PermissionsStatus;
  session: SessionPermissions | null;
  has: (code: PermissionCode) => boolean;
  hasAny: (codes: readonly PermissionCode[]) => boolean;
  refresh: () => Promise<void>;
};

export const PermissionsContext = createContext<PermissionsContextValue | null>(null);
