-- ============================================================================
-- 0006_fix_rpc_cambiar_estado.sql  —  PROPUESTA v2 (revisada), NO APLICADA
-- ============================================================================
-- ESTADO: propuesta original 2026-08-23; v2 con 3 ajustes de revisión
--         previos a su aplicación. PENDIENTE de aprobación final y de
--         aplicación manual en Supabase (SQL Editor o db push).
--         NO forma parte de la consolidación: 0005 documenta lo que EXISTE;
--         este archivo es DDL NUEVA que arregla lo que falta.
--
-- INCIDENCIA QUE RESUELVE (GAP-1, ver ESTADO_ACTUAL.md sección 16):
--   La RPC public.cambiar_estado_movimiento nunca fue aplicada a producción.
--   Evidencia dura:
--     * pg_proc completo (export 2026-08-23): solo existen set_updated_at,
--       generar_legajo, handle_new_cliente, handle_cliente_actualizado,
--       handle_new_admin_user y fn_log_transicion_movimiento.
--     * Sondeo REST con firma exacta (p_comentario, p_movimiento_id,
--       p_nuevo_estado_id) -> HTTP 404 PGRST202 "Could not find the function
--       public.cambiar_estado_movimiento(...) in the schema cache".
--   Impacto actual: el botón "Cambiar estado" de Movimientos (índice + 7
--   sub-rutas) falla en producción desde su implementación.
--
-- AJUSTES DE LA v2 (diferencias con la DDL original de 0002):
--   A1 [CRÍTICO] Comparación de rol insensible a mayúsculas:
--       ANTES:  r.nombre = 'admin'          (hubiera rechazado al admin real,
--                                               porque en prod el rol se llama
--                                               'Admin' — mismo bug de caso ya
--                                               corregido en las políticas RLS)
--       AHORA:  lower(r.nombre) = 'admin'   (idéntico al patrón verificado en
--                                               pg_policies de producción)
--   A2 Retorno incluye 'estado_anterior' (v_estado_anterior ya capturado):
--       auditoría barata, consistente con movimientos_transiciones.
--   A3 Guard temprano no-op: si p_nuevo_estado_id = v_estado_anterior se
--       retorna {'ok':true,'sin_cambios':true} SIN tocar tablas ni generar
--       fila de transición falsa.
--
-- INVARIANTE QUE MANTIENE (ESTADO_ACTUAL.md §5): todo cambio manual de
--   estado deja fila append-only en movimientos_transiciones con
--   origen='manual' + admin_user_id real, en la misma transacción.
--
-- SEGURIDAD: SECURITY DEFINER + auth.uid(); EXECUTE por defecto a PUBLIC
--   (comportamiento Postgres) pero la autorización ocurre dentro: exige
--   admin_users.activo + rol 'admin' (case-insensitive). No se emiten GRANTs.
--
-- VERIFICACIÓN POST-APLICACIÓN OBLIGATORIA (lección GAP-1):
--   SELECT proname FROM pg_proc
--   WHERE pronamespace = 'public'::regnamespace
--     AND proname = 'cambiar_estado_movimiento';   -- debe devolver 1 fila
-- ============================================================================

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
      and lower(r.nombre) = 'admin'   -- A1: 'Admin' en prod; comparación case-insensitive igual que las políticas RLS
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
  -- Evita un UPDATE inútil y cualquier riesgo de fila de transición falsa.
  if p_nuevo_estado_id = v_estado_anterior then
    return jsonb_build_object(
      'ok', true,
      'sin_cambios', true,
      'estado_id', v_estado_anterior,
      'estado_anterior', v_estado_anterior
    );
  end if;

  -- ── Normalización + validación de la transición ──────────────────────
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

  -- ── Escritura atómica ────────────────────────────────────────────────
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

  -- A2: retorno con auditoría del estado previo.
  return jsonb_build_object(
    'ok', true,
    'sin_cambios', false,
    'estado_id', p_nuevo_estado_id,
    'estado_anterior', v_estado_anterior
  );
end;
$$;
