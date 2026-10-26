-- ============================================================================
-- Validaciones de 20261026120000_subaccounts_split_balances.sql
-- Solo lectura salvo la seccion C (smoke tests), que termina en ROLLBACK.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A. ANTES de migrar: guardar el resultado (export CSV desde el SQL Editor)
-- ----------------------------------------------------------------------------
SELECT count(*) AS subcuentas,
       sum(saldo_disponible) AS sum_disponible,
       sum(saldo_retenido)   AS sum_retenido,
       sum(saldo_conciliado) AS sum_conciliado
  FROM public.subcuentas;

SELECT id, saldo_disponible, saldo_retenido, saldo_conciliado
  FROM public.subcuentas
 ORDER BY id;

SELECT public.rpc_pool_recaudacion() AS pool_antes;

-- ----------------------------------------------------------------------------
-- B. DESPUES de migrar
-- ----------------------------------------------------------------------------

-- B1. Conteos y sumas (deben ser iguales a A)
SELECT (SELECT count(*) FROM public.subaccounts)         AS subaccounts,
       (SELECT count(*) FROM public.subaccount_balances) AS balances,
       sum(saldo_disponible) AS sum_disponible,
       sum(saldo_retenido)   AS sum_retenido,
       sum(saldo_conciliado) AS sum_conciliado
  FROM public.subaccount_balances;

-- B2. Saldos por subcuenta (comparar fila a fila con el CSV de A)
SELECT subaccount_id AS id, saldo_disponible, saldo_retenido, saldo_conciliado
  FROM public.subaccount_balances
 ORDER BY subaccount_id;

-- B3. Subcuentas sin saldo / saldos huerfanos (ambos 0)
SELECT (SELECT count(*) FROM public.subaccounts s
         WHERE NOT EXISTS (SELECT 1 FROM public.subaccount_balances b WHERE b.subaccount_id = s.id)) AS sin_saldo,
       (SELECT count(*) FROM public.subaccount_balances b
         WHERE NOT EXISTS (SELECT 1 FROM public.subaccounts s WHERE s.id = b.subaccount_id))   AS huerfanos;

-- B4. Columnas de saldo ya no estan en subaccounts (0 filas)
SELECT attname FROM pg_attribute
 WHERE attrelid = 'public.subaccounts'::regclass
   AND attname LIKE 'saldo\_%' AND NOT attisdropped;

-- B5. FKs que apuntan a subaccounts (esperado: movimientos, comisiones_cliente,
--     plantillas_transferencia, transferencias_borrador, transferencias_programadas,
--     subaccount_balances) con sus ON DELETE originales
SELECT conrelid::regclass AS tabla, conname, pg_get_constraintdef(oid) AS def, convalidated
  FROM pg_constraint
 WHERE confrelid = 'public.subaccounts'::regclass
 ORDER BY 1;

-- B6. Restricciones, indices y triggers de las dos tablas
SELECT conrelid::regclass, conname, pg_get_constraintdef(oid)
  FROM pg_constraint
 WHERE conrelid IN ('public.subaccounts'::regclass, 'public.subaccount_balances'::regclass)
 ORDER BY 1, 2;
SELECT indexrelid::regclass, pg_get_indexdef(indexrelid)
  FROM pg_index
 WHERE indrelid IN ('public.subaccounts'::regclass, 'public.subaccount_balances'::regclass);
SELECT tgrelid::regclass, tgname, pg_get_triggerdef(oid)
  FROM pg_trigger
 WHERE tgrelid IN ('public.subaccounts'::regclass, 'public.subaccount_balances'::regclass)
   AND NOT tgisinternal;

-- B7. Politicas RLS (subaccounts: las 7 renombradas subaccounts_*;
--     subaccount_balances: _select y _update_admin) y RLS activo
SELECT tablename, policyname, cmd, roles, qual, with_check
  FROM pg_policies
 WHERE schemaname = 'public' AND tablename IN ('subaccounts', 'subaccount_balances')
 ORDER BY 1, 2;
SELECT relname, relrowsecurity FROM pg_class
 WHERE oid IN ('public.subaccounts'::regclass, 'public.subaccount_balances'::regclass);

-- B8. Permisos efectivos (anon sin nada en balances; authenticated SELECT +
--     UPDATE solo en las 3 columnas de saldo; service_role todo)
SELECT grantee, string_agg(privilege_type, ',' ORDER BY privilege_type) AS privs
  FROM information_schema.role_table_grants
 WHERE table_schema = 'public' AND table_name = 'subaccount_balances'
 GROUP BY grantee;
SELECT grantee, column_name, privilege_type
  FROM information_schema.column_privileges
 WHERE table_schema = 'public' AND table_name = 'subaccount_balances'
   AND grantee IN ('anon', 'authenticated')
 ORDER BY 1, 2, 3;

-- B9. Grants de las funciones adaptadas (deben ser iguales a antes)
SELECT p.oid::regprocedure, p.prosecdef, p.proconfig, p.proacl
  FROM pg_proc p
 WHERE p.pronamespace = 'public'::regnamespace
   AND p.proname IN ('calcular_comision_transferencia', 'validar_operacion_comercio',
                     'rpc_pool_recaudacion', 'registrar_transferencia_subcuentas',
                     'registrar_transferencia_externa', 'registrar_transferencia_bdc',
                     'aplicar_liquidacion_lote', 'acreditar_lote', 'fn_acreditar_adelanto',
                     'tg_subaccounts_init_balance', 'tg_subaccount_balances_touch')
 ORDER BY 1;

-- B10. Referencias SQL obsoletas a subcuentas (0 filas)
SELECT p.oid::regprocedure
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
   AND p.prosrc ~* '(public\.|from\s+|join\s+|update\s+|into\s+)"?subcuentas"?\M';
SELECT schemaname, viewname FROM pg_views
 WHERE definition ~* '\msubcuentas\M' AND schemaname NOT IN ('pg_catalog', 'information_schema');
SELECT jobname FROM cron.job WHERE command ~* 'subcuentas|saldo_';

-- B11. El pool de recaudacion debe dar lo mismo que en A
SELECT public.rpc_pool_recaudacion() AS pool_despues;

-- ----------------------------------------------------------------------------
-- C. Smoke tests de funciones (TODO termina en ROLLBACK, no deja cambios).
--    Reemplazar los placeholders <...> por datos reales de un cliente de prueba.
-- ----------------------------------------------------------------------------
BEGIN;

-- C1. Trigger: una subcuenta nueva nace con saldo en 0
INSERT INTO public.subaccounts (cliente_legajo, nombre, tipo)
VALUES ('<LEGAJO_DE_PRUEBA>', 'smoke-test', 'Operativa')
RETURNING id;
SELECT b.* FROM public.subaccount_balances b
  JOIN public.subaccounts s ON s.id = b.subaccount_id
 WHERE s.nombre = 'smoke-test';

-- C2. Transferencia entre subcuentas como el cliente (RLS + funcion)
SELECT set_config('request.jwt.claims',
                  json_build_object('sub', '<AUTH_UID_CLIENTE>', 'email', '<CORREO_CLIENTE>',
                                    'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

SELECT subaccount_id, saldo_disponible FROM public.subaccount_balances;  -- solo las propias
SELECT public.registrar_transferencia_subcuentas('<SUB_ORIGEN>', '<SUB_DESTINO>', 1, 'smoke');
SELECT subaccount_id, saldo_disponible FROM public.subaccount_balances
 WHERE subaccount_id IN ('<SUB_ORIGEN>', '<SUB_DESTINO>');               -- -1 / +1

-- C3. El cliente NO puede editar su saldo directo (0 filas o permiso denegado)
UPDATE public.subaccount_balances SET saldo_disponible = 999999
 WHERE subaccount_id = '<SUB_ORIGEN>';

ROLLBACK;
