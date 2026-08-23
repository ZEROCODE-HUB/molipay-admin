import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import { toCodigoError } from "./mappers";
import type {
  CodigoError,
  CodigoErrorInput,
  CodigoErrorRow,
  AudienciaError,
  Page,
  Pagination,
} from "./types";

export type CodigoErrorFilters = Pagination & {
  search?: string;
  audiencia?: AudienciaError;
  activo?: boolean;
};

const COLUMNS =
  "id, codigo, mensaje, audiencia, canal_defecto, descripcion, activo, created_at, updated_at";

function escapeLike(q: string): string {
  return q.trim().replace(/[%_]/g, "\\$&");
}

export async function listCodigosError(filters: CodigoErrorFilters): Promise<Page<CodigoError>> {
  const sb = requireSupabase();
  const { page, pageSize, search, audiencia, activo } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("codigos_error").select(COLUMNS, { count: "exact" });

  if (search && search.trim()) {
    const q = escapeLike(search);
    query = query.or(`codigo.ilike.%${q}%,mensaje.ilike.%${q}%`);
  }
  if (audiencia) query = query.eq("audiencia", audiencia);
  if (activo !== undefined) query = query.eq("activo", activo);

  query = query.order("codigo", { ascending: true }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);

  const rows = (data ?? []) as CodigoErrorRow[];
  return { rows: rows.map(toCodigoError), total: count ?? rows.length, page, pageSize };
}

export async function getCodigoError(id: string): Promise<CodigoError | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("codigos_error").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new DataAccessError(error);
  return data ? toCodigoError(data as CodigoErrorRow) : null;
}

export async function createCodigoError(input: CodigoErrorInput): Promise<CodigoError> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("codigos_error")
    .insert({
      codigo: input.codigo.trim(),
      mensaje: input.mensaje.trim(),
      audiencia: input.audiencia ?? "tecnico",
      canal_defecto: input.canalDefecto,
      descripcion: input.descripcion?.trim() ?? null,
      activo: input.activo ?? true,
    })
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toCodigoError(data as CodigoErrorRow);
}

export type CodigoErrorUpdateInput = Partial<CodigoErrorInput>;

export async function updateCodigoError(
  id: string,
  input: CodigoErrorUpdateInput,
): Promise<CodigoError> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.codigo !== undefined) payload.codigo = input.codigo.trim();
  if (input.mensaje !== undefined) payload.mensaje = input.mensaje.trim();
  if (input.audiencia !== undefined) payload.audiencia = input.audiencia;
  if (input.canalDefecto !== undefined) payload.canal_defecto = input.canalDefecto;
  if (input.descripcion !== undefined) payload.descripcion = input.descripcion?.trim() ?? null;
  if (input.activo !== undefined) payload.activo = input.activo;

  const { data, error } = await sb
    .from("codigos_error")
    .update(payload)
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toCodigoError(data as CodigoErrorRow);
}

export async function setCodigoErrorActivo(id: string, activo: boolean): Promise<CodigoError> {
  return updateCodigoError(id, { activo });
}

export async function deleteCodigoError(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("codigos_error").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}

// Seed function for the 10 known real codes
export const CODIGOS_ERROR_SEED: Omit<CodigoErrorInput, "activo">[] = [
  { codigo: "E_ORIGIN_ID_DUPLICATE", mensaje: "ID de origen duplicado", canalDefecto: "Telegram" },
  {
    codigo: "E_ORIGIN_ID_TOO_LONG",
    mensaje: "ID de origen demasiado largo",
    canalDefecto: "Telegram",
  },
  {
    codigo: "E_INSUFFICIENT_AMOUNT_APPLIED_COMMISSION",
    mensaje: "Monto insuficiente para comisión aplicada",
    canalDefecto: "Telegram",
  },
  {
    codigo: "E_MERCHANT_NOT_DEACTIVATED",
    mensaje: "Comercio no desactivado",
    canalDefecto: "Telegram",
  },
  {
    codigo: "E_USER_PAYMENT_NOT_FOUND",
    mensaje: "Pago de usuario no encontrado",
    canalDefecto: "Telegram",
  },
  {
    codigo: "E_COELSA_CONTRACARGO_ERROR",
    mensaje: "Error de contracargo COELSA",
    canalDefecto: "Telegram",
  },
  {
    codigo: "E_COELSA_GET_ACTIVIDAD_ERROR",
    mensaje: "Error obteniendo actividad COELSA",
    canalDefecto: "Telegram",
  },
  {
    codigo: "E_COELSA_ALTA_COMERCIO_ERROR",
    mensaje: "Error en alta de comercio COELSA",
    canalDefecto: "Telegram",
  },
  { codigo: "E_INVALID_AMOUNT", mensaje: "Monto inválido", canalDefecto: "Telegram" },
  {
    codigo: "E_QR_NOT_STATIC_TYPE",
    mensaje: "QR no es de tipo estático",
    canalDefecto: "Telegram",
  },
];
