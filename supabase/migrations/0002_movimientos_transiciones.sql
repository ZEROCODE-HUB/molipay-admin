-- ============================================================================
-- [!] DESALINEADA CON PRODUCCION (verificado contra information_schema /
--     pg_constraint el 2026-08-23). NO usar para reconstruir un entorno nuevo.
--     FUENTE DE VERDAD VIGENTE DEL SCHEMA: 0005_consolidacion_schema_real.sql
--     Este archivo se conserva por historia. Ver ESTADO_ACTUAL.md, seccion 16.
-- ============================================================================

-- 0002: RPC atómica de cambio manual de estado de movimiento.
--
-- IMPORTANTE: la tabla `movimientos_transiciones` YA EXISTE en producción
-- (columnas: id, movimiento_id, estado_anterior_id, estado_nuevo_id, origen,
-- admin_user_id, comentario, fecha) con su propio trigger
-- `trg_log_transicion_movimiento` que inserta con `origen = 'coelsa'` en cada
-- cambio de `movimientos.estado_id`. Por eso ESTE archivo NO la crea.
--
-- La RPC corre como SECURITY DEFINER, por lo que puede corregir la fila que
-- acaba de insertar el trigger (la tabla es append-only para el rol público,
-- pero el dueño de la función conserva UPDATE) dejándola con `origen = 'manual'`
-- y el `admin_user_id` real, en la misma transacción.
--
-- Valida que el estado destino sea válido para el TIPO de ese movimiento
-- consultando `estados_por_tipo`.

create or replace function public.cambiar_estado_movimiento(
  p_movimiento_id uuid,
  p_nuevo_estado_id smallint,
  p_comentario text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_es_admin boolean;
  v_tipo text;
  v_tipo_key text;
  v_transicion_valida boolean;
  v_hay_definicion boolean;
  v_estado_anterior smallint;
begin
  if v_admin is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.admin_users au
    join public.roles r on r.id = au.rol_id
    where au.id = v_admin and au.activo and r.nombre = 'admin'
  ) into v_es_admin;

  if not v_es_admin then
    raise exception 'Sin permiso para cambiar el estado' using errcode = '42501';
  end if;

  select m.tipo, m.estado_id
  into v_tipo, v_estado_anterior
  from public.movimientos m
  where m.id = p_movimiento_id
  for update;

  if v_tipo is null then
    raise exception 'Movimiento no encontrado';
  end if;

  -- Normaliza el tipo de movimiento (display en BD) al código de estados_por_tipo.
  v_tipo_key := case v_tipo
    when 'Depósito' then 'deposito'
    when 'Retiro' then 'retiro'
    when 'Pago con tarjeta' then 'tarjeta'
    when 'Pago PCT' then 'pago_pct'
    when 'Cobro PCT' then 'cobro_pct'
    else v_tipo
  end;

  -- Solo valida si el tipo tiene estados definidos; si no, no se bloquea.
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

  -- Dispara el trigger (inserta fila con origen = 'coelsa').
  update public.movimientos set estado_id = p_nuevo_estado_id where id = p_movimiento_id;

  -- Corrige la fila recién creada por el trigger a origen = 'manual'.
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

  return jsonb_build_object('ok', true, 'estado_id', p_nuevo_estado_id);
end;
$$;
