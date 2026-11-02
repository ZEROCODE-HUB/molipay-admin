import * as XLSX from "xlsx";

/**
 * Lector de padrones de Ingresos Brutos (SIRTAC primero).
 *
 * Formato SIRTAC, una fila por contribuyente, separado por ";":
 *   FechaEmision;FechaDesde;FechaHasta;CUIT;TipoRegimen;Sujeto;Exento;
 *   AlicuotaPercepcion;AlicuotaRetencion;CodControl1;CodControl2;RazonSocial
 *   28072026;01082026;31082026;20000163989;D;S;N;0,00;0,00;00;00;ETCHEVERRIGARAY JUAN CARLOS
 *
 * El archivo se lee en streaming (no se carga entero en memoria) y se entrega
 * en bloques ya saneados. Una fila mala no corta la lectura: va a errores.
 * Duplicados: gana la mayor alicuota de retencion (a igual alicuota, la
 * ultima). Dentro de un bloque se resuelve aca; entre bloques, en la base.
 */

export type FilaPadron = {
  cuit: string;
  tipo_regimen: "D" | "C";
  sujeto: boolean;
  exento: boolean;
  alicuota_percepcion: number;
  alicuota_retencion: number;
  cod_control_1: string;
  cod_control_2: string;
  razon_social: string;
  linea: number;
};

export type ErrorPadron = { linea: number; contenido: string; motivo: string };

export type VigenciaPadron = {
  fecha_emision: string;
  vigencia_desde: string;
  vigencia_hasta: string;
};

export type ResultadoLinea =
  | { ok: true; fila: FilaPadron; vigencia: VigenciaPadron }
  | { ok: false; error: ErrorPadron }
  | null; // linea vacia

const MAX_ERRORES_GUARDADOS = 5000;

/** DDMMAAAA -> AAAA-MM-DD (o null si no es una fecha real). */
export function fechaDdmmaaaa(v: string): string | null {
  const s = v.trim();
  if (!/^\d{8}$/.test(s)) return null;
  const d = Number(s.slice(0, 2));
  const m = Number(s.slice(2, 4));
  const y = Number(s.slice(4));
  const f = new Date(Date.UTC(y, m - 1, d));
  if (f.getUTCFullYear() !== y || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * CUIT sin separadores; null si no son 11 digitos o el digito verificador no
 * cierra. `verificarDigito: false` solo para padrones de prueba (CUIT de
 * clientes de test que no tienen un verificador real).
 */
export function normalizarCuit(v: string, verificarDigito = true): string | null {
  const s = v.replace(/[\s.\-/]/g, "");
  if (!/^\d{11}$/.test(s)) return null;
  if (!verificarDigito) return s;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((t, p, i) => t + p * Number(s[i]), 0);
  const resto = 11 - (suma % 11);
  const dv = resto === 11 ? 0 : resto === 10 ? 9 : resto;
  return dv === Number(s[10]) ? s : null;
}

/** "6,00" / "6.00" / "6" -> 6. null si no es un porcentaje valido. */
export function alicuota(v: string): number | null {
  const s = v.trim().replace(/\s/g, "");
  if (s === "") return 0;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 10000) / 10000 : null;
}

const ENTIDADES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
};

function limpiarTexto(v: string): string {
  return v
    .replace(/&(amp|lt|gt|quot|apos|#39);/g, (_, e: string) => ENTIDADES[e])
    .replace(/\s+/g, " ")
    .trim();
}

/** Detecta el separador mirando la primera linea con datos. */
export function detectarSeparador(linea: string): string {
  if (linea.includes(";")) return ";";
  if (linea.includes("\t")) return "\t";
  return ",";
}

/** Sanea una linea del padron. Devuelve la fila, un error, o null si esta vacia. */
export function parsearLinea(
  texto: string,
  linea: number,
  sep: string,
  verificarDigito = true,
): ResultadoLinea {
  const raw = texto.replace(/\r$/, "");
  if (raw.trim() === "") return null;
  const err = (motivo: string): ResultadoLinea => ({
    ok: false,
    error: { linea, contenido: raw.slice(0, 500), motivo },
  });

  let c = raw.split(sep);
  if (c.length < 11) return err(`Faltan columnas: se esperaban 12 y hay ${c.length}`);
  // La razon social puede traer el separador: todo lo que sobra es parte del nombre.
  if (c.length > 12) c = [...c.slice(0, 11), c.slice(11).join(sep)];

  const emision = fechaDdmmaaaa(c[0]);
  const desde = fechaDdmmaaaa(c[1]);
  const hasta = fechaDdmmaaaa(c[2]);
  if (!emision) return err("Fecha de emisión inválida (DDMMAAAA)");
  if (!desde || !hasta) return err("Fecha de vigencia inválida (DDMMAAAA)");
  if (hasta < desde) return err("La vigencia termina antes de empezar");

  const cuit = normalizarCuit(c[3], verificarDigito);
  if (!cuit)
    return err(
      verificarDigito
        ? "CUIT inválido (11 dígitos con dígito verificador)"
        : "CUIT inválido (11 dígitos)",
    );

  const regimen = c[4].trim().toUpperCase();
  if (regimen !== "D" && regimen !== "C")
    return err(`Tipo de régimen inválido: "${c[4].trim()}" (D o C)`);
  const sujeto = c[5].trim().toUpperCase();
  const exento = c[6].trim().toUpperCase();
  if (!["S", "N"].includes(sujeto))
    return err(`Marca de sujeto inválida: "${c[5].trim()}" (S o N)`);
  if (!["S", "N"].includes(exento))
    return err(`Marca de exención inválida: "${c[6].trim()}" (S o N)`);

  const percepcion = alicuota(c[7]);
  const retencion = alicuota(c[8]);
  if (percepcion === null) return err(`Alícuota de percepción inválida: "${c[7].trim()}"`);
  if (retencion === null) return err(`Alícuota de retención inválida: "${c[8].trim()}"`);

  return {
    ok: true,
    vigencia: { fecha_emision: emision, vigencia_desde: desde, vigencia_hasta: hasta },
    fila: {
      cuit,
      tipo_regimen: regimen,
      sujeto: sujeto === "S",
      exento: exento === "S",
      alicuota_percepcion: percepcion,
      alicuota_retencion: retencion,
      cod_control_1: c[9].trim(),
      cod_control_2: c[10].trim(),
      razon_social: limpiarTexto(c[11] ?? ""),
      linea,
    },
  };
}

// ---------------------------------------------------------------------------
// Lectura del archivo
// ---------------------------------------------------------------------------

export type BloquePadron = {
  filas: FilaPadron[];
  errores: ErrorPadron[];
  /** Errores que ya no se guardan (tope de MAX_ERRORES_GUARDADOS) pero se cuentan. */
  erroresSinDetalle: number;
  progreso: number; // 0..100
};

export type ResumenLectura = {
  filasLeidas: number;
  filasValidas: number;
  errores: number;
  duplicadasEnBloque: number;
  vigencia: VigenciaPadron | null;
  codificacion: string;
  separador: string;
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

async function* lineasDeTexto(
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

async function* lineasDeXlsx(file: File): AsyncGenerator<{ texto: string; bytes: number }> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array", raw: false, cellDates: false });
  const hoja = wb.Sheets[wb.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, raw: false, defval: "" });
  for (let i = 0; i < filas.length; i++) {
    // Excel suele perder ceros a la izquierda de las fechas DDMMAAAA (1082026).
    const celdas = filas[i].map((v, j) => {
      const s = String(v ?? "").trim();
      return j <= 2 && /^\d{7}$/.test(s) ? s.padStart(8, "0") : s;
    });
    yield { texto: celdas.join(";"), bytes: Math.round(((i + 1) / filas.length) * file.size) };
  }
}

/**
 * Lee el padron y llama a `onBloque` cada `tamBloque` filas validas.
 * Si `onBloque` falla, la lectura se corta (la carga se marca con error arriba).
 */
export async function leerPadron(
  file: File,
  onBloque: (b: BloquePadron) => Promise<void>,
  opts: {
    tamBloque?: number;
    signal?: AbortSignal;
    /** false: archivo de prueba, acepta CUIT sin digito verificador valido. */
    verificarDigito?: boolean;
  } = {},
): Promise<ResumenLectura> {
  const tam = opts.tamBloque ?? 2000;
  const esXlsx = /\.xlsx?$/i.test(file.name);
  const codificacion = esXlsx ? "xlsx" : await detectarCodificacion(file);
  const lineas = esXlsx ? lineasDeXlsx(file) : lineasDeTexto(file, codificacion);

  let sep: string | null = esXlsx ? ";" : null;
  let vigencia: VigenciaPadron | null = null;
  let numero = 0;
  let leidas = 0;
  let validas = 0;
  let errores = 0;
  let guardados = 0;
  let dupBloque = 0;
  let bloque = new Map<string, FilaPadron>();
  let erroresBloque: ErrorPadron[] = [];
  let sinDetalle = 0;
  let ultimoProgreso = 0;

  const registrarError = (e: ErrorPadron) => {
    errores++;
    if (guardados < MAX_ERRORES_GUARDADOS) {
      erroresBloque.push(e);
      guardados++;
    } else sinDetalle++;
  };

  const vaciar = async (bytes: number) => {
    if (bloque.size === 0 && erroresBloque.length === 0 && sinDetalle === 0) return;
    ultimoProgreso = Math.min(99, Math.floor((bytes / Math.max(file.size, 1)) * 100));
    await onBloque({
      filas: [...bloque.values()],
      errores: erroresBloque,
      erroresSinDetalle: sinDetalle,
      progreso: ultimoProgreso,
    });
    bloque = new Map();
    erroresBloque = [];
    sinDetalle = 0;
  };

  let ultimoBytes = 0;
  for await (const { texto, bytes } of lineas) {
    if (opts.signal?.aborted) throw new DOMException("Carga cancelada", "AbortError");
    numero++;
    ultimoBytes = bytes;
    if (sep === null) {
      if (texto.trim() === "") continue;
      sep = detectarSeparador(texto);
    }
    const r = parsearLinea(texto, numero, sep, opts.verificarDigito ?? true);
    if (r === null) continue;
    leidas++;
    if (!r.ok) {
      registrarError(r.error);
    } else {
      // Todo el archivo debe ser del mismo periodo que la primera fila valida.
      if (!vigencia) vigencia = r.vigencia;
      if (
        r.vigencia.vigencia_desde !== vigencia.vigencia_desde ||
        r.vigencia.vigencia_hasta !== vigencia.vigencia_hasta
      ) {
        registrarError({
          linea: numero,
          contenido: texto.slice(0, 500),
          motivo: "Vigencia distinta al resto del archivo",
        });
      } else {
        validas++;
        const previa = bloque.get(r.fila.cuit);
        if (previa) {
          dupBloque++;
          if (r.fila.alicuota_retencion >= previa.alicuota_retencion)
            bloque.set(r.fila.cuit, r.fila);
        } else bloque.set(r.fila.cuit, r.fila);
      }
    }
    if (bloque.size >= tam || erroresBloque.length >= tam) await vaciar(bytes);
  }
  await vaciar(ultimoBytes || file.size);

  return {
    filasLeidas: leidas,
    filasValidas: validas,
    errores,
    duplicadasEnBloque: dupBloque,
    vigencia,
    codificacion,
    separador: sep === "\t" ? "tab" : (sep ?? ";"),
  };
}
