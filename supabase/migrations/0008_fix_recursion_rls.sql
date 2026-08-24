-- ============================================================================
-- 0008_fix_recursion_rls.sql
-- FECHA: 2026-08-23 | ESTADO: PROPUESTA - NO APLICADA - REQUIERE APROBACION
-- ============================================================================
-- Resuelve GAP-4 (ESTADO_ACTUAL.md seccion 16): auto-recursion RLS en el
-- patron admin-gated.
--
-- EVIDENCIA (sondeos REST como anon, 2026-08-23):
--   admin_users        -> HTTP 500 42P17 "infinite recursion detected in policy for relation admin_users"
--   clientes           -> HTTP 500 42P17 (misma raiz)
--   comisiones_cliente -> HTTP 500 42P17 (misma raiz)
--
-- CAUSA: las politicas con expresion inline
--     EXISTS (SELECT 1 FROM admin_users au JOIN roles r ... )
-- re-evaluan las politicas de admin_users al ejecutarse; la(s) politica(s)
-- de la PROPIA admin_users que contienen ese EXISTS se autorreferencian ->
-- recursion infinita en CUALQUIER query por camino RLS.
--
-- ACLARACION 6-vs-7 (revision del usuario): admin_users tiene TRES
-- politicas, no dos: manage_admins (ALL), select_all_admins (SELECT) y
-- select_own (SELECT, USING auth.uid() = id). Total real: 3 + 2 + 2 = 7.
--
-- ANALISIS DE select_own — EXCLUIDA DEL FIX, CON FUNDAMENTO:
--   * NO participa de la recursion: su USING es expresion pura
--     (auth.uid() = id), sin subquery sobre admin_users -> no dispara
--     re-evaluacion de politicas. Hipotesis del usuario CONFIRMADA.
--   * Igualmente no puede "salvar" la tabla sola: en SELECT se evaluan en
--     OR todas las politicas PERMISSIVE aplicables, incluidas las que SI
--     recursan; por eso el fix ataca solo a las autorreferenciales.
--   * Queda intacta y sin tocar en este archivo.
--
-- FIX: helper public.is_admin() SECURITY DEFINER STABLE. Dentro del cuerpo,
-- la lectura corre como OWNER -> las politicas RLS de admin_users NO se
-- aplican (owner bypasea RLS salvo FORCE ROW LEVEL SECURITY, que no esta
-- activo) -> la recursion desaparece por construccion. Predicado identico
-- al inline actual (activo + lower(nombre)='admin').
--
-- ESTRATEGIA SIN NOMBRES HARDCODEADOS: en vez de adivinar identificadores,
-- el drop es DINAMICO y AUTOTARGETEADO: elimina exactamente las politicas
-- de las 3 tablas cuya expresion (qual/with_check) referencia admin_users.
-- select_own queda excluida por definicion (no referencia la tabla).
-- Las recreadas adoptan nombres canonicos nuevos (normalizacion intencional,
-- documentada abajo). Los REVOKE existentes no se tocan. Sin cambios de datos.
--
-- ORDEN DE APLICACION PIEZA A PIEZA (verificacion entre piezas):
--   P0 helper is_admin()            -> sin cambio observable esperado
--   P1 politicas de admin_users     -> sondeo anon: 500 -> [] o denial limpio
--   P2 politicas de clientes        -> idem para clientes
--   P3 politicas de comisiones_cliente -> idem
--   P4 check final vista auditoria_legajos como anon -> denial/[] sin 500
-- ============================================================================


-- ───────────────────────────────────────────────────────────────────────────
-- PIEZA 0 [helper]: rompe la recursion por construccion
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.admin_users au
    join public.roles r on r.id = au.rol_id
    where au.id = auth.uid()
      and au.activo
      and lower(r.nombre) = 'admin'
  )
$function$;

COMMENT ON FUNCTION public.is_admin() IS
'Helper anti-recursion (GAP-4): SECURITY DEFINER para leer admin_users sin RLS. Unico punto de verdad del predicado admin-gated.';


-- ───────────────────────────────────────────────────────────────────────────
-- PIEZA 1 [admin_users]: drop autotargeteado + recreate canonica
--    drop esperado: manage_admins (ALL), select_all_admins (SELECT)
--    preservado por diseño: select_own
-- ───────────────────────────────────────────────────────────────────────────
DO $do$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_users'
      AND ( coalesce(qual,'') LIKE '%admin_users%'
         OR coalesce(with_check,'') LIKE '%admin_users%' )
  LOOP
    RAISE NOTICE 'dropping policy % on admin_users', r.policyname;
    EXECUTE format('DROP POLICY %I ON public.admin_users', r.policyname);
  END LOOP;
END $do$;

CREATE POLICY manage_admins ON public.admin_users
  FOR ALL
  USING ( is_admin() )
  WITH CHECK ( is_admin() );

CREATE POLICY select_all_admins ON public.admin_users
  FOR SELECT
  USING ( is_admin() );


-- ───────────────────────────────────────────────────────────────────────────
-- PIEZA 2 [clientes]: mismas dos politicas, nombres canonicos nuevos
--    (los nombres viejos se capturan en el NOTICE del drop)
-- ───────────────────────────────────────────────────────────────────────────
DO $do$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clientes'
      AND ( coalesce(qual,'') LIKE '%admin_users%'
         OR coalesce(with_check,'') LIKE '%admin_users%' )
  LOOP
    RAISE NOTICE 'dropping policy % on clientes', r.policyname;
    EXECUTE format('DROP POLICY %I ON public.clientes', r.policyname);
  END LOOP;
END $do$;

CREATE POLICY clientes_admin_all ON public.clientes
  FOR ALL
  USING ( is_admin() )
  WITH CHECK ( is_admin() );

CREATE POLICY clientes_admin_select ON public.clientes
  FOR SELECT
  USING ( is_admin() );


-- ───────────────────────────────────────────────────────────────────────────
-- PIEZA 3 [comisiones_cliente]: idem
-- ───────────────────────────────────────────────────────────────────────────
DO $do$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'comisiones_cliente'
      AND ( coalesce(qual,'') LIKE '%admin_users%'
         OR coalesce(with_check,'') LIKE '%admin_users%' )
  LOOP
    RAISE NOTICE 'dropping policy % on comisiones_cliente', r.policyname;
    EXECUTE format('DROP POLICY %I ON public.comisiones_cliente', r.policyname);
  END LOOP;
END $do$;

CREATE POLICY comisiones_cliente_admin_all ON public.comisiones_cliente
  FOR ALL
  USING ( is_admin() )
  WITH CHECK ( is_admin() );

CREATE POLICY comisiones_cliente_admin_select ON public.comisiones_cliente
  FOR SELECT
  USING ( is_admin() );


-- ───────────────────────────────────────────────────────────────────────────
-- VERIFICACIONES POST-APLICACION OBLIGATORIAS (correr cada una al cerrar
-- su pieza; los sondeos REST los ejecuta el agente entre piezas)
-- ───────────────────────────────────────────────────────────────────────────

-- V0 (tras Pieza 0): helper bien definido
--   SELECT proname, prosecdef, provolatile, proconfig
--   FROM pg_proc WHERE proname = 'is_admin';
--   ESPERADO: 1 fila, prosecdef = true, provolatile = 's'

-- V1 (tras Pieza 1): estado final de admin_users = 3 politicas
--   SELECT policyname, cmd, qual, with_check
--   FROM pg_policies WHERE tablename = 'admin_users';
--   ESPERADO: manage_admins(ALL, is_admin()), select_all_admins(SELECT,
--   is_admin()), select_own(SELECT, auth.uid() = id) — esta ultima INTACTA

-- V2/V3 (tras Piezas 2 y 3):
--   SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE tablename IN ('clientes','comisiones_cliente')
--   ORDER BY tablename, cmd;
--   ESPERADO: 2 filas por tabla, ambas con is_admin()

-- V4 (final, agente via sondeo anon):
--   GET /rest/v1/{admin_users,clientes,comisiones_cliente}  -> ya NO 500 42P17
--   GET /rest/v1/auditoria_legajos                          -> denial/[] sin 500
