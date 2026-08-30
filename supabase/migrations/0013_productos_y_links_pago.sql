-- ============================================================================
-- 0013_productos_y_links_pago.sql
-- Objetivo: soporte escalable de productos y links de pago para el portal
-- empresas (B2B). Modelo por cliente, coherente con cliente_* y preparado
-- para evolucionar a catalogo global (legajo nulo) sin romper esquema.
--   - productos                  (catalogo del cliente)
--   - cliente_links_pago          (se EXTIENDE la tabla existente)
--   - cliente_links_pago_detalle  (relacion N:N link<->producto con snapshot)
-- RLS: se agregan politicas de cliente (por legajo de sesion) sin tocar las
-- politicas de admin existentes en 0012.
-- ============================================================================

-- ---- funcion auxiliar: legajo del cliente logueado ----
-- Mapea el email de la sesion de Supabase Auth -> legajo en clientes.
-- Seguridad definer para no depender de RLS de clientes al evaluar la policy.
create or replace function public.legajo_de_sesion()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select legajo from public.clientes where correo = auth.email() limit 1;
$$;

grant execute on function public.legajo_de_sesion() to anon, authenticated;

-- ---- productos (catalogo por cliente) ----
create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  cliente_legajo text not null references public.clientes(legajo) on delete cascade,
  nombre text not null,
  descripcion text,
  precio numeric(14,2) not null default 0,
  cantidad integer not null default 1,            -- unidades por defecto al armar el link
  moneda text not null default 'ARS',
  sku text,
  imagen_url text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_productos_cliente on public.productos(cliente_legajo);

-- ---- extension de cliente_links_pago (tabla existente, NO se reemplaza) ----
alter table public.cliente_links_pago
  add column if not exists referencia text,
  add column if not exists notas text,
  add column if not exists expira_en timestamptz,
  add column if not exists pagos_parciales boolean not null default false,
  add column if not exists metodos_pago jsonb,
  add column if not exists vistas integer not null default 0,
  add column if not exists pagos integer not null default 0;

-- ---- cliente_links_pago_detalle (relacion link <-> producto) ----
create table if not exists public.cliente_links_pago_detalle (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.cliente_links_pago(id) on delete cascade,
  producto_id uuid references public.productos(id) on delete set null,
  producto_nombre text not null,                 -- snapshot: sobrevive si se borra el producto
  cantidad integer not null default 1,
  precio_unitario numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_link_detalle_link on public.cliente_links_pago_detalle(link_id);

-- ---- RLS ----
alter table public.productos enable row level security;
alter table public.cliente_links_pago_detalle enable row level security;

-- productos: el cliente solo ve/modifica los suyos
drop policy if exists productos_cliente on public.productos;
create policy productos_cliente on public.productos
  for all to authenticated, anon
  using (cliente_legajo = public.legajo_de_sesion())
  with check (cliente_legajo = public.legajo_de_sesion());

-- cliente_links_pago: mantiene politicas admin de 0012; se suma la del cliente
drop policy if exists cliente_links_pago_cliente on public.cliente_links_pago;
create policy cliente_links_pago_cliente on public.cliente_links_pago
  for all to authenticated, anon
  using (cliente_legajo = public.legajo_de_sesion())
  with check (cliente_legajo = public.legajo_de_sesion());

-- detalle: acceso si el link padre pertenece al cliente
drop policy if exists link_detalle_cliente on public.cliente_links_pago_detalle;
create policy link_detalle_cliente on public.cliente_links_pago_detalle
  for all to authenticated, anon
  using (exists (
    select 1 from public.cliente_links_pago l
    where l.id = link_id and l.cliente_legajo = public.legajo_de_sesion()
  ))
  with check (exists (
    select 1 from public.cliente_links_pago l
    where l.id = link_id and l.cliente_legajo = public.legajo_de_sesion()
  ));
