-- ============================================================================
-- 0014_cliente_integraciones_ecommerce.sql
-- Estado de integraciones E-commerce por cliente (Shopify, WooCommerce, ...).
-- El catalogo de plataformas disponibles vive en el frontend; aqui se guarda
-- el estado (Habilitado/Deshabilitado), api_key y webhook de cada cliente.
-- RLS: politica de cliente por legajo (reusa legajo_de_sesion de 0013).
-- ============================================================================

create table if not exists public.cliente_integraciones_ecommerce (
  id uuid primary key default gen_random_uuid(),
  cliente_legajo text not null references public.clientes(legajo) on delete cascade,
  plataforma text not null,
  estado text not null default 'Deshabilitado',
  api_key text,
  webhook_url text,
  created_at timestamptz not null default now(),
  unique (cliente_legajo, plataforma)
);
create index if not exists idx_int_ecom_cliente on public.cliente_integraciones_ecommerce(cliente_legajo);

alter table public.cliente_integraciones_ecommerce enable row level security;

drop policy if exists int_ecom_cliente on public.cliente_integraciones_ecommerce;
create policy int_ecom_cliente on public.cliente_integraciones_ecommerce
  for all to authenticated, anon
  using (cliente_legajo = public.legajo_de_sesion())
  with check (cliente_legajo = public.legajo_de_sesion());
