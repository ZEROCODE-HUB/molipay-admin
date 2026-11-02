// Edge Function: acciones sobre usuarios del backoffice que necesitan la API
// de administracion de Supabase Auth.
//
//   POST { action: "send_password_link", userId, redirectTo? }
//        Reenvia la invitacion (si nunca definio clave) o resetea la clave:
//        marca must_change_password (queda sin permisos) y envia el email.
//        Permiso: backoffice.users.update (reenviar invitacion: users.invite).
//
//   POST { action: "set_active", userId, active }
//        Activa o desactiva. Las reglas (no a uno mismo, ultimo Admin, solo un
//        Admin toca a otro Admin) las aplica la RPC backoffice_user_set_active
//        con el JWT del que llama. Desactivar ademas bloquea el usuario en Auth
//        (corta las sesiones abiertas). Permiso: backoffice.users.deactivate.
//
// Deploy: supabase functions deploy backoffice-user-admin

import { HttpError, json, readJson, requirePermission, safeRedirect, serve } from "../_shared/backoffice.ts";
import { recordSecurityEvent } from "../_shared/security-events.ts";

type Body = { action?: string; userId?: string; active?: boolean; redirectTo?: string };

const BAN_FOREVER = "876000h"; // ~100 years

serve(async (req) => {
  const body = await readJson<Body>(req);
  const userId = (body.userId ?? "").trim();
  if (!userId) throw new HttpError(400, "Falta el usuario");

  if (body.action === "set_active") {
    if (typeof body.active !== "boolean") throw new HttpError(400, "Falta indicar activo o inactivo");
    const caller = await requirePermission(req, "backoffice.users.deactivate");
    const { error } = await caller.user.rpc("backoffice_user_set_active", { p_user_id: userId, p_active: body.active });
    if (error) throw new HttpError(error.code === "42501" ? 403 : 400, error.message);

    const { error: banErr } = await caller.admin.auth.admin.updateUserById(userId, {
      ban_duration: body.active ? "none" : BAN_FOREVER,
    });
    if (banErr) {
      // The DB already deactivated it (no permissions); the Auth ban is the second layer.
      console.error("ban", banErr.message);
      return json(req, { ok: true, warning: "Usuario desactivado; no se pudo bloquear su sesión en Auth." });
    }
    return json(req, { ok: true });
  }

  if (body.action === "send_password_link") {
    // Read the target first to know which permission is required.
    const probe = await requirePermission(req, "backoffice.users.read");
    const { data: target, error: tErr } = await probe.admin
      .from("backoffice_users")
      .select("id, email, is_active, password_set_at, role_id, roles(is_superadmin)")
      .eq("id", userId)
      .maybeSingle();
    if (tErr) throw new HttpError(500, "No se pudo leer el usuario");
    if (!target) throw new HttpError(404, "Usuario no encontrado");
    if (!target.is_active) throw new HttpError(400, "El usuario está inactivo: activalo primero");

    const isInvitation = !target.password_set_at;
    const caller = await requirePermission(req, isInvitation ? "backoffice.users.invite" : "backoffice.users.update");
    const targetRole = Array.isArray(target.roles) ? target.roles[0] : target.roles;
    if (targetRole?.is_superadmin && target.id !== caller.id) {
      const { data: callerIsAdmin } = await caller.user.rpc("is_admin");
      if (callerIsAdmin !== true) throw new HttpError(403, "Solo un Admin puede resetear la clave de otro Admin");
    }

    const { error: updErr } = await caller.admin
      .from("backoffice_users")
      .update({ must_change_password: true })
      .eq("id", userId);
    if (updErr) throw new HttpError(400, updErr.message);

    const { error: mailError } = await caller.admin.auth.resetPasswordForEmail(target.email, {
      redirectTo: safeRedirect(body.redirectTo, "/definir-clave"),
    });
    if (mailError) {
      if (/rate limit/i.test(mailError.message)) {
        throw new HttpError(429, "Se alcanzó el límite de emails por hora. Configurá el SMTP (Resend) en Supabase o probá más tarde.");
      }
      throw new HttpError(400, mailError.message);
    }

    await recordSecurityEvent(caller.admin, req, {
      action: isInvitation ? "admin.user.invitation_resent" : "admin.user.password_reset_sent",
      actorId: caller.id,
      targetType: "backoffice_user",
      targetId: userId,
      targetUserId: userId,
      metadata: { email: target.email },
    });
    return json(req, { ok: true, invitation: isInvitation });
  }

  throw new HttpError(400, "Acción desconocida");
});
