-- ============================================================================
-- 0010_crear_subcuentas_documentos.sql
-- Objetivo: crear las tablas de respaldo que faltan para el detalle de cliente
-- (persona fisica/juridica) restaurado con tabs. Hoy el detalle solo muestra
-- 8 campos reales de `clientes`; subcuentas y documentos NO existen en prod.
-- RLS: admin-gated, idéntico al patrón de `clientes` (0005:793-809).
-- ============================================================================

-- ---- subcuentas (hijo de clientes) ----
create table if not exists public.subcuentas (
  id                  uuid primary key default gen_random_uuid(),
  cliente_legajo      text not null references public.clientes(legajo) on delete cascade,
  nombre              text not null default '',
  apellido            text not null default '',
  email               text not null default '',
  cbu                 text,
  tipo                text not null default 'Operativa'
                        check (tipo in ('Operativa','Recaudacion','Garantias','Sueldos')),
  estado              text not null default 'Activa'
                        check (estado in ('Activa','Pausada')),
  saldo_disponible    numeric(18,2) not null default 0,
  saldo_retenido      numeric(18,2) not null default 0,
  saldo_conciliado    numeric(18,2) not null default 0,
  ingresos            text,
  egresos             text,
  responsable         text,
  limite              text,
  retiros_habilitados boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_subcuentas_cliente on public.subcuentas(cliente_legajo);

-- ---- documentos (hijo de clientes) ----
create table if not exists public.documentos (
  id             uuid primary key default gen_random_uuid(),
  cliente_legajo text not null references public.clientes(legajo) on delete cascade,
  tipo           text not null check (tipo in ('id_frente','id_dorso','servicio','selfie')),
  url            text,
  label          text not null default '',
  created_at     timestamptz not null default now()
);
create index if not exists idx_documentos_cliente on public.documentos(cliente_legajo);

-- ---- RLS (admin-gated, espejo de clientes) ----
alter table public.subcuentas enable row level security;
alter table public.documentos enable row level security;

create policy subcuentas_select_admins on public.subcuentas
  as permissive for select to public
  using (exists (
    select 1 from admin_users au
    join roles r on r.id = au.rol_id
    where au.id = auth.uid() and au.activo and lower(r.nombre) = 'admin'
  ));
create policy subcuentas_manage_admins on public.subcuentas
  as permissive for all to public
  using (exists (
    select 1 from admin_users au
    join roles r on r.id = au.rol_id
    where au.id = auth.uid() and au.activo and lower(r.nombre) = 'admin'
  ))
  with check (exists (
    select 1 from admin_users au
    join roles r on r.id = au.rol_id
    where au.id = auth.uid() and au.activo and lower(r.nombre) = 'admin'
  ));

create policy documentos_select_admins on public.documentos
  as permissive for select to public
  using (exists (
    select 1 from admin_users au
    join roles r on r.id = au.rol_id
    where au.id = auth.uid() and au.activo and lower(r.nombre) = 'admin'
  ));
create policy documentos_manage_admins on public.documentos
  as permissive for all to public
  using (exists (
    select 1 from admin_users au
    join roles r on r.id = au.rol_id
    where au.id = auth.uid() and au.activo and lower(r.nombre) = 'admin'
  ))
  with check (exists (
    select 1 from admin_users au
    join roles r on r.id = au.rol_id
    where au.id = auth.uid() and au.activo and lower(r.nombre) = 'admin'
  ));
