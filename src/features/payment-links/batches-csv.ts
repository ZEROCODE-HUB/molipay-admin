import { type BatchCredit } from "@/infrastructure/supabase/legacy/types";
import {
  esDelFile,
  netBatch,
  statusMostrado,
  totalCompensaciones,
  totalDescuentos,
} from "@/features/payment-links/batches.rules";

/** CSV de lotes con separador `;` y coma decimal, para Excel. */
export function batchesToCsvLines(rows: BatchCredit[]): string[] {
  const HEADERS = [
    "Código",
    "Fecha de liquidación",
    "Comercio",
    "Legajo",
    "Bandera",
    "Ops",
    "Monto bruto liquidado",
    "Descuentos e impuestos",
    "Adelantos, deudas y contracargos",
    "Neto a acreditar",
    "Fecha de acreditación",
    "Estado",
  ];
  const lines: string[] = [HEADERS.join(";")];
  for (const l of rows) {
    lines.push(
      [
        l.codigo,
        esDelFile(l) ? l.fecha : `${l.fecha} (estimada)`,
        l.comercio?.nombreComercio ?? l.comercio?.usuario ?? "",
        l.comercio?.legajo ?? l.comercioId,
        l.bandera,
        l.cantidadOperaciones,
        l.importeBruto.toFixed(2).replace(".", ","),
        totalDescuentos(l).toFixed(2).replace(".", ","),
        totalCompensaciones(l).toFixed(2).replace(".", ","),
        netBatch(l).toFixed(2).replace(".", ","),
        l.fechaAcreditacion ?? "",
        statusMostrado(l),
      ]
        .map((v) => {
          const s = String(v);
          return s.includes(";") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(";"),
    );
  }
  return lines;
}
