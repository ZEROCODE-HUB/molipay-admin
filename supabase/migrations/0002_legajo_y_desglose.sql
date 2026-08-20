-- 0002: Legajo como identificador interno del cliente + desglose Comisión/Impuesto
--
-- - public.clientes: entidad Cliente. El legajo es el identificador interno del
--   cliente (NO el usuario/mail de login). Formato LPF-#### (persona física) /
--   LPJ-#### (persona jurídica), único y auto-generado en el alta.
-- - public.comisiones_cliente: parametrización por cliente + tipo de operación
--   con % comisión o monto fijo y % impuesto (IVA sobre la comisión, hoy 21%).
-- - public.movimientos: cobros con desglose comisión / impuesto / monto cobrado.
-- - public.auditoria_legajos: vista para auditar datos existentes.

create extension if not exists pgcrypto;

-- --- Clientes ---------------------------------------------------------------

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  legajo text not null unique
    check (legajo ~ '^(LPF|LPJ)-[0-9]{4,}$'),
  tipo_persona text not null check (tipo_persona in ('fisica', 'juridica')),
  correo text not null unique,
  nombre text not null,
  cuit text not null unique,
  estado text not null default 'activo' check (estado in ('activo', 'suspendido', 'rechazado')),
  fecha_alta date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Cross-validation: el prefijo del legajo debe ser consistente con el tipo de persona
  constraint legajo_prefijo_consistente check (
    (tipo_persona = 'fisica'   and legajo like 'LPF-%')
    or (tipo_persona = 'juridica' and legajo like 'LPJ-%')
  )
);

comment on table public.clientes is
  'Clientes de la plataforma. El legajo (LPF-#### / LPJ-####) es el identificador interno del cliente, distinto del usuario (mail de login).';

-- Secuencias para auto-generar legajos únicos por tipo de persona
create sequence if not exists public.seq_legajo_lpf start 1;
create sequence if not exists public.seq_legajo_lpj start 1;

-- Genera un legajo nuevo del formato correcto según el tipo de persona
create or replace function public.generar_legajo(p_tipo_persona text)
returns text
language plpgsql
as $$
declare
  v_num int;
begin
  if p_tipo_persona = 'fisica' then
    select nextval('public.seq_legajo_lpf') into v_num;
    return 'LPF-' || lpad(v_num::text, 4, '0');
  elsif p_tipo_persona = 'juridica' then
    select nextval('public.seq_legajo_lpj') into v_num;
    return 'LPJ-' || lpad(v_num::text, 4, '0');
  else
    raise exception 'tipo de persona inválido: %', p_tipo_persona;
  end if;
end;
$$;

-- Auto-genera el legajo en el alta si no vino en el insert.
-- Si vino un legajo manual inconsistente con el tipo de persona, lo regenera.
create or replace function public.handle_new_cliente()
returns trigger
language plpgsql
as $$
begin
  if new.legajo is null or new.legajo !~ '^(LPF|LPJ)-[0-9]{4,}$'
     or (new.tipo_persona = 'fisica' and new.legajo not like 'LPF-%')
     or (new.tipo_persona = 'juridica' and new.legajo not like 'LPJ-%') then
    new.legajo := public.generar_legajo(new.tipo_persona);
  end if;
  return new;
end;
$$;

drop trigger if exists clientes_auto_legajo on public.clientes;
create trigger clientes_auto_legajo
  before insert on public.clientes
  for each row execute function public.handle_new_cliente();

-- Mantiene updated_at
drop trigger if exists clientes_set_updated_at on public.clientes;
create trigger clientes_set_updated_at
  before update on public.clientes
  for each row execute function public.set_updated_at();

-- --- Comisiones por cliente y operación -------------------------------------

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

-- --- Movimientos con desglose comisión / impuesto ---------------------------

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
  -- El monto cobrado debe ser comisión × (1 + impuesto%)
  constraint monto_cobrado_consistente check (monto_cobrado = comision + impuesto)
);

comment on table public.movimientos is
  'Cobros con desglose Comisión e Impuesto. monto_cobrado = comisión × (1 + impuesto%), el impuesto se retiene y liquida MoliPay.';

create index if not exists movimientos_cliente_idx on public.movimientos (cliente_id, fecha desc);
create index if not exists movimientos_legajo_idx on public.movimientos (legajo);

-- --- Auditoría de legajos existentes ----------------------------------------

create or replace view public.auditoria_legajos as
select
  m.id_txn,
  m.legajo,
  m.fecha,
  case
    when m.legajo !~ '^(LPF|LPJ)-[0-9]{4,}$' then 'formato_invalido'
    when c.id is null then 'sin_cliente'
    when (c.tipo_persona = 'fisica' and m.legajo not like 'LPF-%')
      or (c.tipo_persona = 'juridica' and m.legajo not like 'LPJ-%') then 'prefijo_inconsistente'
    else null
  end as observacion
from public.movimientos m
left join public.clientes c on c.legajo = m.legajo
where m.legajo !~ '^(LPF|LPJ)-[0-9]{4,}$'
   or c.id is null
   or (c.tipo_persona = 'fisica' and m.legajo not like 'LPF-%')
   or (c.tipo_persona = 'juridica' and m.legajo not like 'LPJ-%');

comment on view public.auditoria_legajos is
  'Movimientos con legajo inválido, sin cliente asociado o con prefijo inconsistente con el tipo de persona.';

-- --- RLS --------------------------------------------------------------------

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