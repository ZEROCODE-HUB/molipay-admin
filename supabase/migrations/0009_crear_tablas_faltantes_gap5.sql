-- ============================================================================
-- 0009_crear_tablas_faltantes_gap5.sql
-- FECHA: 2026-08-23 | ESTADO: PROPUESTA - NO APLICADA - REQUIERE APROBACION
-- ============================================================================
--
-- ⚠️ NOTA EXPLÍCITA (GAP-5): estas 4 tablas nunca existieron en este
-- proyecto pese a estar documentadas como creadas en sesiones anteriores —
-- root cause: mismo patrón de proyecto/pestaña equivocada ya visto en GAP-1,
-- sin pérdida de datos reales de negocio.
--
-- EVIDENCIA (2026-08-23):
--   * Sondeo REST: HTTP 404 PGRST205 "Could not find the table" para las 4.
--   * CSV(8) information_schema: cero filas de columnas para las 4.
--   * Grep de todos los migrations del repo: el DDL jamás fue versionado.
--   * Los "datos reales" viven solo en fixtures de código (users.ts,
--     CODIGOS_ERROR_SEED en codigos-error.ts).
--
-- FUENTE DE DISEÑO: los tipos TypeScript ya commiteados (types.ts L626-L760)
-- y las capas API (integraciones.ts, codigos-error.ts, canales-notificacion.ts,
-- eventos-notificacion.ts) son el contrato exacto que la app espera. Este DDL
-- calza 1:1 con esos contratos, incluidos los dominios CHECK.
--
-- RLS: patrón B del proyecto ({authenticated} ALL true/true) — familia de
-- tablas de configuración/catálogo gestionadas por el panel.
--
-- SEMILLAS: solo datos REALES confirmados en código/documentación.
--   * codigos_error: los 10 códigos reales (CODIGOS_ERROR_SEED).
--   * integraciones: las 6 integraciones — lista completa y cerrada,
--     confirmada por el revisor contra las capturas del Gestor de Logins
--     (no faltan filas).
--   * canales_notificacion / eventos_notificacion: sin semilla (se cargan
--     por uso; configuración de canales es runtime).
--
-- ORDEN DE APLICACIÓN PIEZA A PIEZA (verificación entre piezas):
--   P0 integraciones + seed        -> sondeo: 404 -> 200 []
--   P1 codigos_error + seed        -> idem
--   P2 canales_notificacion        -> idem
--   P3 eventos_notificacion (+FK)  -> idem + embed funcionando
-- ============================================================================


-- ───────────────────────────────────────────────────────────────────────────
-- PIEZA 0: integraciones
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE public.integraciones (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     text NOT NULL,
  proveedor  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integraciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_all_integraciones ON public.integraciones
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO public.integraciones (nombre, proveedor) VALUES
  ('Wondersoft',      'pct:wondersoft'),
  ('Pago Mis Cuentas','pds:pago_mis_cuentas'),
  ('BDC Conecta',     'bank.bdc_conecta'),
  ('COELSA CPF',      'cpf:coelsa_cpf'),
  ('COELSA CVU',      'pct:coelsa_cvu'),
  ('COELSA DEBIN',    'pct:coelsa_debin');


-- ───────────────────────────────────────────────────────────────────────────
-- PIEZA 1: codigos_error (catálogo de los 10 códigos REALES)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE public.codigos_error (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        text NOT NULL UNIQUE,
  mensaje       text NOT NULL,
  audiencia     text NOT NULL DEFAULT 'tecnico'
                CHECK (audiencia = ANY (ARRAY['tecnico'::text, 'admin'::text, 'cliente'::text])),
  canal_defecto text NOT NULL DEFAULT 'Telegram'
                CHECK (canal_defecto = ANY (ARRAY['Email'::text, 'Telegram'::text, 'WhatsApp'::text])),
  descripcion   text,
  activo        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.codigos_error ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_all_codigos_error ON public.codigos_error
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER codigos_error_set_updated_at BEFORE UPDATE ON public.codigos_error
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.codigos_error (codigo, mensaje, canal_defecto) VALUES
  ('E_ORIGIN_ID_DUPLICATE',                    'ID de origen duplicado',                    'Telegram'),
  ('E_ORIGIN_ID_TOO_LONG',                     'ID de origen demasiado largo',              'Telegram'),
  ('E_INSUFFICIENT_AMOUNT_APPLIED_COMMISSION', 'Monto insuficiente para comisión aplicada', 'Telegram'),
  ('E_MERCHANT_NOT_DEACTIVATED',               'Comercio no desactivado',                   'Telegram'),
  ('E_USER_PAYMENT_NOT_FOUND',                 'Pago de usuario no encontrado',             'Telegram'),
  ('E_COELSA_CONTRACARGO_ERROR',               'Error de contracargo COELSA',               'Telegram'),
  ('E_COELSA_GET_ACTIVIDAD_ERROR',             'Error obteniendo actividad COELSA',         'Telegram'),
  ('E_COELSA_ALTA_COMERCIO_ERROR',             'Error en alta de comercio COELSA',          'Telegram'),
  ('E_INVALID_AMOUNT',                         'Monto inválido',                            'Telegram'),
  ('E_QR_NOT_STATIC_TYPE',                     'QR no es de tipo estático',                 'Telegram');


-- ───────────────────────────────────────────────────────────────────────────
-- PIEZA 2: canales_notificacion (sin semilla: configuración runtime)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE public.canales_notificacion (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        text NOT NULL,
  tipo          text NOT NULL
                CHECK (tipo = ANY (ARRAY['Email'::text, 'Telegram'::text, 'WhatsApp'::text])),
  configuracion jsonb,
  activo        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.canales_notificacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_all_canales_notificacion ON public.canales_notificacion
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER canales_notificacion_set_updated_at BEFORE UPDATE ON public.canales_notificacion
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
-- PIEZA 3: eventos_notificacion (fusion Centro + Incidentes; FK única hacia
-- codigos_error -> embed PostgREST sin ambigüedad)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE public.eventos_notificacion (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo           text NOT NULL DEFAULT 'evento'
                 CHECK (tipo = ANY (ARRAY['evento'::text, 'incidente'::text])),
  codigo_error_id uuid REFERENCES public.codigos_error(id),
  titulo         text NOT NULL,
  mensaje        text NOT NULL,
  audiencia      text NOT NULL
                 CHECK (audiencia = ANY (ARRAY['Admin'::text, 'Cliente'::text, 'Ambos'::text])),
  canal          text NOT NULL
                 CHECK (canal = ANY (ARRAY['Email'::text, 'Telegram'::text, 'WhatsApp'::text])),
  estado_entrega text NOT NULL DEFAULT 'pendiente'
                 CHECK (estado_entrega = ANY (ARRAY['pendiente'::text, 'enviado'::text, 'fallido'::text, 'reintentando'::text])),
  fecha          timestamptz NOT NULL DEFAULT now(),
  metadata       jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_eventos_notificacion_fecha ON public.eventos_notificacion USING btree (fecha DESC);
CREATE INDEX idx_eventos_notificacion_codigo_error ON public.eventos_notificacion USING btree (codigo_error_id);

ALTER TABLE public.eventos_notificacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_all_eventos_notificacion ON public.eventos_notificacion
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER eventos_notificacion_set_updated_at BEFORE UPDATE ON public.eventos_notificacion
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN POST-APLICACIÓN OBLIGATORIA (por pieza)
-- ───────────────────────────────────────────────────────────────────────────

-- V0 (tras P0):
--   SELECT count(*) FROM public.integraciones;
--   ESPERADO: 6

-- V1 (tras P1):
--   SELECT count(*) FROM public.codigos_error;
--   ESPERADO: 10

-- V2/V3 (tras P2/P3): estructura
--   SELECT table_name, string_agg(column_name, ', ' ORDER BY ordinal_position)
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name IN
--     ('integraciones','codigos_error','canales_notificacion','eventos_notificacion')
--   GROUP BY table_name;

-- V4 (agente, tras cada pieza): sondeo REST como anon
--   GET /rest/v1/{tabla}?limit=1  -> flip de 404 PGRST205 a 200 []

-- V5 (final, sesión viva de admin): las pantallas admin.configuracion.index
--   y admin.configuracion.logins deben cargar su listado sin error.
