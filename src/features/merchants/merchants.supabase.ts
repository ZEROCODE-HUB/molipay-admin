import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";
import { toMerchant,toPointSale } from "@/infrastructure/supabase/legacy/mappers";
import type {
CustomerSelect,
Merchant,
MerchantInput,
MerchantRow,
StatusMerchant,
LevelMerchant,
Page,
Pagination,
PointSale,
PointSaleRow,
KindPerson,
} from "@/infrastructure/supabase/legacy/types";
import { escapeLike } from "@/infrastructure/supabase/query-helpers";

export type MerchantFilters = Pagination & {
  /** Búsqueda de texto libre: usuario (email) o legajo del comercio. */
  search?: string;
  estado?: StatusMerchant;
  nivel?: LevelMerchant;
  fechaDesde?: string; // YYYY-MM-DD
  fechaHasta?: string; // YYYY-MM-DD
};

// Tabla real comercios (verificada via information_schema):
// id, usuario, legajo (FK -> clientes.legajo), nombre_comercio, categoria_id, estado, nivel, created_at, updated_at
// + relaciones clientes, codigos_categoria, puntos_venta
// Ya no existe metodos_config ni habilitado_* — migrado a comercio_banderas.
const COLUMNS =
  "id, usuario, legajo, nombre_comercio, categoria_id, estado, nivel, ejecutivo_responsable_id, site_id, created_at, updated_at, clientes(legajo, nombre, cuit, tipo_persona, correo), codigos_categoria(id, codigo, nombre, descripcion, estado), puntos_venta(id, nombre, estado, created_at), backoffice_users!comercios_ejecutivo_responsable_id_fkey(id, full_name, email)";

export async function listMerchants(filters: MerchantFilters): Promise<Page<Merchant>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado: status, nivel: level } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let q = sb.from("comercios").select(COLUMNS, { count: "exact" });
  if (search && search.trim()) {
    const qq = escapeLike(search);
    q = q.or(`usuario.ilike.%${qq}%,legajo.ilike.%${qq}%`);
  }
  if (status) q = q.eq("estado", status);
  if (level) q = q.eq("nivel", level);
  if (filters.fechaDesde) q = q.gte("created_at", filters.fechaDesde);
  if (filters.fechaHasta) q = q.lte("created_at", filters.fechaHasta + "T23:59:59");
  q = q.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await q;
  if (error) throw toAppError(error);

  const rows = (data ?? []) as unknown as (MerchantRow & {
    clientes?:
      | {
          legajo: string;
          nombre: string;
          cuit: string;
          tipo_persona: KindPerson;
          correo: string;
        }[]
      | null;
    codigos_categoria?: { id: number; descripcion: string }[] | null;
    puntos_venta?: PointSaleRow[] | null;
  })[];

  return {
    rows: rows.map(toMerchant),
    total: count ?? rows.length,
    page,
    pageSize,
  };
}

export async function getMerchant(id: string): Promise<Merchant | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("comercios").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw toAppError(error);
  if (!data) return null;
  return toMerchant(
    data as unknown as MerchantRow & {
      clientes?:
        | {
            legajo: string;
            nombre: string;
            cuit: string;
            tipo_persona: KindPerson;
            correo: string;
          }[]
        | null;
      codigos_categoria?: { id: number; descripcion: string }[] | null;
      puntos_venta?: PointSaleRow[] | null;
    },
  );
}

export type MerchantCreateInput = MerchantInput;

export async function createMerchant(input: MerchantCreateInput): Promise<Merchant> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {
    usuario: input.usuario.trim(),
    legajo: input.legajo.trim(),
    nombre_comercio: (input as { nombreComercio?: string | null }).nombreComercio?.trim() || null,
    categoria_id: input.categoriaId,
    nivel: input.nivel,
    estado: input.estado,
    ejecutivo_responsable_id: input.ejecutivoResponsableId?.trim() || null,
    site_id: (input as { siteId?: string | null }).siteId?.trim() || null,
  };
  const { data, error } = await sb.from("comercios").insert(payload).select(COLUMNS).single();
  if (error) throw toAppError(error);
  return toMerchant(
    data as unknown as MerchantRow & {
      clientes?:
        | {
            legajo: string;
            nombre: string;
            cuit: string;
            tipo_persona: KindPerson;
            correo: string;
          }[]
        | null;
      codigos_categoria?: { id: number; descripcion: string }[] | null;
      puntos_venta?: PointSaleRow[] | null;
    },
  );
}

export type MerchantUpdateInput = Partial<MerchantInput>;

export async function updateMerchant(id: string, input: MerchantUpdateInput): Promise<Merchant> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.usuario !== undefined) payload.usuario = input.usuario.trim();
  if (input.legajo !== undefined) payload.legajo = input.legajo.trim();
  if ((input as { nombreComercio?: string | null }).nombreComercio !== undefined)
    payload.nombre_comercio =
      (input as { nombreComercio?: string | null }).nombreComercio?.trim() || null;
  if (input.categoriaId !== undefined) payload.categoria_id = input.categoriaId;
  if (input.nivel !== undefined) payload.nivel = input.nivel;
  if (input.estado !== undefined) payload.estado = input.estado;
  if (input.ejecutivoResponsableId !== undefined)
    payload.ejecutivo_responsable_id = input.ejecutivoResponsableId?.trim() || null;
  if ((input as { siteId?: string | null }).siteId !== undefined)
    payload.site_id = (input as { siteId?: string | null }).siteId?.trim() || null;

  const { data, error } = await sb
    .from("comercios")
    .update(payload)
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw toAppError(error);
  return toMerchant(
    data as unknown as MerchantRow & {
      clientes?:
        | {
            legajo: string;
            nombre: string;
            cuit: string;
            tipo_persona: KindPerson;
            correo: string;
          }[]
        | null;
      codigos_categoria?: { id: number; descripcion: string }[] | null;
      puntos_venta?: PointSaleRow[] | null;
    },
  );
}

export async function setMerchantStatus(id: string, status: StatusMerchant): Promise<Merchant> {
  return updateMerchant(id, { estado: status });
}

/**
 * Deshabilitar un comercio: cambia estado a 'Desactivado', exige motivo,
 * y registra en historial_cambios. NO elimina el registro.
 */
export async function disableMerchant(id: string, reason: string): Promise<Merchant> {
  const sb = requireSupabase();

  // 1. Cambiar estado
  const { data, error } = await sb
    .from("comercios")
    .update({ estado: "Desactivado" })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw toAppError(error);

  // 2. Registrar en historial_cambios
  try {
    const { data: auth } = await sb.auth.getUser();
    const uid = auth?.user?.id ?? null;
    await sb.from("historial_cambios").insert({
      tabla: "comercios",
      registro_id: id,
      cambio: "Deshabilitación",
      motivo: reason.trim(),
      usuario_id: uid,
    });
  } catch {
    // No falla la operación principal si el historial falla
  }

  return toMerchant(
    data as unknown as MerchantRow & {
      clientes?:
        | {
            legajo: string;
            nombre: string;
            cuit: string;
            tipo_persona: KindPerson;
            correo: string;
          }[]
        | null;
      codigos_categoria?: { id: number; descripcion: string }[] | null;
      puntos_venta?: PointSaleRow[] | null;
    },
  );
}

// --- catálogos auxiliares ---------------------------------------------------

// Legajo siempre es un cliente: el alta de comercio exige elegir un cliente
// existente (FK real a clientes.legajo). Selector con búsqueda server-side + limit.
export async function listCustomersForSelect(search?: string): Promise<CustomerSelect[]> {
  const sb = requireSupabase();
  let query = sb
    .from("clientes")
    .select("legajo, nombre, correo, cuit, tipo_persona")
    .order("nombre", { ascending: true })
    .limit(20);
  if (search?.trim()) {
    const q = search.trim().replace(/[%_]/g, "\\$&");
    query = query.or(`legajo.ilike.%${q}%,correo.ilike.%${q}%,nombre.ilike.%${q}%`);
  }
  const { data, error } = await query;
  if (error) throw toAppError(error);
  return (data ?? []).map(
    (r: {
      legajo: string;
      nombre: string;
      correo: string;
      cuit: string;
      tipo_persona: string;
    }): CustomerSelect => ({
      legajo: r.legajo,
      nombre: r.nombre,
      correo: r.correo,
      cuit: r.cuit,
      tipoPersona: r.tipo_persona as CustomerSelect["tipoPersona"],
    }),
  );
}

export async function listPointsSale(merchantId: string): Promise<PointSale[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("puntos_venta")
    .select("id, comercio_id, nombre, estado, created_at")
    .eq("comercio_id", merchantId)
    .order("created_at", { ascending: true });
  if (error) throw toAppError(error);
  return (data ?? []).map((r: PointSaleRow) => toPointSale(r));
}
