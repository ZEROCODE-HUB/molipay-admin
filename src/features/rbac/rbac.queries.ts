import { queryOptions } from "@tanstack/react-query";
import { STALE } from "@/app/query-client";
import { privateScope } from "@/shared/lib/query-scope";
import type { RbacRepository } from "./rbac.repository";

export const rbacKeys = {
  all: (userId: string) => [...privateScope(userId), "rbac"] as const,
  myPermissions: (userId: string) => [...rbacKeys.all(userId), "my-permissions"] as const,
  catalog: (userId: string) => [...rbacKeys.all(userId), "catalog"] as const,
  roles: (userId: string) => [...rbacKeys.all(userId), "roles"] as const,
  rolePermissions: (userId: string, roleId: string) =>
    [...rbacKeys.all(userId), "role-permissions", roleId] as const,
};

export const createRbacQueries = (repository: RbacRepository) => ({
  myPermissions: (userId: string) =>
    queryOptions({
      queryKey: rbacKeys.myPermissions(userId),
      queryFn: ({ signal }) => repository.getMyPermissions({ signal }),
      staleTime: STALE.moderate,
    }),
  catalog: (userId: string) =>
    queryOptions({
      queryKey: rbacKeys.catalog(userId),
      queryFn: ({ signal }) => repository.listPermissionModules({ signal }),
      staleTime: STALE.long,
    }),
  roles: (userId: string) =>
    queryOptions({
      queryKey: rbacKeys.roles(userId),
      queryFn: ({ signal }) => repository.listRoles({ signal }),
      staleTime: STALE.moderate,
    }),
  rolePermissions: (userId: string, roleId: string) =>
    queryOptions({
      queryKey: rbacKeys.rolePermissions(userId, roleId),
      queryFn: ({ signal }) => repository.listRolePermissions(roleId, { signal }),
      staleTime: STALE.moderate,
    }),
});
