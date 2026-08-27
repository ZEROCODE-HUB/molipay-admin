-- ============================================================================
-- 0013_seed_clientes_validacion.sql
-- ----------------------------------------------------------------------------
-- Objetivo: poblar datos de VALIDACION para dos clientes YA EXISTENTES en
--           `clientes` (no se crean clientes, solo sus tablas hijas):
--             * LPF-20000009179  -> Valentina Fernández        (física)
--             * LPJ-30112233445  -> Constructora Alpha SA      (jurídica)
--
-- Cubre (para cada uno): subcuentas, documentos, validaciones automáticas,
-- alertas, bloqueos, los 3 módulos de productos (pct/blp/api), parámetros de
-- alertas y bloqueos, comercios PST, links de pago, movimientos (con estados
-- reales), comisiones (arancelario) e impuestos asignados (catálogo real) e
-- historial de cambios.
--
-- REQUISITOS:
--   1) Las migraciones 0010 / 0011 / 0012 ya deben estar aplicadas en Supabase
--      (crean las tablas de respaldo del detalle). Si no, correrlas primero.
--   2) Las tablas `estados_movimiento` e `impuestos` deben tener datos (son
--      catálogos reales de prod). Los movimientos referencian estados por
--      código y los impuestos asignados usan ids reales del catálogo.
--
-- IDEMPOTENTE: limpia primero los hijos de estos dos legajos antes de insertar,
-- así se puede correr varias veces sin duplicar.
-- ============================================================================

do $$
declare
  v_legajos     text[] := array['LPF-20000009179', 'LPJ-30112233445'];
  v_legajo      text;
  v_cliente_id  uuid;
  v_est_aprob   smallint := (select id from estados_movimiento where codigo = 'APROBADO');
  v_est_prog    smallint := (select id from estados_movimiento where codigo = 'EN_PROGRESO');
  v_est_creado  smallint := (select id from estados_movimiento where codigo = 'CREADO');
  v_est_rech    smallint := (select id from estados_movimiento where codigo = 'RECHAZADO');
  v_imp1        uuid;
  v_imp2        uuid;
  v_imp3        uuid;
begin
  -- Catálogo real de impuestos (hasta 3 existentes, en orden de alta)
  select id from impuestos order by created_at limit 1        into v_imp1;
  select id from impuestos order by created_at limit 1 offset 1 into v_imp2;
  select id from impuestos order by created_at limit 1 offset 2 into v_imp3;

  foreach v_legajo in array v_legajos loop
    select id into v_cliente_id from clientes where legajo = v_legajo;
    if v_cliente_id is null then
      raise notice 'Cliente % no encontrado en `clientes`: se salta.', v_legajo;
      continue;
    end if;

    ---------------------------------------------------------------
    -- LIMPIEZA (hijos de este legajo) para poder re-ejecutar
    ---------------------------------------------------------------
    -- (movimientos_transiciones es append-only; lo limpiamos primero para
    --  no bloquear el delete de movimientos por la FK NO ACTION)
    delete from movimientos_transiciones
      where movimiento_id in (select id from movimientos where legajo = v_legajo);
    delete from movimientos               where legajo = v_legajo;
    delete from comisiones_cliente        where cliente_id = v_cliente_id;
    delete from impuestos_asignaciones    where legajo = v_legajo;
    delete from subcuentas                where cliente_legajo = v_legajo;
    delete from documentos                where cliente_legajo = v_legajo;
    delete from validaciones              where cliente_legajo = v_legajo;
    delete from alertas                   where cliente_legajo = v_legajo;
    delete from bloqueos                  where cliente_legajo = v_legajo;
    delete from cliente_modulos           where cliente_legajo = v_legajo;
    delete from cliente_parametros_alertas   where cliente_legajo = v_legajo;
    delete from cliente_parametros_bloqueos  where cliente_legajo = v_legajo;
    delete from cliente_comercios_pst      where cliente_legajo = v_legajo;
    delete from cliente_links_pago         where cliente_legajo = v_legajo;
    delete from historial_cambios         where cliente_legajo = v_legajo;

    ---------------------------------------------------------------
    -- SUBCUENTAS Y CBUs
    ---------------------------------------------------------------
    insert into subcuentas
      (cliente_legajo, nombre, apellido, email, cbu, tipo, estado,
       saldo_disponible, saldo_retenido, saldo_conciliado, retiros_habilitados)
    values
      (v_legajo, 'Operativa',   '', 'subcuenta1@mockmail.com', 'CVU00000000000000000001', 'Operativa',   'Activa',  125000.50,     0.00, 125000.50, true),
      (v_legajo, 'Recaudación', '', 'recaudacion@mockmail.com', 'CVU00000000000000000002', 'Recaudacion', 'Activa',  480000.00, 12000.00, 492000.00, true),
      (v_legajo, 'Garantías',   '', 'garantias@mockmail.com',   'CVU00000000000000000003', 'Garantias',   'Pausada',      0.00, 75000.00,  75000.00, false);

    ---------------------------------------------------------------
    -- DOCUMENTOS (URLs fake de referencia)
    ---------------------------------------------------------------
    insert into documentos (cliente_legajo, tipo, url, label)
    values
      (v_legajo, 'id_frente', 'https://storage.molipay.com/docs/' || v_legajo || '/id_frente.jpg', 'DNI frente'),
      (v_legajo, 'id_dorso',  'https://storage.molipay.com/docs/' || v_legajo || '/id_dorso.jpg',  'DNI dorso'),
      (v_legajo, 'servicio',  'https://storage.molipay.com/docs/' || v_legajo || '/servicio.pdf',  'Comprobante de servicio'),
      (v_legajo, 'selfie',    'https://storage.molipay.com/docs/' || v_legajo || '/selfie.jpg',    'Selfie verificatoria');

    ---------------------------------------------------------------
    -- VALIDACIONES AUTOMÁTICAS
    ---------------------------------------------------------------
    insert into validaciones (cliente_legajo, proveedor, estado, fecha)
    values
      (v_legajo, 'AFIP',  'Ok',          current_date - 30),
      (v_legajo, 'BCRA',  'Ok',          current_date - 30),
      (v_legajo, 'RENIEC','En proceso',  current_date - 2),
      (v_legajo, 'OECD',  'Pendiente',   current_date);

    ---------------------------------------------------------------
    -- ALERTAS (Riesgo y monitoreo)
    ---------------------------------------------------------------
    insert into alertas (cliente_legajo, tipo, fecha, estado)
    values
      (v_legajo, 'Depósito excedido',                     current_date - 5, 'Pendiente'),
      (v_legajo, 'Variación de volumen',                  current_date - 3, 'En revision'),
      (v_legajo, 'Operación individual sospechosa',       current_date - 1, 'Resuelta');

    ---------------------------------------------------------------
    -- BLOQUEOS (parámetros)
    ---------------------------------------------------------------
    insert into bloqueos (cliente_legajo, parametro, valor)
    values
      (v_legajo, 'Límite diario',   '$ 1.000.000'),
      (v_legajo, 'Límite mensual',  '$ 15.000.000'),
      (v_legajo, 'Retiros en frío', '24h');

    ---------------------------------------------------------------
    -- MÓDULOS Y PRODUCTOS (los 3: pct / blp / api)
    ---------------------------------------------------------------
    insert into cliente_modulos (cliente_legajo, clave, titulo, cantidad, detalle)
    values
      (v_legajo, 'pct', 'PCT',        2, '2 comercios PST vinculados'),
      (v_legajo, 'blp', 'BLP',        3, '3 links de pago activos'),
      (v_legajo, 'api', 'API Externa',1, '1 usuario API en producción');

    ---------------------------------------------------------------
    -- PARÁMETROS DE ALERTAS (algunos habilitados para ver el resumen)
    ---------------------------------------------------------------
    insert into cliente_parametros_alertas (cliente_legajo, clave, habilitado, valor, periodo)
    values
      (v_legajo, 'exceso_perfil_transaccional',                    true,  null,     null),
      (v_legajo, 'variacion_volumen_mes_anterior',                 true,  '10',     null),
      (v_legajo, 'domicilio_jurisdiccion_alto_riesgo',             false, null,     null),
      (v_legajo, 'operacion_individual_monto',                     true,  '100000', null),
      (v_legajo, 'operaciones_repetidas_mismo_destinatario',       true,  '5',      '24h');

    ---------------------------------------------------------------
    -- PARÁMETROS DE BLOQUEO
    ---------------------------------------------------------------
    insert into cliente_parametros_bloqueos (cliente_legajo, clave, habilitado, valor, periodo)
    values
      (v_legajo, 'bloqueo_exceso_perfil_transaccional',            false, null,      null),
      (v_legajo, 'bloqueo_variacion_volumen_mes_anterior',         true,  '20',      null),
      (v_legajo, 'bloqueo_operacion_individual_monto',             true,  '200000',  null),
      (v_legajo, 'bloqueo_operaciones_repetidas_mismo_destinatario',true, '5',       '24h');

    ---------------------------------------------------------------
    -- COMERCIOS PST (popup del módulo PST)
    ---------------------------------------------------------------
    insert into cliente_comercios_pst (cliente_legajo, nombre, email, legajo_comercio)
    values
      (v_legajo, 'Comercio Demo Uno', 'comercio1@mockmail.com', v_legajo || '-C001'),
      (v_legajo, 'Comercio Demo Dos', 'comercio2@mockmail.com', v_legajo || '-C002');

    ---------------------------------------------------------------
    -- LINKS DE PAGO (popup del módulo BLP)
    ---------------------------------------------------------------
    insert into cliente_links_pago (cliente_legajo, comercio_nombre, url, monto, estado)
    values
      (v_legajo, 'Comercio Demo Uno', 'https://pay.molipay.com/l/abc123', 5000.00,  'Activo'),
      (v_legajo, 'Comercio Demo Dos', 'https://pay.molipay.com/l/def456', 12500.50, 'Activo'),
      (v_legajo, 'Comercio Demo Dos', 'https://pay.molipay.com/l/ghi789',   300.00, 'Inactivo');

    ---------------------------------------------------------------
    -- HISTORIAL DE CAMBIOS
    ---------------------------------------------------------------
    insert into historial_cambios
      (cliente_legajo, campo, valor_anterior, valor_nuevo, fecha, hora, usuario)
    values
      (v_legajo, 'Ficha creada',               '—', 'Registro inicial',                        current_date - 40, '09:10', 'system'),
      (v_legajo, 'Estado',                    'Pendiente', 'Activo',                          current_date - 40, '09:12', 'system'),
      (v_legajo, 'Comisión Depósito',         '—', '1.50%',                                  current_date - 20, '14:30', 'admin@molipay.com'),
      (v_legajo, 'Bloqueo límite diario',     '—', '$ 1.000.000',                            current_date - 10, '11:05', 'admin@molipay.com');

    ---------------------------------------------------------------
    -- MOVIMIENTOS (estados reales; monto_cobrado = comision + impuesto)
    ---------------------------------------------------------------
    insert into movimientos
      (cliente_id, legajo, id_txn, tipo, cvu, monto_operacion, comision, impuesto, monto_cobrado, fecha, estado_id)
    values
      (v_cliente_id, v_legajo, v_legajo || '-M001', 'deposito',  'CVU00000000000000000001', 100000.00, 1500.00,  315.00, 1815.00, current_date - 20, v_est_aprob),
      (v_cliente_id, v_legajo, v_legajo || '-M002', 'retiro',    'CVU00000000000000000001',  50000.00,  750.00,  157.50,  907.50, current_date - 18, v_est_aprob),
      (v_cliente_id, v_legajo, v_legajo || '-M003', 'pago_pct',  'CVU00000000000000000002',  25000.00,  375.00,   78.75,  453.75, current_date - 10, v_est_prog),
      (v_cliente_id, v_legajo, v_legajo || '-M004', 'cobro_pct', 'CVU00000000000000000002',   8000.00,  120.00,   25.20,  145.20, current_date - 8,  v_est_creado),
      (v_cliente_id, v_legajo, v_legajo || '-M005', 'tarjeta',   'CVU00000000000000000003',  15000.00,  225.00,   47.25,  272.25, current_date - 4,  v_est_aprob),
      (v_cliente_id, v_legajo, v_legajo || '-M006', 'deposito',  'CVU00000000000000000001',  20000.00,  300.00,   63.00,  363.00, current_date - 1,  v_est_rech);

    ---------------------------------------------------------------
    -- COMISIONES (configuración arancelaria del cliente)
    ---------------------------------------------------------------
    insert into comisiones_cliente
      (cliente_id, operacion, tipo, modalidad, porcentaje, monto_fijo, porcentaje_impuesto, estado, descripcion)
    values
      (v_cliente_id, 'OP-DEP-'  || v_legajo, 'Depósito',     'Porcentaje', 1.50, null, 21, 'Habilitado',   'Comisión por depósito'),
      (v_cliente_id, 'OP-RET-'  || v_legajo, 'Retiro',       'Porcentaje', 1.20, null, 21, 'Habilitado',   'Comisión por retiro'),
      (v_cliente_id, 'OP-LP-'   || v_legajo, 'Link de pago', 'Fijo',       null, 120.00, 21, 'Habilitado', 'Comisión fija link de pago'),
      (v_cliente_id, 'OP-EC-'   || v_legajo, 'E-commerce',   'Porcentaje', 2.00, null, 21, 'Deshabilitado', 'Comisión e-commerce (inactiva)');

    ---------------------------------------------------------------
    -- IMPUESTOS ASIGNADOS (catálogo real de prod)
    ---------------------------------------------------------------
    if v_imp1 is not null then
      insert into impuestos_asignaciones (legajo, impuesto_id, tipo, monto, estado, fecha_asignacion)
      values (v_legajo, v_imp1, 'Porcentaje', 21.0,    'Activo',   current_date - 30);
    end if;
    if v_imp2 is not null then
      insert into impuestos_asignaciones (legajo, impuesto_id, tipo, monto, estado, fecha_asignacion)
      values (v_legajo, v_imp2, 'Fijo',       100.00,  'Activo',   current_date - 25);
    end if;
    if v_imp3 is not null then
      insert into impuestos_asignaciones (legajo, impuesto_id, tipo, monto, estado, fecha_asignacion)
      values (v_legajo, v_imp3, 'Porcentaje', 10.5,    'Inactivo', current_date - 15);
    end if;

    raise notice 'Cliente % poblado correctamente.', v_legajo;
  end loop;
end $$;
