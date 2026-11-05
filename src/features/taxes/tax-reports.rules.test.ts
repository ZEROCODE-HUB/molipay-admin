import { describe, expect, it } from "vitest";
import { contentTxt, lineSircupa, sircupaMissing } from "./tax-reports.rules";

const filing = { periodo: "2026-11", tramo: 2 as const };
const row = {
  cuit: "30712345678",
  cvu: "0000003100012345678901",
  base: 1050,
  monto: 26.25,
  movimientos: 3,
  crc: "47",
};

describe("TXT de SIRCUPA", () => {
  it("arma las 14 columnas en orden", () => {
    expect(lineSircupa(filing, row).split(",")).toEqual([
      "2026",
      "11",
      "2",
      "30712345678",
      "0000003100012345678901",
      "1050.00",
      "26.25",
      "",
      "1",
      "3",
      "47",
      "0",
      "1",
      "0",
    ]);
  });

  it("termina cada linea con CRLF y un tramo sin filas queda vacio", () => {
    expect(contentTxt(filing, [row, row]).split("\r\n")).toHaveLength(3);
    expect(contentTxt(filing, [])).toBe("");
  });

  it("avisa los datos que faltan", () => {
    expect(sircupaMissing([row])).toEqual([]);
    expect(sircupaMissing([{ ...row, cuit: "", cvu: "", crc: "" }])).toEqual([
      "1 sin CUIT válido",
      "1 sin CVU",
      "1 sin CRC del padrón",
    ]);
  });
});
