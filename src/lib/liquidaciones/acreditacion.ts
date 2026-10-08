import type { LoteAcreditacion } from "@/lib/api/types";
import type { RenglonLiquidacion } from "./parse";

// Calculo del lote de acreditacion a partir del archivo de liquidacion de
// Payway.
//
// Es un modulo puro a proposito: no toca Supabase ni React. Todo lo que hace es
// resolver que renglon del archivo corresponde a este lote y cuanto queda para
// acreditar. Si mañana la cuenta se cambia, se testea sin base de datos.
//
// La base del calculo es `TOTAL_NETO` del CSV, no el bruto: es el dinero que
// Payway deposito en la cuenta recaudadora de MoliPay. De ahi se descuentan las
// comisiones de MoliPay y las retenciones, y lo que queda es lo que se acredita
// al comercio.

/** Retenciones que todavia no tienen calculo automatico en el repo. */
export const RETENCION_DEBITO_CREDITO_PCT = 0.6;
export const RETENCION_IVA_PCT = 21;

export type ParametrosAcreditacion = {
  /** De `parametros_globales.comision_cierre_lote_pct`. */
  comisionCierreLotePct: number;
  /** De `parametros_globales.liquidacion_tolerancia_bruto_pct`. */
  toleranciaBrutoPct: number;
  /** Editable por el operador, arranca en el 0.6% de la RG 2111/4172. */
  retencionDebitoCreditoPct: number;
  /** Editable, arranca en el 21% que declara `comisiones_cliente`. */
  retencionIvaPct: number;
  /**
   * No hay padron de Ingresos Brutos cargado ni funcion que lo aplique, asi que
   * esto lo completa el operador a mano. Se guarda el monto, no la tasa.
   */
  retencionIibbMonto: number;
};

export const PARAMETROS_DEFAULT: ParametrosAcreditacion = {
  comisionCierreLotePct: 0.45,
  toleranciaBrutoPct: 0,
  retencionDebitoCreditoPct: RETENCION_DEBITO_CREDITO_PCT,
  retencionIvaPct: RETENCION_IVA_PCT,
  retencionIibbMonto: 0,
};

export type EstadoRenglon =
  | "aplicado"
  | "diferencia"
  | "sin_establecimiento"
  | "sin_movimiento"
  | "error_formato"
  | "otro_lote"
  | "excluido";

/**
 * Correccion manual del operador sobre un renglon.
 *
 * El match por establecimiento es una heuristica, y las heuristicas fallan. Un
 * renglon puede ser de este lote y que el mapa no lo sepa todavia, o al
 * reves. Sin override manual el operador queda sin salida: o acredita un lote
 * al que no le corresponden renglones, o no acredita nada.
 */
export type OverrideRenglon = "aplicar" | "excluir";

export type RenglonMatch = {
  renglon: RenglonLiquidacion;
  /** Comercio resuelto por el mapa de establecimientos o por el selector manual. */
  comercioId: string | null;
  comercioNombre: string | null;
  estado: EstadoRenglon;
  /** |bruto del renglón - |bruto que el lote espera|. */
  diferencia: number;
  /** El renglon es de este lote y se puede acreditar. */
  acreditable: boolean;
};

export type TotalesAcreditacion = {
  brutoCsv: number;
  netoCsv: number;
  impuestosPayway: number;
  costoServicio: number;
  comisionMolipay: number;
  comisionCierre: number;
  retencionDebitoCredito: number;
  retencionIva: number;
  retencionIibb: number;
  /** Total descontado del neto de Payway. */
  totalDescuentos: number;
  /** Lo que se deposita en la subcuenta Operativa del comercio. */
  importeNeto: number;
};

export type PreviewAcreditacion = {
  renglones: RenglonMatch[];
  /** Renglones que aplican a este lote, en estado acreditable. */
  aplicables: RenglonMatch[];
  totales: TotalesAcreditacion;
  /** |bruto del CSV - bruto estimado del lote|. */
  diferenciaBruto: number;
  diferenciaBrutoPct: number;
  excedeTolerancia: boolean;
};

type EstablecimientoLookup = {
  comercioId: string;
  comercioNombre: string;
  marca: string;
  vigenteHasta: string | null;
};

/** Redondea a dos decimales, que es la escala de todos los numeric(14,2). */
function r2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Reduce una marca a comparable.
 *
 * El lote guarda "Visa Credito" y el CSV manda "VISA". Sin acentos, sin
 * espacios y sin guiones, "Visa Credito" queda "visacredito" y "VISA" queda
 * "visa", que se matchean por prefijo.
 */
export function normalizaMarca(s: string): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Una marca del CSV corresponde a la bandera del lote.
 *
 * Se matchea por prefijo y no por igualdad porque el lote distingue
 * "Visa" de "Visa Credito" (son `comercio_banderas` distintas) mientras que el
 * CSV manda una sola marca por renglon. El CSV nunca es mas especifico que el
 * lote, asi que el prefijo corto gana.
 */
export function marcaCoincide(marcaCsv: string, banderaLote: string): boolean {
  const a = normalizaMarca(marcaCsv);
  const b = normalizaMarca(banderaLote);
  if (!a || !b) return false;
  return a.startsWith(b) || b.startsWith(a);
}

/**
 * Lookup de un comercio por `sitioId` (la columna `site_id` de la
 * tabla `comercios`). Es el fallback cuando el renglón del CSV no
 * matchea contra el mapa de `comercio_establecimientos` (el de
 * marca/establecimiento), pero el número de establecimiento que
 * trae el archivo coincide con el `site_id` del comercio.
 */
export type SitioLookup = { sitioId: string; comercioId: string; comercioNombre: string };

/** Indice de establecimientos por `ESTABLECIMIENTO|MARCA`, por `ESTABLECIMIENTO` y por `sitioId`. */
function indexarEstablecimientos(
  filas: { establecimiento: string; marca: string; comercioId: string; comercioNombre: string; vigenteHasta: string | null }[],
  sitios: SitioLookup[] = [],
): {
  porMarca: Map<string, EstablecimientoLookup>;
  solo: Map<string, EstablecimientoLookup>;
  porSitio: Map<string, SitioLookup>;
} {
  const porMarca = new Map<string, EstablecimientoLookup>();
  const solo = new Map<string, EstablecimientoLookup>();
  const porSitio = new Map<string, SitioLookup>();

  for (const f of filas) {
    const lookup: EstablecimientoLookup = {
      comercioId: f.comercioId,
      comercioNombre: f.comercioNombre,
      marca: f.marca,
      vigenteHasta: f.vigenteHasta,
    };
    const e = f.establecimiento.trim();
    const k = `${e}|${normalizaMarca(f.marca)}`;
    if (!porMarca.has(k)) porMarca.set(k, lookup);
    if (!solo.has(e)) solo.set(e, lookup);
  }

  for (const s of sitios) {
    const k = s.sitioId.trim();
    if (!k) continue;
    if (!porSitio.has(k)) porSitio.set(k, s);
  }

  return { porMarca, solo, porSitio };
}

function vigenteEn(lookup: EstablecimientoLookup, fecha: string): boolean {
  // Sin fecha de renglon no hay contra que comparar: se acepta.
  if (!fecha) return true;
  if (!lookup.vigenteHasta) return true;
  return lookup.vigenteHasta >= fecha;
}

/**
 * Resuelve un renglon contra el lote.
 *
 * El orden importa: primero se ve si el renglon es de este lote. Solo si lo es
 * se exigencia que tenga un comercio mapeado, porque un renglon que es de otro
 * lote no necesita resolverse para poder acreditarse acá.
 *
 * Tres caminos de resolución, en este orden:
 *   1. Mapa de establecimientos (`(establecimiento, marca)` o sólo
 *      `establecimiento`).
 *   2. `comercioManual` que el operador eligió en el modal.
 *   3. **Fallback por `site_id`**: si el `ESTABLECIMIENTO` del CSV
 *      coincide con el `site_id` de un comercio, se considera el
 *      renglón de ese comercio. Esto es lo que permite que el CSV
 *      de prueba funcione sin tener cargado el mapa de
 *      establecimientos, mientras el operador siga usando
 *      `comercios.site_id` como clave.
 */
export function resolverRenglon(
  renglon: RenglonLiquidacion,
  lote: LoteAcreditacion,
  idx: {
    porMarca: Map<string, EstablecimientoLookup>;
    solo: Map<string, EstablecimientoLookup>;
    porSitio: Map<string, SitioLookup>;
  },
  comercioManual: string | null,
  toleranciaBrutoPct: number,
): RenglonMatch {
  const base = {
    renglon,
    comercioId: null as string | null,
    comercioNombre: null as string | null,
    diferencia: 0,
  };

  if (renglon.error) {
    return { ...base, estado: "error_formato", acreditable: false };
  }

  // Renglon de dia sin movimiento: es un renglon valido del archivo, pero no
  // aporta plata y no debe generar una diferencia de $0 que se vea como
  // "cuadra perfecto" cuando en realidad no hay nada que liquidar.
  if (renglon.sinMovimiento) {
    const lookupCero =
      idx.porMarca.get(`${renglon.establecimiento}|${normalizaMarca(renglon.marca)}`) ??
      idx.solo.get(renglon.establecimiento) ??
      idx.porSitio.get(renglon.establecimiento);
    return {
      ...base,
      comercioId: lookupCero ? (lookupCero as { comercioId: string }).comercioId : null,
      comercioNombre: lookupCero ? (lookupCero as { comercioNombre: string }).comercioNombre : null,
      estado: "sin_movimiento",
      acreditable: false,
    };
  }

  const lookup =
    idx.porMarca.get(`${renglon.establecimiento}|${normalizaMarca(renglon.marca)}`) ??
    idx.solo.get(renglon.establecimiento);

  if (!lookup || !vigenteEn(lookup, renglon.fecha)) {
    if (comercioManual && comercioManual === lote.comercioId) {
      // El operador lo resuelve a mano: el renglon es de este lote
      const dif = r2(Math.abs(renglon.totalBruto - lote.importeBruto));
      const pct = lote.importeBruto !== 0 ? r2((dif / lote.importeBruto) * 100) : 0;
      return {
        ...base,
        comercioId: lote.comercioId,
        comercioNombre: lote.comercio?.nombreComercio ?? lote.comercio?.usuario ?? null,
        estado: pct > toleranciaBrutoPct ? "diferencia" : "aplicado",
        diferencia: dif,
        acreditable: true,
      };
    }

    // Fallback por site_id: si el número de establecimiento del CSV
    // coincide con el site_id de un comercio Y ese comercio es el del
    // lote, el renglón se marca como aplicable. Esto es lo que usa el
    // CSV de prueba cuando el mapa de establecimientos no está
    // cargado.
    const sitioMatch = idx.porSitio.get(renglon.establecimiento);
    if (sitioMatch && sitioMatch.comercioId === lote.comercioId) {
      const dif = r2(Math.abs(renglon.totalBruto - lote.importeBruto));
      const pct = lote.importeBruto !== 0 ? r2((dif / lote.importeBruto) * 100) : 0;
      return {
        ...base,
        comercioId: sitioMatch.comercioId,
        comercioNombre: sitioMatch.comercioNombre || lote.comercio?.nombreComercio || lote.comercio?.usuario || null,
        estado: pct > toleranciaBrutoPct ? "diferencia" : "aplicado",
        diferencia: dif,
        acreditable: true,
      };
    }

    return { ...base, estado: "sin_establecimiento", acreditable: false };
  }

  const esDeEsteLote = lookup.comercioId === lote.comercioId && marcaCoincide(renglon.marca, lote.bandera);
  if (!esDeEsteLote) {
    return {
      ...base,
      comercioId: lookup.comercioId,
      comercioNombre: lookup.comercioNombre,
      estado: "otro_lote",
      acreditable: false,
    };
  }

  // El renglon es de este lote. La diferencia contra el bruto estimado se
  // calcula recien aca: para un renglon de otro lote no significa nada.
  const diferencia = r2(Math.abs(renglon.totalBruto - lote.importeBruto));
  const pct = lote.importeBruto !== 0 ? r2((diferencia / lote.importeBruto) * 100) : 0;

  return {
    ...base,
    comercioId: lookup.comercioId,
    comercioNombre: lookup.comercioNombre,
    estado: pct > toleranciaBrutoPct ? "diferencia" : "aplicado",
    diferencia,
    acreditable: true,
  };
}

/**
 * Aplica la correccion manual del operador sobre un renglon ya resuelto.
 *
 * "aplicar" marca el renglon como de este lote sin cambiar su importe: la
 * diferencia se recalcula contra el bruto del lote para que el modal siga
 * mostrando la misma columna. Un renglon con error de formato NO se puede
 * forzar a acreditable: no tiene fecha o no tiene establecimiento, y sin eso no
 * hay forma de saber a que lote pertenece.
 */
function aplicarOverride(
  m: RenglonMatch,
  ov: OverrideRenglon,
  lote: LoteAcreditacion,
  toleranciaBrutoPct: number,
): RenglonMatch {
  if (m.renglon.error) return m;

  if (ov === "excluir") {
    return { ...m, estado: "excluido", acreditable: false, diferencia: 0 };
  }

  const dif = r2(Math.abs(m.renglon.totalBruto - lote.importeBruto));
  const pct = lote.importeBruto !== 0 ? r2((dif / lote.importeBruto) * 100) : 0;

  return {
    ...m,
    comercioId: lote.comercioId,
    comercioNombre: m.comercioNombre ?? lote.comercio?.nombreComercio ?? lote.comercio?.usuario ?? null,
    estado: pct > toleranciaBrutoPct ? "diferencia" : "aplicado",
    diferencia: dif,
    acreditable: true,
  };
}

/**
 * Arma la vista previa de la acreditacion.
 *
 * No lanza: devuelve el resultado con los renglones que no se pudieron
 * resolver marcados. El modal decide si bloquea o deja seguir.
 */
export function calcularAcreditacion(args: {
  lote: LoteAcreditacion;
  renglones: RenglonLiquidacion[];
  establecimientos: {
    establecimiento: string;
    marca: string;
    comercioId: string;
    comercioNombre: string;
    vigenteHasta: string | null;
  }[];
  parametros: ParametrosAcreditacion;
  /** Comercio elegido a mano cuando el mapa no tiene el establecimiento. */
  comercioManual?: string | null;
  /**
   * Lookups por `site_id` para el fallback de resolución. Si el
   * renglón del CSV no matchea con el mapa de establecimientos, se
   * prueba contra este set: si el `ESTABLECIMIENTO` coincide con un
   * `site_id` y el comercio matchea con el del lote, el renglón se
   * considera aplicable. Útil para el CSV de prueba cuando todavía
   * no está cargado el mapa.
   */
  sitios?: SitioLookup[];
  /**
   * Correcciones manuales por numero de linea. Se aplican DESPUES de la
   * resolucion automatica y ganan siempre: si el operador forzo un renglon,
   * la heuristica deja de opinar sobre ese renglon.
   */
  overrides?: Record<number, OverrideRenglon>;
}): PreviewAcreditacion {
  const { lote, renglones, parametros } = args;
  const idx = indexarEstablecimientos(args.establecimientos, args.sitios ?? []);
  const overrides = args.overrides ?? {};

  const matches = renglones.map((r) => {
    const auto = resolverRenglon(r, lote, idx, args.comercioManual ?? null, parametros.toleranciaBrutoPct);
    const ov = overrides[r.nro];
    if (!ov) return auto;
    return aplicarOverride(auto, ov, lote, parametros.toleranciaBrutoPct);
  });
  const aplicables = matches.filter((m) => m.acreditable);

  const suma = (fn: (m: RenglonMatch) => number) => r2(aplicables.reduce((a, m) => a + fn(m), 0));

  const brutoCsv = suma((m) => m.renglon.totalBruto);
  const netoCsv = suma((m) => m.renglon.totalNeto);
  const impuestosPayway = suma((m) => m.renglon.impuestos);
  const costoServicio = suma((m) => m.renglon.costoServicio);

  // Base de la comision MoliPay: el neto, segun `comision_molipay_base = 'neto'`
  // que declara la migracion 0044.
  const comisionMolipay = r2((netoCsv * lote.tasaMolipayPct) / 100);
  const comisionCierre = r2((netoCsv * parametros.comisionCierreLotePct) / 100);
  const retencionDebitoCredito = r2((netoCsv * parametros.retencionDebitoCreditoPct) / 100);
  // El IVA se retiene sobre la comision, no sobre el ingreso: es impuesto a la
  // prestacion de MoliPay.
  const retencionIva = r2((comisionMolipay * parametros.retencionIvaPct) / 100);
  const retencionIibb = r2(parametros.retencionIibbMonto);

  const totalDescuentos = r2(comisionMolipay + comisionCierre + retencionDebitoCredito + retencionIva + retencionIibb);
  const importeNeto = r2(netoCsv - totalDescuentos);

  const diferenciaBruto = r2(Math.abs(brutoCsv - lote.importeBruto));
  const diferenciaBrutoPct = lote.importeBruto !== 0 ? r2((diferenciaBruto / lote.importeBruto) * 100) : 0;
  const excedeTolerancia = diferenciaBrutoPct > parametros.toleranciaBrutoPct;

  return {
    renglones: matches,
    aplicables,
    totales: {
      brutoCsv,
      netoCsv,
      impuestosPayway,
      costoServicio,
      comisionMolipay,
      comisionCierre,
      retencionDebitoCredito,
      retencionIva,
      retencionIibb,
      totalDescuentos,
      importeNeto,
    },
    diferenciaBruto,
    diferenciaBrutoPct,
    excedeTolerancia,
  };
}
