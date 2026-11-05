import { describe,expect,it } from "vitest";
import { formatDateTime,formatIsoDate,formatMoney } from "./format";

describe("formatMoney", () => {
  it("formatea con separador de miles y dos decimales", () => {
    expect(formatMoney(1234.5)).toBe("$ 1.234,50");
    expect(formatMoney(0)).toBe("$ 0,00");
  });

  it("mantiene el signo de los negativos", () => {
    expect(formatMoney(-10)).toBe("$ -10,00");
  });

  it("sin valor muestra un guion", () => {
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney(undefined)).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("muestra fecha y hora local en formato es-AR", () => {
    const iso = new Date(2026, 10, 2, 14, 30, 5).toISOString();
    // es-AR usa reloj de 12 h ("02:30 p. m."), igual que el navegador.
    expect(formatDateTime(iso)).toMatch(/^02\/11\/2026, 0?2:30\s?p\.\s?m\.$/);
    expect(formatDateTime(iso, { seconds: true })).toMatch(/^02\/11\/2026, 0?2:30:05\s?p\.\s?m\.$/);
  });

  it("sin valor muestra un guion", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("")).toBe("—");
  });
});

describe("formatIsoDate", () => {
  it("invierte la fecha sin correrla por zona horaria", () => {
    expect(formatIsoDate("2026-11-02")).toBe("02/11/2026");
    expect(formatIsoDate("2026-01-31T23:59:59Z")).toBe("31/01/2026");
  });

  it("sin valor muestra un guion", () => {
    expect(formatIsoDate(null)).toBe("—");
  });
});
