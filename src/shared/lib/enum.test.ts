import { describe,expect,it } from "vitest";
import { parseEnum,parseEnumMap } from "./enum";

describe("parseEnum", () => {
  it("acepta los valores permitidos", () => {
    expect(parseEnum("info", ["info", "high"] as const, "severity")).toBe("info");
  });

  it("un valor desconocido es un error contract (no se acepta en silencio)", () => {
    const error = (() => {
      try {
        parseEnum("extremo", ["info", "high"] as const, "security_events.severity");
      } catch (e) {
        return e;
      }
    })();
    expect(error).toMatchObject({
      kind: "contract",
      retryable: false,
      context: { operation: "security_events.severity" },
    });
  });
});

describe("parseEnumMap", () => {
  it("traduce el valor de la base", () => {
    expect(
      parseEnumMap("activo", { activo: "active", bloqueado: "blocked" }, "clientes.estado"),
    ).toBe("active");
    expect(() => parseEnumMap("otro", { activo: "active" }, "clientes.estado")).toThrow();
  });
});
