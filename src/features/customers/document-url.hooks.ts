import { useEffect,useState } from "react";
import { supabase } from "@/infrastructure/supabase/client";
import { createKeyValueStore } from "@/infrastructure/browser-storage/key-value-store";
import { customerDocumentsBucket,customerDocumentsStorage } from "@/app/dependencies";

/**
 * Resuelve la URL visible de un documento.
 *
 * La columna `documentos.url` suele guardar solo el nombre del archivo
 * (ej. "id_frente.jfif"). Este hook lo convierte en una URL servible desde
 * Supabase Storage (bucket `customerDocumentsBucket`):
 *  - si ya es absoluta o un blob:, se respeta;
 *  - si no, resuelve el path (`<legajo>/<archivo>` o `<archivo>`) y pide una
 *    URL firmada a través del Edge Function `get-document-url` (que usa el
 *    service role y valida que el llamador es admin). Si el Edge Function no
 *    está disponible, cae al intento directo desde el cliente (URL firmada de
 *    Storage y, si falla, URL pública).
 *
 * Devuelve `null` si no pudo resolverse (la UI muestra el estado de error).
 */
export function useDocumentUrl(raw: string | null, legajo: string): string | null {
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
          body: { path: p, bucket: customerDocumentsBucket, expiresIn: 60 * 60 },
        });
        if (!error && data?.signedUrl) return data.signedUrl;
      } catch {
        /* Edge Function no desplegado: caer al método directo */
      }
      // Fallback: intento directo desde el cliente.
      try {
        return await customerDocumentsStorage.getSignedUrl(p, 60 * 60);
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
        const pub = customerDocumentsStorage.getPublicUrl(p);
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

export type DocumentForResolver = { id: string; url: string | null };

export type DocumentsUrls = {
  /** URL del original (para Ver / Descargar). */
  urls: Record<string, string | null>;
  /** URL del thumbnail redimensionado (para mostrar en la grilla). */
  thumbs: Record<string, string | null>;
};

const CACHE_KEY = "docurls:v1";
const THUMB_TRANSFORM = { width: 520, resize: "cover", quality: 80 } as const;

type CacheEntry = { url: string; thumb: string | null; exp: number };
type CacheShape = Record<string, CacheEntry>;

const urlCache = createKeyValueStore<CacheShape>({
  key: CACHE_KEY,
  storage: "session",
  validate: (v): v is CacheShape => typeof v === "object" && v !== null && !Array.isArray(v),
});

function readCache(): CacheShape {
  return urlCache.get() ?? {};
}

function escribirCache(cache: CacheShape) {
  urlCache.set(cache);
}

/**
 * Resuelve las URLs de varios documentos de un legajo en UNA sola llamada al
 * Edge Function `get-document-url` (en vez de una por documento). Devuelve,
 * por cada `id`, la URL del original y la del thumbnail redimensionado.
 * Las URLs firmadas se cachean en sessionStorage (1 h) para no refirmar al
 * volver a la pestaña.
 */
export function useDocumentsUrls(docs: DocumentForResolver[], legajo: string): DocumentsUrls {
  const [out, setOut] = useState<DocumentsUrls>({ urls: {}, thumbs: {} });

  // Clave estable basada en el contenido (no en la referencia del array),
  // para no recrear el efecto en cada render mientras los datos cargan.
  const key = docs.map((d) => `${d.id}:${d.url ?? ""}`).join("|") + `@${legajo}`;

  useEffect(() => {
    let cancelled = false;
    if (!supabase) {
      setOut({ urls: {}, thumbs: {} });
      return;
    }
    const sb = supabase;

    const plan = docs.map((d) => {
      const file = d.url ? d.url.replace(/^\/+/, "") : "";
      return { id: d.id, paths: file ? [`${legajo}/${file}`, file] : [] };
    });
    const allPaths = Array.from(new Set(plan.flatMap((p) => p.paths)));

    (async () => {
      const urls: Record<string, string | null> = {};
      const thumbs: Record<string, string | null> = {};
      const cache = readCache();
      let cacheDirty = false;
      const ahora = Date.now();

      // Valores absolutos/blob y cache vigente se respetan directo.
      for (const d of docs) {
        if (d.url && (/^https?:\/\//i.test(d.url) || d.url.startsWith("blob:"))) {
          urls[d.id] = d.url;
          continue;
        }
        const file = d.url ? d.url.replace(/^\/+/, "") : "";
        const cacheKey = `${legajo}::${file}`;
        const hit = cache[cacheKey];
        if (hit && hit.exp > ahora) {
          const primPath = file ? `${legajo}/${file}` : "";
          urls[d.id] = hit.url;
          thumbs[d.id] = hit.thumb ?? hit.url;
          void primPath;
        }
      }

      const pendings = plan.filter((p) => {
        const file = docs.find((d) => d.id === p.id)?.url?.replace(/^\/+/, "") ?? "";
        return !cache[`${legajo}::${file}`] || cache[`${legajo}::${file}`].exp <= ahora;
      });
      const pendPaths = Array.from(new Set(pendings.flatMap((p) => p.paths)));

      if (pendPaths.length > 0) {
        let signed: Record<string, string> = {};
        let thumbMap: Record<string, string> = {};
        try {
          const { data, error } = await sb.functions.invoke("get-document-url", {
            body: {
              paths: pendPaths,
              bucket: customerDocumentsBucket,
              expiresIn: 60 * 60,
              transform: THUMB_TRANSFORM,
            },
          });
          if (!error && data?.signedUrls) {
            signed = data.signedUrls;
            thumbMap = data.thumbUrls ?? {};
          }
        } catch {
          /* Edge Function no disponible */
        }
        if (Object.keys(signed).length === 0) {
          // Fallback: intento directo desde el cliente para cada path.
          for (const p of pendPaths) {
            try {
              signed[p] = await customerDocumentsStorage.getSignedUrl(p, 60 * 60);
            } catch {
              /* ignore */
            }
          }
        }
        const exp = ahora + 60 * 60 * 1000;
        for (const p of pendings) {
          const hit = p.paths.find((pp) => signed[pp]);
          if (hit) {
            const file = docs.find((d) => d.id === p.id)?.url?.replace(/^\/+/, "") ?? "";
            const ck = `${legajo}::${file}`;
            urls[p.id] = signed[hit];
            thumbs[p.id] = (thumbMap[hit] ?? signed[hit]) as string;
            cache[ck] = { url: signed[hit], thumb: thumbMap[hit] ?? null, exp };
            cacheDirty = true;
          }
        }
      }

      if (cacheDirty) escribirCache(cache);
      if (!cancelled) setOut({ urls, thumbs });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return out;
}
