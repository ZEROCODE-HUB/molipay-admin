import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";

export type EstadoContra =
  | "Simulado"
  | "Abierto"
  | "En_mediación"
  | "Cerrado_acreditado"
  | "Cerrado_retenido";

export type ContraRow = {
  id: string;
  comercio_id: string;
  pago_id: string;
  movimiento_id: string;
  importe: number;
  estado: EstadoContra;
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
  comercios?: { id: string; usuario: string; legajo: string; nombre_comercio: string | null }[] | null;
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
  estado: EstadoContra;
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
};

const COLUMNS = `
  id, comercio_id, pago_id, movimiento_id, importe, estado,
  ticket_payway, motivo_payway, documentacion,
  es_simulacion, lote_sugerido_id,
  impacto_neto, impacto_saldo, impacto_tasa, impacto_cierre,
  resolucion, resuelto_por, fecha_cierre,
  created_at, updated_at,
  comercios(id, usuario, legajo, nombre_comercio),
  cliente_links_pago_pagos(link_id, site_transaction_id)
`;

function toContra(r: ContraRow): Contra {
  const com = Array.isArray(r.comercios) ? r.comercios[0] : null;
  const pago = Array.isArray(r.cliente_links_pago_pagos) ? r.cliente_links_pago_pagos[0] : null;
  return {
    id: r.id,
    comercioId: r.comercio_id,
    comercioNombre: com?.nombre_comercio ?? com?.usuario ?? "—",
    comercioLegajo: com?.legajo ?? r.comercio_id,
    pagoId: r.pago_id ?? "",
    linkId: pago?.link_id ?? "",
    movimientoId: r.movimiento_id ?? "",
    importe: Number(r.importe),
    estado: r.estado,
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
  };
}

export async function listContracargos(filters?: {
  estado?: EstadoContra;
  comercioId?: string;
}): Promise<Contra[]> {
  const sb = requireSupabase();
  let q = sb.from("contracargos").select(COLUMNS).order("created_at", { ascending: false });
  if (filters?.estado) q = q.eq("estado", filters.estado);
  if (filters?.comercioId) q = q.eq("comercio_id", filters.comercioId);
  const { data, error } = await q;
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as ContraRow[]).map(toContra);
}

export async function createContracargo(input: {
  comercioId: string;
  pagoId?: string;
  movimientoId?: string;
  importe: number;
  estado?: EstadoContra;
  ticketPayway?: string | null;
  motivoPayway?: string | null;
  documentacion?: string | null;
  esSimulacion?: boolean;
}): Promise<Contra> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("contracargos")
    .insert({
      comercio_id: input.comercioId,
      pago_id: input.pagoId ?? null,
      movimiento_id: input.movimientoId ?? null,
      importe: input.importe,
      estado: input.estado ?? "Simulado",
      ticket_payway: input.ticketPayway ?? null,
      motivo_payway: input.motivoPayway ?? null,
      documentacion: input.documentacion ?? null,
      es_simulacion: input.esSimulacion ?? true,
    } as Record<string, unknown>)
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toContra(data as ContraRow);
}

export async function updateContracargo(id: string, input: {
  estado?: EstadoContra;
  ticketPayway?: string | null;
  motivoPayway?: string | null;
  documentacion?: string | null;
  resolucion?: string | null;
  esSimulacion?: boolean;
}): Promise<Contra> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.estado !== undefined) {
    payload.estado = input.estado;
    if (input.estado === "Cerrado_acreditado" || input.estado === "Cerrado_retenido") {
      payload.fecha_cierre = new Date().toISOString();
      try {
        const { data: auth } = await sb.auth.getUser();
        payload.resuelto_por = auth?.user?.id ?? null;
      } catch { /* ignore */ }
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
  if (error) throw new DataAccessError(error);
  return toContra(data as ContraRow);
}

export async function deleteContracargo(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("contracargos").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}
