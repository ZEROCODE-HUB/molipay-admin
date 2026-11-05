import { AppError,userMessage } from "@/shared/lib/errors";
import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";
import type { StatusRegistry } from "@/infrastructure/supabase/legacy/types";
import {
readRegistry,
normalizeCuit,
type ErrorRegistry,
type RowRegistry,
type SummaryLectura,
} from "@/features/taxes/importers/iibb-registry";

/**
 * Padrones de Ingresos Brutos: carga real (lectura en el navegador + RPC por
 * bloques), resumen del borrador y confirmacion.
 * Tablas: taxpayer_registries / taxpayer_registry_entries / taxpayer_registry_errors
 * (migracion 20261103100000). La base usa ingles; el dominio del front, español.
 */

export type OrganismoRegistry = "SIRCUPA" | "SIRTAC" | "SIRCERE" | "ARBA" | "AGIP" | "Otro";

export type KpisRegistry = {
  periodo: string;
  padron_anterior_id: string | null;
  padron_anterior_nombre: string | null;
  con_alicuota: number;
  exentos: number;
  alicuotas: { alicuota: number; cuits: number }[];
  /** Solo en padrones SIRCUPA. */
  letras?: { letra: string; alicuota: number; cuits: number }[];
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

export type RegistryIibb = {
  id: string;
  impuestoId: string | null;
  nombre: string;
  archivo: string;
  estado: StatusRegistry;
  progreso: number;
  organismo: OrganismoRegistry | null;
  periodo: string | null;
  fechaEmision: string | null;
  vigenciaDesde: string | null;
  vigenciaHasta: string | null;
  filasLeidas: number;
  filasValidas: number;
  filasError: number;
  filasDuplicadas: number;
  kpis: KpisRegistry | null;
  errorMensaje: string | null;
  confirmadoAt: string | null;
  reemplazadoPor: string | null;
  createdAt: string;
};

export type RowRegistryIibb = {
  cuit: string;
  sujeto: boolean | null;
  exento: boolean | null;
  alicuotaRetencion: number;
  jurisdiccion: string | null;
  crc: string | null;
  letra: string | null;
  razonSocial: string;
  linea: number | null;
};

export type ErrorRegistryIibb = { linea: number | null; contenido: string | null; motivo: string };

const COLUMNS =
  "id, tax_id, name, file_name, status, progress, authority, period, issued_on, valid_from, valid_to, " +
  "rows_read, rows_valid, rows_failed, rows_duplicated, summary, error_message, confirmed_at, replaced_by, created_at";

type RegistryStatus = "loading" | "draft" | "current" | "replaced" | "error" | "legacy";

const STATUS_FROM_DB: Record<RegistryStatus, StatusRegistry> = {
  loading: "Cargando",
  draft: "Borrador",
  current: "Vigente",
  replaced: "Reemplazado",
  error: "Error",
  legacy: "Finalizado",
};

type RegistryRow = {
  id: string;
  tax_id: string | null;
  name: string;
  file_name: string | null;
  status: RegistryStatus;
  progress: number;
  authority: OrganismoRegistry | null;
  period: string | null;
  issued_on: string | null;
  valid_from: string | null;
  valid_to: string | null;
  rows_read: number | null;
  rows_valid: number | null;
  rows_failed: number | null;
  rows_duplicated: number | null;
  summary: KpisRegistry | null;
  error_message: string | null;
  confirmed_at: string | null;
  replaced_by: string | null;
  created_at: string;
};

function toRegistry(r: RegistryRow): RegistryIibb {
  return {
    id: r.id,
    impuestoId: r.tax_id,
    nombre: r.name,
    archivo: r.file_name ?? "",
    estado: STATUS_FROM_DB[r.status] ?? "Error",
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
  "cuit, is_subject, is_exempt, withholding_rate, jurisdiction, crc, rate_letter, business_name, line_no";

type EntryRow = {
  cuit: string;
  is_subject: boolean | null;
  is_exempt: boolean | null;
  withholding_rate: number | string;
  jurisdiction: string | null;
  crc: string | null;
  rate_letter: string | null;
  business_name: string | null;
  line_no: number | null;
};

function toRow(r: EntryRow): RowRegistryIibb {
  return {
    cuit: r.cuit,
    sujeto: r.is_subject,
    exento: r.is_exempt,
    alicuotaRetencion: Number(r.withholding_rate),
    jurisdiccion: r.jurisdiction,
    crc: r.crc,
    letra: r.rate_letter,
    razonSocial: r.business_name ?? "",
    linea: r.line_no,
  };
}

/** Fila leida del archivo -> columnas de taxpayer_registry_entries. La base toma el porcentaje de tax_rates segun la letra. */
const rowADb = (f: RowRegistry) => ({
  cuit: f.cuit,
  business_name: f.razon_social,
  jurisdiction: f.jurisdiccion,
  crc: f.crc,
  rate_letter: f.letra,
  line_no: f.linea,
});

const errorADb = (e: ErrorRegistry) => ({
  line_no: e.linea,
  raw_line: e.contenido,
  reason: e.motivo,
});

export const QK_REGISTRIES = ["taxpayer_registries"] as const;

export async function listRegistriesIibb(): Promise<RegistryIibb[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("taxpayer_registries")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw toAppError(error);
  return ((data ?? []) as unknown as RegistryRow[]).map(toRegistry);
}

export async function getRegistryIibb(id: string): Promise<RegistryIibb> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("taxpayer_registries")
    .select(COLUMNS)
    .eq("id", id)
    .single();
  if (error) throw toAppError(error);
  return toRegistry(data as unknown as RegistryRow);
}

/** Contribuyentes del padron por CUIT (prefijo) o razon social, de a paginas. */
export async function pageRegistryEntries(
  registryId: string,
  text: string,
  page: number,
  pageSize: number,
): Promise<{ rows: RowRegistryIibb[]; total: number }> {
  const sb = requireSupabase();
  let q = sb
    .from("taxpayer_registry_entries")
    .select(ENTRY_COLUMNS, { count: "exact" })
    .eq("registry_id", registryId);
  const t = text.trim();
  const digits = t.replace(/\D/g, "");
  if (digits.length >= 2 && digits.length === t.replace(/[\s.\-/]/g, "").length)
    q = q.like("cuit", `${digits}%`);
  else if (t) q = q.ilike("business_name", `%${t.replace(/[%_]/g, "\\$&")}%`);
  const from = page * pageSize;
  const { data, error, count } = await q.order("cuit").range(from, from + pageSize - 1);
  if (error) throw toAppError(error);
  const rows = ((data ?? []) as EntryRow[]).map(toRow);
  return { rows, total: count ?? rows.length };
}

export async function searchEnRegistry(registryId: string, text: string, limit = 50) {
  return (await pageRegistryEntries(registryId, text, 0, limit)).rows;
}

export async function listErrorsRegistry(
  registryId: string,
  limit = 5000,
): Promise<ErrorRegistryIibb[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("taxpayer_registry_errors")
    .select("line_no, raw_line, reason")
    .eq("registry_id", registryId)
    .order("line_no")
    .limit(limit);
  if (error) throw toAppError(error);
  return (data ?? []).map((e) => ({ linea: e.line_no, contenido: e.raw_line, motivo: e.reason }));
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw toAppError(error);
  return data as T;
}

export const confirmRegistry = async (id: string) => {
  const r = await rpc<{ registry_id: string; period: string; replaced: string | null }>(
    "taxpayer_registry_confirm",
    { p_registry_id: id },
  );
  return { padronId: r.registry_id, periodo: r.period, reemplazado: r.replaced };
};

export const descartarRegistry = (id: string) =>
  rpc<void>("taxpayer_registry_discard", { p_registry_id: id });

export type ProgressCarga = {
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
export async function loadRegistryIibb(
  input: {
    nombre: string;
    file: File;
    /** Archivo de prueba: acepta CUIT sin digito verificador valido. */
    prueba?: boolean;
  },
  onProgress: (p: ProgressCarga) => void,
  signal?: AbortSignal,
): Promise<{ padron: RegistryIibb; lectura: SummaryLectura }> {
  const id = await rpc<string>("taxpayer_registry_create", {
    p_name: input.nombre,
    p_file_name: input.file.name,
  });
  let validas = 0;
  let errors = 0;
  try {
    const lectura = await readRegistry(
      input.file,
      async (b) => {
        await rpc("taxpayer_registry_insert_batch", {
          p_registry_id: id,
          p_rows: b.filas.map(rowADb),
          p_errors: b.errores.map(errorADb),
          p_progress: b.progreso,
          p_extra_errors: b.erroresSinDetalle,
        });
        validas += b.filas.length;
        errors += b.errores.length + b.erroresSinDetalle;
        onProgress({ etapa: "leyendo", progreso: b.progreso, validas, errores: errors });
      },
      { signal, verificarDigito: !input.prueba },
    );
    if (!lectura.vigencia)
      throw new AppError(
        "validation",
        "El archivo no tiene ninguna fila válida: revisá el formato (SIRCUPA separado por ';').",
      );
    onProgress({ etapa: "resumen", progreso: 100, validas, errores: errors });
    await rpc("taxpayer_registry_finish_load", {
      p_registry_id: id,
      p_meta: {
        rows_read: lectura.filasLeidas,
        file_duplicates: lectura.duplicadasEnBloque,
        valid_from: lectura.vigencia.vigencia_desde,
        valid_to: lectura.vigencia.vigencia_hasta,
      },
    });
    return { padron: await getRegistryIibb(id), lectura };
  } catch (e) {
    const msg =
      e instanceof DOMException && e.name === "AbortError" ? "Carga cancelada" : userMessage(e);
    await rpc("taxpayer_registry_mark_error", { p_registry_id: id, p_message: msg }).catch(
      () => undefined,
    );
    throw e;
  }
}

/** AAAA-MM -> AAAAMM (formato del padron SIRCUPA). */
const aaaamm = (period: string | null) => (period ?? "").replace("-", "");

/**
 * Padron normalizado en formato SIRCUPA (";"), leido de la base por paginas de
 * 1000 filas (limite de PostgREST). Un CUIT por linea, ya deduplicado.
 */
export async function exportRegistryTxt(
  p: RegistryIibb,
  onProgress?: (leidas: number) => void,
): Promise<string> {
  const sb = requireSupabase();
  const lines: string[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await sb
      .from("taxpayer_registry_entries")
      .select(ENTRY_COLUMNS)
      .eq("registry_id", p.id)
      .order("cuit")
      .range(from, from + page - 1);
    if (error) throw toAppError(error);
    for (const r of (data ?? []) as EntryRow[]) {
      lines.push(
        [
          r.cuit,
          r.business_name ?? "",
          r.jurisdiction ?? "",
          aaaamm(p.periodo),
          r.crc ?? "",
          r.rate_letter ?? "",
        ].join(";"),
      );
    }
    onProgress?.(lines.length);
    if (!data || data.length < page) break;
  }
  return lines.join("\r\n") + "\r\n";
}

// ---------------------------------------------------------------------------
// Padron de prueba (solo para probar la carga)
// ---------------------------------------------------------------------------

export type RegistryDemo = {
  /** Contenido en formato SIRCUPA (";"), CRLF. */
  txt: string;
  periodo: string;
  /** Clientes con CUIT valido incluidos en el archivo. */
  incluidos: number;
  /** Clientes sin CUIT de 11 digitos: no entran. */
  omitidos: number;
  /** Incluidos cuyo CUIT no tiene digito verificador valido (subir como archivo de prueba). */
  sinVerificador: number;
};

const LETTERS_DEMO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
/** Convenio Multilateral o un regimen local, de 901 a 924. */
const JURISDICTIONS_DEMO = ["0", ...Array.from({ length: 24 }, (_, i) => String(901 + i))];

/** Numero estable a partir del CUIT (misma letra en cada descarga del mes). */
const semilla = (cuit: string, period: string) => {
  let h = 0;
  for (const ch of cuit + period) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
};

/**
 * Arma un padron SIRCUPA de prueba con los clientes cargados (su CUIT y razon
 * social), vigente en el mes en curso, con jurisdiccion, CRC y letra de alicuota
 * inventados pero estables. Se puede subir tal cual con "Cargar padrón".
 */
export async function generateRegistryDemo(): Promise<RegistryDemo> {
  const sb = requireSupabase();
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
  const period = today.slice(0, 7);

  const vistos = new Set<string>();
  const lines: string[] = [];
  let omitidos = 0;
  let withoutVerificador = 0;
  const page = 1000;
  for (let inicio = 0; ; inicio += page) {
    const { data, error } = await sb
      .from("clientes")
      .select("legajo, nombre, cuit, cuit_cuil")
      .order("legajo")
      .range(inicio, inicio + page - 1);
    if (error) throw toAppError(error);
    for (const c of data ?? []) {
      // Demo: entran todos los CUIT de 11 digitos, aunque el verificador no cierre.
      const cuit = normalizeCuit(String(c.cuit || c.cuit_cuil || ""), false);
      if (!cuit) {
        omitidos++;
        continue;
      }
      if (vistos.has(cuit)) continue;
      vistos.add(cuit);
      if (!normalizeCuit(cuit)) withoutVerificador++;
      const s = semilla(cuit, period);
      const razon = String(c.nombre ?? c.legajo)
        .replace(/[;\r\n]/g, " ")
        .trim()
        .toUpperCase()
        .slice(0, 45);
      lines.push(
        [
          cuit,
          razon,
          JURISDICTIONS_DEMO[s % JURISDICTIONS_DEMO.length],
          aaaamm(period),
          String(s % 100).padStart(2, "0"),
          LETTERS_DEMO[s % LETTERS_DEMO.length],
        ].join(";"),
      );
    }
    if (!data || data.length < page) break;
  }
  return {
    txt: lines.join("\r\n") + (lines.length ? "\r\n" : ""),
    periodo: period,
    incluidos: lines.length,
    omitidos,
    sinVerificador: withoutVerificador,
  };
}
