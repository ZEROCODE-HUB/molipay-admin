// Edge Function: baja definitiva de un CLIENTE (auth.users + clientes).
//
//   POST { email? , user_id?, legajo? }
//
// Seguridad: exige sesion + permiso customers.delete. No borra usuarios del
// backoffice (esos se desactivan desde Usuarios backoffice).
// Usado por hardDeleteCliente para que "Eliminar" bloquee el login del cliente.
//
// Deploy: supabase functions deploy eliminar-usuario

import { HttpError, json, readJson, requirePermission, serve } from "../_shared/backoffice.ts";

type Body = { email?: string; user_id?: string; legajo?: string };

serve(async (req) => {
  const caller = await requirePermission(req, "customers.delete");
  const body = await readJson<Body>(req);

  let email = body.email?.trim().toLowerCase() || null;
  let userId = body.user_id?.trim() || null;
  const legajo = body.legajo?.trim().toUpperCase() || null;
  if (!email && !userId && !legajo) throw new HttpError(400, "Indicá email, user_id o legajo");

  const db = caller.admin;

  if (legajo && !email && !userId) {
    const { data: customer } = await db.from("clientes").select("correo").eq("legajo", legajo).maybeSingle();
    if (customer?.correo) email = customer.correo.toLowerCase();
  }
  if (userId && !email) {
    const { data } = await db.auth.admin.getUserById(userId);
    email = data?.user?.email?.toLowerCase() ?? null;
  }
  if (!email) throw new HttpError(404, "No se encontró el cliente");

  // Nunca un usuario del backoffice por esta via.
  const { data: staff } = await db.from("backoffice_users").select("id").eq("email", email).maybeSingle();
  if (staff) throw new HttpError(403, "Es un usuario del backoffice: se desactiva desde Usuarios backoffice");
  if (userId === caller.id) throw new HttpError(403, "No podés eliminar tu propio usuario");

  if (!userId) {
    // Busqueda paginada en Auth (sin endpoint por email en la API admin).
    const perPage = 200;
    for (let page = 1; page <= 50; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage });
      if (error) break;
      const found = data.users.find((u) => u.email?.toLowerCase() === email);
      if (found) {
        userId = found.id;
        break;
      }
      if (data.users.length < perPage) break;
    }
  }

  const result: Record<string, unknown> = { email, user_id: userId };
  if (userId) {
    const { error } = await db.auth.admin.deleteUser(userId);
    if (error) result.auth_delete_error = error.message;
    else result.auth_deleted = true;
  } else {
    result.auth_not_found = true;
  }

  const { error: customerError } = await db.from("clientes").delete().eq("correo", email);
  if (customerError) result.customer_delete_error = customerError.message;
  else result.customer_deleted = true;

  return json(req, { ok: true, ...result });
});
