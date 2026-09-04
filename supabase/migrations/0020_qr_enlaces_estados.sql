-- 0020_qr_enlaces_estados.sql
-- Homologacion Comercios / Pagos con QR / Enlaces de pago (spec 2026-09-04)
-- 1) Comercios: sin cambios de schema (solo UI), mantiene comercios.estado actual.
-- 2) QR/POS (puntos_venta): ampliar estados a 6 valores homologados.
--    Flujo: Enterprise crea -> Pendiente de aprobacion -> Payway activa -> Activado
--    Admin solo puede: Desactivar, Rechazar, Suspender, Eliminar (no activar manualmente).
-- 3) Enlaces de pago (cliente_links_pago): normalizar estados a 6 valores.
--    Mismo flujo que QR.

-- 1. puntos_venta: ampliar CHECK estados
ALTER TABLE public.puntos_venta DROP CONSTRAINT IF EXISTS puntos_venta_estado_check;
ALTER TABLE public.puntos_venta ADD CONSTRAINT puntos_venta_estado_check CHECK (
  estado = ANY (ARRAY[
    'Pendiente de aprobacion'::text,
    'Pendiente de aprobación'::text,
    'Activado'::text,
    'Desactivado'::text,
    'Rechazado'::text,
    'Suspendido'::text,
    'Eliminado'::text
  ])
);

-- 1b. Columnas adicionales para identificar QR/POS, comercio, usuario, cajero (si no existen)
ALTER TABLE public.puntos_venta ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'QR' CHECK (tipo IN ('QR','POS'));
ALTER TABLE public.puntos_venta ADD COLUMN IF NOT EXISTS cajero text;
ALTER TABLE public.puntos_venta ADD COLUMN IF NOT EXISTS qr_url text;
ALTER TABLE public.puntos_venta ADD COLUMN IF NOT EXISTS alias text;

-- Migrar datos existentes: Activado/Desactivado se mantienen, nuevos quedan Pendiente por defecto en futuras inserciones desde Enterprise
-- No tocamos filas existentes (ya son Activado/Desactivado)

-- 2. cliente_links_pago: normalizar estados
-- Esta tabla puede no existir en algunos entornos admin puros, crear si falta (idempotente)
CREATE TABLE IF NOT EXISTS public.cliente_links_pago (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  cliente_legajo text NOT NULL,
  comercio_nombre text NOT NULL,
  url text,
  monto numeric,
  estado text DEFAULT 'Pendiente de aprobación'::text,
  referencia text,
  notas text,
  expira_en timestamptz,
  pagos_parciales boolean DEFAULT false,
  metodos_pago text[],
  vistas integer DEFAULT 0,
  pagos integer DEFAULT 0,
  cajero text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Si ya existe, agregar columnas faltantes
ALTER TABLE public.cliente_links_pago ADD COLUMN IF NOT EXISTS referencia text;
ALTER TABLE public.cliente_links_pago ADD COLUMN IF NOT EXISTS notas text;
ALTER TABLE public.cliente_links_pago ADD COLUMN IF NOT EXISTS expira_en timestamptz;
ALTER TABLE public.cliente_links_pago ADD COLUMN IF NOT EXISTS pagos_parciales boolean DEFAULT false;
ALTER TABLE public.cliente_links_pago ADD COLUMN IF NOT EXISTS metodos_pago text[];
ALTER TABLE public.cliente_links_pago ADD COLUMN IF NOT EXISTS vistas integer DEFAULT 0;
ALTER TABLE public.cliente_links_pago ADD COLUMN IF NOT EXISTS pagos integer DEFAULT 0;
ALTER TABLE public.cliente_links_pago ADD COLUMN IF NOT EXISTS cajero text;
ALTER TABLE public.cliente_links_pago ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;

-- Normalizar CHECK estado para enlaces (crear o reemplazar)
DO $$ BEGIN
  ALTER TABLE public.cliente_links_pago DROP CONSTRAINT IF EXISTS cliente_links_pago_estado_check;
  ALTER TABLE public.cliente_links_pago ADD CONSTRAINT cliente_links_pago_estado_check CHECK (
    estado = ANY (ARRAY[
      'Pendiente de aprobacion'::text,
      'Pendiente de aprobación'::text,
      'Activado'::text,
      'Desactivado'::text,
      'Rechazado'::text,
      'Suspendido'::text,
      'Eliminado'::text,
      'Activo'::text,
      'Inactivo'::text
    ])
  );
EXCEPTION WHEN others THEN NULL;
END $$;

-- Actualizar estado legacy Activo->Activado, Inactivo->Desactivado (idempotente)
UPDATE public.cliente_links_pago SET estado='Activado' WHERE estado='Activo';
UPDATE public.cliente_links_pago SET estado='Desactivado' WHERE estado='Inactivo';

-- Indices para Admin
CREATE INDEX IF NOT EXISTS idx_puntos_venta_estado ON public.puntos_venta(estado);
CREATE INDEX IF NOT EXISTS idx_cliente_links_pago_estado ON public.cliente_links_pago(estado);
CREATE INDEX IF NOT EXISTS idx_cliente_links_pago_legajo ON public.cliente_links_pago(cliente_legajo);

-- RLS: mismo patron que otros (authenticated ALL)
ALTER TABLE public.puntos_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_links_pago ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='authenticated_all_puntos_venta_v2' AND tablename='puntos_venta') THEN
    -- ya existe authenticated_all_puntos_venta, no crear duplicado; solo asegurar
    NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='authenticated_all_cliente_links_pago' AND tablename='cliente_links_pago') THEN
    CREATE POLICY authenticated_all_cliente_links_pago ON public.cliente_links_pago AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Para detalle QR (si existe tabla detalle)
CREATE TABLE IF NOT EXISTS public.cliente_links_pago_detalle (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  link_id uuid NOT NULL REFERENCES public.cliente_links_pago(id) ON DELETE CASCADE,
  producto_id uuid,
  producto_nombre text NOT NULL,
  cantidad integer DEFAULT 1,
  precio_unitario numeric DEFAULT 0
);
ALTER TABLE public.cliente_links_pago_detalle ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='authenticated_all_cliente_links_pago_detalle' AND tablename='cliente_links_pago_detalle') THEN
    CREATE POLICY authenticated_all_cliente_links_pago_detalle ON public.cliente_links_pago_detalle AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
