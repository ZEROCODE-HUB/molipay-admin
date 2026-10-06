-- ============================================================================
-- 0013b_crear_clientes_validacion.sql
-- Crea las dos filas de `clientes` que no existían en prod (por eso la ficha
-- daba "cliente no encontrado"). Cumple las restricciones de la tabla:
--   * legajo = prefijo + cuit (LPF/LPJ + 11 dígitos)
--   * correo / cuit únicos
-- Idempotente: si el legajo ya existe, no hace nada.
-- ============================================================================

insert into clientes (legajo, tipo_persona, correo, nombre, cuit, estado, fecha_alta)
values
  ('LPF-20000009179', 'fisica',  'cliente67@mockmail.com',      'Valentina Fernández', '20000009179', 'activo', current_date),
  ('LPJ-30112233445', 'juridica','info@constructoraalpha.com',  'Constructora Alpha SA', '30112233445', 'activo', current_date)
on conflict (legajo) do nothing;
