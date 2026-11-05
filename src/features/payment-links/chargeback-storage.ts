import { requireSupabase } from "@/infrastructure/supabase/client";
import { chargebackDocumentsStorage } from "@/app/dependencies";

/**
 * Entry normalizada de `archivos_adjuntos` en la fila del contracargo.
 * Mantener esta forma sincronizada con el tipo `ArchivoAdjunto` del
 * front y con el `jsonb` que persiste la migración.
 */
export type FileAttachment = {
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
export async function uploadAttachment(
  merchantId: string,
  chargebackId: string,
  file: File,
): Promise<FileAttachment> {
  const sb = requireSupabase();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${merchantId}/${chargebackId}/${Date.now()}_${safeName}`;

  await chargebackDocumentsStorage.upload(key, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });

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
export async function deleteAttachment(path: string): Promise<void> {
  await chargebackDocumentsStorage.remove([path]);
}

/**
 * Devuelve una URL firmada de corta duración (5 min) para descargar
 * un adjunto. Usar en lugar de `getPublicUrl` porque el bucket es
 * privado.
 */
export async function getAttachmentSignedUrl(path: string, expiresInSec = 300): Promise<string> {
  return chargebackDocumentsStorage.getSignedUrl(path, expiresInSec);
}
