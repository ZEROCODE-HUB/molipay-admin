import { describe,expect,it } from "vitest";
import {
addMoney,
compareMoney,
formatMoneyAmount,
moneyFromCents,
moneyFromDecimal,
moneyInputToNumber,
parseMoneyInput,
sumDecimals,
sumMoney,
toDecimalString,
} from "./money";

describe("moneyFromDecimal", () => {
  it("parsea desde el texto, sin errores de float", () => {
    expect(moneyFromDecimal("0.1").cents + moneyFromDecimal("0.2").cents).toBe(30);
    expect(moneyFromDecimal(1234.56).cents).toBe(123456);
    expect(moneyFromDecimal("-10.5").cents).toBe(-1050);
    expect(moneyFromDecimal(null).cents).toBe(0);
  });

  it("redondea half up al centavo cuando vienen mas de 2 decimales", () => {
    expect(moneyFromDecimal("1.005").cents).toBe(101);
    expect(moneyFromDecimal("1.004").cents).toBe(100);
  });

  it("rechaza valores no decimales o fuera de rango", () => {
    expect(() => moneyFromDecimal("1e21")).toThrow();
    expect(() => moneyFromDecimal("abc")).toThrow();
    expect(() => moneyFromDecimal("99999999999999999999")).toThrow();
    expect(() => moneyFromCents(0.5)).toThrow();
  });
});

describe("parseMoneyInput", () => {
  it("acepta formato argentino y con punto decimal", () => {
    expect(parseMoneyInput("1.234,56")?.cents).toBe(123456);
    expect(parseMoneyInput("1234,5")?.cents).toBe(123450);
    expect(parseMoneyInput("1234.56")?.cents).toBe(123456);
    expect(parseMoneyInput("$ 500")?.cents).toBe(50000);
  });

  it("devuelve null si no es un importe valido o tiene mas de 2 decimales", () => {
    expect(parseMoneyInput("")).toBeNull();
    expect(parseMoneyInput("12,345")).toBeNull();
    expect(parseMoneyInput("abc")).toBeNull();
  });
});

describe("operaciones y formato", () => {
  it("suma y compara en centavos", () => {
    const total = sumMoney([
      moneyFromDecimal("0.10"),
      moneyFromDecimal("0.20"),
      moneyFromDecimal("0.30"),
    ]);
    expect(total.cents).toBe(60);
    expect(compareMoney(addMoney(total, moneyFromCents(40)), moneyFromCents(100))).toBe(0);
  });

  it("texto decimal para APIs y formato para pantalla", () => {
    expect(toDecimalString(moneyFromCents(123456))).toBe("1234.56");
    expect(toDecimalString(moneyFromCents(-5))).toBe("-0.05");
    expect(formatMoneyAmount(moneyFromCents(123456))).toBe("$ 1.234,56");
    expect(formatMoneyAmount(moneyFromCents(-1000))).toBe("$ -10,00");
  });
});

describe("importes escritos por el usuario", () => {
  it('"1.500" son mil quinientos, no 1,50', () => {
    expect(parseMoneyInput("1.500")?.cents).toBe(150000);
    expect(parseMoneyInput("1.500.000")?.cents).toBe(150000000);
    expect(moneyInputToNumber("1.500")).toBe(1500);
  });

  it("una plantilla guardada como 1500.5 no se multiplica", () => {
    expect(moneyInputToNumber("1500.5")).toBe(1500.5);
    expect(moneyInputToNumber("1.500,50")).toBe(1500.5);
    expect(moneyInputToNumber("1500,50")).toBe(1500.5);
  });

  it("lo inválido es 0, nunca un monto parecido", () => {
    expect(moneyInputToNumber("abc")).toBe(0);
    expect(moneyInputToNumber("")).toBe(0);
    expect(moneyInputToNumber("12.34.56")).toBe(0);
  });
});

describe("sumDecimals", () => {
  it("suma sin error de float", () => {
    expect(sumDecimals(["0.1", "0.2", null, 1])).toBe(1.3);
  });
});
