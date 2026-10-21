/**
 * Configuracion leida de variables de entorno del build (Vite).
 *
 * Convencion Vite: `VITE_*` queda accesible en el bundle; las demas no.
 * No usar para secretos.
 *
 * Las claves de Supabase se leen directo en `supabase.ts`. Aqui solo vive
 * lo que es del propio admin. Si en el futuro aparecen mas, todas
 * centralizadas aca para que un dev nuevo sepa donde mirar.
 */

const backendUrlRaw = import.meta.env.VITE_BACKEND_URL as string | undefined;
/**
 * URL del backend Hono (`molipay-back`).
 *
 * Default a `http://localhost:3000` (puerto en el que corre `bun run dev`
 * en ese repo). Si se quiere apuntar a otro puerto o entorno, definir
 * `VITE_BACKEND_URL` en `.env.local`.
 *
 * En produccion es obligatorio: el CORS del backend valida contra
 * CORS_ALLOWED_ORIGINS, asi que el origen del admin tiene que estar
 * registrado.
 */
export const BACKEND_URL: string = (backendUrlRaw ?? "http://localhost:3000").replace(/\/+$/, "");

export const env = { BACKEND_URL };
