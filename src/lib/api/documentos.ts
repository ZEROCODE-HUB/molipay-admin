import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";

export type DocumentoTipo = "id_frente" | "id_dorso" | "servicio" | "selfie";

export const DOCUMENTO_LABELS: Record<DocumentoTipo, string> = {
  id_frente: "Documento frente",
  id_dorso: "Documento dorso",
  servicio: "Comprobante de servicio",
  selfie: "Selfie verificatoria",
};

export type Documento = {
  id: string;
  clienteLegajo: string;
  tipo: DocumentoTipo;
  url: string | null;
  label: string;
  createdAt: string;
};

type DocumentoRow = {
  id: string;
  cliente_legajo: string;
  tipo: DocumentoTipo;
  url: string | null;
  label: string;
  created_at: string;
};

const COLUMNS = "id, cliente_legajo, tipo, url, label, created_at";

function toDocumento(r: DocumentoRow): Documento {
  return {
    id: r.id,
    clienteLegajo: r.cliente_legajo,
    tipo: r.tipo,
    url: r.url,
    label: r.label,
    createdAt: r.created_at,
  };
}

export async function listDocumentos(clienteLegajo: string): Promise<Documento[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("documentos")
    .select(COLUMNS)
    .eq("cliente_legajo", clienteLegajo)
    .order("created_at", { ascending: false });
  if (error) throw new DataAccessError(error);
  return ((data as DocumentoRow[]) ?? []).map(toDocumento);
}

/**
 * Convierte el valor de `documentos.url` en una URL absoluta y visible.
 *
 * En producción la columna `url` suele guardar solo el nombre del archivo
 * (ej. "id_frente.jfif") o una ruta de Storage, no una URL completa. Si es
 * absoluta se respeta; si no, se construye contra la base de Storage
 * configurada (VITE_STORAGE_BASE_URL), con el legajo como carpeta.
 */
export function resolveDocumentoUrl(raw: string | null, legajo: string): string | null {
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw) || raw.startsWith("blob:")) return raw;
  const base =
    (import.meta.env.VITE_STORAGE_BASE_URL as string | undefined)?.replace(/\/+$/, "") ??
    "https://storage.molipay.com/docs";
  const file = raw.replace(/^\/+/, "");
  return `${base}/${legajo}/${file}`;
}

export type DocumentoInput = {
  tipo: DocumentoTipo;
  url?: string;
  label?: string;
};

export async function createDocumento(
  clienteLegajo: string,
  input: DocumentoInput,
): Promise<Documento> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("documentos")
    .insert({
      cliente_legajo: clienteLegajo,
      tipo: input.tipo,
      url: input.url ?? null,
      label: input.label ?? DOCUMENTO_LABELS[input.tipo],
    })
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toDocumento(data as DocumentoRow);
}
