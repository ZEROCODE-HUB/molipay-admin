-- ============================================================================
-- 0005_consolidacion_schema_real.sql
-- FUENTE DE VERDAD DEL SCHEMA DE PRODUCCION - generado 2026-08-23.
--
-- Reconstruido VERBATIM desde informacion real de produccion:
--   information_schema.columns, pg_constraint, pg_policies, pg_indexes,
--   pg_proc, pg_get_viewdef (export CSV del SQL Editor de Supabase).
--
-- PROPOSITO: que un clone fresco pueda reconstruir el estado real de
-- produccion sin ingenieria inversa. Las migraciones 0001..0004 estan
-- DESALINEADAS con produccion (ver cabecera de cada una); este archivo
-- reemplaza su contenido como referencia estructural.
--
-- !! NO APLICAR SOBRE PRODUCCION !!
--   Documenta lo YA aplicado. Ejecutarlo contra prod fallaria o crearia
--   duplicados. La unica DDL nueva pendiente de decision es la RPC
--   cambiar_estado_movimiento (ver GAP-1 abajo).
--
-- ALCANCE / LIMITACIONES (documentadas, no ocultas):
--   * Estructura unicamente. NO incluye datos ni catalogos semilla
--     (estados_movimiento, recursos, permisos, roles, codigos_categoria
--     tienen filas en prod que un clone fresco debera sembrar aparte).
--   * Los GRANT/REVOKE de privilegios (ej.: REVOKE UPDATE, DELETE sobre
--     movimientos_transiciones, regla del proyecto ESTADO_ACTUAL.md 5)
--     NO son verificables via los CSV exportados -> pendiente de
--     verificacion con pg_roles/information_schema.role_table_grants.
--     No se emiten aqui para no inventar estado.
--   * Timing de triggers inferido de la semantica de cada funcion
--     (la query de triggers no capturaba action_timing).
--
-- OBJETOS ROTOS / ANOMALIAS DETECTADOS EN PRODUCCION (documentados tal cual):
--   GAP-1 [INCIDENTE CONFIRMADO 2026-08-23]: La RPC
--          public.cambiar_estado_movimiento NO EXISTE en produccion.
--          Evidencia: dump completo de pg_proc (6 funciones publicas, la RPC
--          no esta) + sondeo REST con firma exacta -> HTTP 404 PGRST202.
--          Impacto: el boton "Cambiar estado" del panel falla en prod desde
--          su implementacion. La DDL candidata esta en 0002 y se propone como
--          0006_fix_rpc_cambiar_estado.sql (NO aplicado, pendiente aprobacion).
--          Este archivo NO crea la RPC: documenta solo lo que existe.
--   GAP-2: public.handle_new_admin_user() referencia la columna
--          admin_users.rol (eliminada; hoy existe rol_id). Si sigue enganchada
--          a auth.users, el alta de un admin nuevo rompe en runtime.
--          Se documenta VERBATIM; limpieza pendiente de decision.
--   ANOM-1: Index duplicado sobre movimientos.legajo:
--           movimientos_legajo_idx e idx_movimientos_legajo (identicos).
--   ANOM-2: conciliaciones.monto_diferencia es NULLABLE en prod (las
--           migraciones viejas decian not null default 0).
--   ANOM-3: La vista auditoria_legajos podria ejecutarse con privilegios del
--           owner si fue creada sin security_invoker=true (segun version PG),
--           exponiendo lectura de legajos a roles sin acceso a las tablas base.
--           Pendiente verificacion.
-- ============================================================================

-- ============================================================================
-- 1. TABLAS (orden de dependencia FK) + CONSTRAINTS con nombres de prod
-- ============================================================================

-- ---------------------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------------------
CREATE TABLE public.roles (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  nombre      text        NOT NULL,
  descripcion text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id),
  CONSTRAINT roles_nombre_key UNIQUE (nombre)
);

-- ---------------------------------------------------------------------------
-- recursos
-- ---------------------------------------------------------------------------
CREATE TABLE public.recursos (
  id     uuid NOT NULL DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  modulo text,
  CONSTRAINT recursos_pkey PRIMARY KEY (id),
  CONSTRAINT recursos_codigo_key UNIQUE (codigo)
);

-- ---------------------------------------------------------------------------
-- permisos
-- ---------------------------------------------------------------------------
CREATE TABLE public.permisos (
  id             uuid    NOT NULL DEFAULT gen_random_uuid(),
  rol_id         uuid    NOT NULL,
  recurso_id     uuid    NOT NULL,
  puede_leer     boolean NOT NULL DEFAULT false,
  puede_crear    boolean NOT NULL DEFAULT false,
  puede_modificar boolean NOT NULL DEFAULT false,
  puede_borrar   boolean NOT NULL DEFAULT false,
  CONSTRAINT permisos_pkey PRIMARY KEY (id),
  CONSTRAINT permisos_rol_id_recurso_id_key UNIQUE (rol_id, recurso_id),
  CONSTRAINT permisos_rol_id_fkey FOREIGN KEY (rol_id)
    REFERENCES public.roles(id) ON DELETE CASCADE,
  CONSTRAINT permisos_recurso_id_fkey FOREIGN KEY (recurso_id)
    REFERENCES public.recursos(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- estados_movimiento  (catalogo; smallint sin secuencia, valores sembrados)
-- ---------------------------------------------------------------------------
CREATE TABLE public.estados_movimiento (
  id                   smallint   NOT NULL,
  codigo               text       NOT NULL,
  nombre               text       NOT NULL,
  es_final             boolean    NOT NULL DEFAULT false,
  requiere_conciliacion boolean   NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT estados_movimiento_pkey PRIMARY KEY (id),
  CONSTRAINT estados_movimiento_codigo_key UNIQUE (codigo)
);

-- ---------------------------------------------------------------------------
-- estados_por_tipo  (PK compuesta: transicion valida por tipo de operacion)
-- ---------------------------------------------------------------------------
CREATE TABLE public.estados_por_tipo (
  tipo_movimiento text    NOT NULL,
  estado_id       smallint NOT NULL,
  CONSTRAINT estados_por_tipo_pkey PRIMARY KEY (tipo_movimiento, estado_id),
  CONSTRAINT estados_por_tipo_estado_id_fkey FOREIGN KEY (estado_id)
    REFERENCES public.estados_movimiento(id)
);

-- ---------------------------------------------------------------------------
-- clientes
-- ---------------------------------------------------------------------------
CREATE TABLE public.clientes (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  legajo      text        NOT NULL,
  tipo_persona text       NOT NULL,
  correo      text        NOT NULL,
  nombre      text        NOT NULL,
  cuit        text        NOT NULL,
  estado      text        NOT NULL DEFAULT 'activo',
  fecha_alta  date        NOT NULL DEFAULT CURRENT_DATE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clientes_pkey PRIMARY KEY (id),
  CONSTRAINT clientes_legajo_key UNIQUE (legajo),
  CONSTRAINT clientes_correo_key UNIQUE (correo),
  CONSTRAINT clientes_cuit_key UNIQUE (cuit),
  CONSTRAINT clientes_tipo_persona_check
    CHECK (tipo_persona = ANY (ARRAY['fisica'::text, 'juridica'::text])),
  CONSTRAINT clientes_estado_check
    CHECK (estado = ANY (ARRAY['activo'::text, 'suspendido'::text, 'rechazado'::text])),
  CONSTRAINT clientes_cuit_check CHECK (cuit ~ '^[0-9]{11}$'::text),
  CONSTRAINT clientes_legajo_check CHECK (legajo ~ '^(LPF|LPJ)-[0-9]{11}$'::text),
  -- El legajo deriva del CUIT: LPF-/LPJ- + CUIT de 11 digitos
  CONSTRAINT legajo_deriva_de_cuit CHECK (legajo = (
    CASE tipo_persona
        WHEN 'fisica'::text THEN 'LPF-'::text
        ELSE 'LPJ-'::text
    END || cuit))
);

-- ---------------------------------------------------------------------------
-- admin_users  (rol_id NULLABLE en prod hoy; NOT NULL pendiente de decision
--               tras verificar count(*) de filas con rol_id IS NULL)
-- ---------------------------------------------------------------------------
CREATE TABLE public.admin_users (
  id         uuid        NOT NULL,
  legajo     text        NOT NULL,
  email      text        NOT NULL,
  nombre     text        NOT NULL,
  activo     boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  rol_id     uuid,
  CONSTRAINT admin_users_pkey PRIMARY KEY (id),
  CONSTRAINT admin_users_legajo_key UNIQUE (legajo),
  CONSTRAINT admin_users_email_key UNIQUE (email),
  CONSTRAINT admin_users_id_fkey FOREIGN KEY (id)
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT admin_users_rol_id_fkey FOREIGN KEY (rol_id)
    REFERENCES public.roles(id)
);

-- ---------------------------------------------------------------------------
-- codigos_categoria  (id integer sin secuencia/autoincremento en prod)
-- ---------------------------------------------------------------------------
CREATE TABLE public.codigos_categoria (
  id          integer     NOT NULL,
  codigo      text        NOT NULL,
  nombre      text        NOT NULL,
  descripcion text,
  estado      text        NOT NULL DEFAULT 'activo',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT codigos_categoria_pkey PRIMARY KEY (id),
  CONSTRAINT codigos_categoria_codigo_key UNIQUE (codigo),
  CONSTRAINT codigos_categoria_estado_check
    CHECK (estado = ANY (ARRAY['activo'::text, 'inactivo'::text]))
);

-- ---------------------------------------------------------------------------
-- comercios
-- ---------------------------------------------------------------------------
CREATE TABLE public.comercios (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  usuario     text        NOT NULL,
  legajo      text        NOT NULL,
  categoria_id integer,
  estado      text        NOT NULL,
  nivel       text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comercios_pkey PRIMARY KEY (id),
  CONSTRAINT comercios_estado_check CHECK (estado = ANY (
    ARRAY['Activado'::text, 'Desactivado'::text, 'Pendiente de aprobación'::text,
          'Rechazado'::text, 'Suspendido'::text])),
  CONSTRAINT comercios_nivel_check CHECK (nivel = ANY (
    ARRAY['Pequeño'::text, 'Mediano'::text, 'Grande'::text, 'Premium'::text,
          'Estándar'::text, 'Básico'::text, 'Enterprise'::text])),
  CONSTRAINT comercios_categoria_id_fkey FOREIGN KEY (categoria_id)
    REFERENCES public.codigos_categoria(id),
  -- Regla del proyecto: legajo de comercio SIEMPRE es un cliente existente
  CONSTRAINT comercios_legajo_fkey FOREIGN KEY (legajo)
    REFERENCES public.clientes(legajo)
);

-- ---------------------------------------------------------------------------
-- puntos_venta
-- ---------------------------------------------------------------------------
CREATE TABLE public.puntos_venta (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  comercio_id uuid       NOT NULL,
  nombre     text        NOT NULL,
  estado     text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT puntos_venta_pkey PRIMARY KEY (id),
  CONSTRAINT puntos_venta_estado_check
    CHECK (estado = ANY (ARRAY['Activado'::text, 'Desactivado'::text])),
  CONSTRAINT puntos_venta_comercio_id_fkey FOREIGN KEY (comercio_id)
    REFERENCES public.comercios(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- comisiones_cliente
-- ---------------------------------------------------------------------------
CREATE TABLE public.comisiones_cliente (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  cliente_id          uuid        NOT NULL,
  operacion           text        NOT NULL,
  tipo                text        NOT NULL,
  modalidad           text        NOT NULL DEFAULT 'Porcentaje',
  porcentaje          numeric,
  monto_fijo          numeric,
  porcentaje_impuesto numeric     NOT NULL DEFAULT 21,
  estado              text        NOT NULL DEFAULT 'Habilitado',
  descripcion         text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comisiones_cliente_pkey PRIMARY KEY (id),
  CONSTRAINT comision_unica_por_operacion UNIQUE (cliente_id, operacion),
  CONSTRAINT comisiones_cliente_cliente_id_fkey FOREIGN KEY (cliente_id)
    REFERENCES public.clientes(id) ON DELETE CASCADE,
  CONSTRAINT comisiones_cliente_tipo_check CHECK (tipo = ANY (
    ARRAY['Depósito'::text, 'Retiro'::text, 'Link de pago'::text, 'E-commerce'::text])),
  CONSTRAINT comisiones_cliente_modalidad_check
    CHECK (modalidad = ANY (ARRAY['Porcentaje'::text, 'Fijo'::text])),
  CONSTRAINT comisiones_cliente_estado_check
    CHECK (estado = ANY (ARRAY['Habilitado'::text, 'Deshabilitado'::text])),
  CONSTRAINT comisiones_cliente_porcentaje_check
    CHECK ((porcentaje IS NULL) OR (porcentaje >= (0)::numeric)),
  CONSTRAINT comisiones_cliente_monto_fijo_check
    CHECK ((monto_fijo IS NULL) OR (monto_fijo >= (0)::numeric)),
  CONSTRAINT impuesto_no_negativo CHECK (porcentaje_impuesto >= (0)::numeric),
  CONSTRAINT modalidad_porcentaje_requiere_pct CHECK (
    ((modalidad = 'Porcentaje'::text) AND (porcentaje IS NOT NULL))
    OR ((modalidad = 'Fijo'::text) AND (monto_fijo IS NOT NULL)))
);

-- ---------------------------------------------------------------------------
-- api_usuarios
-- ---------------------------------------------------------------------------
CREATE TABLE public.api_usuarios (
  id                 uuid        NOT NULL DEFAULT gen_random_uuid(),
  codigo_usuario_api text        NOT NULL,
  usuario            text        NOT NULL,
  nombre_completo    text        NOT NULL,
  estado             text        NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT api_usuarios_pkey PRIMARY KEY (id),
  CONSTRAINT api_usuarios_codigo_usuario_api_key UNIQUE (codigo_usuario_api),
  CONSTRAINT api_usuarios_estado_check CHECK (estado = ANY (
    ARRAY['Pendiente Validación'::text, 'Homologación'::text, 'Producción'::text,
          'Suspendido'::text, 'Deshabilitado'::text]))
);

-- ---------------------------------------------------------------------------
-- api_endpoints
-- ---------------------------------------------------------------------------
CREATE TABLE public.api_endpoints (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  nombre      text        NOT NULL,
  path        text        NOT NULL,
  metodo      text        NOT NULL,
  descripcion text,
  grupo       text        NOT NULL,
  estado      text        NOT NULL,
  rec         boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT api_endpoints_pkey PRIMARY KEY (id),
  CONSTRAINT api_endpoints_metodo_check CHECK (metodo = ANY (
    ARRAY['GET'::text, 'POST'::text, 'PUT'::text, 'DELETE'::text, 'PATCH'::text])),
  CONSTRAINT api_endpoints_grupo_check CHECK (grupo = ANY (
    ARRAY['Autenticación'::text, 'Enlaces de pago'::text, 'QR'::text,
          'SubAccounts'::text, 'Transfer'::text, 'User'::text, 'Webhooks'::text])),
  CONSTRAINT api_endpoints_estado_check
    CHECK (estado = ANY (ARRAY['Habilitado'::text, 'Deshabilitado'::text]))
);

-- ---------------------------------------------------------------------------
-- api_restricciones
-- ---------------------------------------------------------------------------
CREATE TABLE public.api_restricciones (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  api_usuario_id  uuid        NOT NULL,
  estado          text        NOT NULL,
  fecha_creacion  timestamptz NOT NULL DEFAULT now(),
  fecha_expiracion date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT api_restricciones_pkey PRIMARY KEY (id),
  CONSTRAINT api_restricciones_estado_check
    CHECK (estado = ANY (ARRAY['Restringiendo'::text, 'No restringiendo'::text])),
  CONSTRAINT api_restricciones_api_usuario_id_fkey FOREIGN KEY (api_usuario_id)
    REFERENCES public.api_usuarios(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- resolvers
-- ---------------------------------------------------------------------------
CREATE TABLE public.resolvers (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  nombre        text        NOT NULL,
  cuit          text        NOT NULL,
  url           text        NOT NULL,
  estado        text        NOT NULL,
  nombre_reverso text,
  formato_web   text,
  pcp_id        text,
  id_pcp        text,
  token         text,
  as_header     boolean     NOT NULL DEFAULT false,
  soa           boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT resolvers_pkey PRIMARY KEY (id),
  CONSTRAINT resolvers_cuit_check CHECK (cuit ~ '^[0-9]{11}$'::text),
  CONSTRAINT resolvers_estado_check
    CHECK (estado = ANY (ARRAY['Activo'::text, 'Inactivo'::text]))
);

-- ---------------------------------------------------------------------------
-- impuestos
-- ---------------------------------------------------------------------------
CREATE TABLE public.impuestos (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  codigo      text        NOT NULL,
  nombre      text        NOT NULL,
  descripcion text,
  tipo        text        NOT NULL,
  monto       numeric,
  estado      text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT impuestos_pkey PRIMARY KEY (id),
  CONSTRAINT impuestos_codigo_key UNIQUE (codigo),
  CONSTRAINT impuestos_tipo_check
    CHECK (tipo = ANY (ARRAY['Porcentaje'::text, 'Fijo'::text, 'Otro'::text])),
  CONSTRAINT impuestos_estado_check
    CHECK (estado = ANY (ARRAY['Activo'::text, 'Inactivo'::text]))
);

-- ---------------------------------------------------------------------------
-- impuestos_alicuotas
-- ---------------------------------------------------------------------------
CREATE TABLE public.impuestos_alicuotas (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  impuesto_id uuid        NOT NULL,
  codigo      text        NOT NULL,
  tasa        numeric     NOT NULL,
  descripcion text,
  estado      text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT impuestos_alicuotas_pkey PRIMARY KEY (id),
  CONSTRAINT impuestos_alicuotas_estado_check
    CHECK (estado = ANY (ARRAY['Activo'::text, 'Inactivo'::text])),
  CONSTRAINT impuestos_alicuotas_impuesto_id_fkey FOREIGN KEY (impuesto_id)
    REFERENCES public.impuestos(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- impuestos_asignaciones  (legajo = FK real a clientes, regla del proyecto)
-- ---------------------------------------------------------------------------
CREATE TABLE public.impuestos_asignaciones (
  id               uuid        NOT NULL DEFAULT gen_random_uuid(),
  legajo           text        NOT NULL,
  impuesto_id      uuid        NOT NULL,
  tipo             text        NOT NULL,
  monto            numeric     NOT NULL,
  estado           text        NOT NULL,
  fecha_asignacion timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT impuestos_asignaciones_pkey PRIMARY KEY (id),
  CONSTRAINT impuestos_asignaciones_tipo_check
    CHECK (tipo = ANY (ARRAY['Porcentaje'::text, 'Fijo'::text, 'Otro'::text])),
  CONSTRAINT impuestos_asignaciones_estado_check
    CHECK (estado = ANY (ARRAY['Activo'::text, 'Inactivo'::text])),
  CONSTRAINT impuestos_asignaciones_legajo_fkey FOREIGN KEY (legajo)
    REFERENCES public.clientes(legajo),
  CONSTRAINT impuestos_asignaciones_impuesto_id_fkey FOREIGN KEY (impuesto_id)
    REFERENCES public.impuestos(id)
);

-- ---------------------------------------------------------------------------
-- ib_padrones
-- ---------------------------------------------------------------------------
CREATE TABLE public.ib_padrones (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  impuesto_id uuid,
  nombre      text        NOT NULL,
  archivo     text,
  estado      text        NOT NULL,
  progreso    integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ib_padrones_pkey PRIMARY KEY (id),
  CONSTRAINT ib_padrones_estado_check CHECK (estado = ANY (
    ARRAY['Cargando'::text, 'Procesando'::text, 'Finalizado'::text, 'Error'::text])),
  CONSTRAINT ib_padrones_impuesto_id_fkey FOREIGN KEY (impuesto_id)
    REFERENCES public.impuestos(id)
);

-- ---------------------------------------------------------------------------
-- ib_normalizacion_preview  (preview-first: aplicado nunca se marca al leer)
-- ---------------------------------------------------------------------------
CREATE TABLE public.ib_normalizacion_preview (
  id                uuid        NOT NULL DEFAULT gen_random_uuid(),
  padron_id         uuid        NOT NULL,
  kpis_json         jsonb,
  creados_json      jsonb,
  desactivados_json jsonb,
  omitidos_json     jsonb,
  aplicado          boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ib_normalizacion_preview_pkey PRIMARY KEY (id),
  CONSTRAINT ib_normalizacion_preview_padron_id_fkey FOREIGN KEY (padron_id)
    REFERENCES public.ib_padrones(id)
);

-- ---------------------------------------------------------------------------
-- dc_excepciones  (direccion solo Entrantes/Salientes: 'Ambos' = 2 filas)
-- ---------------------------------------------------------------------------
CREATE TABLE public.dc_excepciones (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  usuario             text        NOT NULL,
  cuit                text        NOT NULL,
  direccion           text        NOT NULL,
  tipo                text        NOT NULL,
  motivo              text,
  vigencia_desde      timestamptz,
  vigencia_hasta      timestamptz,
  estado              text        NOT NULL,
  autorizacion_codigo text,
  fecha_creacion      timestamptz NOT NULL DEFAULT now(),
  fecha_actualizacion timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dc_excepciones_pkey PRIMARY KEY (id),
  CONSTRAINT dc_excepciones_cuit_check CHECK (cuit ~ '^[0-9]{11}$'::text),
  CONSTRAINT dc_excepciones_direccion_check
    CHECK (direccion = ANY (ARRAY['Entrantes'::text, 'Salientes'::text])),
  CONSTRAINT dc_excepciones_tipo_check CHECK (tipo = ANY (
    ARRAY['Alta manual'::text, 'Convenio multilateral'::text, 'Exención'::text])),
  CONSTRAINT dc_excepciones_estado_check
    CHECK (estado = ANY (ARRAY['Activo'::text, 'Inactivo'::text]))
);

-- ---------------------------------------------------------------------------
-- dc_sync_retroactivo
-- ---------------------------------------------------------------------------
CREATE TABLE public.dc_sync_retroactivo (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  cuit       text        NOT NULL,
  desde      timestamptz,
  hasta      timestamptz,
  preview_json jsonb,
  aplicado   boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dc_sync_retroactivo_pkey PRIMARY KEY (id),
  CONSTRAINT dc_sync_retroactivo_cuit_check CHECK (cuit ~ '^[0-9]{11}$'::text)
);

-- ---------------------------------------------------------------------------
-- movimientos
--   OJO: comision / impuesto / monto_cobrado son NOT NULL SIN default en
--   produccion: cada INSERT debe calcularlos explicitamente (campo fiscal;
--   decidido: fallar fuerte antes que guardar silenciosamente 0).
--   ESCRITURA: sin politicas INSERT/UPDATE para authenticated BY DESIGN;
--   todo cambio de estado pasa por RPC controlada (ESTADO_ACTUAL.md 5).
-- ---------------------------------------------------------------------------
CREATE TABLE public.movimientos (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  cliente_id      uuid        NOT NULL,
  legajo          text        NOT NULL,
  id_txn          text        NOT NULL,
  tipo            text        NOT NULL,
  cvu             text,
  monto_operacion numeric     NOT NULL,
  comision        numeric     NOT NULL,
  impuesto        numeric     NOT NULL,
  monto_cobrado   numeric     NOT NULL,
  fecha           timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  estado_id       smallint    NOT NULL,
  CONSTRAINT movimientos_pkey PRIMARY KEY (id),
  CONSTRAINT movimientos_id_txn_key UNIQUE (id_txn),
  CONSTRAINT movimientos_cliente_id_fkey FOREIGN KEY (cliente_id)
    REFERENCES public.clientes(id) ON DELETE RESTRICT,
  CONSTRAINT movimientos_legajo_fkey FOREIGN KEY (legajo)
    REFERENCES public.clientes(legajo),
  CONSTRAINT movimientos_estado_id_fkey FOREIGN KEY (estado_id)
    REFERENCES public.estados_movimiento(id),
  -- Invariante fiscal de produccion
  CONSTRAINT monto_cobrado_consistente
    CHECK (monto_cobrado = (comision + impuesto))
);

-- ---------------------------------------------------------------------------
-- conciliaciones  (ANOM-2: monto_diferencia es NULLABLE en prod)
-- ---------------------------------------------------------------------------
CREATE TABLE public.conciliaciones (
  id                 uuid        NOT NULL DEFAULT gen_random_uuid(),
  movimiento_id      uuid        NOT NULL,
  fecha_conciliacion date,
  estado_conciliacion text       NOT NULL DEFAULT 'pendiente',
  monto_diferencia   numeric,
  archivo_origen     text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conciliaciones_pkey PRIMARY KEY (id),
  CONSTRAINT conciliaciones_estado_conciliacion_check CHECK (estado_conciliacion = ANY (
    ARRAY['pendiente'::text, 'conciliado'::text, 'diferencia'::text])),
  CONSTRAINT conciliaciones_movimiento_id_fkey FOREIGN KEY (movimiento_id)
    REFERENCES public.movimientos(id)
);

-- ---------------------------------------------------------------------------
-- movimientos_transiciones  (append-only por diseño; ver notas REVOKE arriba)
-- ---------------------------------------------------------------------------
CREATE TABLE public.movimientos_transiciones (
  id                uuid        NOT NULL DEFAULT gen_random_uuid(),
  movimiento_id     uuid        NOT NULL,
  estado_anterior_id smallint,
  estado_nuevo_id   smallint    NOT NULL,
  origen            text        NOT NULL,
  admin_user_id     uuid,
  comentario        text,
  fecha             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT movimientos_transiciones_pkey PRIMARY KEY (id),
  CONSTRAINT movimientos_transiciones_origen_check
    CHECK (origen = ANY (ARRAY['coelsa'::text, 'manual'::text])),
  -- Un cambio manual exige el admin responsable
  CONSTRAINT chk_manual_requiere_usuario
    CHECK ((origen <> 'manual'::text) OR (admin_user_id IS NOT NULL)),
  CONSTRAINT movimientos_transiciones_movimiento_id_fkey FOREIGN KEY (movimiento_id)
    REFERENCES public.movimientos(id),
  CONSTRAINT movimientos_transiciones_estado_anterior_id_fkey
    FOREIGN KEY (estado_anterior_id) REFERENCES public.estados_movimiento(id),
  CONSTRAINT movimientos_transiciones_estado_nuevo_id_fkey
    FOREIGN KEY (estado_nuevo_id) REFERENCES public.estados_movimiento(id),
  CONSTRAINT movimientos_transiciones_admin_user_id_fkey FOREIGN KEY (admin_user_id)
    REFERENCES public.admin_users(id)
);

-- ============================================================================
-- 2. VISTA auditoria_legajos  (detecta legajos invalidos o sin cliente)
--    Definicion verbatim de pg_get_viewdef. Ver ANOM-3 (security_invoker).
-- ============================================================================
CREATE VIEW public.auditoria_legajos AS
 SELECT m.id_txn,
    m.legajo,
    m.fecha,
        CASE
            WHEN m.legajo !~ '^(LPF|LPJ)-[0-9]{11}$'::text THEN 'formato_invalido'::text
            WHEN c.id IS NULL THEN 'sin_cliente'::text
            ELSE NULL::text
        END AS observacion
   FROM movimientos m
     LEFT JOIN clientes c ON c.legajo = m.legajo
  WHERE m.legajo !~ '^(LPF|LPJ)-[0-9]{11}$'::text OR c.id IS NULL;

-- ============================================================================
-- 3. INDICES adicionales (los de PK/UNIQUE nacen con las constraints)
-- ============================================================================
CREATE INDEX idx_movimientos_transiciones_movimiento_id
  ON public.movimientos_transiciones USING btree (movimiento_id);
CREATE INDEX idx_conciliaciones_pendientes
  ON public.conciliaciones USING btree (fecha_conciliacion)
  WHERE (estado_conciliacion = 'pendiente'::text);
CREATE INDEX idx_comercios_estado ON public.comercios USING btree (estado);
CREATE INDEX idx_comercios_legajo ON public.comercios USING btree (legajo);
CREATE INDEX idx_puntos_venta_comercio_id ON public.puntos_venta USING btree (comercio_id);
CREATE INDEX idx_resolvers_estado ON public.resolvers USING btree (estado);
CREATE INDEX idx_api_restricciones_usuario ON public.api_restricciones USING btree (api_usuario_id);
CREATE INDEX movimientos_cliente_idx
  ON public.movimientos USING btree (cliente_id, fecha DESC);
-- ANOM-1: duplicado real en prod (mismo criterio, dos indices). Se reproduce
-- tal cual hasta decidir limpieza:
CREATE INDEX movimientos_legajo_idx ON public.movimientos USING btree (legajo);
CREATE INDEX idx_movimientos_legajo ON public.movimientos USING btree (legajo);
CREATE INDEX idx_movimientos_estado_id ON public.movimientos USING btree (estado_id);
CREATE INDEX idx_movimientos_fecha ON public.movimientos USING btree (fecha);

-- ============================================================================
-- 4. FUNCIONES (verbatim de pg_get_functiondef)
-- ============================================================================

-- Trigger genérico updated_at (usada por admin_users, clientes, comercios, etc.)
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

-- Derivacion LPF/LPJ-CUIT (regla central del proyecto)
CREATE OR REPLACE FUNCTION public.generar_legajo(p_tipo_persona text, p_cuit text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
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
$function$;

-- Trigger INSERT de clientes: normaliza CUIT y deriva legajo
CREATE OR REPLACE FUNCTION public.handle_new_cliente()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.cuit := regexp_replace(new.cuit, '[^0-9]', '', 'g');
  new.legajo := public.generar_legajo(new.tipo_persona, new.cuit);
  return new;
end;
$function$;

-- Trigger UPDATE de clientes: igual que INSERT (recalcula legajo)
CREATE OR REPLACE FUNCTION public.handle_cliente_actualizado()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.cuit := regexp_replace(new.cuit, '[^0-9]', '', 'g');
  new.legajo := public.generar_legajo(new.tipo_persona, new.cuit);
  return new;
end;
$function$;

-- ⚠️ GAP-2: ROTA en prod — inserta sobre admin_users.rol, columna eliminada
-- (hoy: rol_id). Copiada VERBATIM; no reparar aqui sin decision explicita.
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Log append-only de transiciones (origen 'coelsa' automatico)
CREATE OR REPLACE FUNCTION public.fn_log_transicion_movimiento()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.estado_id IS DISTINCT FROM OLD.estado_id) THEN
    INSERT INTO movimientos_transiciones (movimiento_id, estado_anterior_id, estado_nuevo_id, origen)
    VALUES (NEW.id, OLD.estado_id, NEW.estado_id, 'coelsa'); -- default; la app debe hacer el INSERT manual explícito cuando el origen es 'manual'
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO movimientos_transiciones (movimiento_id, estado_anterior_id, estado_nuevo_id, origen)
    VALUES (NEW.id, NULL, NEW.estado_id, 'coelsa');
  END IF;
  RETURN NEW;
END;
$function$;

-- ============================================================================
-- 5. TRIGGERS (timing inferido de la semantica de cada funcion)
-- ============================================================================

-- admin_users: updated_at automático
CREATE TRIGGER admin_users_set_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- clientes: legajo derivado del CUIT en alta y en actualización
CREATE TRIGGER clientes_auto_legajo
  BEFORE INSERT ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_cliente();
CREATE TRIGGER clientes_recalcula_legajo
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.handle_cliente_actualizado();
CREATE TRIGGER clientes_set_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- movimientos: log de transiciones en alta y cambio de estado
CREATE TRIGGER trg_log_transicion_movimiento
  AFTER INSERT OR UPDATE ON public.movimientos
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_transicion_movimiento();

-- ============================================================================
-- 6. ROW LEVEL SECURITY: enable + políticas (verbatim de pg_policies)
--    Patron A "admin-gated": EXISTS(admin_users JOIN roles WHERE uid+activo
--    +lower(nombre)='admin')  |  Patron B: authenticated true/true ALL
--    |  Patron C: SELECT-only authenticated.
--    movimientos: SOLO SELECT admin-gated — sin INSERT/UPDATE BY DESIGN.
-- ============================================================================

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estados_movimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estados_por_tipo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codigos_categoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comercios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puntos_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comisiones_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_restricciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolvers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impuestos_alicuotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impuestos_asignaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ib_padrones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ib_normalizacion_preview ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dc_excepciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dc_sync_retroactivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conciliaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_transiciones ENABLE ROW LEVEL SECURITY;

-- ---- admin_users (3 politicas) ----
CREATE POLICY admin_users_select_own ON public.admin_users
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (auth.uid() = id);
CREATE POLICY admin_users_select_all_admins ON public.admin_users
  AS PERMISSIVE FOR SELECT TO public
  USING (EXISTS ( SELECT 1
   FROM (admin_users au
     JOIN roles r ON ((r.id = au.rol_id)))
  WHERE ((au.id = auth.uid()) AND au.activo AND (lower(r.nombre) = 'admin'::text))));
CREATE POLICY admin_users_manage_admins ON public.admin_users
  AS PERMISSIVE FOR ALL TO public
  USING (EXISTS ( SELECT 1
   FROM (admin_users au
     JOIN roles r ON ((r.id = au.rol_id)))
  WHERE ((au.id = auth.uid()) AND au.activo AND (lower(r.nombre) = 'admin'::text))))
  WITH CHECK (EXISTS ( SELECT 1
   FROM (admin_users au
     JOIN roles r ON ((r.id = au.rol_id)))
  WHERE ((au.id = auth.uid()) AND au.activo AND (lower(r.nombre) = 'admin'::text))));

-- ---- clientes (2 politicas) ----
CREATE POLICY clientes_select_all_admins ON public.clientes
  AS PERMISSIVE FOR SELECT TO public
  USING (EXISTS ( SELECT 1
   FROM (admin_users au
     JOIN roles r ON ((r.id = au.rol_id)))
  WHERE ((au.id = auth.uid()) AND au.activo AND (lower(r.nombre) = 'admin'::text))));
CREATE POLICY clientes_manage_admins ON public.clientes
  AS PERMISSIVE FOR ALL TO public
  USING (EXISTS ( SELECT 1
   FROM (admin_users au
     JOIN roles r ON ((r.id = au.rol_id)))
  WHERE ((au.id = auth.uid()) AND au.activo AND (lower(r.nombre) = 'admin'::text))))
  WITH CHECK (EXISTS ( SELECT 1
   FROM (admin_users au
     JOIN roles r ON ((r.id = au.rol_id)))
  WHERE ((au.id = auth.uid()) AND au.activo AND (lower(r.nombre) = 'admin'::text))));

-- ---- comisiones_cliente (2 politicas) ----
CREATE POLICY comisiones_cliente_select_admins ON public.comisiones_cliente
  AS PERMISSIVE FOR SELECT TO public
  USING (EXISTS ( SELECT 1
   FROM (admin_users au
     JOIN roles r ON ((r.id = au.rol_id)))
  WHERE ((au.id = auth.uid()) AND au.activo AND (lower(r.nombre) = 'admin'::text))));
CREATE POLICY comisiones_cliente_manage_admins ON public.comisiones_cliente
  AS PERMISSIVE FOR ALL TO public
  USING (EXISTS ( SELECT 1
   FROM (admin_users au
     JOIN roles r ON ((r.id = au.rol_id)))
  WHERE ((au.id = auth.uid()) AND au.activo AND (lower(r.nombre) = 'admin'::text))))
  WITH CHECK (EXISTS ( SELECT 1
   FROM (admin_users au
     JOIN roles r ON ((r.id = au.rol_id)))
  WHERE ((au.id = auth.uid()) AND au.activo AND (lower(r.nombre) = 'admin'::text))));

-- ---- movimientos (UNICA politica: SELECT admin-gated; escritura por RPC) ----
CREATE POLICY movimientos_select_admins ON public.movimientos
  AS PERMISSIVE FOR SELECT TO public
  USING (EXISTS ( SELECT 1
   FROM (admin_users au
     JOIN roles r ON ((r.id = au.rol_id)))
  WHERE ((au.id = auth.uid()) AND au.activo AND (lower(r.nombre) = 'admin'::text))));

-- ---- catalogos SELECT-only ----
CREATE POLICY authenticated_read_estados_movimiento ON public.estados_movimiento
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY authenticated_read_estados_por_tipo ON public.estados_por_tipo
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY authenticated_read_recursos ON public.recursos
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- ---- codigos_categoria (SELECT + ALL separadas) ----
CREATE POLICY authenticated_read_codigos_categoria ON public.codigos_categoria
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY authenticated_write_codigos_categoria ON public.codigos_categoria
  AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ---- patron B: authenticated ALL true/true ----
CREATE POLICY authenticated_all_roles ON public.roles
  AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all_permisos ON public.permisos
  AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all_comercios ON public.comercios
  AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all_puntos_venta ON public.puntos_venta
  AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all_api_usuarios ON public.api_usuarios
  AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all_api_endpoints ON public.api_endpoints
  AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all_api_restricciones ON public.api_restricciones
  AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all_resolvers ON public.resolvers
  AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all_impuestos ON public.impuestos
  AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all_impuestos_alicuotas ON public.impuestos_alicuotas
  AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all_impuestos_asignaciones ON public.impuestos_asignaciones
  AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all_ib_padrones ON public.ib_padrones
  AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all_ib_normalizacion_preview ON public.ib_normalizacion_preview
  AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all_dc_excepciones ON public.dc_excepciones
  AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all_dc_sync_retroactivo ON public.dc_sync_retroactivo
  AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all_conciliaciones ON public.conciliaciones
  AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all_movimientos_transiciones ON public.movimientos_transiciones
  AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- 7. PENDIENTES DE DECISION (NO incluidos aqui, documentados en ESTADO_ACTUAL)
-- ============================================================================
-- * GAP-1: crear public.cambiar_estado_movimiento(...) — propuesta en
--   0006_fix_rpc_cambiar_estado.sql (pendiente de aprobacion/aplicacion).
-- * admin_users.rol_id SET NOT NULL — tras count(*) = 0 (decision tomada,
--   aplicacion manual pendiente de ejecutar el count).
-- * REVOKE UPDATE, DELETE sobre movimientos_transiciones — verificar existencia
--   real antes de re-emitir (no visible en los CSV).
-- * ANOM-3: ALTER VIEW auditoria_legajos SET (security_invoker = true) — evaluar.
-- * Limpieza GAP-2 (handle_new_admin_user) y ANOM-1 (indice duplicado).
-- ============================== FIN 0005 ====================================
