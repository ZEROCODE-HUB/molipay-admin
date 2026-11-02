// Edge Function: alta de usuario del backoffice por INVITACION.
//
//   POST { fullName, email, roleId, staffCode?, redirectTo? }
//
// 1. Verifica sesion + permiso backoffice.users.invite (y Admin si el rol es Admin).
// 2. Supabase Auth envia el email de invitacion (SMTP configurado en Supabase;
//    en produccion: Resend). El link vuelve a <admin>/definir-clave.
// 3. Crea backoffice_users con must_change_password = true: sin permisos hasta
//    que defina su clave (un trigger sobre auth.users lo libera).
// Si falla el paso 3 se borra el usuario de Auth (sin huerfanos).
//
// Deploy: supabase functions deploy invite-backoffice-user

import {
  EMAIL_RE,
  HttpError,
  json,
  readJson,
  requirePermission,
  safeRedirect,
  serve,
} from "../_shared/backoffice.ts";

type Body = { fullName?: string; email?: string; roleId?: string; staffCode?: string; redirectTo?: string };

serve(async (req) => {
  const caller = await requirePermission(req, "backoffice.users.invite");
  const body = await readJson<Body>(req);

  const fullName = (body.fullName ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const roleId = (body.roleId ?? "").trim();
  if (fullName.length < 2) throw new HttpError(400, "Indicá el nombre (mínimo 2 caracteres)");
  if (!EMAIL_RE.test(email)) throw new HttpError(400, "Email inválido");
  if (!roleId) throw new HttpError(400, "Elegí un rol");

  const { data: role, error: roleErr } = await caller.admin
    .from("roles")
    .select("id, name, is_superadmin")
    .eq("id", roleId)
    .maybeSingle();
  if (roleErr) throw new HttpError(500, "No se pudo leer el rol");
  if (!role) throw new HttpError(400, "El rol no existe");
  if (role.is_superadmin) {
    const { data: callerIsAdmin } = await caller.user.rpc("is_admin");
    if (callerIsAdmin !== true) throw new HttpError(403, "Solo un Admin puede invitar a otro Admin");
  }

  const { data: existing } = await caller.admin.from("backoffice_users").select("id").eq("email", email).maybeSingle();
  if (existing) throw new HttpError(409, "Ya existe un usuario del backoffice con ese email");

  // Staff code: the given one or the email's local part; must be unique.
  const base = ((body.staffCode ?? "").trim() || email.split("@")[0]).toUpperCase().replace(/[^A-Z0-9._-]/g, "").slice(0, 30) || "USR";
  let staffCode = base;
  for (let i = 2; i < 50; i++) {
    const { data: taken } = await caller.admin.from("backoffice_users").select("id").eq("staff_code", staffCode).maybeSingle();
    if (!taken) break;
    if (body.staffCode) throw new HttpError(409, `El legajo ${staffCode} ya está en uso`);
    staffCode = `${base}${i}`;
  }

  const redirectTo = safeRedirect(body.redirectTo, "/definir-clave");
  const { data: invited, error: invErr } = await caller.admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { full_name: fullName, backoffice: true },
  });
  if (invErr || !invited?.user) {
    const msg = invErr?.message ?? "";
    if (/already been registered|already exists/i.test(msg)) {
      throw new HttpError(409, "Ese email ya tiene una cuenta en la plataforma (por ejemplo, de cliente). Usá otro email.");
    }
    if (/rate limit/i.test(msg)) {
      throw new HttpError(429, "Se alcanzó el límite de emails por hora. Configurá el SMTP (Resend) en Supabase o probá más tarde.");
    }
    throw new HttpError(400, msg || "No se pudo enviar la invitación");
  }

  const { error: insErr } = await caller.admin.from("backoffice_users").insert({
    id: invited.user.id,
    email,
    full_name: fullName,
    staff_code: staffCode,
    role_id: role.id,
    is_active: true,
    must_change_password: true,
    invited_at: new Date().toISOString(),
    created_by: caller.id,
  });
  if (insErr) {
    await caller.admin.auth.admin.deleteUser(invited.user.id);
    throw new HttpError(400, insErr.message || "No se pudo crear el usuario");
  }

  // El alta queda en security_events (admin.user.created) y el rol asignado en
  // rbac_audit_log, ambos por trigger sobre backoffice_users.
  return json(req, { id: invited.user.id, email, staffCode });
});
