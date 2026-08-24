// Edge Function: alta de usuario admin con rol.
// 1) Resuelve el rol_id desde la tabla `roles` por nombre (o usa rolId directo).
// 2) Crea el usuario en Supabase Auth (admin.createUser).
// 3) Inserta la fila en admin_users con ese mismo id y rol_id.
// Operación coordinada: si falla el insert en admin_users se elimina el usuario
// de Auth para no dejar huérfanos.

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) {
    return new Response(JSON.stringify({ error: "Falta configuración del servidor" }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  let body: {
    email?: string;
    password?: string;
    nombre?: string;
    legajo?: string;
    rol?: string;
    rolId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body inválido" }), {
      status: 400,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  if (!body.email || !body.password || !body.nombre) {
    return new Response(JSON.stringify({ error: "Faltan email, password o nombre" }), {
      status: 400,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  const sb = createClient(url, service, { auth: { autoRefreshToken: false } });

  // 1) Resolver rol_id.
  let rolId = body.rolId ?? null;
  if (!rolId && body.rol) {
    const { data: rolRow, error: rolErr } = await sb
      .from("roles")
      .select("id")
      .eq("nombre", body.rol)
      .maybeSingle();
    if (rolErr) {
      return new Response(JSON.stringify({ error: "Error al resolver el rol" }), {
        status: 400,
        headers: { ...cors, "content-type": "application/json" },
      });
    }
    if (!rolRow) {
      return new Response(JSON.stringify({ error: `Rol "${body.rol}" no encontrado` }), {
        status: 400,
        headers: { ...cors, "content-type": "application/json" },
      });
    }
    rolId = rolRow.id;
  }
  if (!rolId) {
    return new Response(JSON.stringify({ error: "Debe indicar rol o rolId" }), {
      status: 400,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  // 2) Crear usuario en Auth.
  const { data, error } = await sb.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { nombre: body.nombre, legajo: body.legajo ?? null },
  });

  if (error || !data.user) {
    return new Response(
      JSON.stringify({ error: error?.message ?? "No se pudo crear el usuario" }),
      {
        status: 400,
        headers: { ...cors, "content-type": "application/json" },
      },
    );
  }

  // 3) Insertar fila en admin_users con el mismo id y el rol_id resuelto.
  const { error: insErr } = await sb.from("admin_users").insert({
    id: data.user.id,
    legajo: (body.legajo ?? body.email.split("@")[0]).toUpperCase(),
    email: body.email,
    nombre: body.nombre,
    activo: true,
    rol_id: rolId,
  });

  if (insErr) {
    // Rollback coordinado: eliminar el usuario de Auth para no dejar huérfano.
    await sb.auth.admin.deleteUser(data.user.id);
    return new Response(
      JSON.stringify({ error: insErr.message ?? "No se pudo crear el admin_users" }),
      { status: 400, headers: { ...cors, "content-type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ id: data.user.id, email: data.user.email }), {
    headers: { ...cors, "content-type": "application/json" },
  });
});
