/**
 * Lector del padron SIRCUPA (Comarb), una fila por CUIT, separado por ";":
 *   CUIT;RazonSocial;Jurisdiccion;Periodo;CRC;LetraAlicuota
 *   20000033481;PERROTTA CAYETANO;908;202209;89;Q
 *
 * El archivo se lee en streaming (no se carga entero en memoria) y se entrega
 * en bloques ya saneados. Una fila mala no corta la lectura: va a errores.
 * Duplicados: gana la mayor alicuota, que en el cuadro de Comarb es la letra
 * mas alta (a igual letra, la ultima). Dentro de un bloque se resuelve aca;
 * entre bloques, en la base, que al cerrar la carga toma el porcentaje de tax_rates.
 */

export type RowRegistry = {
  cuit: string;
  razon_social: string;
  jurisdiccion: string;
  crc: string;
  letra: string;
  linea: number;
};

export type ErrorRegistry = { linea: number; contenido: string; motivo: string };

export type VigenciaRegistry = {
  vigencia_desde: string;
  vigencia_hasta: string;
};

export type ResultLine =
  | { ok: true; fila: RowRegistry; vigencia: VigenciaRegistry }
  | { ok: false; error: ErrorRegistry }
  | null; // linea vacia

const SEPARATOR = ";";
const MAX_ERRORS_GUARDADOS = 5000;
const MAX_NAME_LENGTH = 45;

/** AAAAMM -> primer y ultimo dia del mes (o null si no es un periodo real). */
export function periodVigencia(v: string): VigenciaRegistry | null {
  const s = v.trim();
  if (!/^\d{6}$/.test(s)) return null;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(4));
  if (m < 1 || m > 12) return null;
  const month = `${s.slice(0, 4)}-${s.slice(4)}`;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { vigencia_desde: `${month}-01`, vigencia_hasta: `${month}-${last}` };
}

/**
 * CUIT sin separadores; null si no son 11 digitos o el digito verificador no
 * cierra. `verificarDigito: false` solo para padrones de prueba (CUIT de
 * clientes de test que no tienen un verificador real).
 */
export function normalizeCuit(v: string, verifyDigit = true): string | null {
  const s = v.replace(/[\s.\-/]/g, "");
  if (!/^\d{11}$/.test(s)) return null;
  if (!verifyDigit) return s;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((t, p, i) => t + p * Number(s[i]), 0);
  const resto = 11 - (suma % 11);
  const dv = resto === 11 ? 0 : resto === 10 ? 9 : resto;
  return dv === Number(s[10]) ? s : null;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
};

function limpiarText(v: string): string {
  return v
    .replace(/&(amp|lt|gt|quot|apos|#39);/g, (_, e: string) => ENTITIES[e])
    .replace(/\s+/g, " ")
    .trim();
}

/** 0 / 000 = Convenio Multilateral; 901 a 924 = regimen local. */
function isJurisdiction(v: string): boolean {
  if (!/^\d{1,3}$/.test(v)) return false;
  const code = Number(v);
  return code === 0 || (code >= 901 && code <= 924);
}

/** Sanea una linea del padron. Devuelve la fila, un error, o null si esta vacia. */
export function parsearLine(text: string, line: number, verifyDigit = true): ResultLine {
  const raw = text.replace(/\r$/, "");
  if (raw.trim() === "") return null;
  const err = (reason: string): ResultLine => ({
    ok: false,
    error: { linea: line, contenido: raw.slice(0, 500), motivo: reason },
  });

  const c = raw.split(SEPARATOR);
  if (c.length < 6) return err(`Faltan columnas: se esperaban 6 y hay ${c.length}`);
  // La razon social puede traer el separador: las otras columnas tienen lugar fijo.
  const [jurisdiccion, periodo, crc, letra] = c.slice(-4).map((v) => v.trim());

  const cuit = normalizeCuit(c[0], verifyDigit);
  if (!cuit)
    return err(
      verifyDigit
        ? "CUIT inválido (11 dígitos con dígito verificador)"
        : "CUIT inválido (11 dígitos)",
    );
  if (!isJurisdiction(jurisdiccion))
    return err(`Jurisdicción inválida: "${jurisdiccion}" (0 o de 901 a 924)`);
  const vigencia = periodVigencia(periodo);
  if (!vigencia) return err(`Período inválido: "${periodo}" (AAAAMM)`);
  if (!/^\d{1,2}$/.test(crc)) return err(`CRC inválido: "${crc}" (hasta 2 dígitos)`);
  const letter = letra.toUpperCase();
  if (!/^[A-Z]$/.test(letter)) return err(`Letra de alícuota inválida: "${letra}" (A a Z)`);

  return {
    ok: true,
    vigencia,
    fila: {
      cuit,
      razon_social: limpiarText(c.slice(1, -4).join(SEPARATOR)).slice(0, MAX_NAME_LENGTH),
      jurisdiccion,
      crc,
      letra: letter,
      linea: line,
    },
  };
}

// ---------------------------------------------------------------------------
// Lectura del archivo
// ---------------------------------------------------------------------------

export type SectionRegistry = {
  filas: RowRegistry[];
  errores: ErrorRegistry[];
  /** Errores que ya no se guardan (tope de MAX_ERRORES_GUARDADOS) pero se cuentan. */
  erroresSinDetalle: number;
  progreso: number; // 0..100
};

export type SummaryLectura = {
  filasLeidas: number;
  filasValidas: number;
  errores: number;
  duplicadasEnBloque: number;
  vigencia: VigenciaRegistry | null;
  codificacion: string;
};

/** Primer bloque de bytes decodificable como UTF-8 estricto => UTF-8; si no, Latin-1 (lo habitual en los fiscos). */
async function detectarCodificacion(file: File): Promise<string> {
  const muestra = new Uint8Array(await file.slice(0, 65536).arrayBuffer());
  if (muestra[0] === 0xef && muestra[1] === 0xbb && muestra[2] === 0xbf) return "utf-8";
  try {
    // Recorta un posible caracter multibyte partido al final de la muestra.
    let fin = muestra.length;
    while (fin > 0 && fin > muestra.length - 4 && (muestra[fin - 1] & 0xc0) === 0x80) fin--;
    if (fin > 0 && muestra[fin - 1] >= 0xc0) fin--;
    new TextDecoder("utf-8", { fatal: true }).decode(muestra.slice(0, fin));
    return "utf-8";
  } catch {
    return "iso-8859-1";
  }
}

async function* linesDeText(
  file: File,
  codificacion: string,
): AsyncGenerator<{ texto: string; bytes: number }> {
  const reader = file.stream().getReader();
  const decoder = new TextDecoder(codificacion);
  let resto = "";
  let bytes = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    resto += decoder.decode(value, { stream: true });
    const partes = resto.split("\n");
    resto = partes.pop() ?? "";
    for (const p of partes) yield { texto: p, bytes };
  }
  resto += decoder.decode();
  if (resto) yield { texto: resto, bytes };
}

/**
 * Lee el padron y llama a `onBloque` cada `tamBloque` filas validas.
 * Si `onBloque` falla, la lectura se corta (la carga se marca con error arriba).
 */
export async function readRegistry(
  file: File,
  onSection: (b: SectionRegistry) => Promise<void>,
  opts: {
    tamBloque?: number;
    signal?: AbortSignal;
    /** false: archivo de prueba, acepta CUIT sin digito verificador valido. */
    verificarDigito?: boolean;
  } = {},
): Promise<SummaryLectura> {
  const tam = opts.tamBloque ?? 2000;
  const codificacion = await detectarCodificacion(file);
  const lines = linesDeText(file, codificacion);

  let vigencia: VigenciaRegistry | null = null;
  let number = 0;
  let leidas = 0;
  let validas = 0;
  let errors = 0;
  let guardados = 0;
  let dupSection = 0;
  let section = new Map<string, RowRegistry>();
  let errorsSection: ErrorRegistry[] = [];
  let withoutDetail = 0;
  let lastProgress = 0;

  const registrarError = (e: ErrorRegistry) => {
    errors++;
    if (guardados < MAX_ERRORS_GUARDADOS) {
      errorsSection.push(e);
      guardados++;
    } else withoutDetail++;
  };

  const vaciar = async (bytes: number) => {
    if (section.size === 0 && errorsSection.length === 0 && withoutDetail === 0) return;
    lastProgress = Math.min(99, Math.floor((bytes / Math.max(file.size, 1)) * 100));
    await onSection({
      filas: [...section.values()],
      errores: errorsSection,
      erroresSinDetalle: withoutDetail,
      progreso: lastProgress,
    });
    section = new Map();
    errorsSection = [];
    withoutDetail = 0;
  };

  let lastBytes = 0;
  for await (const { texto: text, bytes } of lines) {
    if (opts.signal?.aborted) throw new DOMException("Carga cancelada", "AbortError");
    number++;
    lastBytes = bytes;
    const r = parsearLine(text, number, opts.verificarDigito ?? true);
    if (r === null) continue;
    leidas++;
    if (!r.ok) {
      registrarError(r.error);
    } else {
      // Todo el archivo debe ser del mismo periodo que la primera fila valida.
      if (!vigencia) vigencia = r.vigencia;
      if (r.vigencia.vigencia_desde !== vigencia.vigencia_desde) {
        registrarError({
          linea: number,
          contenido: text.slice(0, 500),
          motivo: "Período distinto al resto del archivo",
        });
      } else {
        validas++;
        const previa = section.get(r.fila.cuit);
        if (previa) {
          dupSection++;
          if (r.fila.letra >= previa.letra) section.set(r.fila.cuit, r.fila);
        } else section.set(r.fila.cuit, r.fila);
      }
    }
    if (section.size >= tam || errorsSection.length >= tam) await vaciar(bytes);
  }
  await vaciar(lastBytes || file.size);

  return {
    filasLeidas: leidas,
    filasValidas: validas,
    errores: errors,
    duplicadasEnBloque: dupSection,
    vigencia,
    codificacion,
  };
}
