-- ============================================================================
-- seed 0011_detalle_cliente.sql
-- Genera filas de ejemplo por cada cliente YA EXISTENTE (no inventa legajos).
-- Correr DESPUES de 0011_crear_tablas_detalle_cliente.sql.
-- Para limpiar: delete from historial_cambios; delete from validaciones;
--               delete from alertas; delete from bloqueos; delete from cliente_modulos;
-- ============================================================================

insert into historial_cambios (cliente_legajo, campo, valor_anterior, valor_nuevo, fecha, hora, usuario)
select legajo, 'Estado', 'Pendiente', 'Activo', current_date, '09:00', 'system' from clientes;

insert into historial_cambios (cliente_legajo, campo, valor_anterior, valor_nuevo, fecha, hora, usuario)
select legajo, 'Ficha creada', '—', 'Registro inicial', current_date, '10:00', 'system' from clientes;

insert into validaciones (cliente_legajo, proveedor, estado, fecha)
select legajo, 'AFIP', 'Ok', current_date from clientes;

insert into alertas (cliente_legajo, tipo, fecha, estado)
select legajo, 'Depósito excedido', current_date, 'Pendiente' from clientes;

insert into bloqueos (cliente_legajo, parametro, valor)
select legajo, 'Límite diario', '$ 1.000.000' from clientes;

insert into cliente_modulos (cliente_legajo, clave, titulo, cantidad, detalle)
select legajo, 'pct', 'PCT', 0, 'Sin comercios vinculados' from clientes;

insert into cliente_modulos (cliente_legajo, clave, titulo, cantidad, detalle)
select legajo, 'blp', 'BLP', 0, 'Sin links de pago' from clientes;

insert into cliente_modulos (cliente_legajo, clave, titulo, cantidad, detalle)
select legajo, 'api', 'API Externa', 0, 'Sin integraciones' from clientes;
