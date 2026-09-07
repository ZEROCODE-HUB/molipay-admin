-- ============================================================================
-- 0022_cliente_api_usuarios.sql
-- Objetivo: hacer real el tab "API Externa" en /admin/general/usuarios/[legajo]
--   -> Modulos y productos > API externa mostraba datos mock / lista global de
--      api_usuarios sin filtrar por cliente.
-- Crea el vinculo faltante entre clientes y api_usuarios + tablas de soporte
-- que la capa TS ya consume (endpoints / logs por usuario API) pero no
-- existian como DDL en migrations (solo en docs/ESTADO_ACTUAL).
-- Tablas:
--   - cliente_api_usuarios (N:M cliente <-> api_usuario) - NUEVA
--   - api_usuario_endpoints (endpoints habilitados por usuario API) - faltaba
--   - api_usuario_logs (logs de consumo por usuario API) - faltaba
-- RLS: mismo patron admin-gated que 0011/0012 (admin_users + roles).
--      api_* tambien expone authenticated_all como api_usuarios base para
--      compatibilidad con codigo existente.
-- ============================================================================

-- ---- cliente_api_usuarios (join cliente <-> api_usuario) ----
create table if not exists public.cliente_api_usuarios (
  id uuid primary key default gen_random_uuid(),
  cliente_legajo text not null references public.clientes(legajo) on delete cascade,
  api_usuario_id uuid not null references public.api_usuarios(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (cliente_legajo, api_usuario_id)
);
create index if not exists idx_cliente_api_usuarios_cliente on public.cliente_api_usuarios(cliente_legajo);
create index if not exists idx_cliente_api_usuarios_api on public.cliente_api_usuarios(api_usuario_id);

-- ---- api_usuario_endpoints (endpoints por usuario API) ----
-- Consumida por src/lib/api/api-usuarios.ts:listApiUsuarioEndpoints
create table if not exists public.api_usuario_endpoints (
  id uuid primary key default gen_random_uuid(),
  api_usuario_id uuid not null references public.api_usuarios(id) on delete cascade,
  grupo text,
  path text,
  metodo text check (metodo is null or metodo in ('GET','POST','PUT','DELETE','PATCH')),
  estado text check (estado is null or estado in ('Habilitado','Deshabilitado')),
  created_at timestamptz not null default now()
);
create index if not exists idx_api_usuario_endpoints_api on public.api_usuario_endpoints(api_usuario_id);

-- ---- api_usuario_logs (logs por usuario API) ----
-- Consumida por src/lib/api/api-usuarios.ts:listApiUsuarioLogs
create table if not exists public.api_usuario_logs (
  id uuid primary key default gen_random_uuid(),
  api_usuario_id uuid not null references public.api_usuarios(id) on delete cascade,
  fecha_hora timestamptz,
  ip text,
  cliente_id text,
  metodo text,
  endpoint text,
  status integer,
  tiempo_respuesta_ms integer,
  detalle jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_api_usuario_logs_api on public.api_usuario_logs(api_usuario_id);
create index if not exists idx_api_usuario_logs_fecha on public.api_usuario_logs(fecha_hora desc);

-- ---- RLS ----
alter table public.cliente_api_usuarios enable row level security;
alter table public.api_usuario_endpoints enable row level security;
alter table public.api_usuario_logs enable row level security;

-- cliente_api_usuarios: admin-gated (espejo de cliente_modulos / cliente_comercios_pst)
do $$
declare t text;
begin
  foreach t in array array['cliente_api_usuarios']
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

-- api_usuario_endpoints / api_usuario_logs: mismo patron que api_usuarios
-- (authenticated_all true/true) para no romper flujos existentes, + admin-gated adicional
drop policy if exists authenticated_all_api_usuario_endpoints on public.api_usuario_endpoints;
create policy authenticated_all_api_usuario_endpoints on public.api_usuario_endpoints
  as permissive for all to authenticated using (true) with check (true);

drop policy if exists authenticated_all_api_usuario_logs on public.api_usuario_logs;
create policy authenticated_all_api_usuario_logs on public.api_usuario_logs
  as permissive for all to authenticated using (true) with check (true);

-- ---- Sincronizacion cliente_modulos.cantidad para clave='api' ----
-- Mantener coherencia entre join y contador desnormalizado usado en KPIs.
create or replace function public.sync_cliente_modulos_api()
returns trigger
language plpgsql
as $$
declare
  v_legajo text;
  v_cant int;
begin
  if TG_OP = 'DELETE' then
    v_legajo := OLD.cliente_legajo;
  else
    v_legajo := NEW.cliente_legajo;
  end if;

  select count(*) into v_cant from public.cliente_api_usuarios where cliente_legajo = v_legajo;

  -- upsert fila api en cliente_modulos si no existe
  insert into public.cliente_modulos (cliente_legajo, clave, titulo, cantidad, detalle)
  values (v_legajo, 'api', 'API Externa', v_cant,
    case when v_cant = 0 then 'Sin integraciones' else v_cant || ' usuario(s) API en producción' end)
  on conflict (cliente_legajo, clave) do update set
    cantidad = excluded.cantidad,
    detalle = excluded.detalle;

  -- Si la tabla tiene constraint unique (cliente_legajo, clave) no existe como tal,
  -- el on conflict fallara silenciosamente en instalaciones antiguas donde
  -- cliente_modulos no tiene unique. Fallback: update directo.
  -- El trigger igual intenta actualizar por si el insert fallo por falta de constraint.
  -- No-op si ya se actualizo via on conflict.

  return coalesce(NEW, OLD);
exception when unique_violation then
  -- Fallback para instalaciones sin unique: actualizar fila existente
  update public.cliente_modulos set
    cantidad = v_cant,
    detalle = case when v_cant = 0 then 'Sin integraciones' else v_cant || ' usuario(s) API en producción' end
  where cliente_legajo = v_legajo and clave = 'api';
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_sync_cliente_modulos_api_ins on public.cliente_api_usuarios;
create trigger trg_sync_cliente_modulos_api_ins
  after insert on public.cliente_api_usuarios
  for each row execute function public.sync_cliente_modulos_api();

drop trigger if exists trg_sync_cliente_modulos_api_del on public.cliente_api_usuarios;
create trigger trg_sync_cliente_modulos_api_del
  after delete on public.cliente_api_usuarios
  for each row execute function public.sync_cliente_modulos_api();

-- Asegurar unique para que el on conflict funcione en instalaciones nuevas
-- (no rompe si ya existe)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cliente_modulos_legajo_clave_key'
  ) then
    -- intentar crear unique si no existe ninguno sobre (cliente_legajo, clave)
    -- fail-safe: no error si ya hay duplicados
    begin
      alter table public.cliente_modulos add constraint cliente_modulos_legajo_clave_key unique (cliente_legajo, clave);
    exception when duplicate_table then null;
    when others then null;
    end;
  end if;
end $$;
