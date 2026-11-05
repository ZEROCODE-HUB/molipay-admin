import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";
import { toResolver } from "@/infrastructure/supabase/legacy/mappers";
import type {
Page,
Pagination,
Resolver,
ResolverStatus,
ResolverInput,
ResolverRow,
} from "@/infrastructure/supabase/legacy/types";
import { escapeLike } from "@/infrastructure/supabase/query-helpers";

export type ResolverFilters = Pagination & {
  /** Búsqueda de texto libre: nombre, CUIT o URL. */
  search?: string;
  estado?: ResolverStatus;
};

const COLUMNS =
  "id, nombre, cuit, url, estado, nombre_reverso, formato_web, pcp_id, id_pcp, token, as_header, soa, created_at, updated_at";

export async function listResolvers(filters: ResolverFilters): Promise<Page<Resolver>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado: status } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("resolvers").select(COLUMNS, { count: "exact" });

  if (search && search.trim()) {
    const q = escapeLike(search);
    query = query.or(`nombre.ilike.%${q}%,cuit.ilike.%${q}%,url.ilike.%${q}%`);
  }
  if (status) query = query.eq("estado", status);

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw toAppError(error);

  const rows = (data ?? []) as ResolverRow[];
  return {
    rows: rows.map(toResolver),
    total: count ?? rows.length,
    page,
    pageSize,
  };
}

export async function getResolver(id: string): Promise<Resolver | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("resolvers").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw toAppError(error);
  return data ? toResolver(data as ResolverRow) : null;
}

export type ResolverCreateInput = ResolverInput;

export async function createResolver(input: ResolverCreateInput): Promise<Resolver> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("resolvers")
    .insert({
      nombre: input.nombre.trim(),
      cuit: input.cuit.trim(),
      url: input.url.trim(),
      estado: input.estado,
      nombre_reverso: input.nombreReverso.trim(),
      formato_web: input.formatoWeb.trim(),
      pcp_id: input.pcpId.trim(),
      id_pcp: input.idPcp.trim(),
      token: input.token.trim(),
      as_header: input.asHeader,
      soa: input.soa,
    })
    .select(COLUMNS)
    .single();
  if (error) throw toAppError(error);
  return toResolver(data as ResolverRow);
}

export type ResolverUpdateInput = Partial<ResolverInput>;

export async function updateResolver(id: string, input: ResolverUpdateInput): Promise<Resolver> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.nombre !== undefined) payload.nombre = input.nombre.trim();
  if (input.cuit !== undefined) payload.cuit = input.cuit.trim();
  if (input.url !== undefined) payload.url = input.url.trim();
  if (input.estado !== undefined) payload.estado = input.estado;
  if (input.nombreReverso !== undefined) payload.nombre_reverso = input.nombreReverso.trim();
  if (input.formatoWeb !== undefined) payload.formato_web = input.formatoWeb.trim();
  if (input.pcpId !== undefined) payload.pcp_id = input.pcpId.trim();
  if (input.idPcp !== undefined) payload.id_pcp = input.idPcp.trim();
  if (input.token !== undefined) payload.token = input.token.trim();
  if (input.asHeader !== undefined) payload.as_header = input.asHeader;
  if (input.soa !== undefined) payload.soa = input.soa;

  const { data, error } = await sb
    .from("resolvers")
    .update(payload)
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw toAppError(error);
  return toResolver(data as ResolverRow);
}

export async function setResolverStatus(id: string, status: ResolverStatus): Promise<Resolver> {
  return updateResolver(id, { estado: status });
}

export async function deleteResolver(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("resolvers").delete().eq("id", id);
  if (error) throw toAppError(error);
}
