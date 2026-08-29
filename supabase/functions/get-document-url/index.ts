// Edge Function: genera URLs firmadas para objetos privados del Storage.
// Usa el service role (saltea RLS de storage) pero exige que quien llama sea
// un admin activo. La validación de admin la hace la RLS de `admin_users`
// (que ya exige rol admin), así que no necesitamos auth.getUser(): el sub del
// JWT se resuelve localmente y la consulta corre con el JWT del usuario.
//
// Acepta `transform` para devolver además un thumbnail redimensionado
// (más liviano para la grilla). Si el plan no tiene Image Resizing, el
// thumbnail cae al URL del original sin romper nada.
//
// Deploy:
//   supabase functions deploy get-document-url

import { createClient } from "jsr:@supabase/supabase-js@2";

function jwtSub(token: string): string | null {
  try {
    const part = token.split(".")[1];
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = new TextDecoder().decode(
      Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)),
    );
    const payload = JSON.parse(json);
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

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

  // Cliente con el JWT del usuario: la RLS de `admin_users` ya exige rol admin.
  const userSb = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const uid = jwtSub(token);
  if (!uid) {
    return new Response(JSON.stringify({ error: "Sesión inválida" }), {
      status: 401,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  const { data: admin, error: adminErr } = await userSb
    .from("admin_users")
    .select("id, activo, rol_id")
    .eq("id", uid)
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

  let body: {
    path?: string;
    paths?: string[];
    bucket?: string;
    expiresIn?: number;
    transform?: {
      width?: number;
      height?: number;
      resize?: "cover" | "contain" | "fill";
      quality?: number;
    };
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body inválido" }), {
      status: 400,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  const bucket = body.bucket ?? "kyc";
  const paths = Array.isArray(body.paths)
    ? body.paths.filter((p): p is string => typeof p === "string" && p.length > 0)
    : body.path && typeof body.path === "string"
      ? [body.path]
      : [];

  if (paths.length === 0) {
    return new Response(JSON.stringify({ error: "Falta el path del documento" }), {
      status: 400,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  const transform = body.transform &&
    typeof body.transform === "object" &&
    (body.transform.width || body.transform.height)
    ? body.transform
    : undefined;

  // Cliente con service role: firma sin depender de la RLS de storage.
  const adminSb = createClient(url, serviceRole, {
    auth: { persistSession: false },
  });

  const signedUrls: Record<string, string> = {};
  const thumbUrls: Record<string, string> = {};
  const exp = body.expiresIn ?? 3600;

  for (const p of paths) {
    const { data, error } = await adminSb.storage
      .from(bucket)
      .createSignedUrl(p, exp);
    if (!error && data?.signedUrl) signedUrls[p] = data.signedUrl;

    if (transform) {
      try {
        const { data: td, error: terr } = await adminSb.storage
          .from(bucket)
          .createSignedUrl(p, exp, { transform });
        if (!terr && td?.signedUrl) thumbUrls[p] = td.signedUrl;
        else if (data?.signedUrl) thumbUrls[p] = data.signedUrl;
      } catch {
        if (data?.signedUrl) thumbUrls[p] = data.signedUrl;
      }
    }
  }

  // Respuesta única (lotes): mapa path -> signedUrl (+ thumbnails si aplica).
  if (Array.isArray(body.paths)) {
    return new Response(JSON.stringify({ signedUrls, thumbUrls }), {
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  // Respuesta legacy: un solo path.
  const single = body.path as string;
  if (!signedUrls[single]) {
    return new Response(
      JSON.stringify({ error: "No se pudo firmar el archivo" }),
      { status: 404, headers: { ...cors, "content-type": "application/json" } },
    );
  }
  return new Response(
    JSON.stringify({ signedUrl: signedUrls[single], thumbUrl: thumbUrls[single] }),
    { headers: { ...cors, "content-type": "application/json" } },
  );
});
