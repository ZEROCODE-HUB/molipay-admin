import { userMessage } from "@/shared/lib/errors";
import { requireSupabase, isSupabaseConfigured } from "@/infrastructure/supabase/client";
import type { Page, Pagination } from "@/infrastructure/supabase/legacy/types";
import type {
  ReconciliationFile,
  ReconciliationFileRow,
} from "@/infrastructure/supabase/legacy/types";
import { reconciliationFilesStorage } from "@/app/dependencies";

export type Reconciliation = {
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
export async function listReconciliations(
  _filters: Pagination = { page: 0, pageSize: 25 },
): Promise<Page<Reconciliation>> {
  return { rows: [], total: 0, page: _filters.page, pageSize: _filters.pageSize };
}

// ---------------------------------------------------------------------------
// conciliaciones_archivos - persistencia real
// ---------------------------------------------------------------------------
const TABLE = "conciliaciones_archivos";

function mapRow(r: ReconciliationFileRow): ReconciliationFile {
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

export type ListFilesParams = Pagination & {
  tipo?: "bancaria" | "blp";
  search?: string;
};

export async function listReconciliationsFiles(
  params: ListFilesParams = { page: 0, pageSize: 25 },
): Promise<Page<ReconciliationFile>> {
  if (!isSupabaseConfigured)
    return { rows: [], total: 0, page: params.page, pageSize: params.pageSize };
  const sb = requireSupabase();
  const { page, pageSize, tipo: kind, search } = params;
  const from = page * pageSize;
  const to = from + pageSize - 1;
  let q = sb.from(TABLE).select("*", { count: "exact" });
  if (kind) q = q.eq("tipo", kind);
  if (search?.trim()) q = q.ilike("nombre_archivo", `%${search.trim().replace(/[%_]/g, "\\$&")}%`);
  q = q.order("created_at", { ascending: false }).range(from, to);
  const { data, error, count } = await q;
  if (error) throw error;
  const rows = ((data ?? []) as ReconciliationFileRow[]).map(mapRow);
  return { rows, total: count ?? rows.length, page, pageSize };
}

export async function createReconciliationFile(input: {
  nombreArchivo: string;
  fechaCarga: string; // YYYY-MM-DD
  tipo?: "bancaria" | "blp";
  estado?: string;
  file?: File | null;
}): Promise<ReconciliationFile> {
  const sb = requireSupabase();
  let storagePath: string | null = null;

  // 1. Subir a Storage si hay archivo (bucket privado conciliaciones)
  if (input.file) {
    const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${input.tipo ?? "bancaria"}/${Date.now()}_${safeName}`;
    // Si el bucket no existe, no bloqueamos el insert de la fila (fallback a solo metadata)
    try {
      await reconciliationFilesStorage.upload(key, input.file, {
        cacheControl: "3600",
        upsert: false,
      });
      storagePath = key;
    } catch (e) {
      console.warn("[conciliaciones] storage upload warning:", userMessage(e));
    }
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
  return mapRow(data as ReconciliationFileRow);
}
