import { describe,expect,it } from "vitest";
import { statusOf,toBackofficeUser } from "./backoffice-users.supabase";

describe("statusOf", () => {
  it("inactivo, invitado (nunca definio clave) o activo", () => {
    expect(statusOf({ is_active: false, password_set_at: "x", invited_at: "x" })).toBe("inactive");
    expect(statusOf({ is_active: true, password_set_at: null, invited_at: "2026-11-01" })).toBe(
      "invited",
    );
    expect(
      statusOf({ is_active: true, password_set_at: "2026-11-02", invited_at: "2026-11-01" }),
    ).toBe("active");
    // Alta vieja sin invitacion: activo.
    expect(statusOf({ is_active: true, password_set_at: null, invited_at: null })).toBe("active");
  });
});

describe("toBackofficeUser", () => {
  it("toma el rol embebido (objeto o lista)", () => {
    const base = {
      id: "u1",
      staff_code: "OP-1",
      email: "op@moli.com",
      full_name: "Operador",
      is_active: true,
      role_id: "r1",
      must_change_password: false,
      invited_at: null,
      password_set_at: "2026-11-02",
      last_login_at: null,
      created_at: "2026-11-01",
    };
    expect(
      toBackofficeUser({ ...base, roles: { name: "Soporte", is_superadmin: false } }),
    ).toMatchObject({
      roleName: "Soporte",
      roleIsSuperadmin: false,
      status: "active",
    });
    expect(
      toBackofficeUser({ ...base, roles: [{ name: "Admin", is_superadmin: true }] })
        .roleIsSuperadmin,
    ).toBe(true);
    expect(toBackofficeUser({ ...base, roles: null }).roleName).toBe("—");
  });
});
