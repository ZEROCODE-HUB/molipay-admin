// Utilidades compartidas de las Edge Functions del backoffice.
//
// Seguridad: toda funcion que use la service role verifica primero QUIEN llama
// (JWT del usuario) y QUE puede hacer (has_permission en la base, la misma
// puerta que usan RLS y RPC). Nunca se confia en el body para autorizar.

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { recordSecurityEvent } from "./security-events.ts";

/** Origenes permitidos (CORS y redirects de invitacion). ALLOWED_ORIGINS="https://a,https://b". */
export function allowedOrigins(): string[] {
  const env = Deno.env.get("ALLOWED_ORIGINS");
  const list = env
    ? env.split(",").map((s) => s.trim()).filter(Boolean)
    : ["https://molipay-admin.vercel.app", "http://localhost:8081"];
  return list.map((o) => o.replace(/\/+$/, ""));
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = (req.headers.get("Origin") ?? "").replace(/\/+$/, "");
  const allowed = allowedOrigins();
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "content-type": "application/json" },
  });
}

/** Envuelve el handler: OPTIONS, solo POST, errores -> JSON con status. */
export function serve(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
    if (req.method !== "POST") return json(req, { error: "Método no permitido" }, 405);
    try {
      return await handler(req);
    } catch (e) {
      if (e instanceof HttpError) return json(req, { error: e.message }, e.status);
      console.error(e);
      return json(req, { error: "Error interno" }, 500);
    }
  });
}

export type Caller = {
  /** id del usuario que llama (auth.users.id). */
  id: string;
  /** Cliente con el JWT del usuario: RLS y RPC corren con sus permisos. */
  user: SupabaseClient;
  /** Cliente con service role: solo despues de autorizar. */
  admin: SupabaseClient;
};

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new HttpError(500, "Falta configuración del servidor");
  return v;
}

/** Verifica la sesion y que el usuario tenga el permiso. Si no, 401/403. */
export async function requirePermission(req: Request, permission: string): Promise<Caller> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Falta la sesión");

  const url = env("SUPABASE_URL");
  const user = createClient(url, env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: who, error: whoErr } = await user.auth.getUser(token);
  if (whoErr || !who.user) throw new HttpError(401, "Sesión inválida o vencida");

  const { data: ok, error } = await user.rpc("has_permission", { p_code: permission });
  if (error) throw new HttpError(500, "No se pudo verificar el permiso");

  const admin = createClient(url, env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  if (ok !== true) {
    await recordSecurityEvent(admin, req, {
      action: "access.denied",
      outcome: "denied",
      actorId: who.user.id,
      metadata: { permission },
    });
    throw new HttpError(403, "No tenés permiso para esta acción");
  }
  return { id: who.user.id, user, admin };
}

/** URL de retorno de los emails: solo a origenes permitidos. */
export function safeRedirect(raw: unknown, path: string): string {
  const allowed = allowedOrigins();
  let origin = allowed[0];
  if (typeof raw === "string") {
    try {
      const u = new URL(raw);
      if (allowed.includes(u.origin)) origin = u.origin;
    } catch {
      /* se usa el primero permitido */
    }
  }
  return `${origin}${path}`;
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Body inválido");
  }
}

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
