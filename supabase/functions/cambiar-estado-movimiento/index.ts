// Edge Function: cambio manual de estado de un movimiento.
// Delega la operación atómica a la RPC `cambiar_estado_movimiento` (supabase/migrations/0002).
// Usa el JWT del usuario que llama para que la RPC valide que es un admin activo.

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Falta el token de sesión" }), {
      status: 401,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) {
    return new Response(JSON.stringify({ error: "Falta configuración del servidor" }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  let body: { movimiento_id?: string; nuevo_estado_id?: number; observaciones?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body inválido" }), {
      status: 400,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  const sb = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await sb.rpc("cambiar_estado_movimiento", {
    p_movimiento_id: body.movimiento_id,
    p_nuevo_estado_id: body.nuevo_estado_id,
    p_comentario: body.observaciones ?? null,
  });

  if (error) {
    const status = /42501/.test(error.code ?? "") || /permiso/i.test(error.message) ? 403 : 400;
    return new Response(JSON.stringify({ error: error.message }), {
      status,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    headers: { ...cors, "content-type": "application/json" },
  });
});
