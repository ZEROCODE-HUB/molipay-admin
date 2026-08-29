// Edge Function: genera una URL firmada para un objeto privado del Storage.
// Usa el service role (saltea RLS de storage) pero exige que quien llama sea
// un admin activo, validado con el JWT del usuario.
//
// Deploy:
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
//   supabase functions deploy get-document-url

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
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !serviceRole) {
    return new Response(JSON.stringify({ error: "Falta configuración del servidor" }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  // Cliente con el JWT del usuario para validar que es un admin activo.
  const userSb = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userErr } = await userSb.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "Sesión inválida" }), {
      status: 401,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  const { data: admin, error: adminErr } = await userSb
    .from("admin_users")
    .select("id, activo, rol_id")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (adminErr || !admin || !admin.activo) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 403,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  const { data: rol } = await userSb
    .from("roles")
    .select("nombre")
    .eq("id", admin.rol_id)
    .maybeSingle();

  if (!rol?.nombre || rol.nombre.toLowerCase() !== "admin") {
    return new Response(JSON.stringify({ error: "Se requiere rol admin" }), {
      status: 403,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  let body: { path?: string; bucket?: string; expiresIn?: number };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body inválido" }), {
      status: 400,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  const bucket = body.bucket ?? "kyc";
  const path = body.path;
  if (!path || typeof path !== "string") {
    return new Response(JSON.stringify({ error: "Falta el path del documento" }), {
      status: 400,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  // Cliente con service role: firma sin depender de la RLS de storage.
  const adminSb = createClient(url, serviceRole, {
    auth: { persistSession: false },
  });

  const { data, error } = await adminSb.storage
    .from(bucket)
    .createSignedUrl(path, body.expiresIn ?? 3600);

  if (error || !data?.signedUrl) {
    return new Response(
      JSON.stringify({ error: error?.message ?? "No se pudo firmar el archivo" }),
      { status: 404, headers: { ...cors, "content-type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ signedUrl: data.signedUrl }), {
    headers: { ...cors, "content-type": "application/json" },
  });
});
