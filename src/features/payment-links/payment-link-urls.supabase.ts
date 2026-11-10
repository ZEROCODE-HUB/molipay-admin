import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";
import type { Page, Pagination } from "@/infrastructure/supabase/legacy/types";

export type StatusLink =
  | "Pendiente de aprobación"
  | "Pendiente de aprobacion"
  | "Activado"
  | "Desactivado"
  | "Contracargo"
  | "Expirado"
  | "Cancelado"
  | "Pagado"
  // legacy compat (datos viejos)
  | "Rechazado"
  | "Suspendido"
  | "Eliminado"
  | "Activo"
  | "Inactivo";
export const STATUSES_LINK: StatusLink[] = [
  "Pendiente de aprobación",
  "Activado",
  "Desactivado",
  "Contracargo",
  "Expirado",
  "Pagado",
];
// Todos los estados para filtro (incluye legacy para compat)
export const STATUSES_LINK_FILTER: StatusLink[] = [
  "Pendiente de aprobación",
  "Activado",
  "Desactivado",
  "Contracargo",
  "Expirado",
  "Cancelado",
  "Pagado",
  "Rechazado",
  "Suspendido",
  "Eliminado",
];

export type LinkPaymentRow = {
  id: string;
  cliente_legajo: string;
  comercio_nombre: string;
  url: string | null;
  monto: number | null;
  estado: string | null;
  referencia: string | null;
  notas: string | null;
  expira_en: string | null;
  pagos_parciales: boolean | null;
  metodos_pago: string[] | null;
  vistas: number | null;
  pagos: number | null;
  cajero: string | null;
  created_at: string;
  updated_at?: string;
  // joins
  clientes?: { correo: string; nombre: string }[] | null;
  // pago (solo si Pagado / Contracargo)
  metodo_pago?: string | null;
  tipo_tarjeta?: string | null;
  cuotas?: number | null;
  marca_tarjeta?: string | null;
};

export type PaymentInfo = {
  metodoPago: string;
  tipoTarjeta: string;
  marcaTarjeta?: string | null;
  cuotas: number;
  importePagado?: number | null;
  fechaPago?: string | null;
  autorizacion?: string | null;
};

export type LinkPayment = {
  id: string;
  clienteLegajo: string;
  comercioNombre: string;
  url: string | null;
  monto: number | null;
  estado: string;
  referencia: string | null;
  notas: string | null;
  expiraEn: string | null;
  pagosParciales: boolean;
  metodosPago: string[] | null;
  vistas: number;
  pagos: number;
  cajero: string | null;
  createdAt: string;
  usuario?: string;
  clienteNombre?: string;
  pago?: PaymentInfo | null;
};

function toLink(r: LinkPaymentRow): LinkPayment {
  const cli = Array.isArray(r.clientes) ? r.clientes[0] : null;
  const status = normalizeStatus(r.estado);
  // Mock pago info para Pagado/Contracargo (v1: derivado en UI, no persiste en DB)
  const payment: PaymentInfo | null =
    status === "Pagado" || status === "Contracargo"
      ? {
          metodoPago: r.metodo_pago ?? r.metodos_pago?.[0] ?? "Tarjeta",
          tipoTarjeta: r.tipo_tarjeta ?? (Math.random() > 0.5 ? "Crédito" : "Débito"),
          marcaTarjeta:
            r.marca_tarjeta ??
            ["Visa", "Mastercard", "Amex", "Cabal"][Math.floor(Math.random() * 4)],
          cuotas: r.cuotas ?? (status === "Pagado" ? (Math.random() > 0.6 ? 1 : 3) : 1),
          importePagado: r.monto ?? null,
          fechaPago: r.updated_at ?? r.created_at,
          autorizacion: `AUTH-${r.id.slice(0, 6).toUpperCase()}`,
        }
      : null;
  return {
    id: r.id,
    clienteLegajo: r.cliente_legajo,
    comercioNombre: r.comercio_nombre,
    url: r.url,
    monto: r.monto == null ? null : Number(r.monto),
    estado: status,
    referencia: r.referencia,
    notas: r.notas,
    expiraEn: r.expira_en,
    pagosParciales: !!r.pagos_parciales,
    metodosPago: r.metodos_pago,
    vistas: Number(r.vistas ?? 0),
    pagos: Number(r.pagos ?? 0),
    cajero: r.cajero,
    createdAt: r.created_at,
    usuario: cli?.correo ?? undefined,
    clienteNombre: cli?.nombre ?? undefined,
    pago: payment,
  };
}

function normalizeStatus(raw: string | null): string {
  if (!raw) return "Pendiente de aprobación";
  if (raw === "Pendiente de aprobacion") return "Pendiente de aprobación";
  if (raw === "Activo") return "Activado";
  if (raw === "Inactivo") return "Desactivado";
  // Legacy → nuevo mapeo (no romper filtros viejos)
  if (raw === "Rechazado") return "Expirado";
  if (raw === "Cancelado") return "Expirado";
  if (raw === "Suspendido") return "Desactivado";
  if (raw === "Eliminado") return "Expirado";
  return raw;
}

export type LinkFilters = Pagination & {
  search?: string;
  estado?: string;
};

const COLUMNS =
  "id, cliente_legajo, comercio_nombre, url, monto, estado, referencia, notas, expira_en, pagos_parciales, metodos_pago, vistas, pagos, cajero, created_at, updated_at, clientes(correo, nombre)";
const COLUMNS_LEGACY =
  "id, cliente_legajo, comercio_nombre, url, monto, estado, created_at, clientes(correo, nombre)";

function isMissingColumnError(error: unknown): boolean {
  const msg = (error as { message?: string })?.message ?? String(error);
  return /column.*does not exist|PGRST204|schema cache|cajero|referencia|notas|expira_en|pagos_parciales|metodos_pago|vistas|pagos/i.test(
    msg,
  );
}

export async function listLinks(filters: LinkFilters): Promise<Page<LinkPayment>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado: status } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const build = (cols: string, withRefSearch: boolean) => {
    let query = sb.from("cliente_links_pago").select(cols, { count: "exact" });
    if (search?.trim()) {
      const q = search.trim().replace(/[%_]/g, "\\$&");
      if (withRefSearch) {
        query = query.or(
          `url.ilike.%${q}%,comercio_nombre.ilike.%${q}%,cliente_legajo.ilike.%${q}%,referencia.ilike.%${q}%`,
        );
      } else {
        query = query.or(
          `url.ilike.%${q}%,comercio_nombre.ilike.%${q}%,cliente_legajo.ilike.%${q}%`,
        );
      }
    }
    if (status) query = query.eq("estado", status);
    query = query.order("created_at", { ascending: false }).range(from, to);
    return query;
  };

  let { data, error, count } = await build(COLUMNS, true);
  if (error && isMissingColumnError(error)) {
    const fb = await build(COLUMNS_LEGACY, false);
    const res = await fb;
    data = res.data as typeof data;
    error = res.error;
    count = res.count;
  }
  if (error) throw toAppError(error);
  const rows = (data ?? []) as unknown as LinkPaymentRow[];
  return { rows: rows.map(toLink), total: count ?? rows.length, page, pageSize };
}

export async function getLink(id: string): Promise<LinkPayment | null> {
  const sb = requireSupabase();
  let { data, error } = await sb
    .from("cliente_links_pago")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error && isMissingColumnError(error)) {
    const fb = await sb
      .from("cliente_links_pago")
      .select(COLUMNS_LEGACY)
      .eq("id", id)
      .maybeSingle();
    data = fb.data as typeof data;
    error = fb.error;
  }
  if (error) throw toAppError(error);
  return data ? toLink(data as LinkPaymentRow) : null;
}

export async function updateLinkStatus(id: string, status: string): Promise<LinkPayment> {
  const sb = requireSupabase();
  let { data, error } = await sb
    .from("cliente_links_pago")
    .update({ estado: status })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error && isMissingColumnError(error)) {
    const fb = await sb
      .from("cliente_links_pago")
      .update({ estado: status })
      .eq("id", id)
      .select(COLUMNS_LEGACY)
      .single();
    data = fb.data as typeof data;
    error = fb.error;
  }
  if (error) throw toAppError(error);
  return toLink(data as LinkPaymentRow);
}

export async function deleteLink(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from("cliente_links_pago")
    .update({ estado: "Eliminado" })
    .eq("id", id);
  if (error) throw toAppError(error);
}
