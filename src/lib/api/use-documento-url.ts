import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/** Nombre del bucket de Storage donde el onboarding guarda las imágenes. */
export const STORAGE_BUCKET =
  (import.meta.env.VITE_STORAGE_BUCKET as string | undefined) ?? "kyc";

/**
 * Resuelve la URL visible de un documento.
 *
 * La columna `documentos.url` suele guardar solo el nombre del archivo
 * (ej. "id_frente.jfif"). Este hook lo convierte en una URL servible desde
 * Supabase Storage (bucket `STORAGE_BUCKET`):
 *  - si ya es absoluta o un blob:, se respeta;
 *  - si no, resuelve el path (`<legajo>/<archivo>` o `<archivo>`) y pide una
 *    URL firmada a través del Edge Function `get-document-url` (que usa el
 *    service role y valida que el llamador es admin). Si el Edge Function no
 *    está disponible, cae al intento directo desde el cliente (URL firmada de
 *    Storage y, si falla, URL pública).
 *
 * Devuelve `null` si no pudo resolverse (la UI muestra el estado de error).
 */
export function useDocumentoUrl(raw: string | null, legajo: string): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!raw) {
      setUrl(null);
      return;
    }
    if (/^https?:\/\//i.test(raw) || raw.startsWith("blob:")) {
      setUrl(raw);
      return;
    }
    if (!supabase) {
      setUrl(null);
      return;
    }
    const sb = supabase;

    const file = raw.replace(/^\/+/, "");
    const paths = [`${legajo}/${file}`, file];

    const firmar = async (p: string): Promise<string | null> => {
      // Prioridad: Edge Function con service role (no depende de la RLS de storage).
      try {
        const { data, error } = await sb.functions.invoke("get-document-url", {
          body: { path: p, bucket: STORAGE_BUCKET, expiresIn: 60 * 60 },
        });
        if (!error && data?.signedUrl) return data.signedUrl;
      } catch {
        /* Edge Function no desplegado: caer al método directo */
      }
      // Fallback: intento directo desde el cliente.
      try {
        const { data, error } = await sb.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(p, 60 * 60);
        if (!error && data?.signedUrl) return data.signedUrl;
      } catch {
        /* bucket sin política de lectura o inexistente */
      }
      return null;
    };

    (async () => {
      for (const p of paths) {
        const signed = await firmar(p);
        if (signed) {
          if (!cancelled) setUrl(signed);
          return;
        }
        // URL pública (bucket marcado como público)
        const pub = sb.storage.from(STORAGE_BUCKET).getPublicUrl(p).data.publicUrl;
        try {
          const res = await fetch(pub, { method: "HEAD" });
          if (res.ok) {
            if (!cancelled) setUrl(pub);
            return;
          }
        } catch {
          /* la URL no existe o no es accesible */
        }
      }
      if (!cancelled) setUrl(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [raw, legajo]);

  return url;
}
