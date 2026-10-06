// Edge Function: eliminación completa de usuario (auth + clientes + admin_users).
// Recibe { email } o { user_id } o { legajo }. Busca el usuario en auth y lo borra
// via auth.admin.deleteUser (requiere service_role). También limpia filas huérfanas
// en public.clientes y public.admin_users por email.
// Usado por hardDeleteCliente para garantizar que "Eliminar" bloquee el login.

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

  let body: { email?: string; user_id?: string; legajo?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body inválido" }), {
      status: 400,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  const email = body.email?.trim().toLowerCase() ?? null;
  const userId = body.user_id?.trim() ?? null;
  const legajo = body.legajo?.trim().toUpperCase() ?? null;

  if (!email && !userId && !legajo) {
    return new Response(JSON.stringify({ error: "Debe indicar email, user_id o legajo" }), {
      status: 400,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  const sb = createClient(url, service, { auth: { autoRefreshToken: false } });

  // Resolver user id / email si solo vino legajo
  let targetEmail = email;
  let targetId = userId;

  if (legajo && !targetEmail && !targetId) {
    const { data: cli } = await sb.from("clientes").select("correo").eq("legajo", legajo).maybeSingle();
    if (cli?.correo) targetEmail = cli.correo.toLowerCase();
    const { data: adm } = await sb.from("admin_users").select("email").eq("legajo", legajo).maybeSingle();
    if (!targetEmail && adm?.email) targetEmail = adm.email.toLowerCase();
  }

  // Si tenemos email pero no id, buscar en auth
  if (targetEmail && !targetId) {
    // listUsers con paginación hasta encontrar coincidencia (evita scan completo si es reciente)
    let page = 1;
    const perPage = 200;
    outer: for (let attempt = 0; attempt < 10; attempt++) {
      const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
      if (error) break;
      const found = data.users.find((u) => u.email?.toLowerCase() === targetEmail);
      if (found) {
        targetId = found.id;
        break outer;
      }
      if (data.users.length < perPage) break;
      page++;
    }
  }

  // Si tenemos id pero no email, resolver email para limpieza en public
  if (targetId && !targetEmail) {
    const { data } = await sb.auth.admin.getUserById(targetId);
    if (data?.user?.email) targetEmail = data.user.email.toLowerCase();
  }

  const results: Record<string, unknown> = {};

  // 1) Borrar de auth.users (bloquea login)
  if (targetId) {
    const { error: delErr } = await sb.auth.admin.deleteUser(targetId);
    if (delErr) {
      // No es fatal: puede que ya no exista, continuamos con limpieza de public
      results.auth_delete_error = delErr.message;
    } else {
      results.auth_deleted = targetId;
    }
  } else if (targetEmail) {
    // No se encontró en auth: quizá ya fue borrado o es cliente sin auth (ej. seed)
    results.auth_not_found = targetEmail;
  }

  // 2) Limpieza en public (idempotente, ignora RLS porque usamos service_role)
  if (targetEmail) {
    const { error: cliErr, count: cliCount } = await sb
      .from("clientes")
      .delete()
      .eq("correo", targetEmail);
    // supabase-js no expone count en delete sin select; ignoramos
    if (cliErr) results.clientes_error = cliErr.message;
    else results.clientes_cleaned = targetEmail;

    const { error: admErr } = await sb.from("admin_users").delete().eq("email", targetEmail);
    if (admErr) results.admin_users_error = admErr.message;
    else results.admin_users_cleaned = targetEmail;
  }

  // Caso histórico específico reportado: asegurar que joseandres no quede huérfano
  // (si vino legajo, ya se cubrió; si no, igual intentamos por email directo)
  if (!targetEmail && legajo) {
    // ya intentado arriba
  }

  return new Response(JSON.stringify({ ok: true, ...results, email: targetEmail, user_id: targetId }), {
    headers: { ...cors, "content-type": "application/json" },
  });
});
