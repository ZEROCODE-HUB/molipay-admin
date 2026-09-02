import { requireSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Page, Pagination } from "./types";
import type { ConciliacionArchivo, ConciliacionArchivoRow } from "./types";

export type Conciliacion = {
  id: string;
  periodo: string;
  estado: "Pendiente" | "En progreso" | "Finalizada" | "Error";
  totalMovimientos: number;
  totalConciliados: number;
  createdAt: string;
};

/**
 * Placeholder legacy - se mantiene por compatibilidad.
 */
export async function listConciliaciones(
  _filters: Pagination = { page: 0, pageSize: 25 },
): Promise<Page<Conciliacion>> {
  return { rows: [], total: 0, page: _filters.page, pageSize: _filters.pageSize };
}

// ---------------------------------------------------------------------------
// conciliaciones_archivos - persistencia real
// ---------------------------------------------------------------------------
const TABLE = "conciliaciones_archivos";
const BUCKET = "conciliaciones";

function mapRow(r: ConciliacionArchivoRow): ConciliacionArchivo {
  return {
    id: r.id,
    nombreArchivo: r.nombre_archivo,
    fechaCarga: r.fecha_carga,
    storagePath: r.storage_path,
    estado: r.estado,
    tipo: r.tipo,
    archivoOrigen: r.archivo_origen,
    createdAt: r.created_at,
    createdBy: r.created_by,
  };
}

export type ListArchivosParams = Pagination & {
  tipo?: "bancaria" | "blp";
  search?: string;
};

export async function listConciliacionesArchivos(
  params: ListArchivosParams = { page: 0, pageSize: 25 },
): Promise<Page<ConciliacionArchivo>> {
  if (!isSupabaseConfigured) return { rows: [], total: 0, page: params.page, pageSize: params.pageSize };
  const sb = requireSupabase();
  const { page, pageSize, tipo, search } = params;
  const from = page * pageSize;
  const to = from + pageSize - 1;
  let q = sb.from(TABLE).select("*", { count: "exact" });
  if (tipo) q = q.eq("tipo", tipo);
  if (search?.trim()) q = q.ilike("nombre_archivo", `%${search.trim().replace(/[%_]/g, "\\$&")}%`);
  q = q.order("created_at", { ascending: false }).range(from, to);
  const { data, error, count } = await q;
  if (error) throw error;
  const rows = ((data ?? []) as ConciliacionArchivoRow[]).map(mapRow);
  return { rows, total: count ?? rows.length, page, pageSize };
}

export async function createConciliacionArchivo(input: {
  nombreArchivo: string;
  fechaCarga: string; // YYYY-MM-DD
  tipo?: "bancaria" | "blp";
  estado?: string;
  file?: File | null;
}): Promise<ConciliacionArchivo> {
  const sb = requireSupabase();
  let storagePath: string | null = null;

  // 1. Subir a Storage si hay archivo (bucket privado conciliaciones)
  if (input.file) {
    const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${input.tipo ?? "bancaria"}/${Date.now()}_${safeName}`;
    const { error: upErr } = await sb.storage.from(BUCKET).upload(key, input.file, {
      cacheControl: "3600",
      upsert: false,
    });
    // Si el bucket no existe, no bloqueamos el insert de la fila (fallback a solo metadata)
    if (!upErr) storagePath = key;
    else console.warn("[conciliaciones] storage upload warning:", upErr.message);
  }

  // 2. Insertar fila
  const payload = {
    nombre_archivo: input.nombreArchivo,
    fecha_carga: input.fechaCarga,
    tipo: input.tipo ?? "bancaria",
    estado: input.estado ?? "Pendiente",
    storage_path: storagePath,
    archivo_origen: input.file?.name ?? input.nombreArchivo,
  };

  const { data, error } = await sb.from(TABLE).insert(payload).select("*").single();
  if (error) throw error;
  return mapRow(data as ConciliacionArchivoRow);
}
