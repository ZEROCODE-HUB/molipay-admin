-- ============================================================================
-- 0023_fix_eliminacion_y_filtro_admin.sql
-- Corrige dos incidencias reportadas:
--   1) "Eliminé a joseandres83.diaz@gmail.com pero sigue pudiendo ingresar"
--      -> hardDeleteCliente borraba solo public.clientes, dejaba auth.users
--         vivo (el login via supabase auth seguía válido).
--   2) "andres@zerocode.la sale en lista persona física siendo admin"
--      -> no debe aparecer en /admin/general/usuarios (tipo fisica/juridica);
--         solo en /admin/administracion/usuarios (backoffice).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Limpieza inmediata de duplicados existentes:
--    Cualquier cliente cuyo correo coincida con un admin_users.email es un
--    duplicado huérfano y debe desaparecer de la lista de clientes.
-- ---------------------------------------------------------------------------
delete from public.clientes
where lower(correo) in (select lower(email) from public.admin_users);

-- Caso específico reportado (por si admin_users aún no tenía la fila en el
-- momento de la migración, o el cliente fue creado con mayúsculas distintas)
delete from public.clientes where lower(correo) = lower('andres@zerocode.la');
delete from public.clientes where lower(correo) = lower('joseandres83.diaz@gmail.com');

-- Si el usuario eliminado sigue en auth, intentar borrarlo también (si la
-- función existe en este entorno, la usamos; si no, el Edge Function lo hará).
-- Borrado directo en auth.users requiere privilegios del owner; lo hacemos en
-- una función SECURITY DEFINER abajo y la invocamos aquí vía SQL directo
-- cuando sea posible. En Supabase cloud, auth.users es borrable por service_role
-- pero no por postgres anon; por eso envolvemos en DO con manejo de error.

-- ---------------------------------------------------------------------------
-- 2) Trigger: impedir futuros clientes con email de admin
-- ---------------------------------------------------------------------------
create or replace function public.prevent_cliente_con_email_admin()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.admin_users where lower(email) = lower(new.correo)) then
    raise exception 'No se puede crear/modificar cliente con email de backoffice (%) — use Administración > Usuarios', new.correo;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_cliente_admin_email on public.clientes;
create trigger trg_prevent_cliente_admin_email
  before insert or update of correo on public.clientes
  for each row execute function public.prevent_cliente_con_email_admin();

-- ---------------------------------------------------------------------------
-- 3) Trigger: al borrar un cliente, borrar también su usuario de auth y
--    cualquier fila huérfana en admin_users con ese mismo email.
--    Usa SECURITY DEFINER para poder tocar auth.users aunque el caller sea anon.
-- ---------------------------------------------------------------------------
create or replace function public.handle_cliente_deleted_cleanup()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Borrar de auth.users por email (si existe). En Supabase, auth.users.email
  -- es único; el delete es idempotente.
  begin
    delete from auth.users where lower(email) = lower(old.correo);
  exception when others then
    -- Si no hay permisos o la tabla no es visible, no bloquear el delete del cliente
    raise notice 'handle_cliente_deleted_cleanup: no se pudo borrar auth.users para %: %', old.correo, sqlerrm;
  end;

  -- Limpiar admin_users huérfano con mismo email (por si era admin duplicado)
  begin
    delete from public.admin_users where lower(email) = lower(old.correo);
  exception when others then
    raise notice 'handle_cliente_deleted_cleanup: no se pudo borrar admin_users para %: %', old.correo, sqlerrm;
  end;

  return old;
end;
$$;

-- Solo disparamos en DELETE (hard delete). Los soft-deletes (estado) no tocan auth.
drop trigger if exists trg_cliente_deleted_cleanup on public.clientes;
create trigger trg_cliente_deleted_cleanup
  after delete on public.clientes
  for each row execute function public.handle_cliente_deleted_cleanup();

-- ---------------------------------------------------------------------------
-- 4) Helper RPC para borrar un auth user por email desde el cliente
--    (alternativa al Edge Function cuando se usa anon key).
--    SECURITY DEFINER + service_role-like privileges.
-- ---------------------------------------------------------------------------
create or replace function public.eliminar_auth_por_email(p_email text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if p_email is null or btrim(p_email) = '' then
    raise exception 'email vacío';
  end if;
  delete from auth.users where lower(email) = lower(btrim(p_email));
  -- También limpiar public por si el trigger no disparó (ej. borrado previo)
  delete from public.clientes where lower(correo) = lower(btrim(p_email));
  delete from public.admin_users where lower(email) = lower(btrim(p_email));
end;
$$;

grant execute on function public.eliminar_auth_por_email(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) Asegurar que el caso joseandres quede limpio en auth si aún existe
--    (best-effort, no falla si no hay permisos)
-- ---------------------------------------------------------------------------
do $$
begin
  perform public.eliminar_auth_por_email('joseandres83.diaz@gmail.com');
exception when others then
  raise notice 'cleanup joseandres falló (esperable si no hay auth): %', sqlerrm;
end $$;

do $$
begin
  -- andres@zerocode.la debe quedar SOLO como admin, no como cliente
  -- (ya borramos el cliente arriba; aquí aseguramos que no quede auth duplicado de cliente)
  -- No borramos su auth porque es admin activo; solo aseguramos que no haya cliente
  null;
end $$;

-- ---------------------------------------------------------------------------
-- Comentarios para auditoría
-- ---------------------------------------------------------------------------
comment on function public.prevent_cliente_con_email_admin() is 'Evita que un email de backoffice aparezca como cliente (persona física/jurídica). Reporte: andres@zerocode.la duplicado.';
comment on function public.handle_cliente_deleted_cleanup() is 'Al hard-delete de clientes, borra también auth.users para bloquear login. Reporte: joseandres83.diaz@gmail.com seguía ingresando.';
comment on function public.eliminar_auth_por_email(text) is 'RPC para borrar un usuario de auth por email desde el front (anon) cuando el trigger no alcanza. Usado por hardDeleteCliente.';
