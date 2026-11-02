import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import type { Page } from "./types";

/**
 * Exenciones impositivas (tabla tax_exemptions, migracion 20261103120000).
 *
 * Una fila por CUIT, impuesto y direccion: mientras este vigente, ese impuesto
 * se calcula en 0%. Filtros, paginacion y conteos corren en la base. El
 * vencimiento lo aplica el calculo; "Verificar vencidas" solo las pasa a
 * inactivas (tax_exemptions_expire).
 */

export type DireccionExencion = "Entrantes" | "Salientes";
export type TipoExencion = "Certificado de exención" | "Alta manual" | "Convenio multilateral";
/** Estado guardado. */
export type EstadoExencion = "Activa" | "Inactiva";
/** Estado efectivo (lo que ve el calculo hoy). */
export type SituacionExencion = "Vigente" | "Programada" | "Vencida" | "Inactiva";

export const TIPOS_EXENCION: TipoExencion[] = [
  "Certificado de exención",
  "Alta manual",
  "Convenio multilateral",
];
export const SITUACIONES_EXENCION: SituacionExencion[] = [
  "Vigente",
  "Programada",
  "Vencida",
  "Inactiva",
];

export type Exencion = {
  id: string;
  cuit: string;
  clienteLegajo: string | null;
  clienteNombre: string | null;
  email: string | null;
  impuestoId: string;
  impuestoCodigo: string;
  impuestoNombre: string;
  /** El impuesto toma la alicuota del padron (IIBB): solo admite Entrantes. */
  impuestoEsPadron: boolean;
  direccion: DireccionExencion;
  tipo: TipoExencion;
  motivo: string | null;
  desde: string;
  hasta: string | null;
  estado: EstadoExencion;
  codigoAutorizacion: string | null;
  certificado: string | null;
  createdAt: string;
  updatedAt: string;
  bajaAt: string | null;
  bajaMotivo: string | null;
};

const DIRECCION_DB: Record<DireccionExencion, "inbound" | "outbound"> = {
  Entrantes: "inbound",
  Salientes: "outbound",
};
const TIPO_DB: Record<TipoExencion, string> = {
  "Certificado de exención": "certificate",
  "Alta manual": "manual",
  "Convenio multilateral": "multilateral_agreement",
};
const TIPO_DESDE_DB: Record<string, TipoExencion> = {
  certificate: "Certificado de exención",
  manual: "Alta manual",
  multilateral_agreement: "Convenio multilateral",
};
const BAJA_MOTIVO: Record<string, string> = {
  manual: "Desactivada manualmente",
  expired: "Vencida (Verificar vencidas)",
  duplicate: "Duplicada",
  invalid_direction: "Dirección no válida para el impuesto",
};

type ExemptionRow = {
  id: string;
  cuit: string;
  client_legajo: string | null;
  contact_email: string | null;
  tax_id: string;
  direction: "inbound" | "outbound";
  exemption_type: string;
  reason: string | null;
  valid_from: string;
  valid_to: string | null;
  status: "active" | "inactive";
  authorization_code: string | null;
  certificate_path: string | null;
  created_at: string;
  updated_at: string;
  deactivated_at: string | null;
  deactivation_reason: string | null;
  taxes:
    | { code: string; name: string; rate_source: string }
    | { code: string; name: string; rate_source: string }[]
    | null;
  clientes: { nombre: string } | { nombre: string }[] | null;
};

const uno = <T>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

const COLUMNS =
  "id, cuit, client_legajo, contact_email, tax_id, direction, exemption_type, reason, valid_from, valid_to, status, " +
  "authorization_code, certificate_path, created_at, updated_at, deactivated_at, deactivation_reason, " +
  "taxes(code, name, rate_source), clientes!tax_exemptions_client_legajo_fkey(nombre)";

function toExencion(r: ExemptionRow): Exencion {
  const t = uno(r.taxes);
  return {
    id: r.id,
    cuit: r.cuit,
    clienteLegajo: r.client_legajo,
    clienteNombre: uno(r.clientes)?.nombre ?? null,
    email: r.contact_email,
    impuestoId: r.tax_id,
    impuestoCodigo: t?.code ?? "—",
    impuestoNombre: t?.name ?? "—",
    impuestoEsPadron: t?.rate_source === "taxpayer_registry",
    direccion: r.direction === "outbound" ? "Salientes" : "Entrantes",
    tipo: TIPO_DESDE_DB[r.exemption_type] ?? "Alta manual",
    motivo: r.reason,
    desde: r.valid_from,
    hasta: r.valid_to,
    estado: r.status === "active" ? "Activa" : "Inactiva",
    codigoAutorizacion: r.authorization_code,
    certificado: r.certificate_path,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    bajaAt: r.deactivated_at,
    bajaMotivo: r.deactivation_reason
      ? (BAJA_MOTIVO[r.deactivation_reason] ?? r.deactivation_reason)
      : null,
  };
}

/** Estado efectivo a una fecha (por defecto, ahora). */
export function situacion(
  e: Pick<Exencion, "estado" | "desde" | "hasta">,
  ahora = new Date(),
): SituacionExencion {
  if (e.estado === "Inactiva") return "Inactiva";
  if (new Date(e.desde) > ahora) return "Programada";
  if (e.hasta && new Date(e.hasta) < ahora) return "Vencida";
  return "Vigente";
}

// ============================================================================
// Lectura
// ============================================================================

export type ExencionFilters = {
  page: number;
  pageSize: number;
  /** CUIT completo o prefijo. */
  cuit?: string;
  impuestoId?: string;
  direccion?: DireccionExencion;
  situacion?: SituacionExencion;
};

export const QK_EXENCIONES = ["tax_exemptions"] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function aplicarFiltros(q: any, f: Omit<ExencionFilters, "page" | "pageSize">) {
  const digitos = (f.cuit ?? "").replace(/\D/g, "");
  if (digitos) q = q.like("cuit", `${digitos}%`);
  if (f.impuestoId) q = q.eq("tax_id", f.impuestoId);
  if (f.direccion) q = q.eq("direction", DIRECCION_DB[f.direccion]);
  const ahora = new Date().toISOString();
  switch (f.situacion) {
    case "Inactiva":
      q = q.eq("status", "inactive");
      break;
    case "Vigente":
      q = q
        .eq("status", "active")
        .lte("valid_from", ahora)
        .or(`valid_to.is.null,valid_to.gte.${ahora}`);
      break;
    case "Programada":
      q = q.eq("status", "active").gt("valid_from", ahora);
      break;
    case "Vencida":
      q = q.eq("status", "active").lt("valid_to", ahora);
      break;
  }
  return q;
}

export async function listExenciones(filters: ExencionFilters): Promise<Page<Exencion>> {
  const sb = requireSupabase();
  const { page, pageSize, ...f } = filters;
  const from = page * pageSize;
  let q = sb.from("tax_exemptions").select(COLUMNS, { count: "exact" });
  q = aplicarFiltros(q, f);
  const { data, error, count } = await q
    .order("created_at", { ascending: false })
    .order("id")
    .range(from, from + pageSize - 1);
  if (error) throw new DataAccessError(error);
  const rows = ((data ?? []) as unknown as ExemptionRow[]).map(toExencion);
  return { rows, total: count ?? rows.length, page, pageSize };
}

/** Todas las filas que cumplen los filtros (para exportar), de a paginas de 1000. */
export async function listExencionesParaExportar(
  filters: Omit<ExencionFilters, "page" | "pageSize">,
  maximo = 50000,
): Promise<Exencion[]> {
  const sb = requireSupabase();
  const out: Exencion[] = [];
  const pagina = 1000;
  for (let desde = 0; desde < maximo; desde += pagina) {
    let q = sb.from("tax_exemptions").select(COLUMNS);
    q = aplicarFiltros(q, filters);
    const { data, error } = await q
      .order("created_at", { ascending: false })
      .order("id")
      .range(desde, desde + pagina - 1);
    if (error) throw new DataAccessError(error);
    out.push(...((data ?? []) as unknown as ExemptionRow[]).map(toExencion));
    if (!data || data.length < pagina) break;
  }
  return out;
}

/** Activas con la vigencia vencida (las que "Verificar vencidas" desactivaria). */
export async function contarVencidasActivas(): Promise<number> {
  const sb = requireSupabase();
  const { count, error } = await sb
    .from("tax_exemptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .lt("valid_to", new Date().toISOString());
  if (error) throw new DataAccessError(error);
  return count ?? 0;
}

/** Cliente con ese CUIT (para validar el alta y mostrar su nombre). */
export async function buscarClientePorCuit(
  cuit: string,
): Promise<{ legajo: string; nombre: string; correo: string | null } | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("clientes")
    .select("legajo, nombre, correo")
    .eq("cuit", cuit.replace(/\D/g, ""))
    .order("legajo")
    .limit(1)
    .maybeSingle();
  if (error) throw new DataAccessError(error);
  return data ?? null;
}

// ============================================================================
// Certificados (bucket privado)
// ============================================================================

export const CERTIFICADOS_BUCKET = "tax-exemption-certificates";
export const CERTIFICADO_MAX_BYTES = 10 * 1024 * 1024;
export const CERTIFICADO_TIPOS = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

async function subirCertificado(cuit: string, file: File): Promise<string> {
  if (file.size > CERTIFICADO_MAX_BYTES) throw new Error("El certificado supera los 10 MB.");
  if (!CERTIFICADO_TIPOS.includes(file.type))
    throw new Error("El certificado debe ser PDF, JPG, PNG o WEBP.");
  const sb = requireSupabase();
  const nombre = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
  const path = `${cuit}/${crypto.randomUUID()}-${nombre}`;
  const { error } = await sb.storage
    .from(CERTIFICADOS_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (error) throw new Error(`No se pudo subir el certificado: ${error.message}`);
  return path;
}

/** URL para ver el certificado: firmada por 5 minutos (o la URL externa de altas viejas). */
export async function urlCertificado(path: string): Promise<string> {
  if (/^https?:\/\//i.test(path)) return path;
  const sb = requireSupabase();
  const { data, error } = await sb.storage.from(CERTIFICADOS_BUCKET).createSignedUrl(path, 300);
  if (error || !data)
    throw new Error(`No se pudo abrir el certificado: ${error?.message ?? "sin URL"}`);
  return data.signedUrl;
}

// ============================================================================
// Escritura
// ============================================================================

export type ExencionInput = {
  cuit: string;
  email?: string | null;
  impuestoId: string;
  /** Ambos = dos filas (Entrantes y Salientes), cada una desactivable por separado. */
  direccion: DireccionExencion | "Ambos";
  tipo: TipoExencion;
  motivo: string;
  /** ISO; vacio = ahora (lo pone la base). */
  desde?: string | null;
  /** ISO; vacio = sin vencimiento. */
  hasta?: string | null;
  codigoAutorizacion?: string | null;
  certificado?: File | null;
};

/** Alta (1 o 2 filas en un solo INSERT: o entran todas o ninguna). */
export async function crearExencion(input: ExencionInput): Promise<number> {
  const sb = requireSupabase();
  const cuit = input.cuit.replace(/\D/g, "");
  const path = input.certificado ? await subirCertificado(cuit, input.certificado) : null;
  const direcciones: DireccionExencion[] =
    input.direccion === "Ambos" ? ["Entrantes", "Salientes"] : [input.direccion];
  const base = {
    cuit,
    contact_email: input.email?.trim() || null,
    tax_id: input.impuestoId,
    exemption_type: TIPO_DB[input.tipo],
    reason: input.motivo.trim(),
    authorization_code: input.codigoAutorizacion?.trim() || null,
    certificate_path: path,
    status: "active",
    ...(input.desde ? { valid_from: input.desde } : {}),
    valid_to: input.hasta || null,
  };
  const { error } = await sb
    .from("tax_exemptions")
    .insert(direcciones.map((d) => ({ ...base, direction: DIRECCION_DB[d] })));
  if (error) {
    // El certificado no quedo asociado a nada: se borra (best effort).
    if (path)
      await sb.storage
        .from(CERTIFICADOS_BUCKET)
        .remove([path])
        .catch(() => undefined);
    throw new DataAccessError(error);
  }
  return direcciones.length;
}

export async function setEstadoExencion(id: string, estado: EstadoExencion): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from("tax_exemptions")
    .update({ status: estado === "Activa" ? "active" : "inactive" })
    .eq("id", id);
  if (error) throw new DataAccessError(error);
}

export type VencidaExencion = {
  id: string;
  cuit: string;
  clienteLegajo: string | null;
  clienteNombre: string | null;
  impuestoCodigo: string;
  direccion: DireccionExencion;
  hasta: string;
};

/** "Verificar vencidas": simular = true solo lista; false las pasa a inactivas. */
export async function verificarVencidas(
  simular: boolean,
): Promise<{ total: number; items: VencidaExencion[] }> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("tax_exemptions_expire", { p_dry_run: simular });
  if (error) throw new DataAccessError(error);
  const r = data as {
    count: number;
    items: {
      id: string;
      cuit: string;
      client_legajo: string | null;
      client_name: string | null;
      tax_code: string;
      direction: "inbound" | "outbound";
      valid_to: string;
    }[];
  };
  return {
    total: r.count,
    items: (r.items ?? []).map((i) => ({
      id: i.id,
      cuit: i.cuit,
      clienteLegajo: i.client_legajo,
      clienteNombre: i.client_name,
      impuestoCodigo: i.tax_code,
      direccion: i.direction === "outbound" ? "Salientes" : "Entrantes",
      hasta: i.valid_to,
    })),
  };
}
