import { describe, expect, it } from "vitest";
import { parsearLine, periodVigencia } from "./iibb-registry";

const parse = (line: string) => parsearLine(line, 1, false);
const reason = (line: string) => {
  const r = parse(line);
  return r && !r.ok ? r.error.motivo : null;
};

describe("parsearLine (SIRCUPA)", () => {
  it("lee las 6 columnas del ejemplo oficial", () => {
    expect(parse("20000033481;PERROTTA CAYETANO;908;202209;89;Q\r")).toEqual({
      ok: true,
      vigencia: { vigencia_desde: "2022-09-01", vigencia_hasta: "2022-09-30" },
      fila: {
        cuit: "20000033481",
        razon_social: "PERROTTA CAYETANO",
        jurisdiccion: "908",
        crc: "89",
        letra: "Q",
        linea: 1,
      },
    });
  });

  it("acepta Convenio Multilateral como 0 y 000", () => {
    for (const code of ["0", "000"]) {
      const r = parse(`30699027320;CLOFEA SRL;${code};202209;23;D`);
      expect(r?.ok && r.fila.jurisdiccion).toBe(code);
    }
  });

  it("conserva una razon social con punto y coma y la recorta a 45", () => {
    const r = parse(`30699027320;A;B;0;202209;23;D`);
    expect(r?.ok && r.fila.razon_social).toBe("A;B");
    const long = parse(`30699027320;${"X".repeat(60)};0;202209;23;D`);
    expect(long?.ok && long.fila.razon_social).toHaveLength(45);
  });

  it("ignora lineas vacias", () => {
    expect(parse("  \r")).toBeNull();
  });

  it.each([
    ["30699027320;CLOFEA;0;202209;23", "Faltan columnas"],
    ["123;CLOFEA;0;202209;23;D", "CUIT inválido"],
    ["30699027320;CLOFEA;900;202209;23;D", "Jurisdicción inválida"],
    ["30699027320;CLOFEA;925;202209;23;D", "Jurisdicción inválida"],
    ["30699027320;CLOFEA;0;202213;23;D", "Período inválido"],
    ["30699027320;CLOFEA;0;202209;123;D", "CRC inválido"],
    ["30699027320;CLOFEA;0;202209;23;1", "Letra de alícuota inválida"],
  ])("rechaza %s", (line, expected) => {
    expect(reason(line)).toContain(expected);
  });

  it("valida el digito verificador salvo en archivos de prueba", () => {
    const line = "30699027321;CLOFEA;0;202209;23;D";
    expect(parsearLine(line, 1, true)?.ok).toBe(false);
    expect(parsearLine(line, 1, false)?.ok).toBe(true);
  });
});

describe("periodVigencia", () => {
  it("cubre el mes completo, incluso en bisiesto", () => {
    expect(periodVigencia("202402")).toEqual({
      vigencia_desde: "2024-02-01",
      vigencia_hasta: "2024-02-29",
    });
  });
});
