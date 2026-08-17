-- 0001: Auth del backoffice — usuarios del panel de administración + roles + RLS

create table if not exists public.admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  legajo text not null unique,
  email text not null unique,
  nombre text not null,
  rol text not null default 'operador' check (rol in ('admin', 'operador', 'compliance')),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.admin_users is 'Usuarios del panel de administración (backoffice)';

-- Crea el perfil automáticamente al registrar un usuario en auth.users
create or replace function public.handle_new_admin_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_legajo text := coalesce(new.raw_user_meta_data->>'legajo', split_part(new.email, '@', 1));
  v_nombre text := coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1));
  v_rol text := coalesce(new.raw_user_meta_data->>'rol', 'operador');
begin
  insert into public.admin_users (id, legajo, email, nombre, rol)
  values (new.id, v_legajo, new.email, v_nombre, v_rol)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_admin_user_created on auth.users;
create trigger on_auth_admin_user_created
  after insert on auth.users
  for each row execute function public.handle_new_admin_user();

-- Mantiene updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists admin_users_set_updated_at on public.admin_users;
create trigger admin_users_set_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

-- RLS
alter table public.admin_users enable row level security;

drop policy if exists admin_users_select_own on public.admin_users;
create policy admin_users_select_own on public.admin_users
  for select to authenticated
  using (auth.uid() = id);

drop policy if exists admin_users_select_all_admins on public.admin_users;
create policy admin_users_select_all_admins on public.admin_users
  for select to authenticated
  using (
    exists (
      select 1 from public.admin_users au
      where au.id = auth.uid() and au.activo and au.rol = 'admin'
    )
  );

drop policy if exists admin_users_manage_admins on public.admin_users;
create policy admin_users_manage_admins on public.admin_users
  for all to authenticated
  using (
    exists (
      select 1 from public.admin_users au
      where au.id = auth.uid() and au.activo and au.rol = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.admin_users au
      where au.id = auth.uid() and au.activo and au.rol = 'admin'
    )
  );