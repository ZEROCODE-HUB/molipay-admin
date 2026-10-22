/**
 * Padrón de Clientes Personas Jurídicas — Régimen Informativo de Proveedores de
 * Servicios de Pago, Comunicación "A" 8207 (BCRA), presentado vía SISCEN.
 *
 * El archivo `padron.xlsx` NO lleva encabezado: cada fila es un cliente
 * Persona Jurídica y las columnas están fijadas por el regulador (ver
 * `COLUMNAS` más abajo). Por eso se arma un array de filas en vez de usar
 * `json_to_sheet`, que emitiría los nombres de campo como encabezado.
 */

import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "@/lib/api/errors";

/** Tipo de documento: 11 = CUIT (valor fijo del régimen). */
export const TIPO_DOCUMENTO_CUIT = "11";

/** Sufijo fijo del padrón. */
export const SUFIJO_FIJO = "00";

/** Flag fijo del padrón. */
export const FLAG_FIJO = "0";

/** Ancho fijo de la razón social, en caracteres, con relleno a la derecha. */
export const ANCHO_RAZON_SOCIAL = 80;

/** Ancho fijo del código postal (CPA: 4 dígitos + 3 letras), con relleno. */
export const ANCHO_CP = 8;

/**
 * Tipo de persona societaria (columna H). El régimen espera un identificador
 * numérico de 2 dígitos. La tabla `clientes` guarda la forma jurídica como
 * texto libre ("S.A.", "SRL", ...), así que se traduce con este mapa; los
 * prefijos de CUIT son el respaldo cuando `tipo_sociedad` no está cargado,
 * porque el prefijo de un CUIT-Persona Jurídica ya codifica la sociedad.
 */
export const TIPO_SOCIEDAD: Record<string, string> = {
  srl: "20",
  "s.a": "10",
  sa: "10",
  "s.a.s": "11",
  sas: "11",
  "s.a.i": "12",
  sai: "12",
  "s.a.c": "13",
  sac: "13",
  "s.c.a": "14",
  sca: "14",
  "s.c.s": "15",
  scs: "15",
  "s.e": "16",
  se: "16",
  sociedad: "17",
  "cooperativa": "18",
  cooperativa: "18",
  consortorio: "19",
  "sin fines de lucro": "19",
};

/** Tipo de persona por defecto cuando no se puede determinar la sociedad. */
export const TIPO_SOCIEDAD_POR_DEFECTO = "20"; // SRL

/**
 * Prefijo del CUIT → forma jurídica. El prefijo de 2 dígitos identifica el
 * tipo de persona jurídica ante AFIP/ARCA, y es dato duro: no se infiere.
 */
const SOCIEDAD_POR_PREFIJO_CUIT: Record<string, string> = {
  "30": "10", // S.A. / sociedad anónima
  "33": "20", // S.R.L.
  "34": "13", // S.A.C.
};

/** Una fila del padrón, con una propiedad por columna y en el orden del régimen. */
export type FilaPadron = {
  /** A — Tipo de documento (fijo "11" = CUIT). */
  tipoDocumento: string;
  /** B — CUIT sin guiones (11 dígitos). */
  cuit: string;
  /** C — Sufijo (fijo "00"). */
  sufijo: string;
  /** D — Columna vacía. */
  vacio: string;
  /** E — Razón social, ancho fijo 80. */
  razonSocial: string;
  /** F — Flag (fijo "0"). */
  flag: string;
  /** G — Código postal, ancho fijo 8. */
  codigoPostal: string;
  /** H — Tipo de persona societaria (2 dígitos). */
  tipoPersonaSocietaria: string;
};

/**
 * Rellena a la derecha con espacios hasta `ancho`. Si el texto excede el ancho
 * se trunca: el archivo es de ancho fijo y una columna más larga desalinea
 * todas las siguientes.
 */
export function padFixed(texto: string, ancho: number): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  return limpio.length > ancho ? limpio.slice(0, ancho) : limpio.padEnd(ancho, " ");
}

/**
 * Traduce la forma jurídica a su código de 2 dígitos. Primero intenta el
 * `tipo_sociedad` de la DB (fuente declarada), y si no está, lo infiere del
 * prefijo del CUIT.
 */
export function resolverTipoSocietaria(
  tipoSociedad: string | null | undefined,
  cuit: string,
): string {
  const clave = tipoSociedad?.trim().toLowerCase().replace(/\./g, "");
  if (clave && TIPO_SOCIEDAD[clave]) return TIPO_SOCIEDAD[clave];

  const prefijo = cuit.replace(/\D/g, "").slice(0, 2);
  return SOCIEDAD_POR_PREFIJO_CUIT[prefijo] ?? TIPO_SOCIEDAD_POR_DEFECTO;
}

/**
 * Construye la fila del padrón a partir de un cliente de la DB. Devuelve `null`
 * si el CUIT no es válido: una fila con CUIT mal formado rompería la
 * validación del regulador, así que se excluye y se reporta aparte en
 * `padronInvalidos`.
 */
export function construirFilaPadron(cliente: {
  cuit: string | null | undefined;
  nombre: string | null | undefined;
  nombre_legal?: string | null;
  cp?: string | null;
  tipo_sociedad?: string | null;
}): FilaPadron | null {
  const cuit = (cliente.cuit ?? "").replace(/\D/g, "");
  if (cuit.length !== 11) return null;

  const razonSocial = cliente.nombre_legal?.trim() || cliente.nombre?.trim() || "";
  const cp = (cliente.cp ?? "").trim();

  return {
    tipoDocumento: TIPO_DOCUMENTO_CUIT,
    cuit,
    sufijo: SUFIJO_FIJO,
    vacio: "",
    razonSocial: padFixed(razonSocial, ANCHO_RAZON_SOCIAL),
    flag: FLAG_FIJO,
    codigoPostal: padFixed(cp, ANCHO_CP),
    tipoPersonaSocietaria: resolverTipoSocietaria(cliente.tipo_sociedad, cuit),
  };
}

export type ResultadoPadron = {
  filas: FilaPadron[];
  /** Filas excluidas por datos inválidos, para poder avisar en la UI. */
  invalidos: { cuit: string | null; nombre: string | null; motivo: string }[];
  /** Registros descartados por no ser Persona Jurídica. */
  descartadosNoJuridicos: number;
  /** Registros sin código postal cargado (la celda G queda en blanco). */
  sinCodigoPostal: number;
};

/**
 * Consulta los clientes Persona Jurídica y arma las filas del padrón.
 *
 * Excluye `eliminado` de forma explícita (además del filtro de estado) para no
 * informar al regulador clientes dados de baja.
 */
export async function generarPadron(): Promise<ResultadoPadron> {
  const sb = requireSupabase();

  const { data, error } = await sb
    .from("clientes")
    .select("cuit, nombre, nombre_legal, cp, tipo_sociedad, tipo_persona, estado")
    .eq("tipo_persona", "juridica")
    .neq("estado", "eliminado")
    .order("nombre", { ascending: true })
    .limit(50000);

  if (error) throw new DataAccessError(error);

  const filas: FilaPadron[] = [];
  const invalidos: ResultadoPadron["invalidos"] = [];
  let descartadosNoJuridicos = 0;
  let sinCodigoPostal = 0;

  for (const c of (data ?? []) as Record<string, string | null>[]) {
    if (c.tipo_persona !== "juridica") {
      descartadosNoJuridicos++;
      continue;
    }

    const fila = construirFilaPadron({
      cuit: c.cuit,
      nombre: c.nombre,
      nombre_legal: c.nombre_legal,
      cp: c.cp,
      tipo_sociedad: c.tipo_sociedad,
    });

    if (!fila) {
      invalidos.push({
        cuit: c.cuit,
        nombre: c.nombre,
        motivo: "CUIT inválido: no tiene 11 dígitos.",
      });
      continue;
    }

    if (!(c.cp ?? "").trim()) sinCodigoPostal++;
    filas.push(fila);
  }

  return { filas, invalidos, descartadosNoJuridicos, sinCodigoPostal };
}

/**
 * Nombre del archivo según el período informado, siguiendo el patrón
 * `YYYYMM` + `P` que usan los apartados A y B del mismo régimen.
 */
export function nombreArchivoPadron(periodo: string): string {
  const limpio = periodo.replace(/\D/g, "");
  return `${limpio || "padron"}P.xlsx`;
}