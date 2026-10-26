# Auditoría de Seguridad — MoliPay
**Módulo:** Base de Datos, Autenticación y RLS
**Stack:** Supabase (Postgres + GoTrue + RLS)
**Nivel:** PSP / Billetera Virtual B2B (BCRA)
**Severidad interna:** 🔴 Alta — no se puede operar producción como está.

---

## TL;DR

El schema tiene **las piezas correctas** (helpers `is_admin()`, `legajo_de_sesion()`; tabla `permisos` con matriz por recurso; FKs bien armadas; CHECK constraints; triggers de auditoría), pero las **policies RLS son en su mayoría `USING (true) WITH CHECK (true)` abiertas al rol `authenticated`, y dos tablas críticas tienen `USING(true)` abiertas al rol `anon`**.

Cualquier usuario autenticado (cliente, backoffice con rol mínimo, API key filtrada) puede hoy, directamente desde el navegador sin pasar por el backend:

- Borrar `permisos`, `roles`, `recursos` (rompiendo el RBAC global).
- Borrar `cliente_transiciones` (rompiendo la auditoría BCRA obligatoria).
- Modificar `conciliaciones`, `impuestos_alicuotas`, `resolvers`.
- Visitar `comercios` **sin autenticarse**.

Mientras no se aplique este fix, ningún otro módulo de seguridad (MFA, JWT, bcrypt, …) importa: el atacante opera **dentro** del PostgREST.

---

## 1. Hallazgos detallados por severidad

### 🔴 CRÍTICO — Exposición a `anon` (sin login)

**C-1. `banderas` es accesible de forma anónima para INSERT/UPDATE/DELETE/SELECT.**
```sql
-- Encontrado en 20261005224751_remote_schema.sql líneas 4565-4581
CREATE POLICY "Allow anon read"   ON "public"."banderas" FOR SELECT TO "anon" USING (true);
CREATE POLICY "Allow anon insert" ON "public"."banderas" FOR INSERT TO "anon" WITH CHECK (true);
CREATE POLICY "Allow anon update" ON "public"."banderas" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete" ON "public"."banderas" FOR DELETE TO "anon" USING (true);
```
**Riesgo:** Un visitante con la `anon` key pública puede listar/crear/modificar/borrar banderas del catálogo (los métodos de pago que aplican al sistema). Compromete todo el motor de liquidación.

**C-2. `comercios` es legible anónimamente.**
```sql
CREATE POLICY "anon_read_comercios" ON "public"."comercios" FOR SELECT TO "anon" USING (true);
```
**Riesgo:** Cualquier visitante (incluso sin login) puede listar todos los comercios con CUIT, legajo, site_id y datos de contacto. PII filtrada por defecto.

---

### 🔴 CRÍTICO — Tablas sin RLS habilitado

Varias tablas financieras **no tienen** `ENABLE ROW LEVEL SECURITY` en el dump remoto. Postgres por defecto las deja pasar a todos los roles. Esto significa que cualquier `authenticated` puede SELECT/UPDATE/DELETE sin restricción:

| Tabla | Por qué importa |
|---|---|
| `clientes` | PII (CUIT, nombre, mail, CBU, fecha nac, domicilio). Es la base. |
| `movimientos` | Movimientos contables de cada cliente. |
| `subcuentas` | Saldos de subcuentas/CVU. |
| `productos` | Catálogo del cliente. |
| `cliente_links_pago`, `cliente_links_pago_detalle`, `cliente_links_pago_pagos` | Links de pago. |
| `destinatarios_frecuentes`, `transferencias_borrador`, `transferencias_programadas` | Transferencias. |
| `validaciones`, `documentos`, `alertas`, `bloqueos`, `historial_cambios` | KYC. |
| `lotes` (legacy), `lote_registros` | Liquidaciones. |
| `caja_molipay`, `caja_movimientos` | La caja común. Si alguien edita `saldo_bancario`, todo el motor se rompe. |

**Severidad operativa:** total. Estas tablas son la espina dorsal del producto. Hoy día están literalmente abiertas para cualquier usuario autenticado.

---

### 🔴 CRÍTICO — Policies permisivas con `authenticated_all_*`

Decenas de policies como la siguiente:

```sql
CREATE POLICY "authenticated_all_permisos"   ON "public"."permisos"   TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_roles"      ON "public"."roles"      TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_resolvers"  ON "public"."resolvers"  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_impuestos"  ON "public"."impuestos"  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_conciliaciones" ON "public"."conciliaciones" TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_cliente_transiciones" ON "public"."cliente_transiciones" TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_eventos_notificacion" ON "public"."eventos_notificacion" TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_dc_excepciones" ON "public"."dc_excepciones" TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_dc_sync_retroactivo" ON "public"."dc_sync_retroactivo" TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_ib_padrones" ON "public"."ib_padrones" TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_ib_normalizacion_preview" ON "public"."ib_normalizacion_preview" TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_impuestos_alicuotas" ON "public"."impuestos_alicuotas" TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_impuestos_asignaciones" ON "public"."impuestos_asignaciones" TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_lote_movimientos" ON "public"."lote_movimientos" TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_lotes_acreditacion" ON "public"."lotes_acreditacion" TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_movimientos_transiciones" ON "public"."movimientos_transiciones" TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_canales_notificacion" ON "public"."canales_notificacion" TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_codigos_error" ON "public"."codigos_error" TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_integraciones" ON "public"."integraciones" TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_comercio_banderas" ON "public"."comercio_banderas" TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_puntos_venta" ON "public"."puntos_venta" TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_comercios" ON "public"."comercios" TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_adelantos" ON "public"."adelantos" TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_api_endpoints" ON "public"."api_endpoints" TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_api_restricciones" ON "public"."api_restricciones" TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_api_usuario_endpoints" ON "public"."api_usuario_endpoints" TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_api_usuario_logs" ON "public"."api_usuario_logs" TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_api_usuarios" ON "public"."api_usuarios" TO authenticated USING (true) WITH CHECK (true);
```

**Riesgo:** cualquier usuario autenticado (un comerciante cualquiera, un backoffice con rol "Reader") puede modificar/borrar tablas globales. Por ejemplo, borrar `permisos` significa que **el RBAC entero queda inoperable**.

**Decisión consciente:** la app admin usa esto hoy para funcionar sin chequear permisos en la DB. Esas policies se **reemplazan** con policies estrictas que chequean `is_admin()` + matriz `permisos` con la columna apropiada (`puede_leer`, `puede_crear`, …). El front puede seguir usando la misma anon/authenticated key; los hooks `useCan()` siguen siendo la autorización a nivel UI; la DB se convierte en la **última línea de defensa**.

---

### 🟠 ALTO — Diseño del RBAC

**H-1.** `is_admin()` exige `lower(r.nombre) = 'admin'`. Si alguien renombra el rol "Admin" o crea otro con ese nombre en minúsculas, se rompe la autorización. **Solución:** definir un rol "inmutable" con `is_system = true`, y que `is_admin()` chequee ese flag.

**H-2.** No hay protección de "último admin activo". Si quedan cero admins activos con rol Admin, nadie puede volver a crear. **Solución:** trigger que impida UPDATE/DELETE del último `admin_users` con rol Admin activo.

**H-3.** `auth.uid()` se usa para identificar `admin_users`, pero `admin_users.id` tiene FK a `auth.users(id)`. Hasta acá bien. **Pero** `clientes.id` **no tiene FK a `auth.users(id)`** (es un UUID independiente). La forma actual de hacer "yo soy este cliente" es por `legajo_de_sesion()` que matchea `auth.email()` con `clientes.correo`. Esto es funcional pero **frágil**:
- Si renombrás el email → el cliente pierde acceso a sus datos.
- Dos cuentas `auth.users` con el mismo email (improbable pero posible) rompen la unicidad.
- **Recomendación a futuro:** agregar una tabla `auth_links` o `clientes.usuario_id uuid FK auth.users(id)` y migrar.

**H-4.** No hay MFA/2FA habilitado en el schema. Supabase soporta TOTP, pero no hay migraciones que lo enganchen. Habilitarlo en `auth.users.encrypted_password + raw_app_meta_data.factor_enrollment` es trabajo del proyecto Supabase, no de RLS. **Severidad:** media para BCRA (el regulator exige al menos 2FA para backoffice), pero el fix inmediato es lo otro.

**H-5.** `cliente_legajo_actual()` devuelve `LIMIT 1` sin `ORDER BY`. Si dos clientes tuvieran el mismo `correo` (no debería pasar, pero el `clientes.correo` **no tiene constraint UNIQUE**), devolvería uno no determinista. **Fix:** agregar UNIQUE sobre `clientes.correo` (con `lower()` idealmente, vía índice único funcional).

---

### 🟠 ALTO — Tablas faltantes en la matriz de auditoría

Las siguientes tablas tienen trigger de log o deberían tenerlo y no:

- `admin_users` no tiene trigger de auditoría de cambios de `rol_id` ni de `activo=false` (debería loguear quién desactivó un admin).
- `roles`, `recursos`, `permisos` no tienen trigger; un cambio en la matriz RBAC debería quedar registrado para BCRA.

---

### 🟡 MEDIO — Modelado

**M-1.** `cliente_links_pago.vistas` y `pagos` se incrementan con `coalesce(vistas, 0) + 1`. Sin embargo, sin RLS, un usuario autenticado cualquiera puede hacer `update set vistas = 99999`. **Solución:** el fix de RLS ya lo cubre.

**M-2.** `cliente_links_pago_pagos.pagos_parciales` está en la tabla padre como `boolean` pero los pagos parciales se modelan en otra columna. No es bug, pero el nombre confunde.

**M-3.** Falta una vista materializada o índice para `caja_molipay.saldo_conciliado` y para los joins de `movimientos` por `legajo + fecha`.

**M-4.** `comisiones_cliente.porcentaje_impuesto` es un `numeric(?,?)` sin constraint CHECK que valide 0 ≤ x ≤ 100. Cualquier valor puede entrar. **Fix:** CHECK o FK a un catálogo.

**M-5.** En la tabla `adelantos.estado`, el CHECK acepta `Acreditado`, pero el avance natural no obliga a pasar por todos los estados (`Pendiente → Aprobado → Acreditado`). Hoy no hay trigger que valide la transición. **Fix:** trigger de transición como el que existe para `clientes`/`movimientos`.

---

### 🟡 MEDIO — `impuestos_asignaciones` no tiene FK a admin_users

`impuestos_asignaciones` es modificable por `authenticated_all_*` sin auditoría de quién la cambió. Lo mismo aplica a `integraciones`, `resolver`, etc.

---

### 🟢 BAJO

**L-1.** Comentarios `COMMENT ON …` están bien; consistentes y útiles. Felicidades.

**L-2.** El uso de `IMMUTABLE` para `generar_legajo(p_tipo_persona, p_cuit)` es correcto (no depende de estado de DB).

**L-3.** FK con `ON DELETE CASCADE` en `cliente_*_legajo` está bien aplicado — un DELETE del cliente limpia su rastro relacionado, alineado con auditoría. Pero ojo: **borrar `clientes` borra toda la trazabilidad del cliente** salvo `cliente_transiciones` y los logs de auditoría. Es preferible una **soft-delete** (`estado = 'eliminado'` + trigger que no borre físicamente). Pero eso es un cambio mayor y queda fuera de esta migración.

---

## 2. Lo que está bien (no tocar)

| Pieza | Estado |
|---|---|
| `clientes.cuit` CHECK `^[0-9]{11}$` | ✅ |
| `clientes.legajo` CHECK `^(LPF|LPJ)-[0-9]{11}$` | ✅ |
| `legajo_deriva_de_cuit` CHECK | ✅ |
| Trigger `fn_log_transicion_cliente` | ✅ |
| Trigger `fn_log_transicion_movimiento` | ✅ |
| Trigger `trg_prevent_cliente_admin_email` | ✅ |
| Trigger `trg_fix_monto_cobrado` | ✅ |
| `movimientos.monto_cobrado_consistente` CHECK | ✅ |
| `movimientos.movimientos_tarjeta_requiere_comercio_bandera` CHECK | ✅ |
| FKs `clientes.legajo` desde casi todas las tablas hijas | ✅ |
| `acreditacion_lotes` append-only por convención | ✅ (pero falta FK enforcement) |
| `caja_movimientos` append-only por convención | ✅ |
| Uso de `SECURITY DEFINER` en RPCs | ✅ |
| `search_path` fijado en `SECURITY DEFINER` | ✅ |
| Supabase Auth (JWT firmado, bcrypt, refresh) | ✅ (provisto por Supabase) |

---

## 3. Plan de remediación

### Aplicar esta migración:
`supabase/migrations/20261010000000_security_rls_hardening.sql`

Incluye:
1. Mata las 4 policies `anon` de `banderas` y la `anon_read_comercios`.
2. Habilita RLS en TODAS las tablas que faltan (`clientes`, `movimientos`, `subcuentas`, `caja_molipay`, …).
3. Define `current_admin_id()`, `current_cliente_legajo()`, `is_admin()`, `current_is_staff()` como **single source of truth**.
4. Reemplaza las policies permisivas con policies estrictas:
   - **Path admin:** `is_admin()` para tablas administrativas.
   - **Path comerciante:** `auth.email() = cliente.correo` (via `legajo_de_sesion()`) para tablas tenant-scoped.
5. Agrega UNIQUE sobre `lower(clientes.correo)` + `clientes.legajo` ya tiene CHECK funcional.
6. Trigger que protege al último admin activo.
7. Trigger de auditoría para `permisos`/`roles`/`recursos`.

### Coste esperado

El front admin va a **dejar de usar** las `authenticated_all_*` abiertas. Las páginas que hoy funcionan sin chequear permisos van a pasar por `is_admin()` (sigue funcionando porque los admins reales tienen rol "Admin"), pero las **acciones desde la app enterprise (comerciante)** van a quedar restringidas a sus propios datos. Eso es el comportamiento correcto.

Si alguna página del admin usa `supabase.from('permisos').insert(...)` directamente desde un usuario autenticado que **no** es Admin, va a fallar 403. **Solución de transición:** envolver los inserts/updates de admin en una Edge Function (`pg_net` + service role) o pedir un JWT con claim custom. **Recomendado:** hacerlo.

### Después de aplicar

- Smoke tests del front enterprise.
- Smoke tests del front admin.
- Probar específicamente:
  - Un backoffice con rol "Reader" **no** puede borrar `permisos`.
  - Un comerciante **no** puede leer `movimientos` de otro cliente.
  - `anon` no puede leer `comercios`.

---

## 4. Supabase Auth / MFA (fuera de SQL)

Para llegar al estándar BCRA hace falta, **a nivel proyecto** (no SQL):

- Habilitar TOTP / WebAuthn en Auth → MFA.
- Configurar `auth.email` con dominio verificado y rate-limit en Edge Functions.
- Configurar la Edge Function `crear_admin_user` que ya tienen para usar `service_role` key **solamente del backend** y nunca exponerla al cliente.
- Auditar `auth.users.encrypted_password` con bcrypt (ya viene por defecto en Supabase).
- Considerar `auth.jwt() -> 'aal'` para exigir AAL ≥ 2 en policies para operaciones sensibles (acreditaciones, deshabilitar comercios, etc).

Esto se trata en una segunda oleada.
