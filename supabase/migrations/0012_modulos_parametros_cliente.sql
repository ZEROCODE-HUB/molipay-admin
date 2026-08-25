-- ============================================================================
-- 0012_modulos_parametros_cliente.sql
-- Objetivo: crear las tablas de respaldo para las nuevas funcionalidades del
-- detalle de cliente (Admin General -> Usuarios):
--   - cliente_parametros_alertas  (parámetros de alertas por cliente)
--   - cliente_parametros_bloqueos (parámetros de bloqueo por cliente)
--   - cliente_comercios_pst        (comercios PST vinculados por cliente)
--   - cliente_links_pago           (links de pago vinculados por cliente)
-- RLS: admin-gated, idéntico al patrón de 0011_crear_tablas_detalle_cliente.
-- ============================================================================

-- ---- cliente_parametros_alertas ----
create table if not exists public.cliente_parametros_alertas (
  id uuid primary key default gen_random_uuid(),
  cliente_legajo text not null references public.clientes(legajo) on delete cascade,
  clave text not null,
  habilitado boolean not null default false,
  valor text,
  periodo text,
  created_at timestamptz not null default now(),
  unique (cliente_legajo, clave)
);
create index if not exists idx_param_alertas_cliente on public.cliente_parametros_alertas(cliente_legajo);

-- ---- cliente_parametros_bloqueos ----
create table if not exists public.cliente_parametros_bloqueos (
  id uuid primary key default gen_random_uuid(),
  cliente_legajo text not null references public.clientes(legajo) on delete cascade,
  clave text not null,
  habilitado boolean not null default false,
  valor text,
  periodo text,
  created_at timestamptz not null default now(),
  unique (cliente_legajo, clave)
);
create index if not exists idx_param_bloqueos_cliente on public.cliente_parametros_bloqueos(cliente_legajo);

-- ---- cliente_comercios_pst ----
create table if not exists public.cliente_comercios_pst (
  id uuid primary key default gen_random_uuid(),
  cliente_legajo text not null references public.clientes(legajo) on delete cascade,
  nombre text not null,
  email text,
  legajo_comercio text,
  created_at timestamptz not null default now()
);
create index if not exists idx_comercios_pst_cliente on public.cliente_comercios_pst(cliente_legajo);

-- ---- cliente_links_pago ----
create table if not exists public.cliente_links_pago (
  id uuid primary key default gen_random_uuid(),
  cliente_legajo text not null references public.clientes(legajo) on delete cascade,
  comercio_nombre text not null,
  url text,
  monto numeric,
  estado text,
  created_at timestamptz not null default now()
);
create index if not exists idx_links_pago_cliente on public.cliente_links_pago(cliente_legajo);

-- ---- RLS (admin-gated, espejo de 0011) ----
alter table public.cliente_parametros_alertas enable row level security;
alter table public.cliente_parametros_bloqueos enable row level security;
alter table public.cliente_comercios_pst enable row level security;
alter table public.cliente_links_pago enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['cliente_parametros_alertas','cliente_parametros_bloqueos','cliente_comercios_pst','cliente_links_pago']
  loop
    execute format('drop policy if exists %1$s_select_admins on public.%1$s;', t);
    execute format('drop policy if exists %1$s_manage_admins on public.%1$s;', t);
    execute format($f$
      create policy %1$s_select_admins on public.%1$s
        as permissive for select to public
        using (exists (select 1 from admin_users au join roles r on r.id = au.rol_id
          where au.id = auth.uid() and au.activo and lower(r.nombre) = 'admin'));
      create policy %1$s_manage_admins on public.%1$s
        as permissive for all to public
        using (exists (select 1 from admin_users au join roles r on r.id = au.rol_id
          where au.id = auth.uid() and au.activo and lower(r.nombre) = 'admin'))
        with check (exists (select 1 from admin_users au join roles r on r.id = au.rol_id
          where au.id = auth.uid() and au.activo and lower(r.nombre) = 'admin'));
    $f$, t);
  end loop;
end $$;
