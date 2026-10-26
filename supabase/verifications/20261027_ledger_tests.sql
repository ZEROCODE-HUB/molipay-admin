-- ============================================================================
-- Pruebas del ledger (migraciones 20261027100000 .. 20261027103000)
--
-- Todo corre en UNA transaccion que termina en ROLLBACK: crea sus propios
-- clientes/subcuentas de prueba y no deja nada. Ejecutar como postgres
-- (SQL Editor) despues de aplicar las 4 migraciones. Cada prueba que falla
-- aborta con "FALLO <n>: ...". Si llega al final imprime "LEDGER OK".
--
-- Concurrencia real (prueba 5) necesita dos sesiones: ver el bloque
-- comentado al final.
-- ============================================================================

BEGIN;

CREATE SCHEMA ledger_test;
GRANT USAGE ON SCHEMA ledger_test TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Helpers de sesion (simulan el JWT de Supabase)
-- ---------------------------------------------------------------------------
CREATE FUNCTION ledger_test.como(p_role text, p_sub uuid DEFAULT NULL, p_email text DEFAULT NULL)
RETURNS void LANGUAGE sql AS $$
    SELECT set_config('request.jwt.claims',
                      json_build_object('role', p_role, 'sub', p_sub, 'email', p_email)::text, true);
$$;

CREATE FUNCTION ledger_test.ok(p_cond boolean, p_msg text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    IF p_cond IS NOT TRUE THEN
        RAISE EXCEPTION 'FALLO %', p_msg;
    END IF;
END;
$$;

CREATE FUNCTION ledger_test.saldo(p_sub uuid) RETURNS numeric LANGUAGE sql AS $$
    SELECT saldo_disponible FROM public.subaccount_balances WHERE subaccount_id = p_sub;
$$;
CREATE FUNCTION ledger_test.retenido(p_sub uuid) RETURNS numeric LANGUAGE sql AS $$
    SELECT saldo_retenido FROM public.subaccount_balances WHERE subaccount_id = p_sub;
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA ledger_test TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Datos de prueba
-- ---------------------------------------------------------------------------
INSERT INTO public.clientes (id, legajo, tipo_persona, correo, nombre, cuit) VALUES
    ('00000000-0000-4000-8000-0000000000a1', 'LPJ-30999999991', 'juridica', 'ledger.a@test.molipay', 'CLIENTE A', '30999999991'),
    ('00000000-0000-4000-8000-0000000000b1', 'LPJ-30999999992', 'juridica', 'ledger.b@test.molipay', 'CLIENTE B', '30999999992');

INSERT INTO public.subaccounts (id, cliente_legajo, nombre, tipo, cbu) VALUES
    ('00000000-0000-4000-8000-00000000a0a1', 'LPJ-30999999991', 'A Operativa', 'Operativa', '0000003199999999999901'),
    ('00000000-0000-4000-8000-00000000a0a2', 'LPJ-30999999991', 'A Sueldos',   'Sueldos',   '0000003199999999999902'),
    ('00000000-0000-4000-8000-00000000b0b1', 'LPJ-30999999992', 'B Operativa', 'Operativa', '0000003199999999999903');

-- Comision de retiro 1% + IVA 21% para A.
INSERT INTO public.comisiones_cliente (cliente_id, operacion, tipo, modalidad, porcentaje, porcentaje_impuesto, estado)
VALUES ('00000000-0000-4000-8000-0000000000a1', 'Transferencia', 'Retiro', 'Porcentaje', 1, 21, 'Habilitado');

-- Admin: se usa uno activo existente (admin_users.id tiene FK a auth.users).
-- Solo se simula su sesion; nada suyo se modifica.
SELECT set_config('ledger_test.admin',
                  (SELECT au.id::text FROM public.admin_users au JOIN public.roles r ON r.id = au.rol_id
                    WHERE au.activo AND lower(r.nombre) = 'admin' ORDER BY au.created_at LIMIT 1), true);
SELECT ledger_test.ok(coalesce(current_setting('ledger_test.admin', true), '') <> '',
                      '0: se necesita al menos un admin activo con rol Admin');

-- Las cuentas contables se crean solas con la subcuenta.
SELECT ledger_test.ok((SELECT count(*) FROM public.ledger_accounts
                    WHERE subaccount_id IN ('00000000-0000-4000-8000-00000000a0a1',
                                            '00000000-0000-4000-8000-00000000a0a2',
                                            '00000000-0000-4000-8000-00000000b0b1')) = 6,
                  '0: cada subcuenta nueva tiene 2 cuentas contables');

-- ===========================================================================
-- 10/1. Deposito entrante (backend) -> multiples asientos relacionados
-- ===========================================================================
SELECT ledger_test.como('service_role');
SET LOCAL ROLE service_role;
SELECT ledger_test.ok((public.registrar_deposito_entrante('TEST-DEP-1', '0000003199999999999901', 10000,
                   '0110000000000000000001', '20111111112', 'PAGADOR UNO')->>'estado') = 'acreditado',
                  '10: deposito acreditado');
RESET ROLE;

SELECT ledger_test.ok(ledger_test.saldo('00000000-0000-4000-8000-00000000a0a1') = 10000, '10: saldo tras deposito = 10000');
SELECT ledger_test.ok((SELECT count(*) FROM public.ledger_entries e JOIN public.transactions t ON t.id = e.transaction_id
                    WHERE t.id_txn = 'TEST-DEP-1') = 2, '1: deposito genera 2 asientos');

-- ===========================================================================
-- 3. Idempotencia
-- ===========================================================================
SET LOCAL ROLE service_role;
SELECT ledger_test.ok((public.registrar_deposito_entrante('TEST-DEP-1', '0000003199999999999901', 10000)->>'estado') = 'ya_registrado',
                  '3: reintento del mismo deposito no se registra de nuevo');
RESET ROLE;
SELECT ledger_test.ok(ledger_test.saldo('00000000-0000-4000-8000-00000000a0a1') = 10000, '3: el reintento no duplica saldo');
SELECT ledger_test.ok((SELECT count(*) FROM public.ledger_entries e JOIN public.transactions t ON t.id = e.transaction_id
                    WHERE t.id_txn = 'TEST-DEP-1') = 2, '3: el reintento no duplica asientos');
-- ledger_post directo con la misma etapa devuelve false.
SELECT ledger_test.ok(NOT public.ledger_post(
           (SELECT id FROM public.transactions WHERE id_txn = 'TEST-DEP-1'), 'acreditacion',
           public._ledger_lines(
               public._ledger_line(public._ledger_account_id('BANCO_BDC'), 'debit', 1),
               public._ledger_line(public._ledger_sub_account_id('00000000-0000-4000-8000-00000000a0a1', 'disponible'), 'credit', 1))),
       '3: ledger_post es idempotente por (transaccion, etapa)');

-- ===========================================================================
-- 10/1. Transferencia externa con comision e IVA (cliente A)
-- ===========================================================================
SELECT ledger_test.como('authenticated', '00000000-0000-4000-8000-0000000000a1', 'ledger.a@test.molipay');
SET LOCAL ROLE authenticated;
SELECT ledger_test.ok((public.registrar_transferencia_externa('00000000-0000-4000-8000-00000000a0a1',
                   '0170000000000000000009', 1000, 'test')->>'total_debitado')::numeric = 1012.10,
                  '10: externa debita monto + 1% + IVA (1012.10)');
RESET ROLE;
SELECT ledger_test.ok(ledger_test.saldo('00000000-0000-4000-8000-00000000a0a1') = 8987.90, '10: saldo tras externa = 8987.90');
SELECT ledger_test.ok((SELECT count(*) FROM public.ledger_entries e JOIN public.transactions t ON t.id = e.transaction_id
                    WHERE t.legajo = 'LPJ-30999999991' AND t.id_txn LIKE 'EXT-%') = 6,
                  '1: externa genera 6 asientos (monto, comision e IVA del cliente y sus contrapartidas)');

-- ===========================================================================
-- 10. Transferencia interna (una operacion, dos lados)
-- ===========================================================================
SET LOCAL ROLE authenticated;
SELECT public.registrar_transferencia_subcuentas('00000000-0000-4000-8000-00000000a0a1',
                                                  '00000000-0000-4000-8000-00000000a0a2', 500, 'interna');
RESET ROLE;
SELECT ledger_test.ok(ledger_test.saldo('00000000-0000-4000-8000-00000000a0a1') = 8487.90
              AND ledger_test.saldo('00000000-0000-4000-8000-00000000a0a2') = 500, '10: interna mueve 500');

-- ===========================================================================
-- 4. Atomicidad: un fallo no deja ni operacion, ni asientos, ni saldo cambiado
-- ===========================================================================
DO $$
DECLARE
    v_antes numeric := ledger_test.saldo('00000000-0000-4000-8000-00000000a0a1');
    v_tx    bigint  := (SELECT count(*) FROM public.transactions WHERE legajo = 'LPJ-30999999991');
    v_le    bigint  := (SELECT count(*) FROM public.ledger_entries);
BEGIN
    BEGIN
        PERFORM set_config('request.jwt.claims', json_build_object('role', 'authenticated',
                'sub', '00000000-0000-4000-8000-0000000000a1', 'email', 'ledger.a@test.molipay')::text, true);
        PERFORM public.registrar_transferencia_externa('00000000-0000-4000-8000-00000000a0a1',
                                                       '0170000000000000000009', 999999, 'no alcanza');
        RAISE EXCEPTION 'FALLO 4: debio rechazar por saldo insuficiente';
    EXCEPTION WHEN raise_exception OR check_violation THEN
        IF SQLERRM LIKE 'FALLO%' THEN RAISE; END IF;
        PERFORM ledger_test.ok(SQLERRM LIKE '%Saldo insuficiente%', '4: mensaje de saldo insuficiente (' || SQLERRM || ')');
    END;
    PERFORM ledger_test.ok(ledger_test.saldo('00000000-0000-4000-8000-00000000a0a1') = v_antes, '4: saldo intacto tras el fallo');
    PERFORM ledger_test.ok((SELECT count(*) FROM public.transactions WHERE legajo = 'LPJ-30999999991') = v_tx, '4: sin operacion huerfana');
    PERFORM ledger_test.ok((SELECT count(*) FROM public.ledger_entries) = v_le, '4: sin asientos huerfanos');
END;
$$;

-- ===========================================================================
-- 5. Reservas: dos transferencias que juntas exceden el saldo
--    (la 2da ve el saldo ya reservado por la 1ra; con dos sesiones la 2da
--     espera el lock de la fila de saldo, ver bloque final)
-- ===========================================================================
SELECT ledger_test.como('authenticated', '00000000-0000-4000-8000-0000000000a1', 'ledger.a@test.molipay');
SET LOCAL ROLE authenticated;
SELECT ledger_test.ok((public.reservar_transferencia_bdc('00000000-0000-4000-8000-00000000a0a1', 'TEST-BDC-1',
                   '0170000000000000000009', 5000)->>'ledger_status') = 'reserved', '5: primera reserva');
RESET ROLE;
SELECT ledger_test.ok(ledger_test.retenido('00000000-0000-4000-8000-00000000a0a1') = 5060.50, '5: retenido = 5000 + 1% + IVA');

DO $$
BEGIN
    BEGIN
        PERFORM set_config('request.jwt.claims', json_build_object('role', 'authenticated',
                'sub', '00000000-0000-4000-8000-0000000000a1', 'email', 'ledger.a@test.molipay')::text, true);
        PERFORM public.reservar_transferencia_bdc('00000000-0000-4000-8000-00000000a0a1', 'TEST-BDC-2',
                                                  '0170000000000000000009', 5000);
        RAISE EXCEPTION 'FALLO 5: la segunda reserva debio fallar';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'FALLO%' THEN RAISE; END IF;
    END;
    PERFORM ledger_test.ok(NOT EXISTS (SELECT 1 FROM public.transactions WHERE id_txn = 'TEST-BDC-2'), '5: la 2da reserva no dejo rastro');
END;
$$;

-- Reintento de la misma reserva: no duplica.
SET LOCAL ROLE authenticated;
SELECT ledger_test.ok((public.reservar_transferencia_bdc('00000000-0000-4000-8000-00000000a0a1', 'TEST-BDC-1',
                   '0170000000000000000009', 5000)->>'ya_registrada')::boolean, '3: reserva idempotente por TXID');
-- Confirmacion del banco.
SELECT ledger_test.ok((public.confirmar_transferencia_bdc('TEST-BDC-1', 'COMPLETED')->>'ok')::boolean, '10: confirmacion BDC');
SELECT ledger_test.ok((public.confirmar_transferencia_bdc('TEST-BDC-1', 'COMPLETED')->>'ya_registrada')::boolean, '3: confirmacion idempotente');
RESET ROLE;
SELECT ledger_test.ok(ledger_test.retenido('00000000-0000-4000-8000-00000000a0a1') = 0, '10: retenido liberado al enviar');
SELECT ledger_test.ok(ledger_test.saldo('00000000-0000-4000-8000-00000000a0a1') = 3427.40, '10: disponible final tras BDC');

-- ===========================================================================
-- 7. Reversos con trazabilidad: reserva cancelada y externa rechazada
-- ===========================================================================
SET LOCAL ROLE authenticated;
SELECT public.reservar_transferencia_bdc('00000000-0000-4000-8000-00000000a0a1', 'TEST-BDC-3', '0170000000000000000009', 100);
SELECT public.cancelar_transferencia_bdc('TEST-BDC-3', 'el banco rechazo');
RESET ROLE;
SELECT ledger_test.ok(ledger_test.saldo('00000000-0000-4000-8000-00000000a0a1') = 3427.40
              AND ledger_test.retenido('00000000-0000-4000-8000-00000000a0a1') = 0, '7: cancelacion devuelve la reserva');
SELECT ledger_test.ok(NOT EXISTS (
           SELECT 1 FROM public.ledger_entries o JOIN public.transactions t ON t.id = o.transaction_id
            WHERE t.id_txn = 'TEST-BDC-3' AND o.posting_key = 'reserva'
              AND NOT EXISTS (SELECT 1 FROM public.ledger_entries r
                               WHERE r.reversal_of_entry_id = o.id AND r.entry_type <> o.entry_type AND r.amount = o.amount)),
       '7: cada asiento de la reserva tiene su reverso enlazado');

-- Admin rechaza una externa ya contabilizada -> reverso completo.
SELECT set_config('ledger_test.rechazado', (SELECT id FROM public.estados_movimiento WHERE codigo = 'RECHAZADO')::text, true);
SELECT ledger_test.como('authenticated', current_setting('ledger_test.admin')::uuid, NULL);
SET LOCAL ROLE authenticated;
SELECT public.cambiar_estado_movimiento(
           (SELECT id FROM public.transactions WHERE legajo = 'LPJ-30999999991' AND id_txn LIKE 'EXT-%' LIMIT 1),
           current_setting('ledger_test.rechazado')::smallint, 'test reverso');
RESET ROLE;
SELECT ledger_test.ok(ledger_test.saldo('00000000-0000-4000-8000-00000000a0a1') = 4439.50, '7: rechazo devuelve 1012.10');
SELECT ledger_test.ok((SELECT ledger_status FROM public.transactions WHERE legajo = 'LPJ-30999999991' AND id_txn LIKE 'EXT-%' LIMIT 1) = 'reversed',
                  '7: ledger_status = reversed');

-- ===========================================================================
-- 6. Inmutabilidad: asientos y saldos no se tocan por fuera del motor
-- ===========================================================================
DO $$
BEGIN
    BEGIN UPDATE public.ledger_entries SET amount = amount + 1; RAISE EXCEPTION 'FALLO 6: UPDATE permitido';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN DELETE FROM public.ledger_entries; RAISE EXCEPTION 'FALLO 6: DELETE permitido';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN
        INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, posting_key, line_no, posted_at)
        SELECT id, public._ledger_account_id('BANCO_BDC'), 'debit', 1, 'trucho', 1, now()
          FROM public.transactions WHERE id_txn = 'TEST-DEP-1';
        RAISE EXCEPTION 'FALLO 6: INSERT directo permitido';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN UPDATE public.subaccount_balances SET saldo_disponible = saldo_disponible + 1000000
           WHERE subaccount_id = '00000000-0000-4000-8000-00000000a0a1';
          RAISE EXCEPTION 'FALLO 6: UPDATE directo de saldo permitido';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$$;

-- Un cliente no puede ni escribir saldos ni ejecutar el motor.
SELECT ledger_test.ok(NOT has_table_privilege('authenticated', 'public.subaccount_balances', 'UPDATE'), '6: authenticated sin UPDATE en saldos');
SELECT ledger_test.ok(NOT has_function_privilege('authenticated', 'public.ledger_post(uuid,text,jsonb,text,text)', 'EXECUTE'), '6: authenticated no ejecuta ledger_post');
SELECT ledger_test.ok(NOT has_function_privilege('anon', 'public.registrar_transferencia_externa(uuid,text,numeric,text)', 'EXECUTE'), '9: anon no ejecuta transferencias');
SELECT ledger_test.ok(NOT has_function_privilege('authenticated', 'public.registrar_deposito_entrante(text,text,numeric,text,text,text,timestamptz)', 'EXECUTE'), '9: authenticated no registra depositos');

-- Un cliente no puede liquidar ni acreditar lotes / adelantos.
DO $$
BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('role', 'authenticated',
            'sub', '00000000-0000-4000-8000-0000000000a1', 'email', 'ledger.a@test.molipay')::text, true);
    BEGIN
        PERFORM public.acreditar_lote(gen_random_uuid(), NULL, 0);
        RAISE EXCEPTION 'FALLO 9: un cliente pudo llamar acreditar_lote';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN
        PERFORM public.ajustar_saldo_subcuenta('00000000-0000-4000-8000-00000000a0a1', 1000000, 'me regalo plata');
        RAISE EXCEPTION 'FALLO 9: un cliente pudo ajustar su saldo';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$$;

-- ===========================================================================
-- 9. RLS: el cliente B no ve asientos ni saldos de A
-- ===========================================================================
SELECT ledger_test.como('authenticated', '00000000-0000-4000-8000-0000000000b1', 'ledger.b@test.molipay');
SET LOCAL ROLE authenticated;
SELECT ledger_test.ok((SELECT count(*) FROM public.ledger_entries e JOIN public.transactions t ON t.id = e.transaction_id
                    WHERE t.legajo = 'LPJ-30999999991') = 0, '9: B no ve asientos de A');
SELECT ledger_test.ok((SELECT count(*) FROM public.subaccount_balances
                    WHERE subaccount_id = '00000000-0000-4000-8000-00000000a0a1') = 0, '9: B no ve saldos de A');
RESET ROLE;

SELECT ledger_test.como('authenticated', '00000000-0000-4000-8000-0000000000a1', 'ledger.a@test.molipay');
SET LOCAL ROLE authenticated;
SELECT ledger_test.ok((SELECT count(*) FROM public.ledger_entries e JOIN public.transactions t ON t.id = e.transaction_id
                    WHERE t.id_txn = 'TEST-BDC-1') = 8, '9: A ve todo el desglose de su operacion (reserva + envio con comision/IVA)');

-- Vista por concepto: una fila por Egreso / Comision / Impuesto con el mismo TXID.
SELECT ledger_test.ok((SELECT string_agg(tipo_linea || ':' || monto, ',' ORDER BY line_no) FROM public.v_transaction_lines
                       WHERE id_txn = 'TEST-BDC-1') = 'egreso:-5000.00,comision:-50.00,impuesto:-10.50',
                      '11: la vista muestra egreso, comision e impuesto separados (sin la reserva)');
SELECT ledger_test.ok((SELECT count(*) FROM public.v_transaction_lines WHERE legajo = 'LPJ-30999999992') = 0,
                      '11: A no ve lineas de B en la vista');
RESET ROLE;

-- ===========================================================================
-- 10. Ajuste manual (admin) y flujo de lote: liquidacion -> acreditacion
-- ===========================================================================
SELECT ledger_test.como('authenticated', current_setting('ledger_test.admin')::uuid, NULL);
SET LOCAL ROLE authenticated;
SELECT public.ajustar_saldo_subcuenta('00000000-0000-4000-8000-00000000b0b1', 250, 'Ajuste de prueba');
RESET ROLE;
SELECT ledger_test.ok(ledger_test.saldo('00000000-0000-4000-8000-00000000b0b1') = 250, '10: ajuste manual acredita');

INSERT INTO public.comercios (id, usuario, legajo, estado, nivel, nombre_comercio)
VALUES ('00000000-0000-4000-8000-00000000c0c1', 'ledger.b@test.molipay', 'LPJ-30999999992', 'Activado', 'Estándar', 'COMERCIO B');
INSERT INTO public.lotes_acreditacion (id, codigo, comercio_id, bandera, fecha, importe_bruto, tasa_payway_pct,
                                       tasa_payway_monto, tasa_molipay_pct, tasa_molipay_monto, importe_neto, estado)
VALUES ('00000000-0000-4000-8000-00000000101a', 'LOTE-TEST-1', '00000000-0000-4000-8000-00000000c0c1', 'VISA',
        current_date, 1000, 0, 0, 0, 0, 900, 'Programado');

SET LOCAL ROLE authenticated;
SELECT public.aplicar_liquidacion_lote('00000000-0000-4000-8000-00000000101a', '{"importeNeto": 900}'::jsonb, current_date);
SELECT public.acreditar_lote('00000000-0000-4000-8000-00000000101a', 'test', 0);
RESET ROLE;
SELECT ledger_test.ok(ledger_test.saldo('00000000-0000-4000-8000-00000000b0b1') = 1150, '10: lote acreditado en la Operativa de B (250 + 900)');
SELECT ledger_test.ok((SELECT b.saldo_disponible FROM public.subaccount_balances b JOIN public.subaccounts s ON s.id = b.subaccount_id
                    WHERE s.cliente_legajo = 'LPJ-30999999992' AND s.tipo = 'Recaudacion') = 0,
                  '10: la Recaudacion de B quedo en 0 tras acreditar');
SELECT ledger_test.ok((SELECT count(*) FROM public.transactions WHERE id_txn IN
                    ('LIQ-00000000-0000-4000-8000-00000000101a', 'ACR-00000000-0000-4000-8000-00000000101a')) = 2,
                  '10: liquidacion y acreditacion quedan como operaciones');

-- ===========================================================================
-- 12. Comisiones por CVU (Deposito), cotizacion y permisos sobre comisiones
-- ===========================================================================
-- A: 2% de Deposito a nivel cliente y 1% solo para su CVU de Sueldos (gana el CVU).
INSERT INTO public.comisiones_cliente (cliente_id, operacion, tipo, modalidad, porcentaje, porcentaje_impuesto, estado)
VALUES ('00000000-0000-4000-8000-0000000000a1', 'DEP-CLIENTE-TEST', 'Depósito', 'Porcentaje', 2, 21, 'Habilitado');
INSERT INTO public.comisiones_cliente (cliente_id, subcuenta_id, operacion, tipo, modalidad, porcentaje, porcentaje_impuesto, estado)
VALUES ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000a0a2', 'DEP-CVU-TEST', 'Depósito', 'Porcentaje', 1, 21, 'Habilitado');

SELECT ledger_test.como('service_role');
SET LOCAL ROLE service_role;
SELECT ledger_test.ok((public.registrar_deposito_entrante('TEST-DEP-CVU', '0000003199999999999902', 1000)->>'comision')::numeric = 10,
                      '12: deposito al CVU usa la comision del CVU (1%)');
RESET ROLE;
SELECT ledger_test.ok(ledger_test.saldo('00000000-0000-4000-8000-00000000a0a2') = 500 + 987.90,
                      '12: el CVU recibe el bruto menos comision e IVA');
SELECT ledger_test.ok((SELECT string_agg(tipo_linea || ':' || monto, ',' ORDER BY line_no) FROM public.v_transaction_lines
                        WHERE id_txn = 'TEST-DEP-CVU') = 'ingreso:1000.00,comision:-10.00,impuesto:-2.10',
                      '12: el deposito muestra ingreso, comision e impuesto separados');

-- Una comision por CVU solo puede ser de una subcuenta del mismo cliente.
DO $$
BEGIN
    BEGIN
        INSERT INTO public.comisiones_cliente (cliente_id, subcuenta_id, operacion, tipo, modalidad, porcentaje, estado)
        VALUES ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000b0b1', 'CVU-AJENO', 'Retiro', 'Porcentaje', 1, 'Habilitado');
        RAISE EXCEPTION 'FALLO 12: se acepto una comision sobre el CVU de otro cliente';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'FALLO%' THEN RAISE; END IF;
    END;
END;
$$;

-- El cliente no puede bajarse su propia comision.
SELECT ledger_test.como('authenticated', '00000000-0000-4000-8000-0000000000a1', 'ledger.a@test.molipay');
SET LOCAL ROLE authenticated;
UPDATE public.comisiones_cliente SET porcentaje = 0 WHERE operacion = 'DEP-CVU-TEST';
SELECT ledger_test.ok((public.cotizar_transferencia('00000000-0000-4000-8000-00000000a0a1', 99999999, NULL)->>'alcanza')::boolean = false,
                      '12: cotizacion avisa que no alcanza el disponible');
SELECT ledger_test.ok((public.cotizar_transferencia('00000000-0000-4000-8000-00000000a0a1', 1000, '0170000000000000000009')->>'total')::numeric = 1012.10,
                      '12: cotizacion incluye comision e IVA del CVU de origen');
RESET ROLE;
SELECT ledger_test.ok((SELECT porcentaje FROM public.comisiones_cliente WHERE operacion = 'DEP-CVU-TEST') = 1,
                      '12: el cliente no pudo modificar su comision');

-- ===========================================================================
-- 2. Cuadre por conjunto contable y moneda
-- ===========================================================================
SELECT ledger_test.ok(NOT EXISTS (
           SELECT 1 FROM public.ledger_entries
            GROUP BY transaction_id, posting_key, currency_code
           HAVING sum(amount) FILTER (WHERE entry_type = 'debit') <> sum(amount) FILTER (WHERE entry_type = 'credit')),
       '2: todo conjunto contable cuadra');

-- ===========================================================================
-- 8. Conciliacion: saldos operativos = ledger
-- ===========================================================================
SELECT ledger_test.como('service_role');
SELECT ledger_test.ok(NOT EXISTS (SELECT 1 FROM public.ledger_conciliar_saldos()), '8: saldos conciliados contra el ledger');

-- ===========================================================================
-- 9. Integridad referencial e historial
-- ===========================================================================
SELECT ledger_test.ok(NOT EXISTS (SELECT 1 FROM public.transaction_status_history h
                               WHERE NOT EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = h.transaction_id)),
                  '9: historial sin huerfanos');
SELECT ledger_test.ok((SELECT count(*) FROM public.transaction_status_history h JOIN public.transactions t ON t.id = h.transaction_id
                    WHERE t.id_txn = 'TEST-BDC-1') >= 2, '9: el historial registra los cambios de estado');
SELECT ledger_test.ok(NOT EXISTS (SELECT 1 FROM public.subaccounts s
                               WHERE NOT EXISTS (SELECT 1 FROM public.subaccount_balances b WHERE b.subaccount_id = s.id)
                                  OR (SELECT count(*) FROM public.ledger_accounts a WHERE a.subaccount_id = s.id) <> 2),
                  '9: toda subcuenta tiene saldos y 2 cuentas contables');

-- ===========================================================================
-- 11. Vista: transferencia interna muestra los dos lados con su contraparte
-- ===========================================================================
SELECT ledger_test.ok((SELECT count(*) FROM public.v_transaction_lines v JOIN public.transactions t ON t.id = v.transaction_id
                        WHERE t.legajo = 'LPJ-30999999991' AND t.id_txn LIKE 'INT-%'
                          AND ((v.tipo_linea = 'egreso' AND v.monto = -500) OR (v.tipo_linea = 'ingreso' AND v.monto = 500))) = 2,
                      '11: interna = egreso en origen + ingreso en destino');
SELECT ledger_test.ok((SELECT sum(monto) FROM public.v_transaction_lines WHERE subaccount_id = '00000000-0000-4000-8000-00000000a0a1')
                       = ledger_test.saldo('00000000-0000-4000-8000-00000000a0a1'),
                      '11: la suma de lineas de la vista = saldo disponible de la subcuenta');

DO $$ BEGIN RAISE NOTICE 'LEDGER OK'; END $$;

ROLLBACK;

-- ===========================================================================
-- 5 (manual). Concurrencia real con dos sesiones (SQL Editor en 2 pestañas o
-- 2 psql), sobre una subcuenta de prueba con 100 de saldo:
--
--   Sesion 1: BEGIN; SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
--             SELECT public.reservar_transferencia_servicio('<sub>', 'CONC-1', '0170000000000000000009', 80);
--             -- (no hacer COMMIT todavia)
--   Sesion 2: BEGIN; SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
--             SELECT public.reservar_transferencia_servicio('<sub>', 'CONC-2', '0170000000000000000009', 80);
--             -- queda ESPERANDO el lock de la fila de saldo
--   Sesion 1: COMMIT;
--   Sesion 2: falla con "Saldo insuficiente"; ROLLBACK;
--   Resultado: disponible 20, retenido 80, un solo asiento de reserva.
-- ===========================================================================
