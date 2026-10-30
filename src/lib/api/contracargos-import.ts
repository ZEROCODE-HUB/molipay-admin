import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import type { PaywayDisputeRow } from "./importers/payway-chargebacks";
import { parseMonto, parseFecha, parseTarjetaMasked } from "./importers/payway-chargebacks";

/**
 * Resultado de una fila del archivo después del match con la DB.
 *
 * - `ok`        → se insertó el contracargo
 * - `duplicate` → ya existía un contracargo con ese site_transaction_id,
 *                 se omitió
 * - `unmatched` → no se encontró el pago en `cliente_links_pago_pagos`
 *                 (queda en la lista para revisión manual)
 * - `error`     → falló la inserción o el match devolvió datos inválidos
 */
export type ImportRowStatus = "ok" | "duplicate" | "unmatched" | "error";

export type ImportRowResult = PaywayDisputeRow & {
  status: ImportRowStatus;
  message?: string;
  contracargoId?: string;
  comercioId?: string;
  comercioNombre?: string;
  clienteLegajo?: string;
  pagoId?: string;
};

export type ImportSummary = {
  total: number;
  ok: number;
  duplicate: number;
  unmatched: number;
  errors: number;
  details: ImportRowResult[];
};

type MatchResult = {
  comercioId: string;
  comercioNombre: string;
  clienteLegajo: string;
  pagoId: string;
  linkId: string;
  siteId: string | null;
};

type ResultadoRpc = {
  fila: number;
  status: "ok" | "vinculado" | "duplicate" | "unmatched" | "error";
  message?: string;
  contracargo_id?: string;
  comercio_id?: string;
  retencion?: string;
};

/**
 * Importa las filas de un reporte de PayWay con la RPC `contracargo_importar`.
 * La base busca la venta por site_transaction_id, evita duplicados, se cruza
 * con el contracargo que haya creado la liquidacion y decide la retencion
 * (en el lote de la venta, del saldo o como deuda). Las filas con error de
 * parseo no se envian.
 */
export async function importChargebacksFromPayway(
  rows: PaywayDisputeRow[],
): Promise<ImportSummary> {
  const sb = requireSupabase();
  const summary: ImportSummary = {
    total: rows.length,
    ok: 0,
    duplicate: 0,
    unmatched: 0,
    errors: 0,
    details: [],
  };

  const validas: { row: PaywayDisputeRow; payload: Record<string, unknown> }[] = [];
  for (const row of rows) {
    if (row.errors.length > 0 || !row.parsed.idTransaccion) {
      summary.errors += 1;
      summary.details.push({
        ...row,
        status: "error",
        message: row.errors.length > 0 ? row.errors.join(" ") : "Fila sin ID_TRANSACCION; no se puede importar.",
      });
      continue;
    }
    validas.push({
      row,
      payload: {
        id_transaccion: row.parsed.idTransaccion,
        fecha: parseFecha(row.parsed.fechaTransaccion),
        marca: row.parsed.marca ?? null,
        tarjeta: parseTarjetaMasked(row.parsed.nroTarjeta),
        monto: parseMonto(row.parsed.monto),
        autorizacion: row.parsed.autorizacion ?? null,
        cco_origen: row.parsed.ccoOrigen ?? null,
        cco_motivo: row.parsed.ccoMotivo ?? null,
        establecimiento: row.parsed.establecimiento ?? null,
      },
    });
  }
  if (validas.length === 0) return summary;

  const { data, error } = await sb.rpc("contracargo_importar", { p_filas: validas.map((v) => v.payload) });
  if (error) throw new DataAccessError(error);
  const resultados = (data ?? []) as ResultadoRpc[];

  validas.forEach((v, idx) => {
    const r = resultados.find((x) => Number(x.fila) === idx + 1);
    const status: ImportRowStatus = !r ? "error" : r.status === "vinculado" ? "ok" : r.status;
    const det: ImportRowResult = {
      ...v.row,
      status,
      message: r?.message ?? "Sin respuesta de la base",
      contracargoId: r?.contracargo_id,
      comercioId: r?.comercio_id,
    };
    if (status === "ok") summary.ok += 1;
    else if (status === "duplicate") summary.duplicate += 1;
    else if (status === "unmatched") summary.unmatched += 1;
    else summary.errors += 1;
    summary.details.push(det);
  });
  return summary;
}
