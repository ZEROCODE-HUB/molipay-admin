-- 0001: Esquema completo de MoliPay Admin (consolidado)
--
-- Archivo único con el estado final de la base. Idempotente: se puede ejecutar
-- sobre un proyecto nuevo o re-ejecutar sobre uno ya actualizado sin fallar.
-- Aplicar pegándolo en el SQL Editor de Supabase (o `supabase db push`).
--
-- Contenido:
--   1. Extensión pgcrypto
--   2. admin_users — usuarios del backoffice + roles + RLS
--   3. clientes — legajo derivado del CUIT (LPF/LPJ-XXXXXXXXXXX, determinístico)
--   4. comisiones_cliente — parametrización por cliente + tipo de operación
--   5. movimientos — cobros con desglose comisión / impuesto / monto cobrado
--   6. auditoria_legajos — vista de control de legajos inválidos/huérfanos
--
-- Formato de legajo (ver src/data/clientes.ts):
--   legajo = prefijo ('LPF' persona física / 'LPJ' persona jurídica) + '-' + CUIT de 11 dígitos sin separadores.
--   Ejemplos: LPF-20123456789, LPJ-30112233445. El CUIT es la fuente de verdad;
--   el legajo NO es correlativo ni usa secuencias.

create extension if not exists pgcrypto;

-- ============================================================================
-- Utilidades
-- ============================================================================

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

-- ============================================================================
-- 2. Usuarios del backoffice
-- ============================================================================

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

drop trigger if exists admin_users_set_updated_at on public.admin_users;
create trigger admin_users_set_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

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

-- ============================================================================
-- 3. Clientes — legajo derivado del CUIT
-- ============================================================================

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  legajo text not null unique,
  tipo_persona text not null check (tipo_persona in ('fisica', 'juridica')),
  correo text not null unique,
  nombre text not null,
  cuit text not null unique,
  estado text not null default 'activo' check (estado in ('activo', 'suspendido', 'rechazado')),
  fecha_alta date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Formato: LPF/LPJ + CUIT de exactamente 11 dígitos
  constraint clientes_legajo_check check (legajo ~ '^(LPF|LPJ)-[0-9]{11}$'),
  constraint clientes_cuit_check check (cuit ~ '^[0-9]{11}$'),
  -- Invariante determinístico: el legajo ES prefijo + CUIT, sin excepciones
  constraint legajo_deriva_de_cuit check (
    legajo = (case tipo_persona when 'fisica' then 'LPF-' else 'LPJ-' end) || cuit
  )
);

comment on table public.clientes is
  'Clientes de la plataforma. El legajo (LPF-CUIT / LPJ-CUIT, CUIT de 11 dígitos sin separadores) es el identificador interno del cliente, se deriva del CUIT y es distinto del usuario (mail de login).';

-- Genera el legajo a partir del tipo de persona y el CUIT
create or replace function public.generar_legajo(p_tipo_persona text, p_cuit text)
returns text
language plpgsql
immutable
as $$
declare
  v_cuit text := regexp_replace(coalesce(p_cuit, ''), '[^0-9]', '', 'g');
begin
  if length(v_cuit) <> 11 then
    raise exception 'CUIT inválido para generar legajo: %', p_cuit;
  end if;
  if p_tipo_persona = 'fisica' then
    return 'LPF-' || v_cuit;
  elsif p_tipo_persona = 'juridica' then
    return 'LPJ-' || v_cuit;
  else
    raise exception 'tipo de persona inválido: %', p_tipo_persona;
  end if;
end;
$$;

-- Alta: normaliza el CUIT y deriva el legajo (ignora cualquier legajo entrante)
create or replace function public.handle_new_cliente()
returns trigger
language plpgsql
as $$
begin
  new.cuit := regexp_replace(new.cuit, '[^0-9]', '', 'g');
  new.legajo := public.generar_legajo(new.tipo_persona, new.cuit);
  return new;
end;
$$;

drop trigger if exists clientes_auto_legajo on public.clientes;
create trigger clientes_auto_legajo
  before insert on public.clientes
  for each row execute function public.handle_new_cliente();

-- Modificación: si cambian CUIT o tipo de persona, el legajo se recalcula
create or replace function public.handle_cliente_actualizado()
returns trigger
language plpgsql
as $$
begin
  new.cuit := regexp_replace(new.cuit, '[^0-9]', '', 'g');
  new.legajo := public.generar_legajo(new.tipo_persona, new.cuit);
  return new;
end;
$$;

drop trigger if exists clientes_recalcula_legajo on public.clientes;
create trigger clientes_recalcula_legajo
  before update of cuit, tipo_persona on public.clientes
  for each row execute function public.handle_cliente_actualizado();

drop trigger if exists clientes_set_updated_at on public.clientes;
create trigger clientes_set_updated_at
  before update on public.clientes
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 4. Comisiones por cliente y operación
-- ============================================================================

create table if not exists public.comisiones_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  operacion text not null,
  tipo text not null check (tipo in ('Depósito', 'Retiro', 'Link de pago', 'E-commerce')),
  modalidad text not null default 'Porcentaje' check (modalidad in ('Porcentaje', 'Fijo')),
  porcentaje numeric(7,4) check (porcentaje is null or porcentaje >= 0),
  monto_fijo numeric(14,2) check (monto_fijo is null or monto_fijo >= 0),
  porcentaje_impuesto numeric(7,4) not null default 21,
  estado text not null default 'Habilitado' check (estado in ('Habilitado', 'Deshabilitado')),
  descripcion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comision_unica_por_operacion unique (cliente_id, operacion),
  -- Coherencia según modalidad
  constraint modalidad_porcentaje_requiere_pct check (
    (modalidad = 'Porcentaje' and porcentaje is not null)
    or (modalidad = 'Fijo' and monto_fijo is not null)
  ),
  constraint impuesto_no_negativo check (porcentaje_impuesto >= 0)
);

comment on table public.comisiones_cliente is
  'Comisión y % impuesto (IVA sobre la comisión) parametrizables por cliente y tipo de operación. IVA sobre comisión es retenido y pagado por MoliPay; es distinto de retenciones al cliente (IIBB, débito/crédito).';

-- ============================================================================
-- 5. Movimientos con desglose comisión / impuesto
-- ============================================================================

create table if not exists public.movimientos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  legajo text not null,
  id_txn text not null unique,
  tipo text not null,
  cvu text,
  monto_operacion numeric(14,2) not null,
  comision numeric(14,2) not null,
  impuesto numeric(14,2) not null,
  monto_cobrado numeric(14,2) not null,
  estado text not null check (estado in ('APROBADO', 'EN PROGRESO', 'RECHAZADO', 'BLOQUEADO', 'CREADO', 'ABIERTO', 'EXPIRADO', 'REEMBOLSADO')),
  fecha timestamptz not null default now(),
  created_at timestamptz not null default now(),
  -- El monto cobrado debe ser comisión + impuesto
  constraint monto_cobrado_consistente check (monto_cobrado = comision + impuesto)
);

comment on table public.movimientos is
  'Cobros con desglose Comisión e Impuesto. monto_cobrado = comisión × (1 + impuesto%), el impuesto se retiene y liquida MoliPay.';

create index if not exists movimientos_cliente_idx on public.movimientos (cliente_id, fecha desc);
create index if not exists movimientos_legajo_idx on public.movimientos (legajo);

-- ============================================================================
-- 6. Auditoría de legajos
-- ============================================================================

create or replace view public.auditoria_legajos as
select
  m.id_txn,
  m.legajo,
  m.fecha,
  case
    when m.legajo !~ '^(LPF|LPJ)-[0-9]{11}$' then 'formato_invalido'
    when c.id is null then 'sin_cliente'
    else null
  end as observacion
from public.movimientos m
left join public.clientes c on c.legajo = m.legajo
where m.legajo !~ '^(LPF|LPJ)-[0-9]{11}$'
   or c.id is null;

comment on view public.auditoria_legajos is
  'Movimientos con legajo inválido (no LPF/LPJ + CUIT de 11 dígitos) o sin cliente asociado.';

-- ============================================================================
-- RLS: clientes, comisiones y movimientos (solo admins activos)
-- ============================================================================

alter table public.clientes enable row level security;
alter table public.comisiones_cliente enable row level security;
alter table public.movimientos enable row level security;

drop policy if exists clientes_select_all_admins on public.clientes;
create policy clientes_select_all_admins on public.clientes
  for select to authenticated
  using (
    exists (
      select 1 from public.admin_users au
      where au.id = auth.uid() and au.activo and au.rol = 'admin'
    )
  );

drop policy if exists clientes_manage_admins on public.clientes;
create policy clientes_manage_admins on public.clientes
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

drop policy if exists comisiones_cliente_select_admins on public.comisiones_cliente;
create policy comisiones_cliente_select_admins on public.comisiones_cliente
  for select to authenticated
  using (
    exists (
      select 1 from public.admin_users au
      where au.id = auth.uid() and au.activo and au.rol = 'admin'
    )
  );

drop policy if exists comisiones_cliente_manage_admins on public.comisiones_cliente;
create policy comisiones_cliente_manage_admins on public.comisiones_cliente
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

drop policy if exists movimientos_select_admins on public.movimientos;
create policy movimientos_select_admins on public.movimientos
  for select to authenticated
  using (
    exists (
      select 1 from public.admin_users au
      where au.id = auth.uid() and au.activo and au.rol = 'admin'
    )
  );
