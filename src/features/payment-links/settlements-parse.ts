import { round2 } from "@/shared/lib/money-round";
import { AppError } from "@/shared/lib/errors";
// Parser del archivo diario de liquidacion de Payway.
//
// Payway envia un archivo de texto plano delimitado por punto y coma con
// este encabezado:
//
//   FECHA;MARCA;ESTABLECIMIENTO;TOTAL_BRUTO;COSTO_DE_SERVICIO;IMPUESTOS;TOTAL_NETO
//
// Dos decisiones que parecen detalles y no lo son:
//
// 1. Las columnas se buscan POR NOMBRE, no por posicion. El archivo real de
//    Payway no siempre trae las siete en el mismo orden, y agregar una columna
//    nueva no puede romper la importacion. Solo se exige que existan.
//
// 2. No se usa XLSX. Este archivo es texto, no Excel: traer el parser de
//    hojas para un CSV de una linea por renglon es peso de mas.
//
// 3. El archivo real NO arranca en el encabezado. Viene precedido por una linea
//    de titulo con el periodo, tipo:
//
//      Detalle de Liquidaciones de Payway Desde: 08/04/2025 Hasta: 07/07/2025
//
//    Asi que el encabezado se busca, no se asume en la primera linea.
//
// 4. Un renglon de todo ceros es un renglon VALIDO. Payway manda una fila por
//    combinacion de fecha/marca/establecimiento del periodo consultado, y la
//    mayoria son de dias sin movimiento. Marcarlos como error inundaria la
//    pantalla de excepciones de ruido y taparia los problemas reales.
//
// La funcion no descarta renglones invalidos en silencio: los devuelve con
// `error` para que el modal pueda mostrarlos en la lista de excepciones. Un
// archivo con un renglon roto tiene que mostrar CUAL.

export type LineSettlement = {
  /** Posicion en el archivo original, empezando en 1. Es la llave de dedupe. */
  nro: number;
  fecha: string;
  marca: string;
  establecimiento: string;
  totalBruto: number;
  costoServicio: number;
  impuestos: number;
  totalNeto: number;
  /** Motivo para descartar el renglon, o null si es usable. */
  error: string | null;
  /** Renglon valido pero de un dia sin movimiento: todos los importes en 0. */
  sinMovimiento: boolean;
  /** La linea cruda, para mostrar el problema sin adivinar. */
  raw: string;
};

/**
 * Una columna del archivo real, con la columna que el calculo necesita.
 *
 * El archivo de Payway puede traer columnas que no usamos. El mapeo se muestra
 * en el modal para que el operador vea de donde sale cada numero en vez de
 * confiar en un parseo invisible.
 */
export type ColumnMapeada = {
  /** Nombre tal como viene en el archivo, ya normalizado. */
  archivo: string;
  /** Posicion en la linea, o null si la columna no existe. */
  indice: number | null;
};

export type ResultParseo = {
  renglones: LineSettlement[];
  /** Todas las columnas del encabezado, en el orden del archivo. */
  columnas: string[];
  /** Columnas que el calculo necesita, mapeadas a su posicion. */
  mapeo: ColumnMapeada[];
  /** Lineas anteriores al encabezado (el titulo del periodo). */
  encabezadoLineas: string[];
  /** Linea (1-based) del encabezado. */
  lineaEncabezado: number;
  /** Filas que no se pudieron interpretar y por que. */
  descartados: { nro: number; motivo: string; raw: string }[];
  /** Renglones validos pero sin movimiento (todo en cero). */
  sinMovimiento: number;
};

/** Columnas sin las cuales no se puede calcular nada. */
const REQUERIDAS = [
  "FECHA",
  "MARCA",
  "ESTABLECIMIENTO",
  "TOTAL_BRUTO",
  "COSTO_DE_SERVICIO",
  "IMPUESTOS",
  "TOTAL_NETO",
] as const;

/**
 * Normaliza un encabezado para comparar.
 *
 * Payway y los exportadores de bancos agregan basura: BOM al principio del
 * archivo, espacios, \r de Windows, y a veces el sufijo de Excel.
 */
function norm(h: string): string {
  return h
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "")
    .trim()
    .toUpperCase();
}

/**
 * Convierte un importe de Payway a numero.
 *
 * Acepta las dos convenciones porque no se sabe cual manda en el archivo que
 * toque: "-1.234,56" (es-AR), "1234.56" (ISO), "1234,56", y vacio.
 *
 * La decision se toma por posicion del separador, no por locale: el separador
 * decimal es el ultimo que aparece. Un separador seguido de exactamente tres
 * digitos se lee como miles, no como decimal.
 */
export function parseAmount(raw: string): number {
  if (raw == null) return 0;
  let s = String(raw).trim();
  if (!s) return 0;

  // El signo se saca ANTES de limpiar: Payway manda los descuentos ya negativos
  // ("-10.00", "-14.29") y filtrar todo lo que no sea digito se comia el menos.
  // "(1.234,56)" es la otra forma de negativo que usan algunos exportadores.
  const negativo = s.startsWith("-") || /^\(.*\)$/.test(s);
  if (/^\(.*\)$/.test(s)) s = s.slice(1, -1);

  // Fuera todo lo que no sea digito, punto o coma
  s = s.replace(/[^\d.,]/g, "");
  if (!s) return 0;

  const ultPoint = s.lastIndexOf(".");
  const ultComa = s.lastIndexOf(",");

  if (ultPoint >= 0 && ultComa >= 0) {
    if (ultComa > ultPoint) {
      s = s.replace(/\./g, "").replace(",", "."); // 1.234,56 -> 1234.56
    } else {
      s = s.replace(/,/g, ""); // 1,234.56 -> 1234.56
    }
  } else if (ultPoint >= 0) {
    // Un solo tipo de separador: miles si le siguen exactamente 3 digitos
    if (s.length - ultPoint - 1 === 3) s = s.replace(/\./g, ""); // 1.234 -> 1234
  } else if (ultComa >= 0) {
    const despues = s.length - ultComa - 1;
    // "1,234" es ambiguo. En es-AR son miles, asi que se leen como miles.
    if (despues === 3) s = s.replace(/,/g, "");
    else s = s.replace(",", ".");
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return negativo ? -n : n;
}

/**
 * Normaliza la fecha de los renglones a ISO (YYYY-MM-DD).
 *
 * Payway manda "05/10/2026" (dd/mm/aaaa). Se resuelve el orden de dia y mes
 * por el dato: si el segundo componente supera 12 solo puede ser un dia, y si
 * el primero lo supera solo puede ser un mes. Si ambos entran en 1..12 se
 * asume dd/mm/aaaa, que es el formato de un archivo argentino.
 *
 * Cualquier otra cosa devuelve "" y el renglon queda con error.
 */
export function parseDate(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";

  // ISO ya viene listo
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const br = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(s);
  if (!br) return "";

  const a = String(Number(br[1])).padStart(2, "0");
  const b = String(Number(br[2])).padStart(2, "0");
  const y = br[3].length === 2 ? `20${br[3]}` : br[3];

  const nA = Number(a);
  const nB = Number(b);

  let day = a;
  let month = b;
  if (nA > 12 && nB <= 12) {
    day = a;
    month = b;
  } else if (nB > 12 && nA <= 12) {
    // Venia mm/dd: el dia es el segundo componente
    day = b;
    month = a;
  }

  return `${y}-${month}-${day}`;
}

/**
 * Parsea el archivo de liquidacion de Payway.
 *
 * Devuelve todos los renglones leidos. `descartados` lista los que no se
 * pudieron interpretar, para que el operador vea que se le paso por alto en
 * vez de creer que el archivo estaba limpio.
 */
export async function parseFileSettlement(file: File): Promise<ResultParseo> {
  const text = await file.text();

  // Corte de linea: unix, windows y el CR suelto de algunos exportadores
  const lines = text.split(/\r\n|\r|\n/).filter((l) => l.trim() !== "");

  if (lines.length === 0) {
    throw new AppError("validation", "El archivo esta vacio.");
  }

  // El encabezado se BUSCA, no se asume en la linea 1: el archivo real de
  // Payway arranca con una linea de titulo que declara el periodo consultado.
  // Si no hay ninguna linea con las columnas pedidas, se informa que se probo
  // y que se encontro, en vez de tirar "columnas faltantes" sobre un titulo.
  let lineHeader = -1;
  let columns: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i].split(";").map(norm);
    if (REQUERIDAS.every((c) => cols.includes(c))) {
      lineHeader = i;
      columns = cols;
      break;
    }
  }

  if (lineHeader === -1) {
    const primera = lines[0].split(";").map(norm);
    const faltan = REQUERIDAS.filter((c) => !primera.includes(c));
    throw new AppError(
      "validation",
      `No se encontro el encabezado de Payway en ninguna linea del archivo. ` +
        (faltan.length > 0 ? `Faltan: ${faltan.join(", ")}. ` : "") +
        `Primera linea: "${lines[0].slice(0, 160)}"`,
    );
  }

  const headerLines = lines.slice(0, lineHeader);

  // Primera ocurrencia gana si hay columna duplicada: es la que el archivo
  // declara primero.
  const pos = (col: string) => columns.indexOf(col);

  const iDate = pos("FECHA");
  const iBrand = pos("MARCA");
  const iEstab = pos("ESTABLECIMIENTO");
  const iGross = pos("TOTAL_BRUTO");
  const iCost = pos("COSTO_DE_SERVICIO");
  const iImp = pos("IMPUESTOS");
  const iNet = pos("TOTAL_NETO");

  const get = (parts: string[], i: number) => (i >= 0 ? (parts[i] ?? "") : "");

  const renglones: LineSettlement[] = [];
  const descartados: { nro: number; motivo: string; raw: string }[] = [];
  let withoutMovement = 0;

  // `nro` es el numero de linea del archivo (1-based) para que el operador
  // pueda encontrar el renglon exacto en lo que le paso el banco.
  for (let i = lineHeader + 1; i < lines.length; i++) {
    const raw = lines[i];
    const parts = raw.split(";");
    const nro = i + 1;

    const date = parseDate(get(parts, iDate));
    const brand = get(parts, iBrand).trim();
    const establishment = get(parts, iEstab).trim();
    const totalGross = parseAmount(get(parts, iGross));
    const costService = parseAmount(get(parts, iCost));
    const taxes = parseAmount(get(parts, iImp));
    const totalNet = parseAmount(get(parts, iNet));

    // Fila que no trae ni identificadores: es ruido de formato
    if (!date && !brand && !establishment) {
      descartados.push({ nro, motivo: "Renglon vacio", raw });
      continue;
    }

    // Todo en cero es un renglon VALIDO, no un error: Payway manda una fila por
    // combinacion de fecha/marca/establecimiento del periodo consultado y la
    // mayoria son dias sin movimiento. Marcarlo como error llenaria la lista
    // de excepciones de ruido y taparia los problemas de verdad.
    const esCero = totalGross === 0 && totalNet === 0 && costService === 0 && taxes === 0;
    if (esCero) withoutMovement++;

    let error: string | null = null;
    if (!date) error = `Fecha invalida o ausente: "${get(parts, iDate)}"`;
    else if (!establishment) error = "Falta ESTABLECIMIENTO";
    else if (!brand) error = "Falta MARCA";

    if (error) {
      descartados.push({ nro, motivo: error, raw });
      // Se igual agrega el renglon: el modal lo muestra en rojo como excepcion
    }

    renglones.push({
      nro,
      fecha: date,
      marca: brand,
      establecimiento: establishment,
      totalBruto: totalGross,
      costoServicio: costService,
      impuestos: taxes,
      totalNeto: totalNet,
      error,
      sinMovimiento: esCero,
      raw,
    });
  }

  if (renglones.length === 0) {
    throw new AppError("validation", "El archivo tiene encabezado pero ninguna fila de datos.");
  }

  return {
    renglones,
    columnas: columns,
    mapeo: REQUERIDAS.map((c) => ({ archivo: c, indice: pos(c) })),
    encabezadoLineas: headerLines,
    lineaEncabezado: lineHeader + 1,
    descartados,
    sinMovimiento: withoutMovement,
  };
}

/** Genera el contenido de ejemplo que muestra el modal. */
export const EJEMPLO_FILE =
  "Detalle de Liquidaciones de Payway Desde: 08/04/2025 Hasta: 07/07/2025\n" +
  "FECHA;MARCA;ESTABLECIMIENTO;TOTAL_BRUTO;COSTO_DE_SERVICIO;IMPUESTOS;TOTAL_NETO\n" +
  "2025-06-27;VISA;20137725;500.00;-10.00;-14.29;475.71\n" +
  "2025-06-03;MASTERCARD;23941867;0.00;0.00;0.00;0.00";

/**
 * Tipo mínimo que necesita `generarCsvLiquidacionTest` para producir el
 * archivo de Payway. Acepta tanto el `LoteAcreditacion` real como un
 * subset armado a mano, así el helper es usable desde tests unitarios
 * sin tener que mockear Supabase.
 */
export type BatchForCsvTest = {
  codigo: string;
  fecha: string; // YYYY-MM-DD
  bandera: string;
  importeBruto: number;
  /** Porcentaje que cobra PayWay como arancel (ej. 3 = 3%). */
  tasaPaywayPct: number;
  /** Impuestos del lote como porcentaje (ej. 1,429 = 1,429% del bruto). */
  impuestosPct?: number;
  /** Impuestos del lote como monto en $ (alternativa a impuestosPct;
   *  si se pasa se usa para derivar el %). Si ninguno viene, se usa
   *  un estimado razonable del 1,429%. */
  impuestos?: number;
  /** Costo de servicio PayWay como monto en $ (costoPaywayPagoUnico). */
  costoPaywayPagoUnico?: number | null;
};

export type OptionsCsvTest = {
  /** Número de establecimiento Payway. Si no se pasa se usa
   *  "00000000" y se espera que el operador lo edite antes de subirlo
   *  (o que esté cargado en el mapa del comercio). */
  establecimiento?: string;
  /**
   * Fecha que se escribe en la columna `FECHA` del CSV. Por default
   * es **hoy** (YYYY-MM-DD local): la liquidación refleja el día en
   * que el operador la está procesando, no la fecha estimada del
   * lote (que suele ser varios días hábiles en el futuro). Si se
   * quiere otra fecha (testing contra un día histórico) se puede
   * pasar explícita.
   */
  fecha?: string;
};

/**
 * Genera el contenido de un archivo de liquidación Payway de prueba
 * coherente con un lote Programado, listo para que el operador lo baje
 * y lo suba por el mismo modal — el motor de match hace el resto.
 *
 * **Importante**: el archivo se construye a partir de los PORCENTAJES
 * del lote (`tasaPaywayPct`) y un estimado razonable de impuestos,
 * NO a partir de los valores guardados en la DB (`impuestos`,
 * `costoPaywayPagoUnico`, `tasaPaywayMonto`). Esos valores están
 * mal acumulados del job que arma los lotes y dejarían el CSV con
 * números rotos (0s o negativos). Los porcentajes sí son la fuente
 * de verdad.
 *
 * Para un lote de $1.000 con tasa PayWay 3% y bandera Visa:
 *   TOTAL_BRUTO        = 1000,00
 *   COSTO_DE_SERVICIO  = -30,00   (3% del bruto, en negativo)
 *   IMPUESTOS          = -14,29   (estimado Payway 1,429%, en negativo)
 *   TOTAL_NETO         = 955,71   (algebraica directa, positivo)
 *
 * Esto reproduce el formato real de Payway (ver ejemplo del
 * enunciado): renglón con TOTAL_NETO positivo y los descuentos
 * intermedios negativos. La pantalla de carga del CSV hace match
 * por `site_id`, así que el archivo de prueba funciona sin
 * tener cargado el mapa de establecimientos.
 *
 * Reglas:
 *   - Codificación UTF-8 con BOM para que Excel respete acentos.
 *   - Delimitador `;` y salto de línea `\r\n` (formato Payway).
 *   - Línea de título (ASCII puro, sin tildes) con el período + el
 *     encabezado estándar. La línea de título es decorativa: el
 *     parser de Payway la ignora porque busca el encabezado por
 *     nombre, no por posición.
 *   - **Una sola fila agregada** con el total del lote (modo test):
 *     el archivo de Payway real también cierra con una fila por
 *     combinación de fecha+marca+establecimiento, y acá el lote es
 *     esa combinación. Si la UI tiene que mostrar varias filas, se
 *     hace con un archivo real de Payway.
 *   - `establecimiento` se completa con el parámetro o un placeholder;
 *     el match depende del `site_id` del comercio.
 *   - La columna `FECHA` del CSV es la fecha de liquidación, no la
 *     del lote (suele ser hoy).
 */
export function generateCsvSettlementTest(
  batch: BatchForCsvTest,
  options: OptionsCsvTest = {},
): { filename: string; contenido: string } {
  const establishment = options.establecimiento ?? "00000000";
  // Fecha del renglón del CSV: por default, hoy (YYYY-MM-DD local).
  const date = options.fecha ?? todayLocalIso();

  // COSTO_DE_SERVICIO: lo que Payway cobra como arancel. Se deriva
  // de la tasa PayWay del lote (3% sobre bruto = 30 para $1.000).
  // Si la tasa no está cargada o es 0, no se descuenta nada.
  const costPct = Math.abs(Number(batch.tasaPaywayPct) || 0);
  const costNeg = -round2((batch.importeBruto * costPct) / 100);

  // IMPUESTOS: estimado Payway. Prioridad: 1) `impuestosPct` si
  // viene, 2) `impuestos`/$bruto si viene, 3) default 1,429% que
  // reproduce el ejemplo del enunciado (-14,29 sobre $1.000).
  let impPct: number;
  if (typeof batch.impuestosPct === "number" && batch.impuestosPct > 0) {
    impPct = Math.abs(batch.impuestosPct);
  } else if (batch.impuestos && batch.impuestos > 0 && batch.importeBruto > 0) {
    impPct = Math.abs((batch.impuestos / batch.importeBruto) * 100);
  } else {
    impPct = 1.429;
  }
  const taxesNeg = -round2((batch.importeBruto * impPct) / 100);

  // TOTAL_NETO: algebraica directa, siempre positivo. Es el cálculo
  // que Payway efectivamente hace: BRUTO + COSTO + IMPUESTOS, donde
  // los dos últimos están en negativo.
  const net = round2(batch.importeBruto + costNeg + taxesNeg);

  // Línea de título sin tildes para no romper la lectura si Excel la
  // toma como texto libre y la reparte en columnas con tab.
  const lineTitle = `Detalle de Liquidaciones de Payway Test - Lote ${batch.codigo} - Liquidacion ${date}`;
  const header = "FECHA;MARCA;ESTABLECIMIENTO;TOTAL_BRUTO;COSTO_DE_SERVICIO;IMPUESTOS;TOTAL_NETO";
  const row = [
    date,
    batch.bandera,
    establishment,
    n(batch.importeBruto),
    n(costNeg),
    n(taxesNeg),
    n(net),
  ].join(";");

  // BOM + CRLF: Payway exporta en Windows y los parseadores esperan eso.
  const content = "\uFEFF" + [lineTitle, header, row].join("\r\n") + "\r\n";
  const filename = `liquidacion_test_${batch.codigo}.csv`;
  return { filename, contenido: content };
}

/** Hoy en formato YYYY-MM-DD según la hora local del navegador. */
function todayLocalIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/**
 * Genera el CSV de prueba para un lote del modal de detalle.
 *
 * Wrapper sobre `generarCsvLiquidacionTest` que arma los inputs a
 * partir del `LoteAcreditacion`:
 *   - `importeBruto`, `impuestos`, `tasaPaywayMonto` y
 *     `costoPaywayPagoUnico` vienen del propio lote.
 *   - El `establecimiento` es `lote.comercio?.siteId` (la columna
 *     `site_id` de `comercios`), que es el identificador que Payway
 *     usa en su archivo para este comercio.
 *
 * El resultado es un archivo `.csv` con una sola fila agregada con
 * el total del lote (modo test). El parámetro `movimientos` se
 * acepta por compatibilidad con llamadas anteriores pero no se usa
 * (Payway cierra con una fila por lote, no por movimiento).
 */
export type BatchForCsvTestInput = {
  codigo: string;
  fecha: string;
  bandera: string;
  importeBruto: number;
  /** Porcentaje PayWay (ej. 3 = 3%) — se usa para calcular
   *  COSTO_DE_SERVICIO del CSV. */
  tasaPaywayPct: number;
  /** Impuestos del lote como monto en $ (se deriva a % si no viene
   *  impuestosPct). Si es 0 o no está, se usa el default 1,429%. */
  impuestos?: number;
  costoPaywayPagoUnico?: number | null;
  comercio?: { siteId?: string | null } | null;
};

export type MovementForCsvTestInput = {
  fecha: string; // ISO timestamp o YYYY-MM-DD
  montoOperacion: number;
};

export function generateCsvSettlementTestForBatch(
  batch: BatchForCsvTestInput,

  _Movements: MovementForCsvTestInput[] = [],
): { filename: string; contenido: string } {
  return generateCsvSettlementTest(
    {
      codigo: batch.codigo,
      fecha: batch.fecha,
      bandera: batch.bandera,
      importeBruto: batch.importeBruto,
      tasaPaywayPct: batch.tasaPaywayPct,
      impuestos: batch.impuestos,
      costoPaywayPagoUnico: batch.costoPaywayPagoUnico,
    },
    {
      establecimiento: batch.comercio?.siteId?.trim() || undefined,
      // Payway liquida en la fecha estimada del lote: con esa FECHA la
      // importacion vincula el renglon con la proyeccion (lote Programado).
      fecha: batch.fecha,
    },
  );
}

function n(n: number): string {
  // Formato es-AR con coma decimal para que el parser interno lo lea
  // como número (acepta ";" como delimitador y "," como decimal).
  return n.toFixed(2).replace(".", ",");
}
