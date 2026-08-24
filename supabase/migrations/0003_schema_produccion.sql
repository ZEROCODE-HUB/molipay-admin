-- ============================================================================
-- [!] DESALINEADA CON PRODUCCION (verificado contra information_schema /
--     pg_constraint el 2026-08-23). NO usar para reconstruir un entorno nuevo.
--     FUENTE DE VERDAD VIGENTE DEL SCHEMA: 0005_consolidacion_schema_real.sql
--     Este archivo se conserva por historia. Ver ESTADO_ACTUAL.md, seccion 16.
-- ============================================================================

-- 0003: ESQUEMA REAL DE PRODUCCIÓN (equivalente a `supabase db pull`).
--
-- IMPORTANTE / PASOS MANUALES PENDIENTES:
--   El schema real de producción fue verificado vía information_schema.columns y
--   difiere del local `0001_init.sql` (que está DESACTUALIZADO: dice rol text,
--   estado text, y omite roles/recursos/permisos/estados_movimiento/estados_por_tipo/
--   conciliaciones). Este archivo documenta el schema real para que el repo deje
--   de mentir. Cuando haya credenciales, el paso canónico es:
--
--       supabase db pull
--
--   que regenera esta migración con índices, CHECKs, políticas RLS y el trigger
--   `trg_log_transicion_movimiento` exactos de producción.
--
--   NOTA: NO se incluye `CREATE TABLE movimientos_transiciones` (regla del proyecto:
--   no recrear esa tabla en migraciones nuevas; ya existe en prod con su trigger y
--   REVOKE UPDATE/DELETE). La RPC que la corrige vive en 0002.
--   Tampoco se toca `auditoria_legajos` (tabla vacía, sin PK ni lógica): no conectar.

-- admin_users (rol_id FK a roles, NO columna "rol" texto) ------------------
create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  legajo text not null unique,
  email text not null,
  nombre text not null,
  activo boolean not null default true,
  rol_id uuid not null references public.roles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- roles / recursos / permisos (catálogos de autorización) -----------------
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  descripcion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recursos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  modulo text not null
);

create table if not exists public.permisos (
  id uuid primary key default gen_random_uuid(),
  rol_id uuid not null references public.roles(id) on delete cascade,
  recurso_id uuid not null references public.recursos(id) on delete cascade,
  puede_leer boolean not null default false,
  puede_crear boolean not null default false,
  puede_modificar boolean not null default false,
  puede_borrar boolean not null default false,
  unique (rol_id, recurso_id)
);

-- estados_movimiento + estados_por_tipo (máquina de estados) ---------------
create table if not exists public.estados_movimiento (
  id smallint primary key,
  codigo text not null unique,
  nombre text not null,
  es_final boolean not null default false,
  requiere_conciliacion boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.estados_por_tipo (
  tipo_movimiento text not null,
  estado_id smallint not null references public.estados_movimiento(id) on delete cascade,
  primary key (tipo_movimiento, estado_id)
);

-- conciliaciones -----------------------------------------------------------
create table if not exists public.conciliaciones (
  id uuid primary key default gen_random_uuid(),
  movimiento_id uuid not null references public.movimientos(id) on delete cascade,
  fecha_conciliacion date not null,
  estado_conciliacion text not null,
  monto_diferencia numeric not null default 0,
  archivo_origen text,
  created_at timestamptz not null default now()
);

-- clientes (sin cambios respecto a la verificación) ------------------------
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  legajo text not null unique,
  tipo_persona text not null check (tipo_persona in ('fisica','juridica')),
  correo text not null,
  nombre text not null,
  cuit text,
  estado text not null default 'activo' check (estado in ('activo','suspendido','rechazado')),
  fecha_alta date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- comisiones_cliente (operacion = código, tipo = categoría) ----------------
create table if not exists public.comisiones_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  operacion text not null,
  tipo text not null check (tipo in ('Depósito','Retiro','Link de pago','E-commerce')),
  modalidad text not null check (modalidad in ('Porcentaje','Fijo')),
  porcentaje numeric,
  monto_fijo numeric,
  porcentaje_impuesto numeric not null default 21,
  estado text not null default 'Habilitado' check (estado in ('Habilitado','Deshabilitado')),
  descripcion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente_id, operacion)
);

-- movimientos (estado_id FK a estados_movimiento, NO texto libre) ----------
create table if not exists public.movimientos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  legajo text not null,
  id_txn text not null,
  tipo text not null,
  cvu text,
  monto_operacion numeric not null default 0,
  comision numeric not null default 0,
  impuesto numeric not null default 0,
  monto_cobrado numeric not null default 0,
  fecha timestamptz not null default now(),
  created_at timestamptz not null default now(),
  estado_id smallint not null references public.estados_movimiento(id)
);
