-- ============================================================================
-- 0017_fix_monto_cobrado_trigger.sql
-- Fix: new row for relation "movimientos" violates check constraint
--      "monto_cobrado_consistente"  (monto_cobrado = comision + impuesto)
-- Causa: callers (OTP / Edge Functions / inserts ad-hoc) enviaban
--        monto_cobrado inconsistente (ej. 0) o calculaban con floats.
-- Solucion: trigger BEFORE INSERT OR UPDATE que corrige automaticamente
--           monto_cobrado = comision + impuesto antes del CHECK.
--           Mantiene el invariante fiscal sin requerir cambios en cada caller.
-- ============================================================================

create or replace function public.trg_fix_monto_cobrado()
returns trigger
language plpgsql
as $$
begin
  -- Normaliza nulls a 0 para evitar violacion NOT NULL, luego corrige suma
  if new.comision is null then new.comision := 0; end if;
  if new.impuesto is null then new.impuesto := 0; end if;
  new.monto_cobrado := new.comision + new.impuesto;
  return new;
end;
$$;

drop trigger if exists fix_monto_cobrado on public.movimientos;
create trigger fix_monto_cobrado
  before insert or update of comision, impuesto, monto_cobrado on public.movimientos
  for each row execute function public.trg_fix_monto_cobrado();

comment on function public.trg_fix_monto_cobrado() is
  'Fix OTP: garantiza monto_cobrado = comision + impuesto antes del CHECK monto_cobrado_consistente';
