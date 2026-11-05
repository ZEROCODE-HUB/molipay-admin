import { AppError } from "@/shared/lib/errors";
import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";
import {
uploadAttachment,
deleteAttachment,
type FileAttachment,
} from "@/features/payment-links/chargeback-storage";

export type StatusContra =
  | "Simulado"
  | "Abierto"
  | "En_mediación"
  | "En_mediacion" // valor real del CHECK constraint
  | "Cerrado_acreditado"
  | "Cerrado_retenido";

/** Valor canónico para enviar a la DB. */
export const STATUS_CONTRA_DB: Record<StatusContra, StatusContra> = {
  Simulado: "Simulado",
  Abierto: "Abierto",
  En_mediación: "En_mediacion",
  En_mediacion: "En_mediacion",
  Cerrado_acreditado: "Cerrado_acreditado",
  Cerrado_retenido: "Cerrado_retenido",
};

export type ContraRow = {
  id: string;
  comercio_id: string;
  pago_id: string;
  movimiento_id: string;
  importe: number;
  estado: string;
  ticket_payway: string | null;
  motivo_payway: string | null;
  documentacion: string | null;
  es_simulacion: boolean;
  lote_sugerido_id: string | null;
  impacto_neto: number | null;
  impacto_saldo: number | null;
  impacto_tasa: number | null;
  impacto_cierre: number | null;
  resolucion: string | null;
  resuelto_por: string | null;
  fecha_cierre: string | null;
  created_at: string;
  updated_at: string;
  // Nuevas columnas (migración 2026-10-09)
  nro_tarjeta_masked: string | null;
  marca_tarjeta: string | null;
  fecha_transaccion: string | null;
  site_transaction_id: string | null;
  site_id: string | null;
  cco_origen: string | null;
  fecha_limite: string | null;
  enviado_payway_at: string | null;
  archivos_adjuntos: FileAttachment[] | null;
  created_by: string | null;
  cliente_legajo: string | null;
  url_origen: string | null;
  // joins
  comercios?:
    | { id: string; usuario: string; legajo: string; nombre_comercio: string | null }[]
    | null;
  cliente_links_pago_pagos?: { link_id: string; site_transaction_id: string }[] | null;
};

export type Contra = {
  id: string;
  comercioId: string;
  comercioNombre: string;
  comercioLegajo: string;
  pagoId: string;
  linkId: string;
  movimientoId: string;
  importe: number;
  /** Estado canónico para UI: "En_mediación" (con tilde). */
  estado: StatusContra;
  /** Estado real que se persiste en la DB: "En_mediacion" (sin tilde). */
  estadoDb: StatusContra;
  ticketPayway: string | null;
  motivoPayway: string | null;
  documentacion: string | null;
  esSimulacion: boolean;
  loteSugeridoId: string | null;
  impactoNeto: number | null;
  impactoSaldo: number | null;
  impactoTasa: number | null;
  impactoCierre: number | null;
  resolucion: string | null;
  resueltoPor: string | null;
  fechaCierre: string | null;
  createdAt: string;
  updatedAt: string;
  // Nuevos campos
  nroTarjetaMasked: string | null;
  marcaTarjeta: string | null;
  fechaTransaccion: string | null;
  siteTransactionId: string | null;
  siteId: string | null;
  ccoOrigen: string | null;
  fechaLimite: string | null;
  enviadoPaywayAt: string | null;
  archivosAdjuntos: FileAttachment[];
  createdBy: string | null;
  clienteLegajo: string | null;
  urlOrigen: string | null;
};

const COLUMNS = `
  id, comercio_id, pago_id, movimiento_id, importe, estado,
  ticket_payway, motivo_payway, documentacion,
  es_simulacion, lote_sugerido_id,
  impacto_neto, impacto_saldo, impacto_tasa, impacto_cierre,
  resolucion, resuelto_por, fecha_cierre,
  created_at, updated_at,
  nro_tarjeta_masked, marca_tarjeta, fecha_transaccion,
  site_transaction_id, site_id, cco_origen,
  fecha_limite, enviado_payway_at, archivos_adjuntos,
  created_by, cliente_legajo, url_origen,
  comercios(id, usuario, legajo, nombre_comercio),
  cliente_links_pago_pagos(link_id, site_transaction_id)
`;

/** DB → UI: "En_mediacion" (snake) → "En_mediación" (con tilde) */
function statusDbToUi(raw: string | null | undefined): StatusContra {
  if (raw === "En_mediacion") return "En_mediación";
  return (raw as StatusContra) ?? "Abierto";
}

/** UI → DB: "En_mediación" (con tilde) → "En_mediacion" (snake) */
export function statusUiToDb(status: StatusContra): string {
  if (status === "En_mediación") return "En_mediacion";
  return status;
}

function toContra(r: ContraRow): Contra {
  const com = Array.isArray(r.comercios) ? r.comercios[0] : null;
  const payment = Array.isArray(r.cliente_links_pago_pagos) ? r.cliente_links_pago_pagos[0] : null;
  return {
    id: r.id,
    comercioId: r.comercio_id,
    comercioNombre: com?.nombre_comercio ?? com?.usuario ?? "—",
    comercioLegajo: com?.legajo ?? r.comercio_id,
    pagoId: r.pago_id ?? "",
    linkId: payment?.link_id ?? "",
    movimientoId: r.movimiento_id ?? "",
    importe: Number(r.importe),
    estado: statusDbToUi(r.estado),
    estadoDb: (r.estado as StatusContra) ?? "Abierto",
    ticketPayway: r.ticket_payway ?? null,
    motivoPayway: r.motivo_payway ?? null,
    documentacion: r.documentacion ?? null,
    esSimulacion: r.es_simulacion ?? true,
    loteSugeridoId: r.lote_sugerido_id ?? null,
    impactoNeto: r.impacto_neto != null ? Number(r.impacto_neto) : null,
    impactoSaldo: r.impacto_saldo != null ? Number(r.impacto_saldo) : null,
    impactoTasa: r.impacto_tasa != null ? Number(r.impacto_tasa) : null,
    impactoCierre: r.impacto_cierre != null ? Number(r.impacto_cierre) : null,
    resolucion: r.resolucion ?? null,
    resueltoPor: r.resuelto_por ?? null,
    fechaCierre: r.fecha_cierre ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    nroTarjetaMasked: r.nro_tarjeta_masked ?? null,
    marcaTarjeta: r.marca_tarjeta ?? null,
    fechaTransaccion: r.fecha_transaccion ?? null,
    siteTransactionId: r.site_transaction_id ?? null,
    siteId: r.site_id ?? null,
    ccoOrigen: r.cco_origen ?? null,
    fechaLimite: r.fecha_limite ?? null,
    enviadoPaywayAt: r.enviado_payway_at ?? null,
    archivosAdjuntos: Array.isArray(r.archivos_adjuntos) ? r.archivos_adjuntos : [],
    createdBy: r.created_by ?? null,
    clienteLegajo: r.cliente_legajo ?? null,
    urlOrigen: r.url_origen ?? null,
  };
}

export type ContraFilters = {
  estado?: StatusContra;
  comercioId?: string;
};

export async function listChargebacks(filters?: ContraFilters): Promise<Contra[]> {
  const sb = requireSupabase();
  let q = sb.from("contracargos").select(COLUMNS).order("created_at", { ascending: false });
  if (filters?.estado) {
    // Mapeamos el estado de UI a DB para que el filtro funcione.
    const dbStatus = statusUiToDb(filters.estado);
    q = q.eq("estado", dbStatus);
  }
  if (filters?.comercioId) q = q.eq("comercio_id", filters.comercioId);
  const { data, error } = await q;
  if (error) throw toAppError(error);
  return ((data ?? []) as ContraRow[]).map(toContra);
}

export async function getContra(id: string): Promise<Contra | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("contracargos").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw toAppError(error);
  return data ? toContra(data as ContraRow) : null;
}

export type CreateContraInput = {
  comercioId: string;
  pagoId?: string;
  movimientoId?: string;
  importe: number;
  estado?: StatusContra;
  ticketPayway?: string | null;
  motivoPayway?: string | null;
  documentacion?: string | null;
  esSimulacion?: boolean;
};

export async function createChargeback(input: CreateContraInput): Promise<Contra> {
  const sb = requireSupabase();
  const { data: auth } = await sb.auth.getUser().catch(() => ({ data: null }));

  const { data, error } = await sb
    .from("contracargos")
    .insert({
      comercio_id: input.comercioId,
      pago_id: input.pagoId ?? null,
      movimiento_id: input.movimientoId ?? null,
      importe: input.importe,
      estado: input.estado ? statusUiToDb(input.estado) : "Simulado",
      ticket_payway: input.ticketPayway ?? null,
      motivo_payway: input.motivoPayway ?? null,
      documentacion: input.documentacion ?? null,
      es_simulacion: input.esSimulacion ?? true,
      created_by: auth?.user?.id ?? null,
    } as Record<string, unknown>)
    .select(COLUMNS)
    .single();
  if (error) throw toAppError(error);
  return toContra(data as ContraRow);
}

export type UpdateContraInput = {
  estado?: StatusContra;
  ticketPayway?: string | null;
  motivoPayway?: string | null;
  documentacion?: string | null;
  resolucion?: string | null;
  esSimulacion?: boolean;
};

export async function updateChargeback(id: string, input: UpdateContraInput): Promise<Contra> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.estado !== undefined) {
    payload.estado = statusUiToDb(input.estado);
    if (input.estado === "Cerrado_acreditado" || input.estado === "Cerrado_retenido") {
      payload.fecha_cierre = new Date().toISOString();
      try {
        const { data: auth } = await sb.auth.getUser();
        payload.resuelto_por = auth?.user?.id ?? null;
      } catch {
        /* ignore */
      }
    }
  }
  if (input.ticketPayway !== undefined) payload.ticket_payway = input.ticketPayway;
  if (input.motivoPayway !== undefined) payload.motivo_payway = input.motivoPayway;
  if (input.documentacion !== undefined) payload.documentacion = input.documentacion;
  if (input.resolucion !== undefined) payload.resolucion = input.resolucion;
  if (input.esSimulacion !== undefined) payload.es_simulacion = input.esSimulacion;

  const { data, error } = await sb
    .from("contracargos")
    .update(payload)
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw toAppError(error);
  return toContra(data as ContraRow);
}

export async function deleteChargeback(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("contracargos").delete().eq("id", id);
  if (error) throw toAppError(error);
}

/**
 * Confirma una simulación: pasa el contracargo de Simulado → Abierto
 * y trata de autocompletar el `lote_sugerido_id` buscando el lote que
 * contiene la transacción (si hay `movimiento_id` o `pago_id`).
 */
export async function confirmSimulation(id: string): Promise<Contra> {
  // La base pasa Simulado -> Abierto, vincula la venta y decide la retencion
  // (en el lote de la venta si no se acredito; si no, del saldo o como deuda).
  const sb = requireSupabase();
  const { error } = await sb.rpc("contracargo_confirmar", { p_contracargo_id: id });
  if (error) throw toAppError(error);
  const current = await getContra(id);
  if (!current) throw new AppError("not_found", "Contracargo no encontrado");
  return current;
}

// ---------------------------------------------------------------------------
// Archivos adjuntos
// ---------------------------------------------------------------------------

/**
 * Sube un archivo al storage y lo agrega al array `archivos_adjuntos`
 * del contracargo en una sola operación lógica.
 *
 * Si la subida al storage falla, NO se actualiza la fila (todo o nada).
 */
export async function addAttachment(
  contra: Contra,
  file: File,
): Promise<{ contra: Contra; adjunto: FileAttachment }> {
  const sb = requireSupabase();
  const attachment = await uploadAttachment(contra.comercioId, contra.id, file);
  const news = [...contra.archivosAdjuntos, attachment];

  const { data, error } = await sb
    .from("contracargos")
    .update({ archivos_adjuntos: news })
    .eq("id", contra.id)
    .select(COLUMNS)
    .single();
  if (error) {
    // Si falló la actualización en DB, intentamos borrar del storage
    // para no dejar archivo huérfano.
    await deleteAttachment(attachment.path).catch(() => {});
    throw toAppError(error);
  }
  return { contra: toContra(data as ContraRow), adjunto: attachment };
}

export async function quitarAttachment(contra: Contra, path: string): Promise<Contra> {
  const sb = requireSupabase();
  const news = contra.archivosAdjuntos.filter((a) => a.path !== path);

  const { data, error } = await sb
    .from("contracargos")
    .update({ archivos_adjuntos: news })
    .eq("id", contra.id)
    .select(COLUMNS)
    .single();
  if (error) throw toAppError(error);

  // Borrar del storage; si falla no bloqueamos (queda el archivo
  // huérfano pero la fila queda consistente).
  await deleteAttachment(path).catch(() => {});

  return toContra(data as ContraRow);
}

/**
 * Marca el contracargo como "enviado a PayWay". Idempotente: si ya
 * está seteado, no hace nada.
 */
export async function sendAPayway(contraId: string): Promise<Contra> {
  const sb = requireSupabase();
  const current = await getContra(contraId);
  if (!current) throw new AppError("not_found", "Contracargo no encontrado");
  if (current.enviadoPaywayAt) return current;

  const { data, error } = await sb
    .from("contracargos")
    .update({ enviado_payway_at: new Date().toISOString() })
    .eq("id", contraId)
    .select(COLUMNS)
    .single();
  if (error) throw toAppError(error);
  return toContra(data as ContraRow);
}

// ---------------------------------------------------------------------------
// Impacto en lote (Cerrado_retenido)
// ---------------------------------------------------------------------------

export type ResultCloseHeld = {
  contracargoId: string;
  loteId: string;
  loteCodigo: string;
  importeDescontado: number;
  loteContracargoMonto: number;
  loteImporteNeto: number;
};

/**
 * Cierra el contracargo como `Cerrado_retenido` y aplica el impacto
 * financiero al lote elegido vía la RPC
 * `aplicar_contracargo_retenido(contra_id, lote_id)`.
 */
export async function closeComoHeld(contraId: string, batchId: string): Promise<ResultCloseHeld> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("aplicar_contracargo_retenido", {
    p_contracargo_id: contraId,
    p_lote_id: batchId,
  });
  if (error) throw toAppError(error);

  const r = (data ?? {}) as Record<string, unknown>;
  return {
    contracargoId: String(r.contracargo_id ?? contraId),
    loteId: String(r.lote_id ?? batchId),
    loteCodigo: String(r.lote_codigo ?? ""),
    importeDescontado: Number(r.importe_descontado ?? 0),
    loteContracargoMonto: Number(r.lote_contracargo_monto ?? 0),
    loteImporteNeto: Number(r.lote_importe_neto ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Lotes del comercio (para el selector en Cerrado_retenido)
// ---------------------------------------------------------------------------

export type BatchCloseHeld = {
  id: string;
  codigo: string;
  estado: string;
  fecha: string;
  importeBruto: number;
  importeNeto: number;
  contracargoMonto: number;
  esSugerido: boolean;
};

/**
 * Devuelve los lotes del comercio que pueden recibir el descuento de
 * un contracargo retenido: Programado, Pendiente, Rechazado o
 * Contracargo (no Acreditado, no Cancelado).
 *
 * `loteSugeridoId` (si viene) se marca con `esSugerido=true` y se
 * fuerza a la primera posición.
 */
export async function listBatchesForCloseHeld(
  merchantId: string,
  batchSugeridoId: string | null,
): Promise<BatchCloseHeld[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("lotes_acreditacion")
    .select("id, codigo, estado, fecha, importe_bruto, importe_neto, contracargo_monto")
    .eq("comercio_id", merchantId)
    .in("estado", ["Programado", "Pendiente", "Rechazado", "Contracargo"])
    .order("fecha", { ascending: false })
    .limit(20);
  if (error) throw toAppError(error);

  const rows = (data ?? []) as Array<{
    id: string;
    codigo: string;
    estado: string;
    fecha: string;
    importe_bruto: number;
    importe_neto: number;
    contracargo_monto: number;
  }>;

  const mapped: BatchCloseHeld[] = rows.map((r) => ({
    id: r.id,
    codigo: r.codigo,
    estado: r.estado,
    fecha: r.fecha,
    importeBruto: Number(r.importe_bruto),
    importeNeto: Number(r.importe_neto),
    contracargoMonto: Number(r.contracargo_monto ?? 0),
    esSugerido: r.id === batchSugeridoId,
  }));

  // Sugerido primero
  mapped.sort((a, b) => {
    if (a.esSugerido && !b.esSugerido) return -1;
    if (!a.esSugerido && b.esSugerido) return 1;
    return 0;
  });

  return mapped;
}
