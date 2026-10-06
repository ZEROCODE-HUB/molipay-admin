import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import type { Page, Pagination } from "./types";

export type CalendarioAcreditacion = {
  fechaVenta: string;
  fechaEstimadaAcreditacion: string;
  comercioId: string;
  comercioNombre: string;
  comercioLegajo: string;
  bandera: string;
  diasHabiles: number;
  esEstimado: boolean;
  fechaEstimadaRecalcular: boolean;
  importeBruto: number;
  cantidadOperaciones: number;
  estado: "programado" | "pendiente" | "acreditado" | "contracargo" | "cancelado";
  estadoReal: string;
  loteIds: string[];
};

export type CalendarioFilters = {
  mes: number;
  anio: number;
  comercioId?: string;
  bandera?: string;
  estado?: "programado" | "pendiente" | "acreditado" | "contracargo";
};

type LoteAcreditacionRow = {
  id: string;
  codigo: string;
  comercio_id: string;
  bandera: string;
  fecha: string;
  cantidad_operaciones: number;
  importe_bruto: number;
  impuestos: number;
  tasa_payway_pct: number;
  tasa_payway_monto: number;
  tasa_molipay_pct: number;
  tasa_molipay_monto: number;
  cuotas: number | null;
  costo_payway_pago_unico: number | null;
  contracargo_monto: number;
  comision_cierre_lote_pct: number | null;
  comision_cierre_lote_monto: number | null;
  importe_neto: number;
  estado: string;
  resuelto_por: string | null;
  fecha_resolucion: string | null;
  notas_resolucion: string | null;
  created_at: string;
  updated_at: string;
  iva_monto: number | null;
  iibb_monto: number | null;
  debito_credito_monto: number | null;
  comercios: unknown;
};

let diasHabilesCache: Record<string, number> | null = null;

async function obtenerDiasHabilesPorBandera(sb: ReturnType<typeof requireSupabase>): Promise<Record<string, number>> {
  if (diasHabilesCache) return diasHabilesCache;
  
  const { data, error } = await sb
    .from("banderas")
    .select("metodo_key, nombre, dias_habiles_acreditacion");
  
  if (error) throw new DataAccessError(error);
  
  diasHabilesCache = {};
  for (const b of (data ?? []) as Array<{ metodo_key: string | null; nombre: string; dias_habiles_acreditacion: number }>) {
    const key = (b.metodo_key ?? b.nombre).toLowerCase();
    diasHabilesCache[key] = b.dias_habiles_acreditacion ?? 20;
  }
  return diasHabilesCache;
}

function parseDateLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function agregarDiasHabiles(fecha: Date, dias: number): Date {
  const result = new Date(fecha);
  let diasAgregados = 0;

  while (diasAgregados < dias) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      diasAgregados++;
    }
  }

  return result;
}

function calcularEstadoMostrar(
  estadoLote: string | null,
  contracargoMonto: number,
  fechaEstimada: Date,
  hoy: Date
): "programado" | "pendiente" | "acreditado" | "contracargo" | "cancelado" {
  if (estadoLote === "Acreditado") return "acreditado";
  if (estadoLote === "Contracargo" || contracargoMonto > 0) return "contracargo";
  if (estadoLote === "Cancelado") return "cancelado";
  if (estadoLote === "Pendiente") return "pendiente";
  if (hoy < fechaEstimada) return "programado";
  return "pendiente";
}

export async function listCalendarioAcreditaciones(
  filters: CalendarioFilters
): Promise<CalendarioAcreditacion[]> {
  const sb = requireSupabase();
  const { mes, anio, comercioId, bandera, estado } = filters;

  const primerDia = new Date(anio, mes - 1, 1);
  const ultimoDia = new Date(anio, mes, 0);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [lotesVentaData, diasHabilesMap] = await Promise.all([
    sb
      .from("v_lotes_venta")
      .select(
        "fecha, comercio_id, bandera, cantidad_operaciones, importe_bruto, importe_neto, comercios(id, usuario, legajo, nombre_comercio)"
      )
      .gte("fecha", primerDia.toISOString().slice(0, 10))
      .lte("fecha", ultimoDia.toISOString().slice(0, 10)),
    obtenerDiasHabilesPorBandera(sb),
  ]);

  const { data, error } = lotesVentaData;
  if (error) throw new DataAccessError(error);

  const { data: lotesAcreditacion } = await sb
    .from("lotes_acreditacion")
    .select("id, fecha, comercio_id, bandera, estado, contracargo_monto, dias_habiles_aplicados, fecha_estimada_recalcular");

  const loteInfoMap = new Map<string, { estado: string | null; contracargoMonto: number; loteId: string; diasHabilesAplicados: number | null; fechaEstimadaRecalcular: boolean }>();
  for (const l of (lotesAcreditacion ?? []) as Array<{ id: string; fecha: string; comercio_id: string; bandera: string; estado: string; contracargo_monto: number; dias_habiles_aplicados: number | null; fecha_estimada_recalcular: boolean }>) {
    const key = `${l.comercio_id}-${l.bandera}-${l.fecha}`;
    loteInfoMap.set(key, { estado: l.estado, contracargoMonto: l.contracargo_monto ?? 0, loteId: l.id, diasHabilesAplicados: l.dias_habiles_aplicados ?? null, fechaEstimadaRecalcular: l.fecha_estimada_recalcular ?? false });
  }

  const result: CalendarioAcreditacion[] = [];

  for (const row of data ?? []) {
    const comercio = (row.comercios as unknown as Array<{ id: string; usuario: string; legajo: string; nombre_comercio: string }>)?.[0] ?? null;
    // Usar dias_habiles_aplicados de la BD si existe, si no calcular localmente
    const diasHabilesFallback = diasHabilesMap[row.bandera?.toLowerCase() ?? ""] ?? 20;
    const diasHabiles = loteInfo?.diasHabilesAplicados ?? diasHabilesFallback;
    const fechaVenta = parseDateLocal(row.fecha as string);
    const fechaEstimada = agregarDiasHabiles(fechaVenta, diasHabiles);
    const fechaEstimadaStr = fechaEstimada.toISOString().slice(0, 10);

    const key = `${row.comercio_id}-${row.bandera}-${fechaEstimadaStr}`;
    const loteInfo = loteInfoMap.get(key);

    const estadoReal = loteInfo?.estado ?? null;
    const contracargoMonto = loteInfo?.contracargoMonto ?? 0;
    const esEstimado = estadoReal === null || estadoReal === 'Programado';
    const estadoMostrar = calcularEstadoMostrar(estadoReal, contracargoMonto, fechaEstimada, hoy);

    if (estado && estadoMostrar !== estado) continue;

    result.push({
      fechaVenta: row.fecha as string,
      fechaEstimadaAcreditacion: fechaEstimadaStr,
      comercioId: row.comercio_id,
      comercioNombre: comercio?.nombre_comercio ?? comercio?.usuario ?? "—",
      comercioLegajo: comercio?.legajo ?? row.comercio_id,
      bandera: row.bandera ?? "—",
      diasHabiles,
      esEstimado,
      fechaEstimadaRecalcular: loteInfo?.fechaEstimadaRecalcular ?? false,
      importeBruto: Number(row.importe_bruto),
      cantidadOperaciones: Number(row.cantidad_operaciones),
      estado: estadoMostrar,
      estadoReal: estadoReal ?? "Pendiente",
      loteIds: loteInfo?.loteId ? [loteInfo.loteId] : [],
    });
  }

  return result;
}

export type LoteAcreditacionParaCalendario = {
  id: string;
  codigo: string;
  comercioId: string;
  comercioNombre: string;
  comercioLegajo: string;
  bandera: string;
  fecha: string;
  cantidadOperaciones: number;
  importeBruto: number;
  importeNeto: number;
  impuestos: number;
  tasaPaywayPct: number;
  tasaPaywayMonto: number;
  tasaMolipayPct: number;
  tasaMolipayMonto: number;
  cuotas: number | null;
  contracargoMonto: number;
  importeNetoReal: number;
  estado: string;
};

const LOTE_COLUMNS = `
  id, codigo, comercio_id, bandera, fecha, cantidad_operaciones,
  importe_bruto, impuestos, tasa_payway_pct, tasa_payway_monto,
  tasa_molipay_pct, tasa_molipay_monto, cuotas, contracargo_monto,
  comision_cierre_lote_pct, comision_cierre_lote_monto, importe_neto,
  estado, resuelto_por, fecha_resolucion, notas_resolucion,
  created_at, updated_at, iva_monto, iibb_monto, debito_credito_monto,
  comercios(id, usuario, legajo, nombre_comercio)
`;

export async function getLotesPorFecha(fecha: string): Promise<LoteAcreditacionParaCalendario[]> {
  const sb = requireSupabase();
  
  const { data, error } = await sb
    .from("lotes_acreditacion")
    .select(LOTE_COLUMNS)
    .eq("fecha", fecha)
    .order("created_at", { ascending: false });
  
  if (error) throw new DataAccessError(error);
  
  return ((data ?? []) as unknown[]).map((r: unknown) => {
    const row = r as LoteAcreditacionRow & { comercios: unknown };
    const comArr = row.comercios as unknown as Array<{ id: string; usuario: string; legajo: string; nombre_comercio: string }> | null;
    const com = comArr?.[0] ?? null;
    const comisionCierreLoteMonto = Number(row.comision_cierre_lote_monto ?? 0);
    const importeNetoFinal = Number(row.importe_neto) - comisionCierreLoteMonto;
    
    return {
      id: row.id,
      codigo: row.codigo,
      comercioId: row.comercio_id,
      comercioNombre: com?.nombre_comercio ?? com?.usuario ?? "—",
      comercioLegajo: com?.legajo ?? row.comercio_id,
      bandera: row.bandera ?? "—",
      fecha: row.fecha,
      cantidadOperaciones: Number(row.cantidad_operaciones),
      importeBruto: Number(row.importe_bruto),
      importeNeto: Number(row.importe_neto),
      impuestos: Number(row.impuestos),
      tasaPaywayPct: Number(row.tasa_payway_pct),
      tasaPaywayMonto: Number(row.tasa_payway_monto),
      tasaMolipayPct: Number(row.tasa_molipay_pct),
      tasaMolipayMonto: Number(row.tasa_molipay_monto),
      cuotas: row.cuotas != null ? Number(row.cuotas) : null,
      contracargoMonto: Number(row.contracargo_monto ?? 0),
      importeNetoReal: importeNetoFinal,
      estado: row.estado,
    };
  });
}
