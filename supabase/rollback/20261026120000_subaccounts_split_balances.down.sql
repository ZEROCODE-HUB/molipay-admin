-- ============================================================================
-- ROLLBACK de 20261026120000_subaccounts_split_balances.sql
--
-- NO es una migracion: no ponerlo en supabase/migrations. Ejecutarlo a mano
-- y solo si hace falta volver al esquema anterior.
--
-- Vuelve a poner los saldos ACTUALES de subaccount_balances en
-- subcuentas.saldo_* (incluye los movimientos ocurridos despues de la
-- migracion), restaura el nombre de la tabla y las funciones tal como
-- estaban en el remoto el 2026-10-26.
--
-- Diferencias que no se pueden deshacer:
--   * Las tres columnas de saldo quedan al final de la tabla (orden fisico
--     distinto). No afecta a consultas por nombre.
--   * subcuentas.updated_at no reflejara los cambios de saldo hechos mientras
--     rigio el esquema nuevo (ese dato vivia en subaccount_balances.updated_at).
-- Ejecutar el archivo completo como UNA transaccion: psql -1 -v ON_ERROR_STOP=1 -f
-- (o pegarlo entero en el SQL Editor). No usa tablas temporales.
-- ============================================================================

BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '5min';

DO $$
BEGIN
    IF to_regclass('public.subaccounts') IS NULL
       OR to_regclass('public.subaccount_balances') IS NULL THEN
        RAISE EXCEPTION 'No se encuentra el esquema nuevo (subaccounts/subaccount_balances)';
    END IF;
    IF to_regclass('public.subcuentas') IS NOT NULL THEN
        RAISE EXCEPTION 'public.subcuentas ya existe';
    END IF;
END;
$$;

LOCK TABLE public.subaccounts, public.subaccount_balances IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.subaccounts s
                WHERE NOT EXISTS (SELECT 1 FROM public.subaccount_balances b WHERE b.subaccount_id = s.id)) THEN
        RAISE EXCEPTION 'Hay subcuentas sin fila de saldos: revisar antes de revertir';
    END IF;
END;
$$;

-- 1. Columnas de saldo de vuelta en la tabla de subcuentas
ALTER TABLE public.subaccounts
    ADD COLUMN saldo_disponible numeric(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN saldo_retenido   numeric(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN saldo_conciliado numeric(18,2) NOT NULL DEFAULT 0;

UPDATE public.subaccounts s
   SET saldo_disponible = b.saldo_disponible,
       saldo_retenido   = b.saldo_retenido,
       saldo_conciliado = b.saldo_conciliado
  FROM public.subaccount_balances b
 WHERE b.subaccount_id = s.id;

DO $$
DECLARE
    v_difs bigint;
BEGIN
    SELECT count(*) INTO v_difs
      FROM public.subaccounts s
      FULL JOIN public.subaccount_balances b ON b.subaccount_id = s.id
     WHERE s.id IS NULL
        OR b.subaccount_id IS NULL
        OR s.saldo_disponible::text <> b.saldo_disponible::text
        OR s.saldo_retenido::text   <> b.saldo_retenido::text
        OR s.saldo_conciliado::text <> b.saldo_conciliado::text;
    IF v_difs <> 0 THEN
        RAISE EXCEPTION '% saldos no coinciden al revertir', v_difs;
    END IF;
END;
$$;

-- 2. Objetos nuevos fuera
DROP TRIGGER subaccounts_init_balance ON public.subaccounts;
DROP TABLE public.subaccount_balances;   -- arrastra su trigger y sus politicas
DROP FUNCTION public.tg_subaccounts_init_balance();
DROP FUNCTION public.tg_subaccount_balances_touch();

-- 3. Nombre original de la tabla y de sus objetos
ALTER TABLE public.subaccounts RENAME TO subcuentas;

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT conname
          FROM pg_constraint
         WHERE conrelid = 'public.subcuentas'::regclass
           AND conname LIKE 'subaccounts\_%'
    LOOP
        EXECUTE format('ALTER TABLE public.subcuentas RENAME CONSTRAINT %I TO %I',
                       r.conname, regexp_replace(r.conname, '^subaccounts_', 'subcuentas_'));
    END LOOP;

    FOR r IN
        SELECT c.relname
          FROM pg_index i
          JOIN pg_class c ON c.oid = i.indexrelid
         WHERE i.indrelid = 'public.subcuentas'::regclass
           AND c.relname LIKE '%subaccounts%'
           AND NOT EXISTS (SELECT 1 FROM pg_constraint k WHERE k.conindid = i.indexrelid)
    LOOP
        EXECUTE format('ALTER INDEX public.%I RENAME TO %I',
                       r.relname, replace(r.relname, 'subaccounts', 'subcuentas'));
    END LOOP;

    FOR r IN
        SELECT policyname
          FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = 'subcuentas'
           AND policyname LIKE 'subaccounts\_%'
    LOOP
        EXECUTE format('ALTER POLICY %I ON public.subcuentas RENAME TO %I',
                       r.policyname, regexp_replace(r.policyname, '^subaccounts_', 'subcuentas_'));
    END LOOP;
END;
$$;

-- 4. Funciones originales (pg_get_functiondef del remoto, 2026-10-26)

-- calcular_comision_transferencia
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
        from public.subcuentas s
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

-- validar_operacion_comercio
CREATE OR REPLACE FUNCTION public.validar_operacion_comercio(p_comercio_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_cvu_count INT;
  v_bandera_count INT;
BEGIN
  -- Verificar que tiene al menos un CVU activo
  SELECT COUNT(*) INTO v_cvu_count
  FROM subcuentas
  WHERE comercio_id = p_comercio_id
    AND tipo = 'CVU'
    AND estado = 'Activo';

  -- Verificar que tiene al menos una bandera con comision
  SELECT COUNT(*) INTO v_bandera_count
  FROM comercio_banderas cb
  JOIN comercio_banderas_cuotas cbc ON cb.id = cbc.comercio_bandera_id
  WHERE cb.comercio_id = p_comercio_id
    AND cb.estado = 'Activo'
    AND cbc.estado = 'Activo';

  -- Solo puede operar si tiene ambos
  RETURN (v_cvu_count > 0 AND v_bandera_count > 0);
END;
$function$;

-- rpc_pool_recaudacion
CREATE OR REPLACE FUNCTION public.rpc_pool_recaudacion()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    WITH pool AS (
        SELECT COALESCE(SUM(saldo_disponible), 0) AS total
          FROM public.subcuentas
         WHERE tipo = 'Recaudacion'
    ),
    reservados AS (
        SELECT COALESCE(SUM(monto_solicitado), 0) AS total
          FROM public.adelantos
         WHERE estado IN ('Aprobado', 'Acreditado')
    )
    SELECT jsonb_build_object(
        'pool_recaudacion_total', (SELECT total FROM pool),
        'adelantos_en_curso',     (SELECT total FROM reservados),
        'cupo_disponible_pool',   (SELECT total FROM pool) - (SELECT total FROM reservados)
    );
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
      from public.subcuentas so
      join public.subcuentas sd on true
     where so.id = p_subcuenta_origen
       and sd.id = p_subcuenta_destino
       and so.cliente_legajo = v_legajo
       and sd.cliente_legajo = v_legajo
  ) then
    raise exception 'Subcuentas no pertenecen al cliente' using errcode = '42501';
  end if;

  select cbu into v_cbu_origen
    from public.subcuentas
   where id = p_subcuenta_origen;

  select cbu into v_cbu_destino
    from public.subcuentas
   where id = p_subcuenta_destino;

  if exists (
    select 1
      from public.subcuentas
     where id = p_subcuenta_origen
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

  update public.subcuentas
     set saldo_disponible = saldo_disponible - p_monto
   where id = p_subcuenta_origen;

  update public.subcuentas
     set saldo_disponible = saldo_disponible + p_monto
   where id = p_subcuenta_destino;

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
    select 1 from public.subcuentas
     where id = p_subcuenta_origen and cliente_legajo = v_legajo
  ) then
    raise exception 'La subcuenta de origen no pertenece al cliente' using errcode = '42501';
  end if;

  select k.comision, k.impuesto into v_comision, v_impuesto
    from public.calcular_comision_transferencia(v_cliente_id, p_monto, p_subcuenta_origen, p_destinatario_cbu) k;

  if exists (
    select 1 from public.subcuentas
     where id = p_subcuenta_origen
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

  update public.subcuentas
     set saldo_disponible = saldo_disponible - p_monto - v_comision - v_impuesto
   where id = p_subcuenta_origen;

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
    select 1 from public.subcuentas
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

  select saldo_disponible into v_saldo
    from public.subcuentas
   where id = p_subcuenta_origen;

  update public.subcuentas
     set saldo_disponible = saldo_disponible - p_monto - v_comision - v_impuesto
   where id = p_subcuenta_origen;

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
        SELECT id INTO v_sub_recaudacion_id
          FROM public.subcuentas
         WHERE cliente_legajo = v_legajo AND tipo = 'Recaudacion'
         FOR UPDATE;

        IF v_sub_recaudacion_id IS NULL THEN
            INSERT INTO public.subcuentas
                (cliente_legajo, nombre, apellido, email, cbu, tipo, estado,
                 saldo_disponible, saldo_retenido, saldo_conciliado, retiros_habilitados)
            VALUES
                (v_legajo, 'Recaudación', '', '', NULL, 'Recaudacion', 'Activa',
                 v_importe_neto, 0, v_importe_neto, false)
            RETURNING id INTO v_sub_recaudacion_id;
        ELSE
            UPDATE public.subcuentas
               SET saldo_disponible = saldo_disponible + v_importe_neto,
                   saldo_conciliado = saldo_conciliado + v_importe_neto,
                   updated_at       = now()
             WHERE id = v_sub_recaudacion_id;
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
$function$;

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

    SELECT id, saldo_disponible INTO v_sub_recaudacion_id, v_saldo_recaudacion
      FROM public.subcuentas
     WHERE cliente_legajo = v_legajo AND tipo = 'Recaudacion'
     FOR UPDATE;

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

    UPDATE public.subcuentas
       SET saldo_disponible = saldo_disponible - v_debitar_recaudacion,
           updated_at       = now()
     WHERE id = v_sub_recaudacion_id;

    -- 4. Subcuenta Operativa del legajo. Se crea con el neto acreditado
    -- si no existe.
    SELECT id INTO v_subcuenta_id
      FROM public.subcuentas
     WHERE cliente_legajo = v_legajo AND tipo = 'Operativa'
     LIMIT 1;

    IF v_subcuenta_id IS NULL THEN
        INSERT INTO public.subcuentas
            (cliente_legajo, nombre, apellido, email, cbu, tipo, estado,
             saldo_disponible, saldo_retenido, saldo_conciliado, retiros_habilitados)
        VALUES
            (v_legajo, 'Operativa', '', '', NULL, 'Operativa', 'Activa',
             v_monto_acreditar, 0, v_monto_acreditar, true)
        RETURNING id INTO v_subcuenta_id;
    ELSE
        UPDATE public.subcuentas
           SET saldo_disponible = saldo_disponible + v_monto_acreditar,
               saldo_conciliado = saldo_conciliado + v_monto_acreditar,
               updated_at       = now()
         WHERE id = v_subcuenta_id;
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
$function$;

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
    SELECT id INTO v_sub_recaudacion_id
      FROM public.subcuentas
     WHERE cliente_legajo = v_legajo AND tipo = 'Recaudacion'
     FOR UPDATE;

    IF v_sub_recaudacion_id IS NULL THEN
        -- Crear la Recaudación vacía para que el ciclo siguiente pueda
        -- usarla. NO se fondea con capital propio: el pool arranca en 0.
        INSERT INTO public.subcuentas
            (cliente_legajo, nombre, apellido, email, cbu, tipo, estado,
             saldo_disponible, saldo_retenido, saldo_conciliado, retiros_habilitados)
        VALUES
            (v_legajo, 'Recaudación', '', '', NULL, 'Recaudacion', 'Activa',
             0, 0, 0, false)
        RETURNING id, saldo_disponible INTO v_sub_recaudacion_id, v_saldo_recaudacion;
    ELSE
        SELECT saldo_disponible INTO v_saldo_recaudacion
          FROM public.subcuentas
         WHERE id = v_sub_recaudacion_id;
    END IF;

    IF v_saldo_recaudacion < v_monto THEN
        RAISE EXCEPTION
            'La subcuenta Recaudación del comercio (legajo %) tiene saldo % pero el adelanto requiere %. MoliPay no fondea con capital propio.',
            v_legajo, v_saldo_recaudacion, v_monto;
    END IF;

    -- 5. Lock + upsert de la subcuenta Operativa
    SELECT id INTO v_sub_operativa_id
      FROM public.subcuentas
     WHERE cliente_legajo = v_legajo AND tipo = 'Operativa'
     FOR UPDATE;

    IF v_sub_operativa_id IS NULL THEN
        INSERT INTO public.subcuentas
            (cliente_legajo, nombre, apellido, email, cbu, tipo, estado,
             saldo_disponible, saldo_retenido, saldo_conciliado, retiros_habilitados)
        VALUES
            (v_legajo, 'Operativa', '', '', NULL, 'Operativa', 'Activa',
             v_neto, 0, v_neto, true)
        RETURNING id INTO v_sub_operativa_id;
    ELSE
        UPDATE public.subcuentas
           SET saldo_disponible = saldo_disponible + v_neto,
               saldo_conciliado = saldo_conciliado + v_neto,
               updated_at = now()
         WHERE id = v_sub_operativa_id;
    END IF;

    -- 6. Debitar el monto completo de la Recaudación
    UPDATE public.subcuentas
       SET saldo_disponible = saldo_disponible - v_monto,
           updated_at = now()
     WHERE id = v_sub_recaudacion_id;

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
$function$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
          FROM pg_proc p
         WHERE p.pronamespace = 'public'::regnamespace
           AND p.prosrc ~* '(subaccounts|subaccount_balances)'
    ) THEN
        RAISE EXCEPTION 'Quedan funciones que referencian el esquema nuevo';
    END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
