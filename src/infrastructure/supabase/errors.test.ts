import { describe,expect,it } from "vitest";
import { toAppError } from "./errors";

describe("toAppError", () => {
  it("usa el texto de nuestras funciones (RAISE EXCEPTION) como mensaje", () => {
    const e = toAppError({ code: "P0001", message: "El motivo es obligatorio" });
    expect(e).toMatchObject({ kind: "validation", message: "El motivo es obligatorio" });
  });

  it("un 42501 propio conserva el texto; uno del sistema se reemplaza", () => {
    expect(
      toAppError({ code: "42501", message: "No podés desactivar tu propio usuario" }).message,
    ).toBe("No podés desactivar tu propio usuario");
    const system = toAppError({ code: "42501", message: "permission denied for table roles" });
    expect(system.kind).toBe("permission");
    expect(system.message).not.toContain("roles");
  });

  it("clasifica conflictos, no encontrado y red", () => {
    expect(toAppError({ code: "23505", message: "duplicate key" }).kind).toBe("conflict");
    expect(toAppError({ code: "PGRST116", message: "0 rows" }).kind).toBe("not_found");
    expect(toAppError(new TypeError("Failed to fetch"))).toMatchObject({
      kind: "network",
      retryable: true,
    });
  });

  it("lo desconocido no expone el texto tecnico", () => {
    const e = toAppError(
      { code: "42P01", message: 'relation "x" does not exist' },
      { feature: "rbac" },
    );
    expect(e).toMatchObject({ kind: "unknown", context: { feature: "rbac" } });
    expect(e.message).not.toContain("relation");
  });
});
