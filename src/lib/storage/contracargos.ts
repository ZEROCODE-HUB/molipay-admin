import { requireSupabase } from "@/lib/supabase";

export const CONTRACARGOS_BUCKET = "contracargos-docs";

/**
 * Entry normalizada de `archivos_adjuntos` en la fila del contracargo.
 * Mantener esta forma sincronizada con el tipo `ArchivoAdjunto` del
 * front y con el `jsonb` que persiste la migración.
 */
export type ArchivoAdjunto = {
  /** Nombre legible que ve el operador */
  name: string;
  /** Path completo dentro del bucket: {comercio_id}/{contracargo_id}/{filename} */
  path: string;
  /** Tamaño en bytes */
  size: number;
  /** MIME type del archivo */
  mime: string;
  /** ISO timestamp del upload */
  uploaded_at: string;
  /** auth.uid() del que subió */
  uploaded_by: string | null;
};

/**
 * Sube un archivo al bucket `contracargos-docs` siguiendo la
 * convención de path:
 *
 *   {comercio_id}/{contracargo_id}/{timestamp}_{safeName}
 *
 * Devuelve el `ArchivoAdjunto` listo para pushear al array
 * `archivos_adjuntos` del contracargo.
 */
export async function uploadAdjunto(
  comercioId: string,
  contracargoId: string,
  file: File,
): Promise<ArchivoAdjunto> {
  const sb = requireSupabase();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${comercioId}/${contracargoId}/${Date.now()}_${safeName}`;

  const { error } = await sb.storage
    .from(CONTRACARGOS_BUCKET)
    .upload(key, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
  if (error) throw error;

  let uploadedBy: string | null = null;
  try {
    const { data } = await sb.auth.getUser();
    uploadedBy = data?.user?.id ?? null;
  } catch {
    /* ignore */
  }

  return {
    name: file.name,
    path: key,
    size: file.size,
    mime: file.type || "application/octet-stream",
    uploaded_at: new Date().toISOString(),
    uploaded_by: uploadedBy,
  };
}

/**
 * Borra un archivo del bucket. La fila del contracargo ya tiene que
 * haber sido actualizada para remover el entry del array; esto solo
 * limpia el storage.
 */
export async function deleteAdjunto(path: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.storage
    .from(CONTRACARGOS_BUCKET)
    .remove([path]);
  if (error) throw error;
}

/**
 * Devuelve una URL firmada de corta duración (5 min) para descargar
 * un adjunto. Usar en lugar de `getPublicUrl` porque el bucket es
 * privado.
 */
export async function getAdjuntoSignedUrl(
  path: string,
  expiresInSec = 300,
): Promise<string> {
  const sb = requireSupabase();
  const { data, error } = await sb.storage
    .from(CONTRACARGOS_BUCKET)
    .createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}
