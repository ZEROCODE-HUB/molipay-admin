import { AppError } from "@/shared/lib/errors";
import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";
import type { Page } from "@/infrastructure/supabase/legacy/types";
import { taxExemptionCertificatesStorage } from "@/app/dependencies";

/**
 * Exenciones impositivas (tabla tax_exemptions, migracion 20261103120000).
 *
 * Una fila por CUIT, impuesto y direccion: mientras este vigente, ese impuesto
 * se calcula en 0%. Filtros, paginacion y conteos corren en la base. El
 * vencimiento lo aplica el calculo; "Verificar vencidas" solo las pasa a
 * inactivas (tax_exemptions_expire).
 */

export type AddressExemption = "Entrantes" | "Salientes";
export type KindExemption = "Certificado de exención" | "Alta manual" | "Convenio multilateral";
/** Estado guardado. */
export type StatusExemption = "Activa" | "Inactiva";
/** Estado efectivo (lo que ve el calculo hoy). */
export type SituacionExemption = "Vigente" | "Programada" | "Vencida" | "Inactiva";

export const KINDS_EXEMPTION: KindExemption[] = [
  "Certificado de exención",
  "Alta manual",
  "Convenio multilateral",
];
export const SITUACIONES_EXEMPTION: SituacionExemption[] = [
  "Vigente",
  "Programada",
  "Vencida",
  "Inactiva",
];

export type Exemption = {
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
  direccion: AddressExemption;
  tipo: KindExemption;
  motivo: string | null;
  desde: string;
  hasta: string | null;
  estado: StatusExemption;
  codigoAutorizacion: string | null;
  certificado: string | null;
  createdAt: string;
  updatedAt: string;
  bajaAt: string | null;
  bajaMotivo: string | null;
};

const ADDRESS_DB: Record<AddressExemption, "inbound" | "outbound"> = {
  Entrantes: "inbound",
  Salientes: "outbound",
};
const KIND_DB: Record<KindExemption, string> = {
  "Certificado de exención": "certificate",
  "Alta manual": "manual",
  "Convenio multilateral": "multilateral_agreement",
};
const KIND_FROM_DB: Record<string, KindExemption> = {
  certificate: "Certificado de exención",
  manual: "Alta manual",
  multilateral_agreement: "Convenio multilateral",
};
const BAJA_REASON: Record<string, string> = {
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

function toExemption(r: ExemptionRow): Exemption {
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
    tipo: KIND_FROM_DB[r.exemption_type] ?? "Alta manual",
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
      ? (BAJA_REASON[r.deactivation_reason] ?? r.deactivation_reason)
      : null,
  };
}

/** Estado efectivo a una fecha (por defecto, ahora). */
export function situacion(
  e: Pick<Exemption, "estado" | "desde" | "hasta">,
  ahora = new Date(),
): SituacionExemption {
  if (e.estado === "Inactiva") return "Inactiva";
  if (new Date(e.desde) > ahora) return "Programada";
  if (e.hasta && new Date(e.hasta) < ahora) return "Vencida";
  return "Vigente";
}

// ============================================================================
// Lectura
// ============================================================================

export type ExemptionFilters = {
  page: number;
  pageSize: number;
  /** CUIT completo o prefijo. */
  cuit?: string;
  impuestoId?: string;
  direccion?: AddressExemption;
  situacion?: SituacionExemption;
};

export const QK_EXEMPTIONS = ["tax_exemptions"] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(q: any, f: Omit<ExemptionFilters, "page" | "pageSize">) {
  const digits = (f.cuit ?? "").replace(/\D/g, "");
  if (digits) q = q.like("cuit", `${digits}%`);
  if (f.impuestoId) q = q.eq("tax_id", f.impuestoId);
  if (f.direccion) q = q.eq("direction", ADDRESS_DB[f.direccion]);
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

export async function listExemptions(filters: ExemptionFilters): Promise<Page<Exemption>> {
  const sb = requireSupabase();
  const { page, pageSize, ...f } = filters;
  const from = page * pageSize;
  let q = sb.from("tax_exemptions").select(COLUMNS, { count: "exact" });
  q = applyFilters(q, f);
  const { data, error, count } = await q
    .order("created_at", { ascending: false })
    .order("id")
    .range(from, from + pageSize - 1);
  if (error) throw toAppError(error);
  const rows = ((data ?? []) as unknown as ExemptionRow[]).map(toExemption);
  return { rows, total: count ?? rows.length, page, pageSize };
}

/** Todas las filas que cumplen los filtros (para exportar), de a paginas de 1000. */
export async function listExemptionsForExport(
  filters: Omit<ExemptionFilters, "page" | "pageSize">,
  maximo = 50000,
): Promise<Exemption[]> {
  const sb = requireSupabase();
  const out: Exemption[] = [];
  const page = 1000;
  for (let from = 0; from < maximo; from += page) {
    let q = sb.from("tax_exemptions").select(COLUMNS);
    q = applyFilters(q, filters);
    const { data, error } = await q
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, from + page - 1);
    if (error) throw toAppError(error);
    out.push(...((data ?? []) as unknown as ExemptionRow[]).map(toExemption));
    if (!data || data.length < page) break;
  }
  return out;
}

/** Activas con la vigencia vencida (las que "Verificar vencidas" desactivaria). */
export async function contarOverduesActivas(): Promise<number> {
  const sb = requireSupabase();
  const { count, error } = await sb
    .from("tax_exemptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .lt("valid_to", new Date().toISOString());
  if (error) throw toAppError(error);
  return count ?? 0;
}

/** Cliente con ese CUIT (para validar el alta y mostrar su nombre). */
export async function searchCustomerByCuit(
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
  if (error) throw toAppError(error);
  return data ?? null;
}

// ============================================================================
// Certificados (bucket privado)
// ============================================================================

export const CERTIFICATE_MAX_BYTES = 10 * 1024 * 1024;
export const CERTIFICATE_KINDS = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

async function subirCertificate(cuit: string, file: File): Promise<string> {
  if (file.size > CERTIFICATE_MAX_BYTES)
    throw new AppError("validation", "El certificado supera los 10 MB.");
  if (!CERTIFICATE_KINDS.includes(file.type))
    throw new AppError("validation", "El certificado debe ser PDF, JPG, PNG o WEBP.");
  const name = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
  const path = `${cuit}/${crypto.randomUUID()}-${name}`;
  try {
    await taxExemptionCertificatesStorage.upload(path, file, { contentType: file.type });
  } catch (e) {
    throw new AppError("unknown", "No se pudo subir el certificado.", { cause: e });
  }
  return path;
}

/** URL para ver el certificado: firmada por 5 minutos (o la URL externa de altas viejas). */
export async function urlCertificate(path: string): Promise<string> {
  if (/^https?:\/\//i.test(path)) return path;
  try {
    return await taxExemptionCertificatesStorage.getSignedUrl(path, 300);
  } catch (e) {
    throw new AppError("unknown", "No se pudo abrir el certificado.", { cause: e });
  }
}

// ============================================================================
// Escritura
// ============================================================================

export type ExemptionInput = {
  cuit: string;
  email?: string | null;
  impuestoId: string;
  /** Ambos = dos filas (Entrantes y Salientes), cada una desactivable por separado. */
  direccion: AddressExemption | "Ambos";
  tipo: KindExemption;
  motivo: string;
  /** ISO; vacio = ahora (lo pone la base). */
  desde?: string | null;
  /** ISO; vacio = sin vencimiento. */
  hasta?: string | null;
  codigoAutorizacion?: string | null;
  certificado?: File | null;
};

/** Alta (1 o 2 filas en un solo INSERT: o entran todas o ninguna). */
export async function createExemption(input: ExemptionInput): Promise<number> {
  const sb = requireSupabase();
  const cuit = input.cuit.replace(/\D/g, "");
  const path = input.certificado ? await subirCertificate(cuit, input.certificado) : null;
  const addresses: AddressExemption[] =
    input.direccion === "Ambos" ? ["Entrantes", "Salientes"] : [input.direccion];
  const base = {
    cuit,
    contact_email: input.email?.trim() || null,
    tax_id: input.impuestoId,
    exemption_type: KIND_DB[input.tipo],
    reason: input.motivo.trim(),
    authorization_code: input.codigoAutorizacion?.trim() || null,
    certificate_path: path,
    status: "active",
    ...(input.desde ? { valid_from: input.desde } : {}),
    valid_to: input.hasta || null,
  };
  const { error } = await sb
    .from("tax_exemptions")
    .insert(addresses.map((d) => ({ ...base, direction: ADDRESS_DB[d] })));
  if (error) {
    // El certificado no quedo asociado a nada: se borra (best effort).
    if (path) await taxExemptionCertificatesStorage.remove([path]).catch(() => undefined);
    throw toAppError(error);
  }
  return addresses.length;
}

export async function setStatusExemption(id: string, status: StatusExemption): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from("tax_exemptions")
    .update({ status: status === "Activa" ? "active" : "inactive" })
    .eq("id", id);
  if (error) throw toAppError(error);
}

export type OverdueExemption = {
  id: string;
  cuit: string;
  clienteLegajo: string | null;
  clienteNombre: string | null;
  impuestoCodigo: string;
  direccion: AddressExemption;
  hasta: string;
};

/** "Verificar vencidas": simular = true solo lista; false las pasa a inactivas. */
export async function verifyOverdues(
  simulate: boolean,
): Promise<{ total: number; items: OverdueExemption[] }> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("tax_exemptions_expire", { p_dry_run: simulate });
  if (error) throw toAppError(error);
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
