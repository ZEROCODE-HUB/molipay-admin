-- ============================================================================
-- 0011_crear_tablas_detalle_cliente.sql
-- Objetivo: crear las tablas de respaldo que faltan para las tabs del detalle
-- de cliente (persona fisica/juridica) que hoy solo tienen estructura vacía:
--   - historial_cambios  (log de cambios del cliente)
--   - validaciones       (validaciones automáticas)
--   - alertas            (alertas operativas por cliente)
--   - bloqueos           (parámetros de bloqueo por cliente)
--   - cliente_modulos    (módulos/productos vinculados por cliente)
-- RLS: admin-gated, idéntico al patrón de clientes (0005:793-809).
-- El seed va en supabase/seed/0011_detalle_cliente.sql (correr aparte).
-- ============================================================================

-- ---- historial_cambios ----
create table if not exists public.historial_cambios (
  id uuid primary key default gen_random_uuid(),
  cliente_legajo text not null references public.clientes(legajo) on delete cascade,
  campo text not null,
  valor_anterior text,
  valor_nuevo text,
  fecha date not null default current_date,
  hora text,
  usuario text,
  created_at timestamptz not null default now()
);
create index if not exists idx_historial_cliente on public.historial_cambios(cliente_legajo);

-- ---- validaciones ----
create table if not exists public.validaciones (
  id uuid primary key default gen_random_uuid(),
  cliente_legajo text not null references public.clientes(legajo) on delete cascade,
  proveedor text not null,
  estado text not null check (estado in ('Ok', 'En proceso', 'Fallida', 'Pendiente')),
  fecha date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists idx_validaciones_cliente on public.validaciones(cliente_legajo);

-- ---- alertas ----
create table if not exists public.alertas (
  id uuid primary key default gen_random_uuid(),
  cliente_legajo text not null references public.clientes(legajo) on delete cascade,
  tipo text not null,
  fecha date not null default current_date,
  estado text not null check (estado in ('Pendiente', 'En revision', 'Resuelta', 'Descartada')),
  created_at timestamptz not null default now()
);
create index if not exists idx_alertas_cliente on public.alertas(cliente_legajo);

-- ---- bloqueos ----
create table if not exists public.bloqueos (
  id uuid primary key default gen_random_uuid(),
  cliente_legajo text not null references public.clientes(legajo) on delete cascade,
  parametro text not null,
  valor text,
  created_at timestamptz not null default now()
);
create index if not exists idx_bloqueos_cliente on public.bloqueos(cliente_legajo);

-- ---- cliente_modulos ----
create table if not exists public.cliente_modulos (
  id uuid primary key default gen_random_uuid(),
  cliente_legajo text not null references public.clientes(legajo) on delete cascade,
  clave text not null check (clave in ('pct', 'blp', 'api')),
  titulo text not null,
  cantidad integer not null default 0,
  detalle text,
  created_at timestamptz not null default now()
);
create index if not exists idx_cliente_modulos_cliente on public.cliente_modulos(cliente_legajo);

-- ---- RLS (admin-gated, espejo de clientes) ----
alter table public.historial_cambios enable row level security;
alter table public.validaciones enable row level security;
alter table public.alertas enable row level security;
alter table public.bloqueos enable row level security;
alter table public.cliente_modulos enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['historial_cambios','validaciones','alertas','bloqueos','cliente_modulos']
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
