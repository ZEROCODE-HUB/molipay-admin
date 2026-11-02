// Edge Function RETIRADA. Antes creaba usuarios admin con la service role sin
// verificar quien llamaba (cualquiera con la anon key podia crearse un Admin).
// Reemplazo: invite-backoffice-user (invitacion por email + permiso
// backoffice.users.invite). Se deja respondiendo 410 hasta borrarla del
// proyecto:  supabase functions delete crear-admin

Deno.serve(() =>
  new Response(JSON.stringify({ error: "Función retirada: usá invite-backoffice-user." }), {
    status: 410,
    headers: { "content-type": "application/json" },
  })
);
