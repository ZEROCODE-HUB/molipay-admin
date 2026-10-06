export type ImpuestoPorCobrar = {
  id: string;
  usuario: string;
  legajo: string;
  loteId: string;
  bandera: string;
  impuesto: string;
  monto: number;
  estado: "pendiente" | "pagado";
  fechaLote: string;
  comercio: string;
};

export const MOCK_IMPUESTOS_POR_COBRAR: ImpuestoPorCobrar[] = [
  { id: "IPC-001", usuario: "comercio_alpha@mail.com", legajo: "LPF-20111111111", loteId: "LOTE-2026-09-07-001", bandera: "Visa", impuesto: "IIBB 3.5%", monto: 14250, estado: "pendiente", fechaLote: "2026-09-07", comercio: "Distribuidora Delta SRL" },
  { id: "IPC-002", usuario: "comercio_alpha@mail.com", legajo: "LPF-20111111111", loteId: "LOTE-2026-09-07-001", bandera: "Visa", impuesto: "Ganancias 6%", monto: 8750, estado: "pendiente", fechaLote: "2026-09-07", comercio: "Distribuidora Delta SRL" },
  { id: "IPC-003", usuario: "comercio_alpha@mail.com", legajo: "LPF-20111111111", loteId: "LOTE-2026-09-06-010", bandera: "Visa", impuesto: "IIBB 3.5%", monto: 9800, estado: "pagado", fechaLote: "2026-09-06", comercio: "Distribuidora Delta SRL" },
  { id: "IPC-004", usuario: "empresa.beta@mail.com", legajo: "LPJ-30778899001", loteId: "LOTE-2026-09-07-002", bandera: "Mastercard", impuesto: "IIBB 4%", monto: 11200, estado: "pendiente", fechaLote: "2026-09-07", comercio: "Tech Zeta SRL" },
  { id: "IPC-005", usuario: "empresa.beta@mail.com", legajo: "LPJ-30778899001", loteId: "LOTE-2026-09-07-002", bandera: "Mastercard", impuesto: "Sellos 0.6%", monto: 2100, estado: "pendiente", fechaLote: "2026-09-07", comercio: "Tech Zeta SRL" },
  { id: "IPC-006", usuario: "empresa.beta@mail.com", legajo: "LPJ-30778899001", loteId: "LOTE-2026-09-06-011", bandera: "Mastercard", impuesto: "IIBB 4%", monto: 8900, estado: "pagado", fechaLote: "2026-09-05", comercio: "Tech Zeta SRL" },
  { id: "IPC-007", usuario: "kiosco.gamma@mail.com", legajo: "LPF-27234567890", loteId: "LOTE-2026-09-07-003", bandera: "Amex", impuesto: "IIBB 3.5%", monto: 5600, estado: "pendiente", fechaLote: "2026-09-07", comercio: "Vivero Centro" },
  { id: "IPC-008", usuario: "kiosco.gamma@mail.com", legajo: "LPF-27234567890", loteId: "LOTE-2026-09-06-012", bandera: "Cabal", impuesto: "Sellos 0.6%", monto: 1800, estado: "pagado", fechaLote: "2026-09-06", comercio: "Vivero Centro" },
  { id: "IPC-009", usuario: "kiosco.gamma@mail.com", legajo: "LPF-27234567890", loteId: "LOTE-2026-09-06-012", bandera: "Cabal", impuesto: "IIBB 4%", monto: 7200, estado: "pagado", fechaLote: "2026-09-06", comercio: "Vivero Centro" },
  { id: "IPC-010", usuario: "libreria.delta@mail.com", legajo: "LPJ-30889900112", loteId: "LOTE-2026-09-07-004", bandera: "Visa", impuesto: "Ganancias 6%", monto: 15300, estado: "pendiente", fechaLote: "2026-09-07", comercio: "Librería Delta" },
  { id: "IPC-011", usuario: "libreria.delta@mail.com", legajo: "LPJ-30889900112", loteId: "LOTE-2026-09-06-013", bandera: "Visa", impuesto: "IIBB 3.5%", monto: 12100, estado: "pagado", fechaLote: "2026-09-05", comercio: "Librería Delta" },
  { id: "IPC-012", usuario: "almacen.epsilon@mail.com", legajo: "LPF-20334455667", loteId: "LOTE-2026-09-07-005", bandera: "Mastercard", impuesto: "IIBB 4%", monto: 9400, estado: "pendiente", fechaLote: "2026-09-07", comercio: "Minimarket del barrio" },
  { id: "IPC-013", usuario: "almacen.epsilon@mail.com", legajo: "LPF-20334455667", loteId: "LOTE-2026-09-07-005", bandera: "Mastercard", impuesto: "Sellos 0.6%", monto: 1950, estado: "pendiente", fechaLote: "2026-09-07", comercio: "Minimarket del barrio" },
  { id: "IPC-014", usuario: "almacen.epsilon@mail.com", legajo: "LPF-20334455667", loteId: "LOTE-2026-09-06-014", bandera: "Visa", impuesto: "IIBB 3.5%", monto: 8100, estado: "pagado", fechaLote: "2026-09-04", comercio: "Minimarket del barrio" },
];

export function getImpuestosPorCobrarPorLegajo(legajo: string): ImpuestoPorCobrar[] {
  return MOCK_IMPUESTOS_POR_COBRAR.filter((r) => r.legajo === legajo);
}

export type ImpuestoPorComercio = {
  comercio: string;
  legajo: string;
  pendiente: number;
  pagado: number;
  total: number;
  detalle: ImpuestoPorCobrar[];
};

export function getImpuestosPorComercio(): ImpuestoPorComercio[] {
  const map = new Map<string, ImpuestoPorComercio>();
  for (const r of MOCK_IMPUESTOS_POR_COBRAR) {
    const key = `${r.comercio}__${r.legajo}`;
    if (!map.has(key)) map.set(key, { comercio: r.comercio, legajo: r.legajo, pendiente: 0, pagado: 0, total: 0, detalle: [] });
    const agg = map.get(key)!;
    agg.detalle.push(r);
    agg.total += r.monto;
    if (r.estado === "pendiente") agg.pendiente += r.monto;
    else agg.pagado += r.monto;
  }
  return Array.from(map.values());
}

export function formatImpuestoMonto(n: number) {
  return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
