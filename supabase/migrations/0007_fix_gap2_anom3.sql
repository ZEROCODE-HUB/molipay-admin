-- ============================================================================
-- 0007_fix_gap2_anom3.sql
-- FECHA: 2026-08-23 | ESTADO: PROPUESTA - NO APLICADA - REQUIERE APROBACION
-- ============================================================================
-- Dos fixes independientes, una sola sesion de aplicacion manual (SQL Editor).
--
-- SECCION 1 [GAP-2 - Camino A: trigger VIVO]
--   Evidencia (usuario, 2026-08-23): trigger on_auth_admin_user_created
--     AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION
--     handle_new_admin_user()  ->  la funcion rota se ejecuta HOY en cada
--     signup: inserta sobre admin_users.rol, columna eliminada por el
--     refactor rol -> rol_id. Toda alta de admin falla en prod.
--
--   Diferencias v2 vs fuente verbatim de produccion (0005 L678):
--     B1  rol_id se resuelve contra roles por lower(nombre). El default
--         cuando el meta no trae rol pasa de 'operador' (NO existe en el
--         catalogo real: Admin/Customer/Accounting/Management/User/
--         Compliance/Reader) a 'Reader'.
--     B2  Si ni el rol del meta ni el fallback 'Reader' existen ->
--         RAISE EXCEPTION (el signup falla ruidoso). Alternativa descartada:
--         dejar rol_id NULL romperia PEND-2 (SET NOT NULL decidido).
--         [DECISION ABIERTA PARA EL REVISOR]
--     B3  Insert con lista de columnas explicita usando rol_id. Se
--         conservan intactos: SECURITY DEFINER, search_path fijo,
--         on conflict (id) do nothing, reglas de legajo/nombre originales
--         (meta -> local-part del email).
--     B4  Opt-out para la Edge crear-admin: si el meta trae
--         admin_via_edge='true', la funcion retorna sin insertar (la Edge
--         escribe su propia fila con rol autoritativo y convenciones
--         propias: legajo UPPERCASE, activo=true). Sin esto, el trigger
--         del createUser insertaria una fila fantasma con Reader y el
--         insert posterior de la Edge moriria por duplicate key 23505,
--         disparando el rollback que borra al usuario (crear-admin/index.ts
--         L101-117). El guard depende UNICAMENTE de admin_via_edge.
--
-- SECCION 2 [ANOM-3 - vista auditoria_legajos sin security_invoker]
--   Evidencia (usuario, 2026-08-23): reloptions = null -> la vista corre
--   con privilegios del OWNER y bypasea el RLS de las tablas base.
--
--   CAMBIO DE COMPORTAMIENTO ESPERADO tras el fix: un authenticated sin
--   SELECT sobre una tabla subyacente (p.ej. movimientos, que es
--   solo-admin) recibira permission denied al consultar la vista, en vez
--   de leerla completa gracias al bypass del owner. Eso ES el hardening:
--   no es un regression, es el agujero cerrandose.
--
-- VERIFICACION POST-APLICACION OBLIGATORIA: al final de este archivo.
-- ============================================================================


-- ───────────────────────────────────────────────────────────────────────────
-- SECCION 1 [GAP-2]: recrear handle_new_admin_user (mismo nombre: el trigger
-- existente no se toca y queda apuntando a la nueva definicion)
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_legajo text := coalesce(new.raw_user_meta_data->>'legajo', split_part(new.email, '@', 1));
  v_nombre text := coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1));
  v_rol_solicitado text := coalesce(new.raw_user_meta_data->>'rol', 'Reader');
  v_rol_id public.roles.id%TYPE;
begin
  -- B4: camino Edge (crear-admin) escribe su propia fila; el trigger no interviene
  if coalesce(new.raw_user_meta_data->>'admin_via_edge', '') = 'true' then
    return new;
  end if;

  -- B1: resolver el rol pedido (case-insensitive, igual que politicas RLS)
  select id into v_rol_id
  from public.roles
  where lower(nombre) = lower(v_rol_solicitado);

  -- B1: fallback a minimo privilegio si el rol pedido no existe
  if v_rol_id is null then
    select id into v_rol_id
    from public.roles
    where lower(nombre) = 'reader';
  end if;

  -- B2: catalogo roto -> fallar ruidoso, nunca insertar rol_id NULL
  if v_rol_id is null then
    raise exception 'handle_new_admin_user: catalogo roles invalido (pedido "%" y sin fallback Reader)', v_rol_solicitado;
  end if;

  -- B3: insert quirurgico sobre la columna vigente
  insert into public.admin_users (id, legajo, email, nombre, rol_id)
  values (new.id, v_legajo, new.email, v_nombre, v_rol_id)
  on conflict (id) do nothing;

  return new;
end;
$function$;


-- ───────────────────────────────────────────────────────────────────────────
-- SECCION 2 [ANOM-3]: cerrar el bypass de RLS de la vista de auditoria
-- ───────────────────────────────────────────────────────────────────────────
ALTER VIEW public.auditoria_legajos SET (security_invoker = true);


-- ───────────────────────────────────────────────────────────────────────────
-- VERIFICACION POST-APLICACION OBLIGATORIA (lecciones GAP-1 y permisos)
-- Correr cada query en el SQL Editor y contrastar el resultado esperado:
-- ───────────────────────────────────────────────────────────────────────────

-- V1: la funcion usa rol_id y ya no referencia la columna eliminada
--     SELECT pg_get_functiondef('public.handle_new_admin_user()'::regprocedure);
--     ESPERADO: contiene "rol_id"; NO contiene "(id, legajo, email, nombre, rol)"

-- V2: el trigger sigue vivo y apuntando a la funcion recreada
--     SELECT tgname, tgenabled FROM pg_trigger
--     WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;
--     ESPERADO: on_auth_admin_user_created con tgenabled = 'O'

-- V3: la vista quedo endurecida
--     SELECT relname, reloptions FROM pg_class WHERE relname = 'auditoria_legajos';
--     ESPERADO: reloptions = {security_invoker=true}

-- V4 (opcional, prueba de humo del guard interno): como anon, intentar un
--     signup simulado NO es posible via SQL Editor; la prueba real sera el
--     proximo alta de admin. Con V1-V3 verdes, la cadena queda verificada
--     estaticamente.
