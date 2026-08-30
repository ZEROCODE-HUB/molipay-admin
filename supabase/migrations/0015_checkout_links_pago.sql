-- ============================================================================
-- 0015_checkout_links_pago.sql
-- Soporte para el Hosted Payment Page (HPP) publico de links de pago.
--   - cliente_links_pago_pagos        (intentos/confirmaciones de pago)
--   - obtener_link_pago(codigo)        (lectura publica por codigo, SECURITY DEFINER)
--   - incrementar_vistas_link(id)      (contador de vistas)
--   - registrar_pago_link(...)          (inserta pago + suma contador, simulado/real-ready)
-- Acceso anonimo SOLO via estas funciones (no se abre RLS de tablas al publico).
-- ============================================================================

create table if not exists public.cliente_links_pago_pagos (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.cliente_links_pago(id) on delete cascade,
  cliente_legajo text not null,
  metodo text,
  monto numeric(14,2) not null default 0,
  estado text not null default 'Aprobado',
  pagador_nombre text,
  pagador_email text,
  referencia text,
  created_at timestamptz not null default now()
);
create index if not exists idx_pagos_link on public.cliente_links_pago_pagos(link_id);
alter table public.cliente_links_pago_pagos enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cliente_links_pago_pagos' and policyname = 'pagos_link_admin'
  ) then
    create policy pagos_link_admin on public.cliente_links_pago_pagos
      for all to authenticated, anon
      using (exists (select 1 from admin_users au join roles r on r.id = au.rol_id
        where au.id = auth.uid() and au.activo and lower(r.nombre) = 'admin'))
      with check (exists (select 1 from admin_users au join roles r on r.id = au.rol_id
        where au.id = auth.uid() and au.activo and lower(r.nombre) = 'admin'));
  end if;
end $$;

-- Lectura publica del link + detalle por el codigo final de la URL
create or replace function public.obtener_link_pago(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link cliente_links_pago%rowtype;
  v_det jsonb;
begin
  select * into v_link from cliente_links_pago where url like '%' || p_codigo limit 1;
  if v_link.id is null then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'producto_nombre', d.producto_nombre,
    'cantidad', d.cantidad,
    'precio_unitario', d.precio_unitario
  )), '[]'::jsonb) into v_det
  from cliente_links_pago_detalle d where d.link_id = v_link.id;
  return jsonb_build_object(
    'id', v_link.id,
    'url', v_link.url,
    'estado', v_link.estado,
    'referencia', v_link.referencia,
    'notas', v_link.notas,
    'expira_en', v_link.expira_en,
    'pagos_parciales', v_link.pagos_parciales,
    'metodos_pago', v_link.metodos_pago,
    'cliente_legajo', v_link.cliente_legajo,
    'monto', v_link.monto,
    'detalle', v_det
  );
end $$;

create or replace function public.incrementar_vistas_link(p_link_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update cliente_links_pago set vistas = coalesce(vistas, 0) + 1 where id = p_link_id;
$$;

create or replace function public.registrar_pago_link(
  p_link_id uuid,
  p_cliente_legajo text,
  p_metodo text,
  p_monto numeric,
  p_pagador_nombre text,
  p_pagador_email text,
  p_referencia text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into cliente_links_pago_pagos (link_id, cliente_legajo, metodo, monto, estado, pagador_nombre, pagador_email, referencia)
  values (p_link_id, p_cliente_legajo, p_metodo, p_monto, 'Aprobado', p_pagador_nombre, p_pagador_email, p_referencia)
  returning id into v_id;
  update cliente_links_pago set pagos = coalesce(pagos, 0) + 1 where id = p_link_id;
  return jsonb_build_object('id', v_id, 'estado', 'Aprobado');
end $$;

grant execute on function public.obtener_link_pago(text) to anon, authenticated;
grant execute on function public.incrementar_vistas_link(uuid) to anon, authenticated;
grant execute on function public.registrar_pago_link(uuid, text, text, numeric, text, text, text) to anon, authenticated;
