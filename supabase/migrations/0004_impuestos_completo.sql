-- ============================================================================
-- [!] DESALINEADA CON PRODUCCION (verificado contra information_schema /
--     pg_constraint el 2026-08-23). NO usar para reconstruir un entorno nuevo.
--     FUENTE DE VERDAD VIGENTE DEL SCHEMA: 0005_consolidacion_schema_real.sql
--     Este archivo se conserva por historia. Ver ESTADO_ACTUAL.md, seccion 16.
-- ============================================================================

-- ============================================================================
-- 0. FUNCIÓN set_updated_at() — DEBE EXISTIR ANTES DE LOS TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 0. SEED: recurso "impuestos" (ejecutar ANTES de crear las tablas)
-- ============================================================================
INSERT INTO public.recursos (codigo, nombre, modulo)
VALUES ('impuestos', 'Impuestos', 'Comercios')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- 1. IMPUESTOS (catálogo principal) — columna "tipo" (no "tipo_impuesto")
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.impuestos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo          TEXT NOT NULL UNIQUE,              -- ej. 'GAN', 'IIBB', 'SELL'
    nombre          TEXT NOT NULL,                     -- 'Ganancias', 'Ingresos Brutos', etc.
    descripcion     TEXT,
    tipo            TEXT NOT NULL CHECK (tipo IN ('Porcentaje','Fijo','Otro')),  -- "tipo", no "tipo_impuesto"
    monto           NUMERIC(14,4),                     -- NULL si tipo='Otro'
    estado          TEXT NOT NULL CHECK (estado IN ('Activo','Inactivo')) DEFAULT 'Activo',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS impuestos_estado_idx ON public.impuestos (estado);
CREATE INDEX IF NOT EXISTS impuestos_tipo_idx ON public.impuestos (tipo);

-- RLS simple: dejar que PermissionGuard en frontend maneje permisos
ALTER TABLE public.impuestos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS impuestos_simple ON public.impuestos;
CREATE POLICY impuestos_simple ON public.impuestos
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS impuestos_set_updated_at ON public.impuestos;
CREATE TRIGGER impuestos_set_updated_at
  BEFORE UPDATE ON public.impuestos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 2. IMPUESTOS_ALICUOTAS (catálogo de alícuotas por impuesto)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.impuestos_alicuotas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    impuesto_id     UUID NOT NULL REFERENCES public.impuestos(id) ON DELETE CASCADE,
    codigo          TEXT NOT NULL,                          -- ej. 'GAN_35', 'IIBB_4', 'IN_06'
    tasa            NUMERIC(7,4) NOT NULL,                  -- ej. 35, 4, 0.6
    descripcion     TEXT,
    estado          TEXT NOT NULL CHECK (estado IN ('Activa','Inactiva')) DEFAULT 'Activa',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (impuesto_id, codigo)
);

CREATE INDEX IF NOT EXISTS impuestos_alicuotas_impuesto_idx ON public.impuestos_alicuotas (impuesto_id);
CREATE INDEX IF NOT EXISTS impuestos_alicuotas_estado_idx ON public.impuestos_alicuotas (estado);

ALTER TABLE public.impuestos_alicuotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS impuestos_alicuotas_simple ON public.impuestos_alicuotas;
CREATE POLICY impuestos_alicuotas_simple ON public.impuestos_alicuotas
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS impuestos_alicuotas_set_updated_at ON public.impuestos_alicuotas;
CREATE TRIGGER impuestos_alicuotas_set_updated_at
  BEFORE UPDATE ON public.impuestos_alicuotas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 3. IMPUESTOS_ASIGNACIONES (usuarios ↔ impuestos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.impuestos_asignaciones (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_legajo      TEXT NOT NULL REFERENCES public.clientes(legajo) ON DELETE CASCADE,
    impuesto_id         UUID NOT NULL REFERENCES public.impuestos(id) ON DELETE CASCADE,
    tipo                TEXT NOT NULL CHECK (tipo IN ('Porcentaje','Fijo','Otro')),
    monto               NUMERIC(14,4) NOT NULL,                 -- ej. 35, 4, 0.6
    estado              TEXT NOT NULL CHECK (estado IN ('Activo','Inactivo')) DEFAULT 'Activo',
    fecha_asignacion    DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (cliente_legajo, impuesto_id)
);

CREATE INDEX IF NOT EXISTS impuestos_asignaciones_legajo_idx ON public.impuestos_asignaciones (cliente_legajo);
CREATE INDEX IF NOT EXISTS impuestos_asignaciones_impuesto_idx ON public.impuestos_asignaciones (impuesto_id);
CREATE INDEX IF NOT EXISTS impuestos_asignaciones_estado_idx ON public.impuestos_asignaciones (estado);

ALTER TABLE public.impuestos_asignaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS impuestos_asignaciones_simple ON public.impuestos_asignaciones;
CREATE POLICY impuestos_asignaciones_simple ON public.impuestos_asignaciones
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS impuestos_asignaciones_set_updated_at ON public.impuestos_asignaciones;
CREATE TRIGGER impuestos_asignaciones_set_updated_at
  BEFORE UPDATE ON public.impuestos_asignaciones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 4. IB_PADRONES (padrones de Ingresos Brutos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ib_padrones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    impuesto_id     UUID NOT NULL REFERENCES public.impuestos(id) ON DELETE CASCADE,
    nombre          TEXT NOT NULL,                              -- ej. 'Padrón CABA Q2'
    archivo         TEXT NOT NULL,                              -- nombre archivo original
    estado          TEXT NOT NULL CHECK (estado IN ('Cargando','Procesando','Finalizado','Error')) DEFAULT 'Cargando',
    progreso        INTEGER NOT NULL DEFAULT 0 CHECK (progreso BETWEEN 0 AND 100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ib_padrones_impuesto_idx ON public.ib_padrones (impuesto_id);
CREATE INDEX IF NOT EXISTS ib_padrones_estado_idx ON public.ib_padrones (estado);

ALTER TABLE public.ib_padrones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ib_padrones_simple ON public.ib_padrones;
CREATE POLICY ib_padrones_simple ON public.ib_padrones
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS ib_padrones_set_updated_at ON public.ib_padrones;
CREATE TRIGGER ib_padrones_set_updated_at
  BEFORE UPDATE ON public.ib_padrones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 5. IB_NORMALIZACION_PREVIEW (preview de normalización retroactiva)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ib_normalizacion_preview (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    padron_id       UUID NOT NULL REFERENCES public.ib_padrones(id) ON DELETE CASCADE,
    kpis_json       JSONB NOT NULL,                    -- {usuariosAnalizados, impuestosActualizados, ...}
    creados_json    JSONB NOT NULL,                    -- [{cuit, impuesto, tasa, usuario}, ...]
    desactivados_json JSONB NOT NULL,                  -- [{cuit, impuesto, tasa, usuario, motivo}, ...]
    omitidos_json   JSONB NOT NULL,                    -- [{cuit, motivo, usuario}, ...]
    aplicado        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ib_normalizacion_preview_padron_idx ON public.ib_normalizacion_preview (padron_id);

ALTER TABLE public.ib_normalizacion_preview ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ib_normalizacion_preview_simple ON public.ib_normalizacion_preview;
CREATE POLICY ib_normalizacion_preview_simple ON public.ib_normalizacion_preview
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 6. DC_EXCEPCIONES (fusionada: una sola tabla, email válido, sin 'Ambos')
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dc_excepciones (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               TEXT NOT NULL,                              -- EMAIL VÁLIDO (NO username)
    cuit                TEXT NOT NULL CHECK (cuit ~ '^[0-9]{11}$'),
    tipo                TEXT NOT NULL CHECK (tipo IN ('Alta manual','Convenio multilateral','Exención')),
    direccion           TEXT NOT NULL CHECK (direccion IN ('Entrantes','Salientes')), -- NUNCA 'Ambos'
    motivo              TEXT NOT NULL,
    vigencia_desde      DATE NOT NULL DEFAULT CURRENT_DATE,
    vigencia_hasta      DATE,                                       -- NULL = abierta
    autorizacion_codigo TEXT,                                       -- NUEVO: código de autorización (nullable)
    estado              TEXT NOT NULL CHECK (estado IN ('Activo','Inactivo')) DEFAULT 'Activo',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dc_excepciones_cuit_idx ON public.dc_excepciones (cuit);
CREATE INDEX IF NOT EXISTS dc_excepciones_email_idx ON public.dc_excepciones (email);
CREATE INDEX IF NOT EXISTS dc_excepciones_estado_idx ON public.dc_excepciones (estado);
CREATE INDEX IF NOT EXISTS dc_excepciones_vigencia_idx ON public.dc_excepciones (vigencia_desde, vigencia_hasta);

ALTER TABLE public.dc_excepciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dc_excepciones_simple ON public.dc_excepciones;
CREATE POLICY dc_excepciones_simple ON public.dc_excepciones
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS dc_excepciones_set_updated_at ON public.dc_excepciones;
CREATE TRIGGER dc_excepciones_set_updated_at
  BEFORE UPDATE ON public.dc_excepciones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 7. DC_SYNC_RETROACTIVO (sync retroactivo con preview)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dc_sync_retroactivo (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cuit            TEXT NOT NULL CHECK (cuit ~ '^[0-9]{11}$'),
    desde           DATE NOT NULL,
    hasta           DATE,
    preview_json    JSONB NOT NULL,                     -- {usuariosAnalizados, impuestosActualizados, ...}
    aplicado        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dc_sync_retroactivo_cuit_idx ON public.dc_sync_retroactivo (cuit);

ALTER TABLE public.dc_sync_retroactivo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dc_sync_retroactivo_simple ON public.dc_sync_retroactivo;
CREATE POLICY dc_sync_retroactivo_simple ON public.dc_sync_retroactivo
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS dc_sync_retroactivo_set_updated_at ON public.dc_sync_retroactivo;
CREATE TRIGGER dc_sync_retroactivo_set_updated_at
  BEFORE UPDATE ON public.dc_sync_retroactivo
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- FIN DDL
-- ============================================================================
-- NOTAS DE EJECUCIÓN:
-- 1. Ejecutar este script completo en Supabase SQL Editor
-- 2. Confirmar que no hay errores
-- 3. Luego conectar las 4 rutas con PermissionGuard recurso="impuestos"
-- ============================================================================