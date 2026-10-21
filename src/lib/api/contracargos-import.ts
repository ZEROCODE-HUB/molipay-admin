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

/**
 * Intenta matchear una fila de PayWay contra la base:
 *
 *  1. Match principal: `cliente_links_pago_pagos.site_transaction_id`
 *  2. Match secundario: `autorizacion` (payway_payment_id) + site_id
 *
 * Si ninguna matchea, devuelve `null` y la fila queda como
 * `unmatched` para que el operador la gestione manualmente.
 */
async function matchPago(
  sb: ReturnType<typeof requireSupabase>,
  row: PaywayDisputeRow,
): Promise<MatchResult | null> {
  const tid = row.parsed.idTransaccion;
  const authCode = row.parsed.autorizacion;
  const siteId = row.parsed.establecimiento;

  // 1. Por TID
  if (tid) {
    const { data, error } = await sb
      .from("cliente_links_pago_pagos")
      .select(
        "id, link_id, cliente_legajo, cliente_links_pago!inner(id, comercio_id, comercio_nombre, site_id)",
      )
      .eq("site_transaction_id", tid)
      .maybeSingle();
    if (error) {
      // Si la columna no existe (schema legacy), caemos al fallback.
      if (/site_transaction_id|column.*does not exist/i.test(error.message)) {
        // continuar al fallback
      } else {
        throw new DataAccessError(error);
      }
    } else if (data) {
      const link = Array.isArray(data.cliente_links_pago)
        ? data.cliente_links_pago[0]
        : data.cliente_links_pago;
      if (link) {
        return {
          comercioId: link.comercio_id,
          comercioNombre: link.comercio_nombre,
          clienteLegajo: data.cliente_legajo,
          pagoId: data.id,
          linkId: data.link_id,
          siteId: link.site_id ?? null,
        };
      }
    }
  }

  // 2. Por payway_payment_id + site_id
  if (authCode && siteId) {
    const { data, error } = await sb
      .from("cliente_links_pago_pagos")
      .select(
        "id, link_id, cliente_legajo, cliente_links_pago!inner(id, comercio_id, comercio_nombre, site_id)",
      )
      .eq("payway_payment_id", authCode)
      .maybeSingle();
    if (error) throw new DataAccessError(error);
    if (data) {
      const link = Array.isArray(data.cliente_links_pago)
        ? data.cliente_links_pago[0]
        : data.cliente_links_pago;
      if (link && (link.site_id ?? null) === siteId) {
        return {
          comercioId: link.comercio_id,
          comercioNombre: link.comercio_nombre,
          clienteLegajo: data.cliente_legajo,
          pagoId: data.id,
          linkId: data.link_id,
          siteId: link.site_id ?? null,
        };
      }
    }
  }

  return null;
}

/**
 * Verifica si ya existe un contracargo con ese site_transaction_id
 * para evitar duplicados al reprocesar el mismo archivo.
 */
async function yaExiste(
  sb: ReturnType<typeof requireSupabase>,
  siteTransactionId: string,
): Promise<boolean> {
  if (!siteTransactionId) return false;
  const { data, error } = await sb
    .from("contracargos")
    .select("id")
    .eq("site_transaction_id", siteTransactionId)
    .not("estado", "eq", "Eliminado")
    .limit(1)
    .maybeSingle();
  if (error) {
    // Si la columna no existe, no podemos deduplicar; seguimos.
    if (/site_transaction_id|column.*does not exist/i.test(error.message)) {
      return false;
    }
    throw new DataAccessError(error);
  }
  return !!data;
}

/**
 * Importa las filas de un reporte de PayWay. Procesa en serie para
 * no saturar la DB y para que los errores de una fila no afecten a
 * las demás. Devuelve un resumen con el detalle por fila.
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

  for (const row of rows) {
    const base: ImportRowResult = { ...row, status: "error" };

    // Errores de parseo: no seguimos.
    if (row.errors.length > 0) {
      base.status = "error";
      base.message = row.errors.join(" ");
      summary.errors += 1;
      summary.details.push(base);
      continue;
    }

    if (!row.parsed.idTransaccion) {
      base.status = "error";
      base.message = "Fila sin ID_TRANSACCION; no se puede importar.";
      summary.errors += 1;
      summary.details.push(base);
      continue;
    }

    // Duplicado
    try {
      if (await yaExiste(sb, row.parsed.idTransaccion)) {
        base.status = "duplicate";
        base.message = `Ya existe un contracargo con site_transaction_id=${row.parsed.idTransaccion}.`;
        summary.duplicate += 1;
        summary.details.push(base);
        continue;
      }
    } catch (e) {
      base.message = `Error al verificar duplicado: ${(e as Error).message}`;
      summary.errors += 1;
      summary.details.push(base);
      continue;
    }

    // Match
    let match: MatchResult | null = null;
    try {
      match = await matchPago(sb, row);
    } catch (e) {
      base.message = `Error al matchear: ${(e as Error).message}`;
      summary.errors += 1;
      summary.details.push(base);
      continue;
    }

    if (!match) {
      base.status = "unmatched";
      base.message =
        "No se encontró el pago en cliente_links_pago_pagos. Asigná el contracargo manualmente desde el comercio.";
      summary.unmatched += 1;
      summary.details.push(base);
      continue;
    }

    // Insert
    const monto = parseMonto(row.parsed.monto) ?? 0;
    const fecha = parseFecha(row.parsed.fechaTransaccion);
    const tarjeta = parseTarjetaMasked(row.parsed.nroTarjeta);

    try {
      const { data: inserted, error } = await sb
        .from("contracargos")
        .insert({
          comercio_id: match.comercioId,
          cliente_legajo: match.clienteLegajo,
          pago_id: match.pagoId,
          importe: monto,
          estado: "Abierto",
          es_simulacion: false,
          ticket_payway: row.parsed.autorizacion ?? null,
          motivo_payway: row.parsed.ccoMotivo ?? null,
          site_transaction_id: row.parsed.idTransaccion,
          site_id: row.parsed.establecimiento ?? match.siteId ?? null,
          nro_tarjeta_masked: tarjeta ?? null,
          marca_tarjeta: row.parsed.marca ?? null,
          fecha_transaccion: fecha,
          cco_origen: row.parsed.ccoOrigen ?? null,
        } as Record<string, unknown>)
        .select("id")
        .single();
      if (error) throw new DataAccessError(error);

      base.status = "ok";
      base.contracargoId = inserted.id;
      base.comercioId = match.comercioId;
      base.comercioNombre = match.comercioNombre;
      base.clienteLegajo = match.clienteLegajo;
      base.pagoId = match.pagoId;
      summary.ok += 1;
      summary.details.push(base);
    } catch (e) {
      base.message = `Error al insertar: ${(e as Error).message}`;
      summary.errors += 1;
      summary.details.push(base);
    }
  }

  return summary;
}
