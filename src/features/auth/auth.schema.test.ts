import { describe,expect,it } from "vitest";
import { createSetPasswordSchema,loginSchema } from "./auth.schema";

describe("loginSchema", () => {
  it("normaliza el email y exige contraseña", () => {
    const ok = loginSchema.safeParse({ email: "  Admin@Moli.com ", password: "x" });
    expect(ok.success && ok.data.email).toBe("admin@moli.com");
    expect(loginSchema.safeParse({ email: "no-es-email", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});

describe("createSetPasswordSchema", () => {
  const schema = createSetPasswordSchema("juanperez@moli.com");

  it("acepta una clave que cumple la politica y coincide", () => {
    expect(schema.safeParse({ password: "Segura2026x", confirmation: "Segura2026x" }).success).toBe(
      true,
    );
  });

  it("rechaza claves cortas, sin numeros, con el email o que no coinciden", () => {
    const fail = (password: string, confirmation = password) => {
      const r = schema.safeParse({ password, confirmation });
      return r.success ? null : r.error.issues.map((i) => i.path[0]);
    };
    expect(fail("corta1")).toEqual(["password"]);
    expect(fail("SinNumerosAca")).toEqual(["password"]);
    expect(fail("juanperez2026")).toEqual(["password"]);
    expect(fail("Segura2026x", "Otra2026xx")).toEqual(["confirmation"]);
  });
});
