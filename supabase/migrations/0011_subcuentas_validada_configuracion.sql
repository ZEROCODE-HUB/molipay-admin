-- ============================================================================
-- 0011_subcuentas_validada_configuracion.sql
-- Objetivo: agregar los campos requeridos por la gestión de subcuentas
-- (acción "Validar" y la configuración editable: alertas/bloqueos/comisiones).
-- El select de listSubcuentas y el update de updateSubcuenta dependen de ellos.
-- ============================================================================

alter table public.subcuentas
  add column if not exists validada boolean not null default false,
  add column if not exists configuracion jsonb not null default '{}'::jsonb;
