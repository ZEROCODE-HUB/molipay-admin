// Registro de eventos de seguridad (tabla security_events) desde las Edge Functions.
//
// Escribe solo via la RPC security_event_record (service_role): la base valida
// el evento contra el catalogo y filtra claves sensibles de metadata.
// Nunca interrumpe la operacion: si no se puede registrar, deja una linea
// [security_event_lost] en los logs de la funcion.
//
// Nunca pasar en metadata: claves, tokens, JWT, API keys completas, secretos,
// OTP, cookies ni headers de autorizacion.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type SecurityEventInput = {
  action: string;
  outcome?: "success" | "failure" | "denied";
  actorType?: "user" | "staff" | "service" | "anonymous" | "system" | "unknown";
  actorId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  targetUserId?: string | null;
  tenantId?: string | null;
  metadata?: Record<string, unknown>;
};

/** IP del cliente segun el gateway de Supabase (primer valor de x-forwarded-for). */
export function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("cf-connecting-ip") || null;
}

/** Nombre de la funcion (ultimo segmento de la URL) para el campo source. */
export function functionName(req: Request): string {
  return new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "unknown";
}

const RETRIES = 2;

export async function recordSecurityEvent(
  admin: SupabaseClient,
  req: Request,
  event: SecurityEventInput,
): Promise<void> {
  const params = {
    p_action: event.action,
    p_outcome: event.outcome ?? "success",
    p_actor_type: event.actorType ?? null,
    p_actor_id: event.actorId ?? null,
    p_target_type: event.targetType ?? null,
    p_target_id: event.targetId ?? null,
    p_target_user_id: event.targetUserId ?? null,
    p_tenant_id: event.tenantId ?? null,
    p_ip: clientIp(req),
    p_user_agent: req.headers.get("user-agent"),
    p_source: `edge:${functionName(req)}`,
    p_request_id: req.headers.get("x-request-id") ?? req.headers.get("sb-request-id"),
    p_metadata: event.metadata ?? {},
  };
  let lastError = "";
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const { error } = await admin.rpc("security_event_record", params);
    if (!error) return;
    lastError = error.message;
    // Error de validacion (evento desconocido, etc.): reintentar no sirve.
    if (error.code === "22023") break;
  }
  console.error(`[security_event_lost] action=${event.action} source=${params.p_source} error=${lastError}`);
}
