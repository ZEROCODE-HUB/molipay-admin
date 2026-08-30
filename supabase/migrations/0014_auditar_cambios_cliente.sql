-- ============================================================================
-- 0014_auditar_cambios_cliente.sql
-- Objetivo: que los cambios de perfil hechos desde el portal del cliente
-- (MollyPay-Enterprises, "Gestión de cuentas") queden registrados en el
-- "Historial de cambios" del admin (tabla historial_cambios).
--
-- Por qué hace falta:
--   - historial_cambios solo se poblaba con seed; ningún código lo escribía en
--     runtime.
--   - La RLS de historial_cambios exige rol 'admin', así que un cliente
--     (auth.uid() = cliente, no admin) no puede insertar ahí directamente.
--   - El portal guarda el apellido dentro de clientes.nombre (nombre + " " +
--     apellido), no en una columna apellido aparte.
--
-- Solución: trigger AFTER UPDATE sobre clientes que, al detectar que cambió el
-- apellido (parseado del nombre con el mismo convenio que usa el portal:
-- primer token = nombre, resto = apellido), inserta la fila de auditoría.
-- La función es SECURITY DEFINER => corre como dueño y saltea la RLS, de modo
-- que el cliente puede auditar su propio cambio sin ser admin.
--
-- Aplicar: pegar en el SQL Editor de Supabase, o `supabase db push`.
-- ============================================================================

create or replace function public.auditar_cambios_cliente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_apellido text;
  v_new_apellido text;
  v_usuario      text;
begin
  -- Solo actuar si el nombre (que lleva nombre+apellido) cambió.
  if NEW.nombre is distinct from OLD.nombre then
    -- Mismo convenio que clienteToForm() en el portal: primer token = nombre,
    -- el resto (unido con espacios) = apellido.
    v_old_apellido := coalesce(
      array_to_string((regexp_split_to_array(OLD.nombre, '\s+'))[2:], ' '), '');
    v_new_apellido := coalesce(
      array_to_string((regexp_split_to_array(NEW.nombre, '\s+'))[2:], ' '), '');

    if v_old_apellido is distinct from v_new_apellido then
      v_usuario := coalesce(NEW.correo, 'cliente');
      insert into public.historial_cambios
        (cliente_legajo, campo, valor_anterior, valor_nuevo, fecha, hora, usuario)
      values
        (NEW.legajo,
         'apellido',
         nullif(v_old_apellido, ''),
         nullif(v_new_apellido, ''),
         current_date,
         to_char(now(), 'HH24:MI'),
         v_usuario);
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_auditar_cambios_cliente on public.clientes;

create trigger trg_auditar_cambios_cliente
  after update on public.clientes
  for each row
  execute function public.auditar_cambios_cliente();
