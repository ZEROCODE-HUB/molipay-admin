import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import type { EstadoPadron } from "./types";
import {
  leerPadron,
  normalizarCuit,
  type ErrorPadron,
  type FilaPadron,
  type ResumenLectura,
} from "./importers/padron-iibb";

/**
 * Padrones de Ingresos Brutos: carga real (lectura en el navegador + RPC por
 * bloques), resumen del borrador y confirmacion.
 * Tablas: taxpayer_registries / taxpayer_registry_entries / taxpayer_registry_errors
 * (migracion 20261103100000). La base usa ingles; el dominio del front, español.
 */

export type OrganismoPadron = "SIRTAC" | "SIRCERE" | "ARBA" | "AGIP" | "Otro";
export const ORGANISMOS: OrganismoPadron[] = ["SIRTAC", "SIRCERE", "ARBA", "AGIP", "Otro"];

export type KpisPadron = {
  periodo: string;
  padron_anterior_id: string | null;
  padron_anterior_nombre: string | null;
  con_alicuota: number;
  exentos: number;
  alicuotas: { alicuota: number; cuits: number }[];
  clientes_con_cuit: number;
  clientes_sin_cuit_valido: number;
  clientes_en_padron: number;
  clientes_con_retencion: number;
  clientes_fuera_padron: number;
  clientes_con_cambio: number;
  cambios: {
    legajo: string;
    nombre: string;
    cuit: string;
    anterior: number | null;
    nueva: number | null;
  }[];
};

export type PadronIibb = {
  id: string;
  impuestoId: string | null;
  nombre: string;
  archivo: string;
  estado: EstadoPadron;
  progreso: number;
  organismo: OrganismoPadron | null;
  periodo: string | null;
  fechaEmision: string | null;
  vigenciaDesde: string | null;
  vigenciaHasta: string | null;
  filasLeidas: number;
  filasValidas: number;
  filasError: number;
  filasDuplicadas: number;
  kpis: KpisPadron | null;
  errorMensaje: string | null;
  confirmadoAt: string | null;
  reemplazadoPor: string | null;
  createdAt: string;
};

export type FilaPadronIibb = {
  cuit: string;
  tipoRegimen: string | null;
  sujeto: boolean | null;
  exento: boolean | null;
  alicuotaPercepcion: number;
  alicuotaRetencion: number;
  codControl1: string | null;
  codControl2: string | null;
  razonSocial: string;
  linea: number | null;
};

export type ErrorPadronIibb = { linea: number | null; contenido: string | null; motivo: string };

const COLUMNAS =
  "id, tax_id, name, file_name, status, progress, authority, period, issued_on, valid_from, valid_to, " +
  "rows_read, rows_valid, rows_failed, rows_duplicated, summary, error_message, confirmed_at, replaced_by, created_at";

type RegistryStatus = "loading" | "draft" | "current" | "replaced" | "error" | "legacy";

const ESTADO_DESDE_DB: Record<RegistryStatus, EstadoPadron> = {
  loading: "Cargando",
  draft: "Borrador",
  current: "Vigente",
  replaced: "Reemplazado",
  error: "Error",
  legacy: "Finalizado",
};

type PadronRow = {
  id: string;
  tax_id: string | null;
  name: string;
  file_name: string | null;
  status: RegistryStatus;
  progress: number;
  authority: OrganismoPadron | null;
  period: string | null;
  issued_on: string | null;
  valid_from: string | null;
  valid_to: string | null;
  rows_read: number | null;
  rows_valid: number | null;
  rows_failed: number | null;
  rows_duplicated: number | null;
  summary: KpisPadron | null;
  error_message: string | null;
  confirmed_at: string | null;
  replaced_by: string | null;
  created_at: string;
};

function toPadron(r: PadronRow): PadronIibb {
  return {
    id: r.id,
    impuestoId: r.tax_id,
    nombre: r.name,
    archivo: r.file_name ?? "",
    estado: ESTADO_DESDE_DB[r.status] ?? "Error",
    progreso: r.progress ?? 0,
    organismo: r.authority,
    periodo: r.period,
    fechaEmision: r.issued_on,
    vigenciaDesde: r.valid_from,
    vigenciaHasta: r.valid_to,
    filasLeidas: r.rows_read ?? 0,
    filasValidas: r.rows_valid ?? 0,
    filasError: r.rows_failed ?? 0,
    filasDuplicadas: r.rows_duplicated ?? 0,
    kpis: r.summary,
    errorMensaje: r.error_message,
    confirmadoAt: r.confirmed_at,
    reemplazadoPor: r.replaced_by,
    createdAt: r.created_at,
  };
}

const ENTRY_COLUMNS =
  "cuit, regime_type, is_subject, is_exempt, perception_rate, withholding_rate, control_code_1, control_code_2, business_name, line_no";

type EntryRow = {
  cuit: string;
  regime_type: string | null;
  is_subject: boolean | null;
  is_exempt: boolean | null;
  perception_rate: number | string;
  withholding_rate: number | string;
  control_code_1: string | null;
  control_code_2: string | null;
  business_name: string | null;
  line_no: number | null;
};

function toFila(r: EntryRow): FilaPadronIibb {
  return {
    cuit: r.cuit,
    tipoRegimen: r.regime_type,
    sujeto: r.is_subject,
    exento: r.is_exempt,
    alicuotaPercepcion: Number(r.perception_rate),
    alicuotaRetencion: Number(r.withholding_rate),
    codControl1: r.control_code_1,
    codControl2: r.control_code_2,
    razonSocial: r.business_name ?? "",
    linea: r.line_no,
  };
}

/** Fila leida del archivo -> columnas de taxpayer_registry_entries. */
const filaADb = (f: FilaPadron) => ({
  cuit: f.cuit,
  regime_type: f.tipo_regimen,
  is_subject: f.sujeto,
  is_exempt: f.exento,
  perception_rate: f.alicuota_percepcion,
  withholding_rate: f.alicuota_retencion,
  control_code_1: f.cod_control_1,
  control_code_2: f.cod_control_2,
  business_name: f.razon_social,
  line_no: f.linea,
});

const errorADb = (e: ErrorPadron) => ({
  line_no: e.linea,
  raw_line: e.contenido,
  reason: e.motivo,
});

export const QK_PADRONES = ["taxpayer_registries"] as const;

export async function listPadronesIibb(): Promise<PadronIibb[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("taxpayer_registries")
    .select(COLUMNAS)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as unknown as PadronRow[]).map(toPadron);
}

export async function getPadronIibb(id: string): Promise<PadronIibb> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("taxpayer_registries")
    .select(COLUMNAS)
    .eq("id", id)
    .single();
  if (error) throw new DataAccessError(error);
  return toPadron(data as unknown as PadronRow);
}

/** Busca contribuyentes del padron por CUIT (prefijo) o razon social. */
export async function buscarEnPadron(
  padronId: string,
  texto: string,
  limite = 50,
): Promise<FilaPadronIibb[]> {
  const sb = requireSupabase();
  let q = sb.from("taxpayer_registry_entries").select(ENTRY_COLUMNS).eq("registry_id", padronId);
  const t = texto.trim();
  const digitos = t.replace(/\D/g, "");
  if (digitos.length >= 2 && digitos.length === t.replace(/[\s.\-/]/g, "").length)
    q = q.like("cuit", `${digitos}%`);
  else if (t) q = q.ilike("business_name", `%${t.replace(/[%_]/g, "\\$&")}%`);
  const { data, error } = await q.order("cuit").limit(limite);
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as EntryRow[]).map(toFila);
}

export async function listErroresPadron(
  padronId: string,
  limite = 5000,
): Promise<ErrorPadronIibb[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("taxpayer_registry_errors")
    .select("line_no, raw_line, reason")
    .eq("registry_id", padronId)
    .order("line_no")
    .limit(limite);
  if (error) throw new DataAccessError(error);
  return (data ?? []).map((e) => ({ linea: e.line_no, contenido: e.raw_line, motivo: e.reason }));
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new DataAccessError(error);
  return data as T;
}

export const confirmarPadron = async (id: string) => {
  const r = await rpc<{ registry_id: string; period: string; replaced: string | null }>(
    "taxpayer_registry_confirm",
    { p_registry_id: id },
  );
  return { padronId: r.registry_id, periodo: r.period, reemplazado: r.replaced };
};

export const descartarPadron = (id: string) =>
  rpc<void>("taxpayer_registry_discard", { p_registry_id: id });

export type ProgresoCarga = {
  etapa: "leyendo" | "resumen";
  progreso: number;
  validas: number;
  errores: number;
};

/**
 * Carga completa: crea la cabecera, lee el archivo en streaming, manda los
 * bloques y calcula el resumen del borrador. Si algo falla, la cabecera queda
 * en Error con el motivo (se puede descartar desde la lista).
 */
export async function cargarPadronIibb(
  input: {
    impuestoId: string;
    nombre: string;
    organismo: OrganismoPadron;
    file: File;
    /** Archivo de prueba: acepta CUIT sin digito verificador valido. */
    prueba?: boolean;
  },
  onProgreso: (p: ProgresoCarga) => void,
  signal?: AbortSignal,
): Promise<{ padron: PadronIibb; lectura: ResumenLectura }> {
  const id = await rpc<string>("taxpayer_registry_create", {
    p_tax_id: input.impuestoId || null,
    p_name: input.nombre,
    p_file_name: input.file.name,
    p_authority: input.organismo,
  });
  let validas = 0;
  let errores = 0;
  try {
    const lectura = await leerPadron(
      input.file,
      async (b) => {
        await rpc("taxpayer_registry_insert_batch", {
          p_registry_id: id,
          p_rows: b.filas.map(filaADb),
          p_errors: b.errores.map(errorADb),
          p_progress: b.progreso,
          p_extra_errors: b.erroresSinDetalle,
        });
        validas += b.filas.length;
        errores += b.errores.length + b.erroresSinDetalle;
        onProgreso({ etapa: "leyendo", progreso: b.progreso, validas, errores });
      },
      { signal, verificarDigito: !input.prueba },
    );
    if (!lectura.vigencia)
      throw new Error(
        "El archivo no tiene ninguna fila válida: revisá el formato (SIRTAC separado por ';').",
      );
    onProgreso({ etapa: "resumen", progreso: 100, validas, errores });
    await rpc("taxpayer_registry_finish_load", {
      p_registry_id: id,
      p_meta: {
        rows_read: lectura.filasLeidas,
        file_duplicates: lectura.duplicadasEnBloque,
        issued_on: lectura.vigencia.fecha_emision,
        valid_from: lectura.vigencia.vigencia_desde,
        valid_to: lectura.vigencia.vigencia_hasta,
      },
    });
    return { padron: await getPadronIibb(id), lectura };
  } catch (e) {
    const msg =
      e instanceof DOMException && e.name === "AbortError"
        ? "Carga cancelada"
        : (e as Error).message;
    await rpc("taxpayer_registry_mark_error", { p_registry_id: id, p_message: msg }).catch(
      () => undefined,
    );
    throw e;
  }
}

/** AAAA-MM-DD -> DDMMAAAA (formato de los padrones). */
const ddmmaaaa = (iso: string | null) =>
  iso ? iso.slice(0, 10).split("-").reverse().join("") : "";
const coma = (v: number | string | null) =>
  Number(v ?? 0)
    .toFixed(2)
    .replace(".", ",");

/**
 * Padron normalizado en formato SIRTAC (";"), leido de la base por paginas de
 * 1000 filas (limite de PostgREST). Un CUIT por linea, ya deduplicado.
 */
export async function exportarPadronTxt(
  p: PadronIibb,
  onProgreso?: (leidas: number) => void,
): Promise<string> {
  const sb = requireSupabase();
  const lineas: string[] = [];
  const pagina = 1000;
  for (let desde = 0; ; desde += pagina) {
    const { data, error } = await sb
      .from("taxpayer_registry_entries")
      .select(ENTRY_COLUMNS)
      .eq("registry_id", p.id)
      .order("cuit")
      .range(desde, desde + pagina - 1);
    if (error) throw new DataAccessError(error);
    for (const r of (data ?? []) as EntryRow[]) {
      lineas.push(
        [
          ddmmaaaa(p.fechaEmision),
          ddmmaaaa(p.vigenciaDesde),
          ddmmaaaa(p.vigenciaHasta),
          r.cuit,
          r.regime_type ?? "",
          r.is_subject ? "S" : "N",
          r.is_exempt ? "S" : "N",
          coma(r.perception_rate),
          coma(r.withholding_rate),
          r.control_code_1 ?? "",
          r.control_code_2 ?? "",
          r.business_name ?? "",
        ].join(";"),
      );
    }
    onProgreso?.(lineas.length);
    if (!data || data.length < pagina) break;
  }
  return lineas.join("\r\n") + "\r\n";
}

// ---------------------------------------------------------------------------
// Padron de prueba (solo para probar la carga)
// ---------------------------------------------------------------------------

export type PadronDemo = {
  /** Contenido en formato SIRTAC (";"), CRLF. */
  txt: string;
  periodo: string;
  /** Clientes con CUIT valido incluidos en el archivo. */
  incluidos: number;
  /** Clientes sin CUIT de 11 digitos: no entran. */
  omitidos: number;
  /** Incluidos cuyo CUIT no tiene digito verificador valido (subir como archivo de prueba). */
  sinVerificador: number;
};

/** Alicuotas de retencion de prueba (deterministas por CUIT). */
const ALICUOTAS_DEMO = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5];

/** Numero estable a partir del CUIT (misma alicuota en cada descarga del mes). */
const semilla = (cuit: string, periodo: string) => {
  let h = 0;
  for (const ch of cuit + periodo) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
};

/**
 * Arma un padron SIRTAC de prueba con los clientes cargados (su CUIT y razon
 * social), vigente en el mes en curso: ~10% exentos, ~5% no sujetos y el resto
 * con una alicuota de retencion entre 0,5% y 5%. Se puede subir tal cual con
 * "Cargar padrón".
 */
export async function generarPadronDemo(): Promise<PadronDemo> {
  const sb = requireSupabase();
  const hoy = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
  const periodo = hoy.slice(0, 7);
  const [y, m] = periodo.split("-").map(Number);
  const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const emision = ddmmaaaa(hoy);
  const desde = ddmmaaaa(`${periodo}-01`);
  const hasta = ddmmaaaa(`${periodo}-${String(ultimo).padStart(2, "0")}`);

  const vistos = new Set<string>();
  const lineas: string[] = [];
  let omitidos = 0;
  let sinVerificador = 0;
  const pagina = 1000;
  for (let inicio = 0; ; inicio += pagina) {
    const { data, error } = await sb
      .from("clientes")
      .select("legajo, nombre, cuit, cuit_cuil")
      .order("legajo")
      .range(inicio, inicio + pagina - 1);
    if (error) throw new DataAccessError(error);
    for (const c of data ?? []) {
      // Demo: entran todos los CUIT de 11 digitos, aunque el verificador no cierre.
      const cuit = normalizarCuit(String(c.cuit || c.cuit_cuil || ""), false);
      if (!cuit) {
        omitidos++;
        continue;
      }
      if (vistos.has(cuit)) continue;
      vistos.add(cuit);
      if (!normalizarCuit(cuit)) sinVerificador++;
      const s = semilla(cuit, periodo);
      const exento = s % 10 === 0;
      const sujeto = s % 20 !== 5;
      const retencion = exento || !sujeto ? 0 : ALICUOTAS_DEMO[s % ALICUOTAS_DEMO.length];
      const razon = String(c.nombre ?? c.legajo)
        .replace(/[;\r\n]/g, " ")
        .trim()
        .toUpperCase();
      lineas.push(
        [
          emision,
          desde,
          hasta,
          cuit,
          cuit.startsWith("3") ? "C" : "D",
          sujeto ? "S" : "N",
          exento ? "S" : "N",
          coma(retencion),
          coma(retencion),
          "000",
          "000",
          razon,
        ].join(";"),
      );
    }
    if (!data || data.length < pagina) break;
  }
  return {
    txt: lineas.join("\r\n") + (lineas.length ? "\r\n" : ""),
    periodo,
    incluidos: lineas.length,
    omitidos,
    sinVerificador,
  };
}
