import { describe,expect,it } from "vitest";
import { AppError,isRetryable,userMessage } from "./errors";

describe("AppError", () => {
  it("solo las fallas transitorias se reintentan", () => {
    expect(new AppError("network", "x").retryable).toBe(true);
    expect(new AppError("unknown", "x").retryable).toBe(true);
    for (const kind of ["permission", "not_found", "validation", "conflict", "contract"] as const) {
      expect(new AppError(kind, "x").retryable).toBe(false);
    }
  });

  it("los errores que no son AppError mantienen el reintento (codigo legacy)", () => {
    expect(isRetryable(new Error("x"))).toBe(true);
  });

  it("userMessage nunca expone el texto de un error desconocido", () => {
    expect(userMessage(new AppError("conflict", "Ya existe."))).toBe("Ya existe.");
    expect(userMessage(new Error('relation "x" does not exist'))).toBe(
      "Ocurrió un error. Probá de nuevo.",
    );
  });
});
