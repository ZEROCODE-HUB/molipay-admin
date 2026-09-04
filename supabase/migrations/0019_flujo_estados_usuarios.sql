-- 0019_flujo_estados_usuarios.sql
-- Homologación flujo de estados MolliPay Enterprises ↔ MolliPay Admin
-- Flujo: pendiente_verificacion → registrado → preactivado → activado
--        + suspendido / deshabilitado / eliminado (BCRA auditable)
--
-- Reglas:
--  - pendiente_verificacion: estado inicial tras registro (email no verificado)
--  - registrado: tras verificación; permanece hasta aprobación de documentación
--  - preactivado: documentación aprobada; falta CBU + comisión
--  - activado: CBU + comisión cargados
--  - suspendido: suspensión temporal (conserva CBU/historial)
--  - deshabilitado: cancela CBU, conserva historial (idempotente, BCRA)
--  - eliminado: solo si NUNCA tuvo movimientos (movimientos.legajo FK)
--
-- No romper onboarding existente: default pasa a pendiente_verificacion.
-- Mantener compatibilidad con valores legacy (activo/suspendido/rechazado).

-- 1. Ampliar CHECK de clientes.estado
ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_estado_check;
ALTER TABLE public.clientes ADD CONSTRAINT clientes_estado_check CHECK (
  estado = ANY (ARRAY[
    'pendiente_verificacion'::text,
    'registrado'::text,
    'preactivado'::text,
    'activado'::text,
    'suspendido'::text,
    'deshabilitado'::text,
    'eliminado'::text,
    -- legacy compat (se migrará progresivo, no romper datos existentes)
    'activo'::text,
    'rechazado'::text
  ])
);

-- 2. Cambiar default a estado inicial correcto
ALTER TABLE public.clientes ALTER COLUMN estado SET DEFAULT 'pendiente_verificacion';

-- 3. Migrar datos legacy existentes al nuevo vocabulario (idempotente)
-- activo → activado ; rechazado → deshabilitado
UPDATE public.clientes SET estado = 'activado' WHERE estado = 'activo';
UPDATE public.clientes SET estado = 'deshabilitado' WHERE estado = 'rechazado';

-- 4. Columnas de soporte para guards de activación
-- Si ya existen, no falla (IF NOT EXISTS). Se usan para validar CBU/comisión.
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS email_verificado boolean NOT NULL DEFAULT false;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS onboarding_completo boolean NOT NULL DEFAULT false;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS cbu text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS cbu_cancelado boolean NOT NULL DEFAULT false;

-- 5. Historial de transiciones de cliente (auditoría BCRA, idempotente)
CREATE TABLE IF NOT EXISTS public.cliente_transiciones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  legajo text NOT NULL,
  estado_anterior text,
  estado_nuevo text NOT NULL,
  origen text NOT NULL DEFAULT 'manual' CHECK (origen IN ('manual','sistema','onboarding')),
  admin_user_id uuid REFERENCES public.admin_users(id),
  comentario text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cliente_transiciones_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_cliente_transiciones_legajo ON public.cliente_transiciones(legajo);
CREATE INDEX IF NOT EXISTS idx_cliente_transiciones_cliente_id ON public.cliente_transiciones(cliente_id);

ALTER TABLE public.cliente_transiciones ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='authenticated_all_cliente_transiciones' AND tablename='cliente_transiciones') THEN
    CREATE POLICY authenticated_all_cliente_transiciones ON public.cliente_transiciones
      AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 6. Función helper: verificar si cliente tiene movimientos (para guard de eliminación)
CREATE OR REPLACE FUNCTION public.cliente_tiene_movimientos(p_legajo text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.movimientos WHERE legajo = p_legajo);
$$;

-- 7. Función helper: verificar si cliente tiene comisión habilitada
CREATE OR REPLACE FUNCTION public.cliente_tiene_comision(p_cliente_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.comisiones_cliente WHERE cliente_id = p_cliente_id AND estado = 'Habilitado');
$$;

-- 8. Trigger para auditar cambios de estado en clientes
CREATE OR REPLACE FUNCTION public.fn_log_transicion_cliente()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.estado IS DISTINCT FROM OLD.estado THEN
    INSERT INTO public.cliente_transiciones (cliente_id, legajo, estado_anterior, estado_nuevo, origen)
    VALUES (NEW.id, NEW.legajo, OLD.estado, NEW.estado, 'manual');
    -- Si se deshabilita, marcar CBU como cancelado (idempotente)
    IF NEW.estado = 'deshabilitado' THEN
      NEW.cbu_cancelado := true;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.cliente_transiciones (cliente_id, legajo, estado_anterior, estado_nuevo, origen)
    VALUES (NEW.id, NEW.legajo, NULL, NEW.estado, 'sistema');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_transicion_cliente ON public.clientes;
CREATE TRIGGER trg_log_transicion_cliente
  AFTER INSERT OR UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_transicion_cliente();

-- Nota: la función de trigger para CBU cancelado debe ser BEFORE para mutar NEW.
-- Ajuste: recrear como BEFORE UPDATE para cbu_cancelado
DROP TRIGGER IF EXISTS trg_log_transicion_cliente ON public.clientes;
CREATE OR REPLACE FUNCTION public.fn_before_cliente_estado()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.estado = 'deshabilitado' THEN
    NEW.cbu_cancelado := true;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_before_cliente_estado ON public.clientes;
CREATE TRIGGER trg_before_cliente_estado BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.fn_before_cliente_estado();

CREATE TRIGGER trg_log_transicion_cliente
  AFTER INSERT OR UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_transicion_cliente();

-- 9. Comentarios de auditoría
COMMENT ON TABLE public.cliente_transiciones IS 'Trazabilidad de cambios de estado de clientes para auditoría BCRA (append-only lógico).';
COMMENT ON COLUMN public.clientes.cbu IS 'CBU/CVU generado para el cliente; requerido para activación (preactivado→activado).';
