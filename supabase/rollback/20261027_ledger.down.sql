-- ============================================================================
-- ROLLBACK del ledger (deshace 20261027103000, 20261027102000 y 20261027100000)
--
-- NO es una migracion: no ponerlo en supabase/migrations. Ejecutar completo
-- (SQL Editor o `psql -1 -v ON_ERROR_STOP=1 -f`) y solo si hace falta volver.
--
-- * La 20261027101000 (borrado de datos demo y saldos en 0) NO se revierte:
--   fue una decision de negocio y los datos demo no se conservaron.
-- * Los saldos actuales de subaccount_balances se conservan tal cual.
-- * Si ya hay asientos contables, se pierden con este rollback (el historial
--   de operaciones en transactions/movimientos se conserva). Por seguridad
--   aborta salvo que se confirme con:
--       SELECT set_config('molipay.rollback_ledger', 'confirmar', false);
--   en la misma sesion, antes de ejecutar este archivo.
-- * Las funciones vuelven a su definicion del remoto del 2026-10-27; sus
--   permisos quedan como los dejo la 4/4 (sin EXECUTE para anon).
-- ============================================================================

BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '5min';

DO $$
BEGIN
    IF to_regclass('public.ledger_entries') IS NULL OR to_regclass('public.transactions') IS NULL THEN
        RAISE EXCEPTION 'No se encuentra el esquema del ledger';
    END IF;
    IF EXISTS (SELECT 1 FROM public.ledger_entries)
       AND current_setting('molipay.rollback_ledger', true) IS DISTINCT FROM 'confirmar' THEN
        RAISE EXCEPTION 'Hay asientos contables: confirmar con set_config(''molipay.rollback_ledger'', ''confirmar'', false)';
    END IF;
END;
$$;

LOCK TABLE public.transactions, public.transaction_status_history, public.subaccount_balances,
           public.ledger_entries, public.ledger_accounts IN ACCESS EXCLUSIVE MODE;

-- ----------------------------------------------------------------------------
-- 5 y 4/4: vista por concepto, motor, guard y RPCs nuevas
-- ----------------------------------------------------------------------------
-- 6: comisiones por CVU
DROP TRIGGER IF EXISTS comisiones_cliente_subcuenta_valida ON public.comisiones_cliente;
DROP FUNCTION IF EXISTS public.tg_comisiones_cliente_subcuenta_valida();
ALTER TABLE public.comisiones_cliente DROP CONSTRAINT IF EXISTS comisiones_cliente_cvu_tipo_check;
DROP INDEX IF EXISTS public.idx_comisiones_cliente_subcuenta;
DROP POLICY IF EXISTS comisiones_cliente_select_own ON public.comisiones_cliente;
CREATE POLICY comisiones_cliente_own_or_admin
    ON public.comisiones_cliente FOR ALL TO authenticated
    USING (is_admin() OR EXISTS (SELECT 1 FROM clientes c
                                  WHERE c.id = comisiones_cliente.cliente_id AND lower(c.correo) = lower(auth.email())));
DROP FUNCTION IF EXISTS public.cotizar_transferencia(uuid,numeric,text);

DROP VIEW IF EXISTS public.v_transaction_lines;
DROP INDEX IF EXISTS public.idx_transactions_destinatario_cuit;
DROP INDEX IF EXISTS public.idx_transactions_cvu;

DROP TRIGGER subaccount_balances_guard ON public.subaccount_balances;
DROP FUNCTION public.tg_subaccount_balances_guard();

DROP FUNCTION public.reservar_transferencia_bdc(uuid,text,text,numeric,text,text,text,text);
DROP FUNCTION public.reservar_transferencia_servicio(uuid,text,text,numeric,text,text,text);
DROP FUNCTION public.confirmar_transferencia_bdc(text,text);
DROP FUNCTION public.cancelar_transferencia_bdc(text,text);
DROP FUNCTION public.registrar_deposito_entrante(text,text,numeric,text,text,text,timestamptz);
DROP FUNCTION public.ajustar_saldo_subcuenta(uuid,numeric,text,text);
DROP FUNCTION public.ledger_conciliar_saldos();

-- Los helpers se borran despues de restaurar las funciones que los usan
-- (ver final), para que ningun cuerpo quede apuntando a algo inexistente.

GRANT SELECT ON TABLE public.subaccount_balances TO authenticated;
GRANT UPDATE (saldo_disponible, saldo_retenido, saldo_conciliado) ON TABLE public.subaccount_balances TO authenticated;
CREATE POLICY subaccount_balances_update_admin
    ON public.subaccount_balances FOR UPDATE TO authenticated
    USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

-- ----------------------------------------------------------------------------
-- 3/4: tablas del ledger y columnas contables
-- ----------------------------------------------------------------------------
DROP TABLE public.ledger_entries;
DROP TABLE public.ledger_accounts;
DROP FUNCTION public.tg_ledger_entries_guard();
DROP FUNCTION public.tg_ledger_entries_balanced();

ALTER TABLE public.subaccount_balances
    DROP CONSTRAINT subaccount_balances_disponible_no_negativo,
    DROP CONSTRAINT subaccount_balances_retenido_no_negativo;

DROP INDEX public.idx_transactions_ledger_status;
ALTER TABLE public.transactions
    DROP CONSTRAINT transactions_ledger_status_check,
    DROP CONSTRAINT transactions_currency_code_check,
    DROP COLUMN ledger_status,
    DROP COLUMN currency_code;

DROP POLICY transactions_insert_admin ON public.transactions;
CREATE POLICY transactions_insert_admin
    ON public.transactions FOR INSERT TO authenticated
    WITH CHECK (is_admin() OR (legajo = legajo_de_sesion()));

-- ----------------------------------------------------------------------------
-- 1/4: nombres originales
-- ----------------------------------------------------------------------------
ALTER TABLE public.transactions RENAME TO movimientos;
ALTER TABLE public.transaction_status_history RENAME TO movimientos_transiciones;
ALTER TABLE public.movimientos_transiciones RENAME COLUMN transaction_id TO movimiento_id;

DO $$
DECLARE
    r record;
    t record;
BEGIN
    FOR t IN
        SELECT * FROM (VALUES
            ('public.movimientos_transiciones'::regclass, 'transaction_status_history_', 'movimientos_transiciones_'),
            ('public.movimientos'::regclass,              'transactions_',               'movimientos_')
        ) v(rel, viejo, nuevo)
    LOOP
        FOR r IN
            SELECT conname FROM pg_constraint
             WHERE conrelid = t.rel AND conname LIKE replace(t.viejo, '_', '\_') || '%'
        LOOP
            EXECUTE format('ALTER TABLE %s RENAME CONSTRAINT %I TO %I', t.rel, r.conname,
                           t.nuevo || substr(r.conname, length(t.viejo) + 1));
        END LOOP;
    END LOOP;

    FOR r IN
        SELECT c.relname
          FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
         WHERE i.indrelid IN ('public.movimientos'::regclass, 'public.movimientos_transiciones'::regclass)
           AND c.relname ~ '(transactions|transaction_status_history)'
           AND NOT EXISTS (SELECT 1 FROM pg_constraint k WHERE k.conindid = i.indexrelid)
    LOOP
        EXECUTE format('ALTER INDEX public.%I RENAME TO %I', r.relname,
                       replace(replace(r.relname, 'transaction_status_history', 'movimientos_transiciones'), 'transactions', 'movimientos'));
    END LOOP;

    FOR r IN
        SELECT tablename, policyname FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename IN ('movimientos', 'movimientos_transiciones')
           AND policyname ~ '(transactions|transaction_status_history)'
    LOOP
        EXECUTE format('ALTER POLICY %I ON public.%I RENAME TO %I', r.policyname, r.tablename,
                       replace(replace(r.policyname, 'transaction_status_history', 'movimientos_transiciones'), 'transactions', 'movimientos'));
    END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- Funciones originales (pg_get_functiondef del remoto, 2026-10-27)
-- ----------------------------------------------------------------------------

-- cambiar_estado_movimiento
CREATE OR REPLACE FUNCTION public.cambiar_estado_movimiento(p_movimiento_id uuid, p_nuevo_estado_id smallint, p_comentario text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_admin uuid := auth.uid();
  v_es_admin boolean;
  v_tipo text;
  v_tipo_key text;
  v_transicion_valida boolean;
  v_hay_definicion boolean;
  v_estado_anterior smallint;
begin
  -- ── Autorización ──────────────────────────────────────────────────────
  if v_admin is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.admin_users au
    join public.roles r on r.id = au.rol_id
    where au.id = v_admin
      and au.activo
      and lower(r.nombre) = 'admin'   -- A1: 'Admin' en prod; igual que políticas RLS
  ) into v_es_admin;

  if not v_es_admin then
    raise exception 'Sin permiso para cambiar el estado' using errcode = '42501';
  end if;

  -- ── Lock + lectura del movimiento ────────────────────────────────────
  select m.tipo, m.estado_id
  into v_tipo, v_estado_anterior
  from public.movimientos m
  where m.id = p_movimiento_id
  for update;

  if v_tipo is null then
    raise exception 'Movimiento no encontrado';
  end if;

  -- A3: no-op explícito — mismo estado pedido, nada que hacer.
  if p_nuevo_estado_id = v_estado_anterior then
    return jsonb_build_object(
      'ok', true,
      'sin_cambios', true,
      'estado_id', v_estado_anterior,
      'estado_anterior', v_estado_anterior
    );
  end if;

  -- ── Normalización + validación de la transición ──────────────────────
  v_tipo_key := case v_tipo
    when 'Depósito' then 'deposito'
    when 'Retiro' then 'retiro'
    when 'Pago con tarjeta' then 'tarjeta'
    when 'Pago PCT' then 'pago_pct'
    when 'Cobro PCT' then 'cobro_pct'
    else v_tipo
  end;

  select exists (
    select 1 from public.estados_por_tipo ept
    where ept.tipo_movimiento = v_tipo_key
  ) into v_hay_definicion;

  if v_hay_definicion then
    select exists (
      select 1
      from public.estados_por_tipo ept
      where ept.tipo_movimiento = v_tipo_key
        and ept.estado_id = p_nuevo_estado_id
    ) into v_transicion_valida;

    if not v_transicion_valida then
      raise exception 'Transición no válida para el tipo %: estado_id %', v_tipo_key, p_nuevo_estado_id;
    end if;
  end if;

  -- ── Escritura atómica ────────────────────────────────────────────────
  update public.movimientos set estado_id = p_nuevo_estado_id where id = p_movimiento_id;

  update public.movimientos_transiciones t
  set origen = 'manual',
      admin_user_id = v_admin,
      comentario = p_comentario
  where t.id = (
    select id
    from public.movimientos_transiciones
    where movimiento_id = p_movimiento_id
    order by fecha desc nulls last, id desc
    limit 1
  );

  return jsonb_build_object(
    'ok', true,
    'sin_cambios', false,
    'estado_id', p_nuevo_estado_id,
    'estado_anterior', v_estado_anterior
  );
end;
$function$;

-- cliente_tiene_movimientos
CREATE OR REPLACE FUNCTION public.cliente_tiene_movimientos(p_legajo text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.movimientos WHERE legajo = p_legajo);
$function$;

-- fn_log_transicion_movimiento
CREATE OR REPLACE FUNCTION public.fn_log_transicion_movimiento()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.estado_id IS DISTINCT FROM OLD.estado_id) THEN
    INSERT INTO movimientos_transiciones (movimiento_id, estado_anterior_id, estado_nuevo_id, origen)
    VALUES (NEW.id, OLD.estado_id, NEW.estado_id, 'coelsa'); -- default; la app debe hacer el INSERT manual explícito cuando el origen es 'manual'
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO movimientos_transiciones (movimiento_id, estado_anterior_id, estado_nuevo_id, origen)
    VALUES (NEW.id, NULL, NEW.estado_id, 'coelsa');
  END IF;
  RETURN NEW;
END;
$function$;

-- fn_rpc_debug_log
CREATE OR REPLACE FUNCTION public.fn_rpc_debug_log()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_comercio_id  uuid;
    v_legajo       text;
    v_payload      jsonb;
    v_row_id       uuid;
BEGIN
    -- row id: la mayoría de estas tablas tienen `id uuid`, pero
    -- `lote_movimientos` es una tabla de join con PK compuesta
    -- (lote_id, movimiento_id) y NO tiene columna `id`. Hacemos
    -- el acceso defensivo: si la columna no existe, dejamos NULL.
    IF (TG_OP = 'DELETE') THEN
        BEGIN
            v_row_id := OLD.id;
        EXCEPTION WHEN undefined_column THEN
            v_row_id := NULL;
        END;
    ELSE
        BEGIN
            v_row_id := NEW.id;
        EXCEPTION WHEN undefined_column THEN
            v_row_id := NULL;
        END;
    END IF;

    -- comercio_id: varía según la tabla
    IF TG_TABLE_NAME = 'lotes_venta' THEN
        v_comercio_id := (to_jsonb(NEW)->>'comercio_id')::uuid;
        v_legajo := NULL;
        v_payload := jsonb_build_object(
            'comercio_id', v_comercio_id,
            'bandera', NEW.bandera,
            'fecha', NEW.fecha,
            'cantidad_operaciones', NEW.cantidad_operaciones,
            'importe_bruto', NEW.importe_bruto,
            'importe_neto', NEW.importe_neto,
            'comision', NEW.comision,
            'impuestos', NEW.impuestos
        );
    ELSIF TG_TABLE_NAME = 'lotes_acreditacion' THEN
        v_comercio_id := NEW.comercio_id;
        v_legajo := NULL;
        v_payload := jsonb_build_object(
            'comercio_id', v_comercio_id,
            'codigo', NEW.codigo,
            'bandera', NEW.bandera,
            'fecha', NEW.fecha,
            'estado', NEW.estado,
            'cantidad_operaciones', NEW.cantidad_operaciones,
            'importe_bruto', NEW.importe_bruto,
            'importe_neto', NEW.importe_neto
        );
    ELSIF TG_TABLE_NAME = 'movimientos' THEN
        v_comercio_id := NEW.comercio_id;
        v_legajo := NEW.legajo;
        v_payload := jsonb_build_object(
            'comercio_id', v_comercio_id,
            'legajo', v_legajo,
            'id_txn', NEW.id_txn,
            'tipo', NEW.tipo,
            'monto_operacion', NEW.monto_operacion,
            'comision', NEW.comision,
            'impuesto', NEW.impuesto,
            'monto_cobrado', NEW.monto_cobrado,
            'estado_id', NEW.estado_id,
            'bandera', NEW.bandera,
            'id_txn_prefix', substring(NEW.id_txn from 1 for 30)
        );
    ELSIF TG_TABLE_NAME = 'cliente_links_pago_pagos' THEN
        v_comercio_id := NULL;
        v_legajo := NEW.cliente_legajo;
        v_payload := jsonb_build_object(
            'link_id', NEW.link_id,
            'cliente_legajo', NEW.cliente_legajo,
            'metodo', NEW.metodo,
            'monto', NEW.monto,
            'estado', NEW.estado,
            'site_transaction_id', NEW.site_transaction_id,
            'payway_payment_id', NEW.payway_payment_id,
            'payway_status', NEW.payway_status
        );
    ELSIF TG_TABLE_NAME = 'lote_movimientos' THEN
        v_comercio_id := NULL;
        v_legajo := NULL;
        v_payload := jsonb_build_object(
            'lote_id', NEW.lote_id,
            'movimiento_id', NEW.movimiento_id
        );
    ELSE
        v_payload := to_jsonb(NEW);
    END IF;

    INSERT INTO public.rpc_debug_log
        (source_table, op, row_id, comercio_id, legajo, payload, nota)
    VALUES
        (TG_TABLE_NAME, TG_OP, v_row_id, v_comercio_id, v_legajo,
         v_payload, 'trigger ' || lower(TG_OP));

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$function$;

-- registrar_pago_link_completo
CREATE OR REPLACE FUNCTION public.registrar_pago_link_completo(p_link_id uuid, p_cliente_legajo text, p_bandera_id uuid, p_monto numeric, p_pagador_nombre text, p_pagador_email text, p_comercio_id uuid, p_referencia text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_pago_id                 uuid;
    v_movimiento_id           uuid;
    v_lote_venta_id           uuid;
    v_lote_acreditacion_id    uuid;
    v_existe                  integer;

    v_comision_molipay        numeric(7,4);
    v_comision_payway         numeric(7,4);
    v_bandera_nombre          text;
    v_metodo_key              text;

    v_bandera_catalogo_id     uuid;

    v_dias_habiles            integer;
    v_fecha_estimada          date;
    v_fecha_pago              date;

    v_comision_monto          numeric(14,2);
    v_payway_monto            numeric(14,2);
    v_impuesto_monto          numeric(14,2);
    v_estado_aprobado_id      smallint;

    v_now                     timestamptz;
    v_cliente_id              uuid;
BEGIN
    v_now := now();
    v_fecha_pago := date(v_now);

    PERFORM public.fn_rpc_log_event(
        'registrar_pago_link_completo', 'start', true,
        NULL,
        jsonb_build_object(
            'p_link_id', p_link_id,
            'p_comercio_id', p_comercio_id,
            'p_bandera_id', p_bandera_id,
            'p_monto', p_monto
        )
    );

    -- 1. Estado APROBADO
    SELECT id INTO v_estado_aprobado_id
      FROM estados_movimiento
     WHERE codigo = 'APROBADO'
     LIMIT 1;

    IF v_estado_aprobado_id IS NULL THEN
        RAISE EXCEPTION 'Estado APROBADO no encontrado en estados_movimiento';
    END IF;

    -- 2. Bandera del comercio
    SELECT cb.bandera, cb.comision_molipay, cb.comision_payway, cb.metodo_key, cb.bandera_id
      INTO v_bandera_nombre, v_comision_molipay, v_comision_payway, v_metodo_key, v_bandera_catalogo_id
      FROM comercio_banderas cb
     WHERE cb.id = p_bandera_id
       AND cb.comercio_id = p_comercio_id
       AND cb.estado = 'Activo'
     LIMIT 1;

    IF v_bandera_nombre IS NULL THEN
        SELECT cb.bandera, cb.comision_molipay, cb.comision_payway, cb.metodo_key, cb.bandera_id
          INTO v_bandera_nombre, v_comision_molipay, v_comision_payway, v_metodo_key, v_bandera_catalogo_id
          FROM comercio_banderas cb
         WHERE cb.bandera_id = p_bandera_id
           AND cb.comercio_id = p_comercio_id
           AND cb.estado = 'Activo'
         LIMIT 1;
    END IF;

    IF v_bandera_nombre IS NULL THEN
        RAISE EXCEPTION 'Banera % no configurada para el comercio %', p_bandera_id, p_comercio_id;
    END IF;

    -- 2b. Resolver banderas.id del catálogo
    IF v_bandera_catalogo_id IS NULL THEN
        SELECT b.id INTO v_bandera_catalogo_id
          FROM public.banderas b
         WHERE (v_metodo_key IS NOT NULL AND b.metodo_key = v_metodo_key)
            OR lower(b.nombre) = lower(v_bandera_nombre)
         LIMIT 1;
    END IF;

    -- 3. Días hábiles
    SELECT dias_habiles_acreditacion
      INTO v_dias_habiles
      FROM public.banderas
     WHERE id = v_bandera_catalogo_id
     LIMIT 1;

    IF v_dias_habiles IS NULL THEN
        v_dias_habiles := 20;
    END IF;

    -- 4. Fecha estimada
    v_fecha_estimada := public.sumar_dias_habiles(v_fecha_pago, v_dias_habiles);

    -- 5. Comisiones
    v_comision_monto := round(p_monto * v_comision_molipay / 100, 2);
    v_payway_monto   := round(p_monto * v_comision_payway  / 100, 2);
    v_impuesto_monto := round(v_comision_monto * 0.21, 2);

    -- 6. Cliente_id
    SELECT id INTO v_cliente_id
      FROM clientes
     WHERE legajo = p_cliente_legajo
     LIMIT 1;

    -- 7. Pago
    INSERT INTO cliente_links_pago_pagos (
        link_id, cliente_legajo, metodo, monto, estado,
        pagador_nombre, pagador_email, referencia
    )
    VALUES (
        p_link_id, p_cliente_legajo, v_metodo_key, p_monto, 'Aprobado',
        p_pagador_nombre, p_pagador_email, p_referencia
    )
    RETURNING id INTO v_pago_id;

    -- 8. Counter
    UPDATE cliente_links_pago
       SET pagos = coalesce(pagos, 0) + 1
     WHERE id = p_link_id;

    -- 9. Movimiento
    INSERT INTO movimientos (
        cliente_id, legajo, id_txn, tipo, cvu,
        monto_operacion, comision, impuesto, monto_cobrado,
        fecha, estado_id, comercio_id, bandera_id, bandera
    )
    VALUES (
        v_cliente_id, p_cliente_legajo,
        'LINK-' || v_pago_id::text,
        'link_pago', NULL,
        p_monto, v_comision_monto, v_impuesto_monto, v_comision_monto + v_impuesto_monto,
        v_now, v_estado_aprobado_id, p_comercio_id, v_bandera_catalogo_id, v_bandera_nombre
    )
    RETURNING id INTO v_movimiento_id;

    -- 10. Lote de venta
    SELECT id INTO v_existe
      FROM lotes_venta
     WHERE comercio_id = p_comercio_id
       AND bandera = v_bandera_nombre
       AND fecha = v_fecha_pago
     FOR UPDATE;

    IF v_existe IS NOT NULL THEN
        UPDATE lotes_venta SET
            cantidad_operaciones = cantidad_operaciones + 1,
            importe_bruto        = importe_bruto + p_monto,
            impuestos            = impuestos + v_impuesto_monto,
            comision             = comision + v_comision_monto,
            importe_neto         = importe_neto + (p_monto - v_comision_monto - v_impuesto_monto),
            updated_at           = v_now
         WHERE id = v_existe;
        v_lote_venta_id := v_existe;
    ELSE
        INSERT INTO lotes_venta (
            comercio_id, bandera, fecha,
            cantidad_operaciones, importe_bruto, impuestos, comision, importe_neto
        )
        VALUES (
            p_comercio_id, v_bandera_nombre, v_fecha_pago,
            1, p_monto, v_impuesto_monto, v_comision_monto, p_monto - v_comision_monto - v_impuesto_monto
        )
        RETURNING id INTO v_lote_venta_id;
    END IF;

    -- 11. Lote de acreditación
    -- Log pre-INSERT para tener evidencia incluso si ROLLBACK después.
    PERFORM public.fn_rpc_log_event(
        'registrar_pago_link_completo', 'pre_lote_acreditacion', true,
        NULL,
        jsonb_build_object(
            'p_comercio_id', p_comercio_id,
            'v_bandera_nombre', v_bandera_nombre,
            'v_fecha_estimada', v_fecha_estimada
        )
    );

    -- FIX BUG: mismo fix que en registrar_pago_payway. Filtra por
    -- estado = 'Programado' para NO agrupar con lotes cerrados. Ver
    -- comentario detallado arriba en esta misma función.
    SELECT id INTO v_existe
      FROM lotes_acreditacion
     WHERE comercio_id = p_comercio_id
       AND bandera = v_bandera_nombre
       AND fecha = v_fecha_estimada
       AND estado = 'Programado'
     FOR UPDATE;

    IF v_existe IS NOT NULL THEN
        UPDATE lotes_acreditacion SET
            cantidad_operaciones = cantidad_operaciones + 1,
            importe_bruto        = importe_bruto + p_monto,
            impuestos            = impuestos + v_impuesto_monto,
            tasa_payway_pct      = v_comision_payway,
            tasa_payway_monto    = tasa_payway_monto + v_payway_monto,
            tasa_molipay_pct     = v_comision_molipay,
            tasa_molipay_monto   = tasa_molipay_monto + v_comision_monto,
            importe_neto         = importe_neto + (p_monto - v_comision_monto - v_payway_monto - v_impuesto_monto),
            updated_at           = v_now,
            bandera_id           = coalesce(bandera_id, v_bandera_catalogo_id)
         WHERE id = v_existe;
        v_lote_acreditacion_id := v_existe;
        PERFORM public.fn_rpc_log_event(
            'registrar_pago_link_completo', 'lote_acreditacion_updated', true,
            NULL,
            jsonb_build_object('lote_acreditacion_id', v_lote_acreditacion_id)
        );
    ELSE
        INSERT INTO lotes_acreditacion (
            codigo, comercio_id, bandera_id, bandera, fecha,
            cantidad_operaciones, importe_bruto, impuestos,
            tasa_payway_pct, tasa_payway_monto,
            tasa_molipay_pct, tasa_molipay_monto,
            importe_neto, estado,
            es_estimado
        )
        VALUES (
            'LA-' || to_char(v_fecha_estimada, 'YYYYMMDD') || '-' || substr(p_comercio_id::text, 1, 8) ||
                '-' || substr(md5(random()::text), 1, 6),
            p_comercio_id, v_bandera_catalogo_id, v_bandera_nombre, v_fecha_estimada,
            1, p_monto, v_impuesto_monto,
            v_comision_payway, v_payway_monto,
            v_comision_molipay, v_comision_monto,
            p_monto - v_comision_monto - v_payway_monto - v_impuesto_monto,
            'Programado',
            true
        )
        RETURNING id INTO v_lote_acreditacion_id;
        PERFORM public.fn_rpc_log_event(
            'registrar_pago_link_completo', 'lote_acreditacion_inserted', true,
            NULL,
            jsonb_build_object(
                'lote_acreditacion_id', v_lote_acreditacion_id,
                'p_comercio_id', p_comercio_id
            )
        );
    END IF;

    -- 12. Vínculo
    INSERT INTO lote_movimientos (lote_id, movimiento_id)
    VALUES (v_lote_acreditacion_id, v_movimiento_id);

    PERFORM public.fn_rpc_log_event(
        'registrar_pago_link_completo', 'success', true,
        NULL,
        jsonb_build_object(
            'pago_id', v_pago_id,
            'lote_acreditacion_id', v_lote_acreditacion_id
        )
    );

    -- 13. Return
    RETURN jsonb_build_object(
        'pago_id', v_pago_id,
        'movimiento_id', v_movimiento_id,
        'lote_venta_id', v_lote_venta_id,
        'lote_acreditacion_id', v_lote_acreditacion_id,
        'fecha_estimada', v_fecha_estimada,
        'comision_molipay', v_comision_monto,
        'impuesto', v_impuesto_monto,
        'estado', 'Aprobado',
        'bandera_id', v_bandera_catalogo_id,
        'metodo_key', v_metodo_key
    );

    -- Sin EXCEPTION WHEN OTHERS al final: la sintaxis PL/pgSQL no lo permite
    -- como cierre de un BEGIN de función. Si la RPC aborta, el RAISE se
    -- propaga y la transacción rollbackea. Mismo criterio que en
    -- registrar_pago_payway más arriba.
END;
$function$;

-- registrar_pago_payway
CREATE OR REPLACE FUNCTION public.registrar_pago_payway(p_link_id uuid, p_cliente_id uuid, p_bandera_id uuid, p_pagador_nombre text, p_pagador_email text, p_monto numeric, p_site_transaction_id text, p_payway_payment_id text, p_payway_status text, p_payway_status_detail text DEFAULT NULL::text, p_cuotas integer DEFAULT 1, p_costo_payway_pago_unico numeric DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_pago_id                  uuid;
    v_movimiento_id            uuid;
    v_lote_venta_id            uuid;
    v_lote_acreditacion_id     uuid;
    v_existe                   uuid;

    v_estado_aprobado_id       smallint;
    v_comercio_id              uuid;
    v_link_ref                 text;

    v_comision_molipay         numeric(7,4);
    v_comision_payway          numeric(7,4);
    v_bandera_nombre           text;
    v_metodo_key               text;
    v_dias_habiles             integer;
    v_fecha_estimada           date;
    v_fecha_pago               date;

    v_bandera_catalogo_id      uuid;

    v_comision_monto           numeric(14,2);
    v_payway_monto             numeric(14,2);

    v_cantidad_antes           integer;
    v_importe_bruto_antes      numeric(14,2);
    v_acumulado_molipay_antes  numeric;
    v_acumulado_payway_antes   numeric;

    v_aprobado                 boolean;
    v_estado_pago              text;
    v_now                      timestamptz := now();
    v_log_ctx                  jsonb;
BEGIN
    v_fecha_pago := date(v_now);

    -- LOG: arranque
    PERFORM public.fn_rpc_log_event(
        'registrar_pago_payway', 'start', true,
        NULL,
        jsonb_build_object(
            'p_link_id', p_link_id,
            'p_cliente_id', p_cliente_id,
            'p_bandera_id', p_bandera_id,
            'p_monto', p_monto,
            'p_site_transaction_id', p_site_transaction_id,
            'p_payway_status', p_payway_status
        )
    );

    -- 1. Clasificación del status
    v_aprobado := lower(coalesce(p_payway_status, '')) = 'approved';

    IF v_aprobado THEN
        v_estado_pago := 'Aprobado';
    ELSIF lower(coalesce(p_payway_status, '')) IN (
        'pending', 'in_review', 'requires_action', 'pending_review_manual'
    ) THEN
        v_estado_pago := 'Pendiente';
    ELSE
        v_estado_pago := 'Rechazado';
    END IF;

    -- 2. Idempotencia
    SELECT id INTO v_pago_id
      FROM cliente_links_pago_pagos
     WHERE site_transaction_id = p_site_transaction_id
     LIMIT 1;

    IF v_pago_id IS NOT NULL THEN
        PERFORM public.fn_rpc_log_event(
            'registrar_pago_payway', 'idempotencia_replay', true,
            NULL,
            jsonb_build_object('pago_id', v_pago_id, 'site_transaction_id', p_site_transaction_id)
        );
        RETURN jsonb_build_object(
            'pago_id',         v_pago_id,
            'already_registered', true,
            'estado',           v_estado_pago,
            'acreditado',       false
        );
    END IF;

    -- 3. Datos del link y del comercio
    SELECT cl.comercio_id, cl.referencia
      INTO v_comercio_id, v_link_ref
      FROM cliente_links_pago cl
     WHERE cl.id = p_link_id;

    IF v_comercio_id IS NULL THEN
        PERFORM public.fn_rpc_log_event(
            'registrar_pago_payway', 'fail_link_no_encontrado', false,
            'Link no encontrado o sin comercio',
            jsonb_build_object('p_link_id', p_link_id)
        );
        RAISE EXCEPTION 'Link % no encontrado o sin comercio', p_link_id;
    END IF;

    -- 4. Resolución de la bandera del comercio
    SELECT cb.bandera, cb.comision_molipay, cb.comision_payway, cb.metodo_key, cb.bandera_id
      INTO v_bandera_nombre, v_comision_molipay, v_comision_payway, v_metodo_key, v_bandera_catalogo_id
      FROM comercio_banderas cb
     WHERE cb.id = p_bandera_id
       AND cb.comercio_id = v_comercio_id
       AND cb.estado = 'Activo'
     LIMIT 1;

    IF v_bandera_nombre IS NULL THEN
        SELECT cb.bandera, cb.comision_molipay, cb.comision_payway, cb.metodo_key, cb.bandera_id
          INTO v_bandera_nombre, v_comision_molipay, v_comision_payway, v_metodo_key, v_bandera_catalogo_id
          FROM comercio_banderas cb
         WHERE cb.bandera_id = p_bandera_id
           AND cb.comercio_id = v_comercio_id
           AND cb.estado = 'Activo'
         LIMIT 1;
    END IF;

    IF v_bandera_nombre IS NULL THEN
        PERFORM public.fn_rpc_log_event(
            'registrar_pago_payway', 'fail_bandera_no_configurada', false,
            'Bandera no configurada para el comercio',
            jsonb_build_object('p_bandera_id', p_bandera_id, 'v_comercio_id', v_comercio_id)
        );
        RAISE EXCEPTION 'Banera % no configurada para el comercio %', p_bandera_id, v_comercio_id;
    END IF;

    -- 4b. Resolver banderas.id del catálogo si falta
    IF v_bandera_catalogo_id IS NULL THEN
        SELECT b.id INTO v_bandera_catalogo_id
          FROM public.banderas b
         WHERE (v_metodo_key IS NOT NULL AND b.metodo_key = v_metodo_key)
            OR lower(b.nombre) = lower(v_bandera_nombre)
         LIMIT 1;
    END IF;

    PERFORM public.fn_rpc_log_event(
        'registrar_pago_payway', 'flag_resolved', true,
        NULL,
        jsonb_build_object(
            'comercio_id', v_comercio_id,
            'bandera_nombre', v_bandera_nombre,
            'bandera_catalogo_id', v_bandera_catalogo_id,
            'metodo_key', v_metodo_key
        )
    );

    -- 5. Días hábiles y metodo_key
    SELECT metodo_key, dias_habiles_acreditacion
      INTO v_metodo_key, v_dias_habiles
      FROM public.banderas
     WHERE id = v_bandera_catalogo_id
     LIMIT 1;

    IF v_dias_habiles IS NULL THEN
        v_dias_habiles := 20;
    END IF;

    -- 6. Pago no aprobado: auditar y salir
    IF NOT v_aprobado THEN
        INSERT INTO cliente_links_pago_pagos (
            link_id, cliente_legajo, metodo, monto, estado,
            pagador_nombre, pagador_email, referencia,
            payway_payment_id, payway_status, payway_status_detail,
            site_transaction_id, cuotas
        )
        SELECT
            p_link_id, c.legajo, coalesce(v_metodo_key, 'payway'), p_monto, v_estado_pago,
            p_pagador_nombre, p_pagador_email,
            coalesce(v_link_ref, p_site_transaction_id),
            p_payway_payment_id, p_payway_status, p_payway_status_detail,
            p_site_transaction_id, p_cuotas
          FROM clientes c
         WHERE c.id = p_cliente_id
        RETURNING id INTO v_pago_id;

        PERFORM public.fn_rpc_log_event(
            'registrar_pago_payway', 'no_aprobado_audit', true,
            NULL,
            jsonb_build_object('pago_id', v_pago_id, 'estado', v_estado_pago)
        );

        RETURN jsonb_build_object(
            'pago_id',         v_pago_id,
            'already_registered', false,
            'estado',           v_estado_pago,
            'acreditado',       false
        );
    END IF;

    -- 7. Estado APROBADO del catálogo
    SELECT id INTO v_estado_aprobado_id
      FROM estados_movimiento
     WHERE codigo = 'APROBADO'
     LIMIT 1;

    IF v_estado_aprobado_id IS NULL THEN
        RAISE EXCEPTION 'Estado APROBADO no encontrado en estados_movimiento';
    END IF;

    -- 8. Fecha estimada
    v_fecha_estimada := public.sumar_dias_habiles(v_fecha_pago, v_dias_habiles);

    -- 9. Comisiones
    v_comision_monto := round(p_monto * v_comision_molipay / 100, 2);
    v_payway_monto   := round(p_monto * v_comision_payway  / 100, 2);

    -- 10. Insertar pago
    INSERT INTO cliente_links_pago_pagos (
        link_id, cliente_legajo, metodo, monto, estado,
        pagador_nombre, pagador_email, referencia,
        payway_payment_id, payway_status, payway_status_detail,
        site_transaction_id, cuotas
    )
    SELECT
        p_link_id, c.legajo, coalesce(v_metodo_key, 'payway'), p_monto, v_estado_pago,
        p_pagador_nombre, p_pagador_email,
        coalesce(v_link_ref, p_site_transaction_id),
        p_payway_payment_id, p_payway_status, p_payway_status_detail,
        p_site_transaction_id, p_cuotas
      FROM clientes c
     WHERE c.id = p_cliente_id
    RETURNING id INTO v_pago_id;

    UPDATE cliente_links_pago
       SET pagos = coalesce(pagos, 0) + 1
     WHERE id = p_link_id;

    PERFORM public.fn_rpc_log_event(
        'registrar_pago_payway', 'pago_insertado', true,
        NULL,
        jsonb_build_object(
            'pago_id', v_pago_id,
            'site_transaction_id', p_site_transaction_id
        )
    );

    -- 11. Movimiento contable
    INSERT INTO movimientos (
        cliente_id, legajo, id_txn, tipo, cvu,
        monto_operacion, comision, impuesto, monto_cobrado,
        fecha, estado_id, comercio_id, bandera_id, bandera
    )
    VALUES (
        p_cliente_id,
        (SELECT legajo FROM clientes WHERE id = p_cliente_id),
        'PAYWAY-' || v_pago_id::text,
        'tarjeta',
        NULL,
        p_monto,
        v_comision_monto,
        0,
        v_comision_monto,
        v_now,
        v_estado_aprobado_id,
        v_comercio_id,
        v_bandera_catalogo_id,
        v_bandera_nombre
    )
    RETURNING id INTO v_movimiento_id;

    PERFORM public.fn_rpc_log_event(
        'registrar_pago_payway', 'movimiento_insertado', true,
        NULL,
        jsonb_build_object(
            'movimiento_id', v_movimiento_id,
            'comercio_id', v_comercio_id,
            'monto', p_monto
        )
    );

    -- 12. Lote de venta
    SELECT id INTO v_existe
      FROM lotes_venta
     WHERE comercio_id = v_comercio_id
       AND bandera = v_bandera_nombre
       AND fecha = v_fecha_pago
     FOR UPDATE;

    IF v_existe IS NOT NULL THEN
        UPDATE lotes_venta SET
            cantidad_operaciones = cantidad_operaciones + 1,
            importe_bruto        = importe_bruto + p_monto,
            impuestos            = impuestos + 0,
            comision             = comision + v_comision_monto,
            importe_neto         = importe_neto + (p_monto - v_comision_monto),
            updated_at           = v_now
         WHERE id = v_existe;
        v_lote_venta_id := v_existe;
        PERFORM public.fn_rpc_log_event(
            'registrar_pago_payway', 'lote_venta_updated', true,
            NULL,
            jsonb_build_object('lote_venta_id', v_lote_venta_id, 'es_update', true)
        );
    ELSE
        INSERT INTO lotes_venta (
            comercio_id, bandera, fecha,
            cantidad_operaciones, importe_bruto, impuestos, comision, importe_neto
        )
        VALUES (
            v_comercio_id, v_bandera_nombre, v_fecha_pago,
            1, p_monto, 0,
            v_comision_monto,
            p_monto - v_comision_monto
        )
        RETURNING id INTO v_lote_venta_id;
        PERFORM public.fn_rpc_log_event(
            'registrar_pago_payway', 'lote_venta_inserted', true,
            NULL,
            jsonb_build_object('lote_venta_id', v_lote_venta_id, 'es_update', false)
        );
    END IF;

    -- 13. Lote de acreditación
    -- ESTE ES EL PASO CLAVE. Si falla, el ROLLBACK se lleva TODO lo
    -- anterior, pero el logueamos ANTES de hacerlo para que se vea en
    -- el rpc_debug_log si la RPC abortó acá.
    PERFORM public.fn_rpc_log_event(
        'registrar_pago_payway', 'pre_lote_acreditacion', true,
        NULL,
        jsonb_build_object(
            'comercio_id', v_comercio_id,
            'bandera_nombre', v_bandera_nombre,
            'fecha_estimada', v_fecha_estimada,
            'v_existe', v_existe
        )
    );

    -- FIX BUG: el SELECT ahora filtra por estado = 'Programado' para
    -- NO agrupar con lotes ya cerrados (Pendiente, Acreditado,
    -- Rechazado, Contracargo). Si el único lote existente del trío
    -- (comercio, bandera, fecha_estimada) está en cualquier otro
    -- estado, se crea un lote nuevo en Programado. Ver comentario
    -- detallado en la migración 20261007210000 (registrar_pago_payway).
    SELECT id INTO v_existe
      FROM lotes_acreditacion
     WHERE comercio_id = v_comercio_id
       AND bandera = v_bandera_nombre
       AND fecha = v_fecha_estimada
       AND estado = 'Programado'
     FOR UPDATE;

    IF v_existe IS NOT NULL THEN
        SELECT cantidad_operaciones, importe_bruto,
               (tasa_molipay_pct * cantidad_operaciones),
               (tasa_payway_pct  * cantidad_operaciones)
          INTO v_cantidad_antes, v_importe_bruto_antes,
               v_acumulado_molipay_antes, v_acumulado_payway_antes
          FROM lotes_acreditacion
         WHERE id = v_existe;

        UPDATE lotes_acreditacion SET
            cantidad_operaciones = cantidad_operaciones + 1,
            importe_bruto        = importe_bruto + p_monto,
            impuestos            = impuestos + 0,
            tasa_molipay_pct     = (v_acumulado_molipay_antes + v_comision_molipay) / (v_cantidad_antes + 1),
            tasa_molipay_monto   = ((v_acumulado_molipay_antes / v_cantidad_antes) * (v_importe_bruto_antes / v_cantidad_antes) + v_comision_monto) / (v_cantidad_antes + 1) * (v_cantidad_antes + 1),
            tasa_payway_pct      = (v_acumulado_payway_antes + v_comision_payway) / (v_cantidad_antes + 1),
            tasa_payway_monto    = ((v_acumulado_payway_antes / v_cantidad_antes) * (v_importe_bruto_antes / v_cantidad_antes) + v_payway_monto) / (v_cantidad_antes + 1) * (v_cantidad_antes + 1),
            importe_neto         = importe_neto + (p_monto - v_comision_monto - v_payway_monto),
            updated_at           = v_now,
            bandera_id           = coalesce(bandera_id, v_bandera_catalogo_id)
         WHERE id = v_existe;
        v_lote_acreditacion_id := v_existe;
        PERFORM public.fn_rpc_log_event(
            'registrar_pago_payway', 'lote_acreditacion_updated', true,
            NULL,
            jsonb_build_object(
                'lote_acreditacion_id', v_lote_acreditacion_id,
                'es_update', true,
                'cantidad_antes', v_cantidad_antes
            )
        );
    ELSE
        INSERT INTO lotes_acreditacion (
            codigo, comercio_id, bandera_id, bandera, fecha,
            cantidad_operaciones, importe_bruto, impuestos,
            tasa_payway_pct, tasa_payway_monto,
            tasa_molipay_pct, tasa_molipay_monto,
            importe_neto, estado,
            es_estimado,
            cuotas,
            comision_cierre_lote_pct
        )
        VALUES (
            'LA-' || to_char(v_fecha_estimada, 'YYYYMMDD') || '-' ||
                substr(v_comercio_id::text, 1, 8) || '-' || upper(v_bandera_nombre) ||
                '-' || substr(md5(random()::text), 1, 6),
            v_comercio_id, v_bandera_catalogo_id, v_bandera_nombre, v_fecha_estimada,
            1, p_monto, 0,
            v_comision_payway, v_payway_monto,
            v_comision_molipay, v_comision_monto,
            p_monto - v_comision_monto - v_payway_monto,
            'Programado',
            true,
            p_cuotas,
            0
        )
        RETURNING id INTO v_lote_acreditacion_id;

        PERFORM public.fn_rpc_log_event(
            'registrar_pago_payway', 'lote_acreditacion_inserted', true,
            NULL,
            jsonb_build_object(
                'lote_acreditacion_id', v_lote_acreditacion_id,
                'comercio_id', v_comercio_id,
                'estado', 'Programado',
                'importe_neto', p_monto - v_comision_monto - v_payway_monto
            )
        );
    END IF;

    -- 14. Vínculo lote_movimientos
    INSERT INTO lote_movimientos (lote_id, movimiento_id)
    VALUES (v_lote_acreditacion_id, v_movimiento_id);

    PERFORM public.fn_rpc_log_event(
        'registrar_pago_payway', 'lote_movimiento_inserted', true,
        NULL,
        jsonb_build_object(
            'lote_acreditacion_id', v_lote_acreditacion_id,
            'movimiento_id', v_movimiento_id
        )
    );

    -- 15. Return
    PERFORM public.fn_rpc_log_event(
        'registrar_pago_payway', 'success', true,
        NULL,
        jsonb_build_object(
            'pago_id', v_pago_id,
            'lote_acreditacion_id', v_lote_acreditacion_id,
            'lote_venta_id', v_lote_venta_id
        )
    );

    RETURN jsonb_build_object(
        'pago_id',                v_pago_id,
        'movimiento_id',          v_movimiento_id,
        'lote_venta_id',          v_lote_venta_id,
        'lote_acreditacion_id',   v_lote_acreditacion_id,
        'fecha_estimada',         v_fecha_estimada,
        'comision_molipay',       v_comision_monto,
        'impuesto',               0,
        'estado',                 v_estado_pago,
        'acreditado',             true,
        'already_registered',     false,
        'bandera_id',             v_bandera_catalogo_id,
        'metodo_key',             v_metodo_key
    );

    -- Sin EXCEPTION WHEN OTHERS al final: la sintaxis PL/pgSQL no lo permite
    -- como cierre de un BEGIN de función. Si la RPC aborta, el RAISE se
    -- propaga y la transacción rollbackea. Los triggers AFTER de rpc_debug_log
    -- tampoco se dispararán (rollbackean junto con la transacción). Esto es
    -- correcto: si la RPC falló, el backend recibe el error 502 y el operador
    -- lo ve en los logs del backend. Si la RPC commitea, los 5 triggers AFTER
    -- registran los 5 inserts en rpc_debug_log y el log queda completo.
END;
$function$;

-- registrar_transferencia_bdc
CREATE OR REPLACE FUNCTION public.registrar_transferencia_bdc(p_subcuenta_origen uuid, p_origin_id text, p_destinatario_cbu text, p_monto numeric, p_concepto text DEFAULT NULL::text, p_estado_bdc text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_cliente_id uuid;
  v_legajo text;
  v_estado_id smallint;
  v_comision numeric := 0;
  v_impuesto numeric := 0;
  v_saldo numeric := 0;
  v_fila jsonb;
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  if p_monto is null or p_monto <= 0 then
    raise exception 'Monto invalido';
  end if;

  if p_origin_id is null or length(trim(p_origin_id)) = 0 then
    raise exception 'Falta originId (TXID) de la transferencia BDC';
  end if;

  if p_destinatario_cbu is null or length(trim(p_destinatario_cbu)) < 6 then
    raise exception 'CBU/CVU/alias destino invalido';
  end if;

  select c.id, c.legajo into v_cliente_id, v_legajo
    from public.clientes c
   where c.correo = auth.email();

  if v_cliente_id is null then
    raise exception 'Cliente no encontrado' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.subaccounts
     where id = p_subcuenta_origen and cliente_legajo = v_legajo
  ) then
    raise exception 'La subcuenta de origen no pertenece al cliente' using errcode = '42501';
  end if;

  -- Idempotencia: el TXID ya estaba registrado (reintento, doble click, etc.)
  select jsonb_build_object('ok', true, 'id_txn', m.id_txn, 'ya_registrada', true,
                            'monto', m.monto_operacion, 'estado_id', m.estado_id)
    into v_fila
    from public.movimientos m
   where m.id_txn = p_origin_id
   limit 1;

  if v_fila is not null then
    return v_fila;
  end if;

  -- Comision del CVU de origen (o del cliente) — 0 si la transferencia es interna.
  select k.comision, k.impuesto into v_comision, v_impuesto
    from public.calcular_comision_transferencia(v_cliente_id, p_monto, p_subcuenta_origen, p_destinatario_cbu) k;

  -- Estado: si el banco confirmo -> APROBADO; si no, uno en curso.
  if coalesce(p_estado_bdc, '') ilike any (array['%complet%', '%aprob%', '%succes%', '%acepta%']) then
    select id into v_estado_id
      from public.estados_movimiento
     where codigo = 'APROBADO'
     limit 1;

    if v_estado_id is null then
      select id into v_estado_id
        from public.estados_movimiento
       where lower(codigo) like '%acredit%' or lower(nombre) like '%acredit%'
       order by id
       limit 1;
    end if;
  end if;

  if v_estado_id is null then
    select id into v_estado_id
      from public.estados_movimiento
     where codigo in ('PENDIENTE', 'EN_PROGRESO', 'CREADO', 'APROBADO')
     order by case codigo
                when 'PENDIENTE'   then 1
                when 'EN_PROGRESO' then 2
                when 'CREADO'      then 3
                else 4
              end
     limit 1;
  end if;

  if v_estado_id is null then
    raise exception 'No hay estados de movimiento configurados (correr supabase/seed/0001_estados_movimiento.sql)';
  end if;

  -- [subaccounts] Lectura con bloqueo: el saldo informado y el debito
  -- quedan serializados frente a otras operaciones sobre la subcuenta.
  select saldo_disponible into v_saldo
    from public.subaccount_balances
   where subaccount_id = p_subcuenta_origen
     for update;

  update public.subaccount_balances
     set saldo_disponible = saldo_disponible - p_monto - v_comision - v_impuesto
   where subaccount_id = p_subcuenta_origen;

  insert into public.movimientos (
    cliente_id, legajo, id_txn, tipo, cvu, subcuenta_id,
    monto_operacion, comision, impuesto, monto_cobrado, estado_id
  ) values (
    v_cliente_id, v_legajo, trim(p_origin_id), 'transferencia', trim(p_destinatario_cbu), p_subcuenta_origen,
    p_monto, v_comision, v_impuesto, v_comision + v_impuesto, v_estado_id
  );

  return jsonb_build_object(
    'ok', true,
    'id_txn', trim(p_origin_id),
    'comision', v_comision,
    'impuesto', v_impuesto,
    'total_debitado', p_monto + v_comision + v_impuesto,
    'estado_bdc', coalesce(p_estado_bdc, ''),
    'saldo_insuficiente', coalesce(v_saldo, 0) < (p_monto + v_comision + v_impuesto),
    'ya_registrada', false
  );
end;
$function$;

-- registrar_transferencia_bdc_detallada
CREATE OR REPLACE FUNCTION public.registrar_transferencia_bdc_detallada(p_subcuenta_origen uuid, p_origin_id text, p_destinatario_cbu text, p_monto numeric, p_concepto text DEFAULT NULL::text, p_estado_bdc text DEFAULT NULL::text, p_destinatario_nombre text DEFAULT NULL::text, p_destinatario_cuit text DEFAULT NULL::text, p_destinatario_banco text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_resultado jsonb;
begin
  v_resultado := public.registrar_transferencia_bdc(
    p_subcuenta_origen, p_origin_id, p_destinatario_cbu, p_monto,
    p_concepto, p_estado_bdc
  );

  update public.movimientos
     set destinatario_nombre = nullif(trim(coalesce(p_destinatario_nombre, '')), ''),
         destinatario_cuit = nullif(regexp_replace(coalesce(p_destinatario_cuit, ''), '\D', '', 'g'), ''),
         destinatario_banco = nullif(trim(coalesce(p_destinatario_banco, '')), '')
   where id_txn = trim(p_origin_id);

  return v_resultado;
end;
$function$;

-- registrar_transferencia_externa
CREATE OR REPLACE FUNCTION public.registrar_transferencia_externa(p_subcuenta_origen uuid, p_destinatario_cbu text, p_monto numeric, p_concepto text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_cliente_id uuid;
  v_legajo text;
  v_estado_id smallint;
  v_txn text;
  v_comision numeric := 0;
  v_impuesto numeric := 0;
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  if p_monto is null or p_monto <= 0 then
    raise exception 'Monto invalido';
  end if;

  if p_destinatario_cbu is null or length(trim(p_destinatario_cbu)) < 10 then
    raise exception 'CBU/CVU destino invalido';
  end if;

  select c.id, c.legajo into v_cliente_id, v_legajo
    from public.clientes c
   where c.correo = auth.email();

  if v_cliente_id is null then
    raise exception 'Cliente no encontrado' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.subaccounts
     where id = p_subcuenta_origen and cliente_legajo = v_legajo
  ) then
    raise exception 'La subcuenta de origen no pertenece al cliente' using errcode = '42501';
  end if;

  select k.comision, k.impuesto into v_comision, v_impuesto
    from public.calcular_comision_transferencia(v_cliente_id, p_monto, p_subcuenta_origen, p_destinatario_cbu) k;

  -- [subaccounts] Bloqueo del saldo de origen antes de validarlo.
  perform 1
    from public.subaccount_balances
   where subaccount_id = p_subcuenta_origen
     for update;

  if exists (
    select 1 from public.subaccount_balances
     where subaccount_id = p_subcuenta_origen
       and saldo_disponible < (p_monto + v_comision + v_impuesto)
  ) then
    raise exception 'Saldo insuficiente en la subcuenta de origen';
  end if;

  select id into v_estado_id
    from public.estados_movimiento
   where lower(codigo) like '%acredit%' or lower(nombre) like '%acredit%'
   order by id
   limit 1;

  if v_estado_id is null then
    select id into v_estado_id from public.estados_movimiento order by id limit 1;
  end if;

  if v_estado_id is null then
    raise exception 'No hay estados de movimiento configurados';
  end if;

  v_txn := 'EXT-' || upper(substr(md5(random()::text), 1, 12));

  update public.subaccount_balances
     set saldo_disponible = saldo_disponible - p_monto - v_comision - v_impuesto
   where subaccount_id = p_subcuenta_origen;

  insert into public.movimientos (
    cliente_id, legajo, id_txn, tipo, cvu, subcuenta_id,
    monto_operacion, comision, impuesto, monto_cobrado, estado_id
  ) values (
    v_cliente_id, v_legajo, v_txn, 'transferencia', p_destinatario_cbu, p_subcuenta_origen,
    p_monto, v_comision, v_impuesto, v_comision + v_impuesto, v_estado_id
  );

  return jsonb_build_object(
    'ok', true,
    'id_txn', v_txn,
    'comision', v_comision,
    'impuesto', v_impuesto,
    'total_debitado', p_monto + v_comision + v_impuesto
  );
end;
$function$;

-- registrar_transferencia_subcuentas
CREATE OR REPLACE FUNCTION public.registrar_transferencia_subcuentas(p_subcuenta_origen uuid, p_subcuenta_destino uuid, p_monto numeric, p_concepto text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_cliente_id uuid;
  v_legajo text;
  v_estado_id smallint;
  v_cbu_origen text;
  v_cbu_destino text;
  v_txn text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  if p_monto is null or p_monto <= 0 then
    raise exception 'Monto invalido';
  end if;

  if p_subcuenta_origen = p_subcuenta_destino then
    raise exception 'Las subcuentas deben ser distintas';
  end if;

  select c.id, c.legajo into v_cliente_id, v_legajo
    from public.clientes c
   where c.correo = auth.email();

  if v_cliente_id is null then
    raise exception 'Cliente no encontrado' using errcode = '42501';
  end if;

  if not exists (
    select 1
      from public.subaccounts so
      join public.subaccounts sd on true
     where so.id = p_subcuenta_origen
       and sd.id = p_subcuenta_destino
       and so.cliente_legajo = v_legajo
       and sd.cliente_legajo = v_legajo
  ) then
    raise exception 'Subcuentas no pertenecen al cliente' using errcode = '42501';
  end if;

  select cbu into v_cbu_origen
    from public.subaccounts
   where id = p_subcuenta_origen;

  select cbu into v_cbu_destino
    from public.subaccounts
   where id = p_subcuenta_destino;

  -- [subaccounts] Bloqueo de ambos saldos en orden determinista (evita
  -- deadlocks entre transferencias cruzadas) antes de validar el saldo.
  perform 1
    from public.subaccount_balances
   where subaccount_id in (p_subcuenta_origen, p_subcuenta_destino)
   order by subaccount_id
     for update;

  if exists (
    select 1
      from public.subaccount_balances
     where subaccount_id = p_subcuenta_origen
       and saldo_disponible < p_monto
  ) then
    raise exception 'Saldo insuficiente en la subcuenta de origen';
  end if;

  select id into v_estado_id
    from public.estados_movimiento
   where lower(codigo) like '%acredit%'
      or lower(nombre) like '%acredit%'
   order by id
   limit 1;

  if v_estado_id is null then
    select id into v_estado_id
      from public.estados_movimiento
     order by id
     limit 1;
  end if;

  if v_estado_id is null then
    raise exception 'No hay estados de movimiento configurados';
  end if;

  v_txn := 'INT-' || upper(substr(md5(random()::text), 1, 12));

  update public.subaccount_balances
     set saldo_disponible = saldo_disponible - p_monto
   where subaccount_id = p_subcuenta_origen;

  update public.subaccount_balances
     set saldo_disponible = saldo_disponible + p_monto
   where subaccount_id = p_subcuenta_destino;

  insert into public.movimientos (
    cliente_id, legajo, id_txn, tipo, cvu,
    monto_operacion, comision, impuesto, monto_cobrado, estado_id
  ) values (
    v_cliente_id, v_legajo, v_txn || '-E', 'transferencia', v_cbu_origen,
    p_monto, 0, 0, 0, v_estado_id
  );

  insert into public.movimientos (
    cliente_id, legajo, id_txn, tipo, cvu,
    monto_operacion, comision, impuesto, monto_cobrado, estado_id
  ) values (
    v_cliente_id, v_legajo, v_txn || '-C', 'deposito', v_cbu_destino,
    p_monto, 0, 0, 0, v_estado_id
  );

  return jsonb_build_object('ok', true, 'id_txn', v_txn);
end;
$function$;
-- aplicar_liquidacion_lote
CREATE OR REPLACE FUNCTION public.aplicar_liquidacion_lote(p_lote_id uuid, p_liquidacion jsonb, p_fecha_cobro_real date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_estado            text;
    v_importe_neto      numeric(14,2);
    v_fecha_cobro       date;
    v_legajo            text;
    v_tasa_pct          numeric(7,4);
    v_com_cierre_pct    numeric(7,4);
    v_comercio_id       uuid;
    v_sub_recaudacion_id uuid;
BEGIN
    -- 1. Lock + validación de estado. El lock acá hace que dos cargas
    -- simultáneas del mismo lote no peleen por el snapshot: la segunda
    -- queda bloqueada hasta que la primera commitea y, al ver el
    -- estado Pendiente, falla con un mensaje claro.
    SELECT estado, importe_neto, comercio_id
      INTO v_estado, v_importe_neto, v_comercio_id
      FROM public.lotes_acreditacion
     WHERE id = p_lote_id
     FOR UPDATE;

    IF v_estado IS NULL THEN
        RAISE EXCEPTION 'Lote % no encontrado', p_lote_id;
    END IF;

    IF v_estado <> 'Programado' THEN
        RAISE EXCEPTION
            'El lote % debe estar Programado para aplicar la liquidacion (estado actual: %). Si ya esta Pendiente, acredita o cancela desde el detalle.',
            p_lote_id, v_estado;
    END IF;

    -- 2. importeNeto es la única pieza obligatoria del jsonb: el neto a
    -- acreditar que el modal calculó. Sin él no hay forma de cerrar
    -- la cuenta.
    v_importe_neto := (p_liquidacion->>'importeNeto')::numeric;
    IF v_importe_neto IS NULL THEN
        RAISE EXCEPTION 'La liquidacion no incluye importeNeto';
    END IF;

    -- 3. Snapshot de la liquidación. Todo el resto se ignora silenciosa-
    -- mente si la key no viene: la columna guarda el snapshot del lote
    -- original hasta que el modal confirme los números definitivos.
    UPDATE public.lotes_acreditacion
       SET estado                      = 'Pendiente',
           es_estimado                = false,
           fecha_estimada_recalcular  = false,
           fecha_cobro_real           = coalesce(p_fecha_cobro_real, fecha),
           tasa_molipay_pct           = coalesce((p_liquidacion->>'comisionMolipayPct')::numeric,          tasa_molipay_pct),
           tasa_molipay_monto         = coalesce((p_liquidacion->>'comisionMolipayMonto')::numeric,        tasa_molipay_monto),
           comision_cierre_lote_pct   = coalesce((p_liquidacion->>'comisionCierreLotePct')::numeric,      comision_cierre_lote_pct),
           comision_cierre_lote_monto = coalesce((p_liquidacion->>'comisionCierreLoteMonto')::numeric,    comision_cierre_lote_monto),
           debito_credito_monto       = coalesce((p_liquidacion->>'debitoCreditoMonto')::numeric,          debito_credito_monto),
           iva_monto                  = coalesce((p_liquidacion->>'ivaMonto')::numeric,                    iva_monto),
           iibb_monto                 = coalesce((p_liquidacion->>'iibbMonto')::numeric,                   iibb_monto),
           importe_neto               = v_importe_neto,
           updated_at                 = now()
     WHERE id = p_lote_id
     RETURNING fecha_cobro_real INTO v_fecha_cobro;

    -- 4. Volvemos a leer tasa/legajo para devolver contexto al frontend
    -- (útiles para el próximo paso de acreditar y para la auditoría).
    SELECT tasa_molipay_pct, comision_cierre_lote_pct, c.legajo
      INTO v_tasa_pct, v_com_cierre_pct, v_legajo
      FROM public.lotes_acreditacion l
      JOIN public.comercios c ON c.id = l.comercio_id
     WHERE l.id = p_lote_id;

    -- 5. 🔑 ALIMENTAR LA RECAUDACIÓN (la Alcancía se llena).
    -- El cambio de estado Programado → Pendiente confirma que Payway
    -- depositó la plata en el banco. En este momento exacto sumamos
    -- el importe_neto del lote a la subcuenta Recaudacion del legajo
    -- del comercio. Así el pool queda disponible para:
    --   a) Acreditar adelantos (fn_acreditar_adelanto debita de acá)
    --   b) Acreditar el lote final (acreditar_lote debita de acá)
    IF v_legajo IS NOT NULL THEN
        SELECT s.id INTO v_sub_recaudacion_id
          FROM public.subaccounts s
          JOIN public.subaccount_balances b ON b.subaccount_id = s.id
         WHERE s.cliente_legajo = v_legajo AND s.tipo = 'Recaudacion'
         FOR UPDATE OF b;

        IF v_sub_recaudacion_id IS NULL THEN
            -- El trigger subaccounts_init_balance crea la fila de saldos en 0.
            INSERT INTO public.subaccounts
                (cliente_legajo, nombre, apellido, email, cbu, tipo, estado,
                 retiros_habilitados)
            VALUES
                (v_legajo, 'Recaudación', '', '', NULL, 'Recaudacion', 'Activa',
                 false)
            RETURNING id INTO v_sub_recaudacion_id;

            UPDATE public.subaccount_balances
               SET saldo_disponible = v_importe_neto,
                   saldo_retenido   = 0,
                   saldo_conciliado = v_importe_neto
             WHERE subaccount_id = v_sub_recaudacion_id;
        ELSE
            UPDATE public.subaccount_balances
               SET saldo_disponible = saldo_disponible + v_importe_neto,
                   saldo_conciliado = saldo_conciliado + v_importe_neto,
                   updated_at       = now()
             WHERE subaccount_id = v_sub_recaudacion_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'lote_id',            p_lote_id,
        'estado',             'Pendiente',
        'importe_neto',       v_importe_neto,
        'fecha_cobro_real',   v_fecha_cobro,
        'tasa_molipay_pct',   v_tasa_pct,
        'comision_cierre_pct', v_com_cierre_pct,
        'legajo',             v_legajo,
        'subcuenta_recaudacion_id', v_sub_recaudacion_id
    );
END;
$function$
;

-- acreditar_lote
CREATE OR REPLACE FUNCTION public.acreditar_lote(p_lote_id uuid, p_notas text DEFAULT NULL::text, p_adelantos_monto numeric DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_estado                text;
    v_importe_neto          numeric(14,2);
    v_comercio_id           uuid;
    v_legajo                text;
    v_subcuenta_id          uuid;     -- Operativa
    v_sub_recaudacion_id    uuid;     -- Recaudacion
    v_monto_acreditar       numeric(18,2);
    v_debitar_recaudacion   numeric(18,2);
    v_saldo_recaudacion     numeric(18,2);
    v_uid                   uuid;
    v_notas                 text;
    v_adel                  record;
    v_restante              numeric(18,2);
BEGIN
    -- 1. Lock + validación de estado
    SELECT estado, importe_neto, comercio_id
      INTO v_estado, v_importe_neto, v_comercio_id
      FROM public.lotes_acreditacion
     WHERE id = p_lote_id
     FOR UPDATE;

    IF v_estado IS NULL THEN
        RAISE EXCEPTION 'Lote % no encontrado', p_lote_id;
    END IF;

    IF v_estado <> 'Pendiente' THEN
        RAISE EXCEPTION
            'El lote % debe estar Pendiente para acreditarse (estado actual: %). Aplica primero la liquidacion desde el archivo de Payway.',
            p_lote_id, v_estado;
    END IF;

    p_adelantos_monto := coalesce(p_adelantos_monto, 0);
    IF p_adelantos_monto < 0 THEN
        RAISE EXCEPTION 'La deduccion por adelantos no puede ser negativa';
    END IF;
    IF p_adelantos_monto > v_importe_neto THEN
        RAISE EXCEPTION 'La deduccion por adelantos (%) supera el neto del lote (%)', p_adelantos_monto, v_importe_neto;
    END IF;

    -- 2. Legajo del comercio
    SELECT legajo INTO v_legajo FROM public.comercios WHERE id = v_comercio_id;
    IF v_legajo IS NULL THEN
        RAISE EXCEPTION 'No se encontro legajo del comercio (%) del lote %', v_comercio_id, p_lote_id;
    END IF;

    v_monto_acreditar := v_importe_neto - p_adelantos_monto;

    -- 3. 🔑 DEBITAR LA RECAUDACIÓN.
    -- El monto que sale de la Recaudacion hacia el comercio es
    -- (importe_neto - p_adelantos_monto). La parte de adelantos ya
    -- se debitó antes en fn_acreditar_adelanto, así que la Recaudacion
    -- solo tiene que cubrir el remanente. Esto cierra el ciclo:
    -- la Alcancía entra con importe_neto y sale con importe_neto.
    --
    -- Si la Recaudacion no tiene saldo, falla con mensaje claro:
    -- significa que la plata no llegó del banco (no se subió el CSV
    -- o se Acreditó sin haber pasado por Pendiente).
    v_debitar_recaudacion := v_monto_acreditar;

    SELECT s.id, b.saldo_disponible INTO v_sub_recaudacion_id, v_saldo_recaudacion
      FROM public.subaccounts s
      JOIN public.subaccount_balances b ON b.subaccount_id = s.id
     WHERE s.cliente_legajo = v_legajo AND s.tipo = 'Recaudacion'
     FOR UPDATE OF b;

    IF v_sub_recaudacion_id IS NULL THEN
        RAISE EXCEPTION
            'La subcuenta Recaudacion del legajo % no existe. El lote % debería haber pasado por aplicar_liquidacion_lote primero para que la Alcancía se llene.',
            v_legajo, p_lote_id;
    END IF;

    IF v_saldo_recaudacion < v_debitar_recaudacion THEN
        RAISE EXCEPTION
            'La subcuenta Recaudacion del legajo % no tiene saldo suficiente para cubrir el lote % (disponible: %, requerido: %). Verificá que el CSV se haya subido y que no se haya Acreditado más de lo depositado.',
            v_legajo, p_lote_id, v_saldo_recaudacion, v_debitar_recaudacion;
    END IF;

    UPDATE public.subaccount_balances
       SET saldo_disponible = saldo_disponible - v_debitar_recaudacion,
           updated_at       = now()
     WHERE subaccount_id = v_sub_recaudacion_id;

    -- 4. Subcuenta Operativa del legajo. Se crea con el neto acreditado
    -- si no existe.
    SELECT id INTO v_subcuenta_id
      FROM public.subaccounts
     WHERE cliente_legajo = v_legajo AND tipo = 'Operativa'
     LIMIT 1;

    IF v_subcuenta_id IS NULL THEN
        -- El trigger subaccounts_init_balance crea la fila de saldos en 0.
        INSERT INTO public.subaccounts
            (cliente_legajo, nombre, apellido, email, cbu, tipo, estado,
             retiros_habilitados)
        VALUES
            (v_legajo, 'Operativa', '', '', NULL, 'Operativa', 'Activa',
             true)
        RETURNING id INTO v_subcuenta_id;

        UPDATE public.subaccount_balances
           SET saldo_disponible = v_monto_acreditar,
               saldo_retenido   = 0,
               saldo_conciliado = v_monto_acreditar
         WHERE subaccount_id = v_subcuenta_id;
    ELSE
        UPDATE public.subaccount_balances
           SET saldo_disponible = saldo_disponible + v_monto_acreditar,
               saldo_conciliado = saldo_conciliado + v_monto_acreditar,
               updated_at       = now()
         WHERE subaccount_id = v_subcuenta_id;
    END IF;

    -- 5. Adelantos Pendiente/Aprobado: en orden FIFO, se reduce
    -- monto_por_acreditar hasta cubrir p_adelantos_monto.
    IF p_adelantos_monto > 0 THEN
        v_restante := p_adelantos_monto;
        FOR v_adel IN
            SELECT id, monto_por_acreditar
              FROM public.adelantos
             WHERE comercio_id = v_comercio_id
               AND estado IN ('Pendiente', 'Aprobado')
               AND monto_por_acreditar IS NOT NULL
               AND monto_por_acreditar > 0
             ORDER BY fecha_solicitud ASC, created_at ASC
        LOOP
            EXIT WHEN v_restante <= 0;
            IF v_adel.monto_por_acreditar <= v_restante THEN
                UPDATE public.adelantos
                   SET monto_por_acreditar = 0,
                       updated_at = now()
                 WHERE id = v_adel.id;
                v_restante := v_restante - v_adel.monto_por_acreditar;
            ELSE
                UPDATE public.adelantos
                   SET monto_por_acreditar = round((monto_por_acreditar - v_restante)::numeric, 2),
                       updated_at = now()
                 WHERE id = v_adel.id;
                v_restante := 0;
            END IF;
        END LOOP;
    END IF;

    -- 6. Resolucion del lote.
    BEGIN
        v_uid := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_uid := NULL;
    END;

    -- 7. Notas: prefijo automatico de la deduccion por adelantos
    v_notas := '';
    IF p_adelantos_monto > 0 THEN
        v_notas := 'Deduccion por adelantos previos: $' || p_adelantos_monto::text;
    END IF;
    IF p_notas IS NOT NULL AND length(trim(p_notas)) > 0 THEN
        IF v_notas <> '' THEN
            v_notas := v_notas || E'\n' || trim(p_notas);
        ELSE
            v_notas := trim(p_notas);
        END IF;
    END IF;

    UPDATE public.lotes_acreditacion
       SET estado              = 'Acreditado',
           es_estimado         = false,
           fecha_estimada_recalcular = false,
           resuelto_por        = COALESCE(v_uid, resuelto_por),
           fecha_resolucion    = now(),
           notas_resolucion    = NULLIF(v_notas, ''),
           updated_at          = now()
     WHERE id = p_lote_id;

    RETURN jsonb_build_object(
        'lote_id',              p_lote_id,
        'estado',               'Acreditado',
        'importe_neto',         v_importe_neto,
        'adelantos_deducidos',  p_adelantos_monto,
        'monto_acreditado',     v_monto_acreditar,
        'debito_recaudacion',   v_debitar_recaudacion,
        'subcuenta_id',         v_subcuenta_id,
        'subcuenta_recaudacion_id', v_sub_recaudacion_id,
        'legajo',               v_legajo
    );
END;
$function$
;

-- fn_acreditar_adelanto
CREATE OR REPLACE FUNCTION public.fn_acreditar_adelanto(p_adelanto_id uuid, p_notas text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_estado text;
    v_monto numeric(14, 2);
    v_tasa numeric(7, 4);
    v_interes numeric(14, 2);
    v_neto numeric(18, 2);
    v_comercio_id uuid;
    v_legajo text;
    v_sub_recaudacion_id uuid;
    v_saldo_recaudacion numeric(18, 2);
    v_sub_operativa_id uuid;
    v_uid uuid;
    v_fecha_acreditacion timestamptz := now();
BEGIN
    -- 1. Lock + validación del adelanto
    SELECT estado, monto_solicitado, COALESCE(tasa_interes_pct, 0), comercio_id
      INTO v_estado, v_monto, v_tasa, v_comercio_id
      FROM public.adelantos
     WHERE id = p_adelanto_id
     FOR UPDATE;

    IF v_estado IS NULL THEN
        RAISE EXCEPTION 'Adelanto % no encontrado', p_adelanto_id;
    END IF;
    IF v_estado <> 'Aprobado' THEN
        RAISE EXCEPTION 'El adelanto % debe estar Aprobado para acreditarse (estado actual: %). Confirma con el comercio y carga la TEM primero.', p_adelanto_id, v_estado;
    END IF;
    IF v_monto IS NULL OR v_monto <= 0 THEN
        RAISE EXCEPTION 'El monto del adelanto es inválido';
    END IF;

    -- 2. Legajo del comercio (la subcuenta está indexada por legajo)
    SELECT legajo INTO v_legajo FROM public.comercios WHERE id = v_comercio_id;
    IF v_legajo IS NULL THEN
        RAISE EXCEPTION 'No se encontró legajo del comercio (id %)', v_comercio_id;
    END IF;

    -- 3. Cálculo del interés y el neto a depositar
    v_interes := round((v_monto * v_tasa / 100)::numeric, 2);
    v_neto := v_monto - v_interes;
    IF v_neto < 0 THEN
        v_neto := 0;
    END IF;

    -- 4. Lock de la subcuenta Recaudación (crea si no existe)
    SELECT s.id INTO v_sub_recaudacion_id
      FROM public.subaccounts s
      JOIN public.subaccount_balances b ON b.subaccount_id = s.id
     WHERE s.cliente_legajo = v_legajo AND s.tipo = 'Recaudacion'
     FOR UPDATE OF b;

    IF v_sub_recaudacion_id IS NULL THEN
        -- Crear la Recaudación vacía para que el ciclo siguiente pueda
        -- usarla. NO se fondea con capital propio: el pool arranca en 0.
        -- El trigger subaccounts_init_balance crea la fila de saldos en 0.
        INSERT INTO public.subaccounts
            (cliente_legajo, nombre, apellido, email, cbu, tipo, estado,
             retiros_habilitados)
        VALUES
            (v_legajo, 'Recaudación', '', '', NULL, 'Recaudacion', 'Activa',
             false)
        RETURNING id INTO v_sub_recaudacion_id;

        SELECT saldo_disponible INTO v_saldo_recaudacion
          FROM public.subaccount_balances
         WHERE subaccount_id = v_sub_recaudacion_id
         FOR UPDATE;
    ELSE
        SELECT saldo_disponible INTO v_saldo_recaudacion
          FROM public.subaccount_balances
         WHERE subaccount_id = v_sub_recaudacion_id;
    END IF;

    IF v_saldo_recaudacion < v_monto THEN
        RAISE EXCEPTION
            'La subcuenta Recaudación del comercio (legajo %) tiene saldo % pero el adelanto requiere %. MoliPay no fondea con capital propio.',
            v_legajo, v_saldo_recaudacion, v_monto;
    END IF;

    -- 5. Lock + upsert de la subcuenta Operativa
    SELECT s.id INTO v_sub_operativa_id
      FROM public.subaccounts s
      JOIN public.subaccount_balances b ON b.subaccount_id = s.id
     WHERE s.cliente_legajo = v_legajo AND s.tipo = 'Operativa'
     FOR UPDATE OF b;

    IF v_sub_operativa_id IS NULL THEN
        -- El trigger subaccounts_init_balance crea la fila de saldos en 0.
        INSERT INTO public.subaccounts
            (cliente_legajo, nombre, apellido, email, cbu, tipo, estado,
             retiros_habilitados)
        VALUES
            (v_legajo, 'Operativa', '', '', NULL, 'Operativa', 'Activa',
             true)
        RETURNING id INTO v_sub_operativa_id;

        UPDATE public.subaccount_balances
           SET saldo_disponible = v_neto,
               saldo_retenido   = 0,
               saldo_conciliado = v_neto
         WHERE subaccount_id = v_sub_operativa_id;
    ELSE
        UPDATE public.subaccount_balances
           SET saldo_disponible = saldo_disponible + v_neto,
               saldo_conciliado = saldo_conciliado + v_neto,
               updated_at = now()
         WHERE subaccount_id = v_sub_operativa_id;
    END IF;

    -- 6. Debitar el monto completo de la Recaudación
    UPDATE public.subaccount_balances
       SET saldo_disponible = saldo_disponible - v_monto,
           updated_at = now()
     WHERE subaccount_id = v_sub_recaudacion_id;

    -- 7. Resuelto_por
    BEGIN
        v_uid := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_uid := NULL;
    END;

    -- 8. Cerrar el adelanto
    UPDATE public.adelantos
       SET estado = 'Acreditado',
           fecha_acreditacion = v_fecha_acreditacion,
           fecha_resolucion = COALESCE(fecha_resolucion, now()),
           monto_por_acreditar = 0,
           resuelto_por = COALESCE(v_uid, resuelto_por),
           updated_at = now()
     WHERE id = p_adelanto_id;

    -- 9. Notas opcionales: guardamos en el campo motivo si vino algo
    IF p_notas IS NOT NULL AND length(trim(p_notas)) > 0 THEN
        UPDATE public.adelantos
           SET motivo = COALESCE(NULLIF(motivo, '') || E'\n' || trim(p_notas), trim(p_notas))
         WHERE id = p_adelanto_id;
    END IF;

    RETURN jsonb_build_object(
        'adelanto_id', p_adelanto_id,
        'estado', 'Acreditado',
        'monto_solicitado', v_monto,
        'tasa_pct', v_tasa,
        'interes', v_interes,
        'monto_neto_depositado', v_neto,
        'subcuenta_operativa_id', v_sub_operativa_id,
        'subcuenta_recaudacion_id', v_sub_recaudacion_id,
        'legajo', v_legajo,
        'fecha_acreditacion', v_fecha_acreditacion
    );
END;
$function$
;

-- tg_subaccounts_init_balance
CREATE OR REPLACE FUNCTION public.tg_subaccounts_init_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    INSERT INTO public.subaccount_balances (subaccount_id) VALUES (NEW.id);
    RETURN NULL;
END;
$function$
;


-- Helpers internos de la 4/4 (ya nada los referencia).
-- calcular_comision_transferencia original (previa a la 6)
CREATE OR REPLACE FUNCTION public.calcular_comision_transferencia(p_cliente_id uuid, p_monto numeric, p_subcuenta_origen uuid DEFAULT NULL::uuid, p_destino text DEFAULT NULL::text)
 RETURNS TABLE(comision numeric, impuesto numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_legajo text;
  v_es_interna boolean := false;
  v_modalidad text;
  v_porcentaje numeric;
  v_monto_fijo numeric;
  v_impuesto_pct numeric;
  v_comision numeric := 0;
begin
  -- Transferencia INTERNA: si el destino es otro CVU del MISMO cliente, no se
  -- cobra comision ni IVA (pasa plata entre sus propias cuentas).
  if p_destino is not null and length(trim(p_destino)) > 0 then
    select c.legajo into v_legajo
      from public.clientes c
     where c.id = p_cliente_id;

    select exists (
      select 1
        from public.subaccounts s
       where s.cbu = trim(p_destino)
         and s.cliente_legajo = v_legajo
    ) into v_es_interna;

    if v_es_interna then
      return query select 0::numeric, 0::numeric;
    end if;
  end if;

  -- Comision: primero la del CVU de origen; si no tiene, la del cliente (respaldo).
  select c.modalidad, c.porcentaje, c.monto_fijo, coalesce(c.porcentaje_impuesto, 21)
    into v_modalidad, v_porcentaje, v_monto_fijo, v_impuesto_pct
    from public.comisiones_cliente c
   where c.estado = 'Habilitado'
     and lower(c.tipo) = 'retiro'
     and (
          (p_subcuenta_origen is not null and c.subcuenta_id = p_subcuenta_origen)
       or (c.subcuenta_id is null and c.cliente_id = p_cliente_id)
     )
   order by (c.subcuenta_id is not null) desc, c.updated_at desc
   limit 1;

  if coalesce(v_modalidad, '') = 'Fijo' then
    v_comision := coalesce(v_monto_fijo, 0);
  elsif v_porcentaje is not null and v_porcentaje > 0 then
    v_comision := round(p_monto * v_porcentaje / 100, 2);
  end if;

  if v_comision is null or v_comision < 0 then
    v_comision := 0;
  end if;

  return query select v_comision, round(v_comision * coalesce(v_impuesto_pct, 21) / 100, 2);
end;
$function$;
DROP FUNCTION IF EXISTS public.calcular_comision(uuid,numeric,uuid,text,text);

DROP FUNCTION public._tx_reservar_transferencia(uuid,text,uuid,text,text,numeric,text,text,text);
DROP FUNCTION public._tx_confirmar_transferencia(uuid,text);
DROP FUNCTION public._ledger_reverse(uuid,text,text);
DROP FUNCTION public.ledger_post(uuid,text,jsonb,text,text);
DROP FUNCTION public._ledger_account_id(text);
DROP FUNCTION public._ledger_sub_account_id(uuid,text);
DROP FUNCTION public._ledger_lines(jsonb[]);
DROP FUNCTION IF EXISTS public._ledger_line(uuid,text,numeric,text);
DROP FUNCTION IF EXISTS public._ledger_line(uuid,text,numeric);
DROP FUNCTION public._estado_movimiento_id(text);
DROP FUNCTION public._puede(text,text);
DROP FUNCTION public._ensure_subaccount(text,text);
DROP FUNCTION public._tx_operacion_interna(text,text,text,numeric,uuid,uuid);
DROP FUNCTION public._subaccount_add_conciliado(uuid,numeric);

DO $$
DECLARE
    v text;
BEGIN
    SELECT string_agg(p.oid::regprocedure::text, ', ') INTO v
      FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.prosrc ~* '\m(transactions|transaction_status_history|ledger_entries|ledger_accounts|ledger_post)\M';
    IF v IS NOT NULL THEN
        RAISE EXCEPTION 'Funciones que siguen apuntando al esquema del ledger: %', v;
    END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
