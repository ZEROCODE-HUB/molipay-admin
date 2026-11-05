import { describe,expect,it,vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createRbacQueries,rbacKeys } from "./rbac.queries";
import type { RbacRepository } from "./rbac.repository";
import type { Role } from "./rbac.types";

const role: Role = {
  id: "r1",
  name: "Accounting",
  description: null,
  isSuperadmin: false,
  isSystem: false,
  userCount: 2,
  updatedAt: "2026-11-02T00:00:00Z",
};

function fakeRepository(): RbacRepository {
  return {
    getMyPermissions: vi.fn(async () => null),
    listPermissionModules: vi.fn(async () => []),
    listRoles: vi.fn(async () => [role]),
    listRolePermissions: vi.fn(async () => []),
    saveRole: vi.fn(async () => "r1"),
    cloneRole: vi.fn(async () => "r2"),
    deleteRole: vi.fn(async () => 0),
  };
}

describe("rbac queries", () => {
  it("las keys separan la cache por usuario", () => {
    expect(rbacKeys.roles("A")).not.toEqual(rbacKeys.roles("B"));
    expect(rbacKeys.rolePermissions("A", "r1").slice(0, 3)).toEqual(rbacKeys.all("A"));
  });

  it("consulta el repositorio recibido (sin Supabase)", async () => {
    const repository = fakeRepository();
    const client = new QueryClient();
    const roles = await client.fetchQuery(createRbacQueries(repository).roles("A"));
    expect(roles).toEqual([role]);
    expect(repository.listRoles).toHaveBeenCalledTimes(1);
  });

  it("invalidar los roles de un usuario no toca la cache de otro", async () => {
    const repository = fakeRepository();
    const client = new QueryClient();
    const queries = createRbacQueries(repository);
    await client.fetchQuery(queries.roles("A"));
    await client.fetchQuery(queries.roles("B"));
    await client.invalidateQueries({ queryKey: rbacKeys.all("A") });
    expect(client.getQueryState(rbacKeys.roles("A"))?.isInvalidated).toBe(true);
    expect(client.getQueryState(rbacKeys.roles("B"))?.isInvalidated).toBe(false);
  });
});
