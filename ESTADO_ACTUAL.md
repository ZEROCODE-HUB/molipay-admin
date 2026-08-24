# ESTADO_ACTUAL.md — Reglas de negocio críticas (proyecto MoliPay Admin)

> **Documento de referencia.** No afecta el build ni el lint.
> Su propósito es preservar las reglas ya confirmadas en esta sesión para
> que no se pierdan si el contexto del asistente se resetea o compacta.
>
> ⚠️ **El esquema local `supabase/migrations/0001_init.sql` está DESACTUALIZADO**
> (asume `admin_users.rol` texto y `movimientos.estado` texto, y omite
> `roles/recursos/permisos/estados_movimiento/estados_por_tipo/conciliaciones`).
> Cualquier trabajo nuevo debe guiarse por este archivo y por
> `0003_schema_produccion.sql` (snapshot manual equivalente a `supabase db pull`),
> NO por `0001_init.sql`.

---

## 1. Tablas REALES en producción (verificadas vía `information_schema.columns`)

| Tabla | Columnas clave | Notas |
|---|---|---|
| `admin_users` | id (uuid FK auth.users), legajo (text, único), email, nombre, activo (bool), **rol_id (uuid FK roles)**, created_at, updated_at | Ya NO tiene columna `rol`. |
| `clientes` | id, legajo, tipo_persona (`fisica`/`juridica`), correo, nombre, cuit, estado (`activo`/`suspendido`/`rechazado`), fecha_alta (date), created_at, updated_at | |
| `comisiones_cliente` | id, cliente_id (FK), **operacion (text, código único)**, **tipo (`Depósito`/`Retiro`/`Link de pago`/`E-commerce`)**, modalidad (`Porcentaje`/`Fijo`), porcentaje, monto_fijo, porcentaje_impuesto (default 21), estado (`Habilitado`/`Deshabilitado`), descripcion, created_at, updated_at | `operacion` = código; `tipo` = categoría. |
| `conciliaciones` | id, movimiento_id (FK), fecha_conciliacion (date), estado_conciliacion (text), monto_diferencia (numeric), archivo_origen (text), created_at | |
| `estados_movimiento` | **id (smallint PK)**, codigo (text, único), nombre (text), es_final (bool), requiere_conciliacion (bool), created_at | |
| `estados_por_tipo` | tipo_movimiento (text), estado_id (smallint FK) — PK compuesta | Define la máquina de estados. |
| `movimientos` | id, cliente_id (FK), legajo, id_txn, tipo (text), cvu, monto_operacion, comision, impuesto, monto_cobrado, fecha (timestamptz), created_at, **estado_id (smallint FK estados_movimiento)** | Ya NO tiene columna `estado`. |
| `movimientos_transiciones` | id (uuid), movimiento_id (FK), estado_anterior_id (smallint), estado_nuevo_id (smallint), origen (text), admin_user_id (uuid FK), comentario (text), fecha (timestamptz) | **Ya existe en prod** con trigger `trg_log_transicion_movimiento` + `REVOKE UPDATE, DELETE` (append-only). |
| `permisos` | id, rol_id (FK), recurso_id (FK), puede_leer, puede_crear, puede_modificar, puede_borrar (bool) | |
| `recursos` | id (uuid), codigo (text, único), nombre (text), modulo (text) | |
| `roles` | id (uuid), nombre (text, único), descripcion (text), created_at, updated_at | |
| `auditoria_legajos` | id_txn (text), legajo (text), fecha (timestamptz), observacion (text) | **Vacía, sin PK, sin lógica/trigger.** No construir nada sobre ella. |
| `comercios` | id (uuid PK), usuario (text, email), legajo (text, **FK real a `clientes.legajo`**), categoria_id (integer, **FK a `codigos_categoria.id`**), estado (`CHECK`: Activado/Desactivado/Pendiente de aprobación/Rechazado/Suspendido), nivel (`CHECK`: Pequeño/Mediano/Grande/Premium/Estándar/Básico/Enterprise), created_at, updated_at | Alta vía `comercios.ts` (API). El legajo NO es texto libre: debe existir en `clientes`. |
| `puntos_venta` | id (uuid PK), comercio_id (uuid, **FK a `comercios.id` CASCADE**), nombre (text), estado (`CHECK`: Activado/Desactivado), created_at | Se consulta embebida en `comercios` (relación `puntos_venta`). |
| `resolvers` | id (uuid PK), nombre (text), cuit (text, `CHECK` 11 dígitos), url (text), estado (`CHECK`: Activo/Inactivo), nombre_reverso, formato_web, pcp_id, id_pcp (campos separados), token, as_header (bool), soa (bool), created_at, updated_at | Alta/edición vía `resolvers.ts` (API). |
| `codigos_categoria` | id (integer PK, auto-generado), codigo (text **UNIQUE**, ej. "CAT-001"), nombre (text), descripcion (text), estado (`CHECK`: activo/inactivo), created_at, updated_at | Catálogo para `comercios.categoria_id` (FK `comercios_categoria_id_fkey` recreada y verificada). Sembrada con 10 categorías reales (CAT-001…CAT-010). |
| `api_usuarios` | id (uuid PK), **codigo_usuario_api** (text, UNIQUE, ej. "1001" — antes "legajo" en mock, NO es clientes.legajo), usuario (text, email), nombre_completo (text), estado (`CHECK`: Pendiente Validación/Homologación/Producción/Suspendido/Deshabilitado), created_at, updated_at | Usuarios con acceso a APIs externas. El campo antes llamado "legajo" en mock se renombró a `codigo_usuario_api` (numérico libre, NO es clientes.legajo). |
| `api_endpoints` | id (uuid PK), nombre (text), path (text), metodo (`CHECK`: GET/POST/PUT/DELETE/PATCH), descripcion (text), grupo (`CHECK`: Autenticación/Enlaces de pago/QR/SubAccounts/Transfer/User/Webhooks), estado (`CHECK`: Habilitado/Deshabilitado), rec (bool), created_at, updated_at | Catálogo independiente de endpoints de la API externa. Sin relación a usuarios/comercios. |
| `api_restricciones` | id (uuid PK), **api_usuario_id** (uuid, **FK real a `api_usuarios.id` CASCADE**), estado (`CHECK`: Restringiendo/No restringiendo), fecha_creacion (timestamptz), fecha_expiracion (date), created_at | Restricciones por usuario de API. FK real a `api_usuarios` (no matching por string). Join trae email/nombre_completo desde `api_usuarios`. |
| `impuestos` | id (uuid PK), codigo (text UNIQUE), nombre (text), descripcion (text), tipo (`CHECK`: Porcentaje/Fijo/Otro), monto (numeric 14,4 NULL si tipo=Otro), estado (`CHECK`: Activo/Inactivo default Activo), created_at, updated_at | Catálogo principal de impuestos. DDL en `0004_impuestos_completo.sql`. |
| `impuestos_alicuotas` | id (uuid PK), impuesto_id (FK a `impuestos.id` CASCADE), codigo (text), tasa (numeric), descripcion (text), estado (`CHECK`: Activa/Inactiva default Activa), created_at, updated_at | Alícuotas por impuesto. Se consulta embebida (`impuestos_alicuotas`) al traer un impuesto. |
| `impuestos_asignaciones` | id (uuid PK), **cliente_legajo (text, FK real a `clientes.legajo` CASCADE)**, impuesto_id (FK a `impuestos.id`), tipo (`CHECK`: Porcentaje/Fijo/Otro), monto (numeric NULL), estado (Activo/Inactivo), fecha_asignacion (date), created_at, updated_at | Asignación de impuestos a clientes. Respeta la regla "legajo siempre es un cliente" (§9). Joins embebidos: `impuestos`, `clientes`. |
| `ib_padrones` | id (uuid PK), impuesto_id (FK a `impuestos.id`), nombre (text), archivo (text), estado (`CHECK`: Cargando/Procesando/Finalizado/Error default Cargando), progreso (int 0-100), created_at, updated_at | Padrones de Ingresos Brutos. |
| `ib_normalizacion_preview` | id (uuid PK), padron_id (FK a `ib_padrones.id`), kpis_json (jsonb), creados_json (jsonb), desactivados_json (jsonb), omitidos_json (jsonb), aplicado (bool default false), created_at | Preview-first: el preview NUNCA se crea con aplicado=true; solo se marca true vía acción explícita "Aplicar". |
| `dc_excepciones` | id (uuid PK), email (text), **cuit (text CHECK 11 dígitos)**, tipo (`CHECK`: Alta manual/Convenio multilateral/Exención), **direccion (`CHECK`: Entrantes/Salientes — NUNCA 'Ambos')**, motivo (text), vigencia_desde (date), vigencia_hasta (date nullable), autorizacion_codigo (text nullable), estado (Activo/Inactivo), created_at, updated_at | Excepciones Débito/Crédito. Tipo="Ambos" del formulario → frontend hace **2 INSERTs** (uno por dirección) vía `createDcExcepcionAmbos`. |
| `dc_sync_retroactivo` | id (uuid PK), cuit (text CHECK 11 dígitos), desde (date), hasta (date nullable), preview_json (jsonb), aplicado (bool default false), created_at, updated_at | Sincronización retroactiva D/C. Preview-first igual que normalización IB. |

---

## 2. `estados_movimiento` — confirmado EN VIVO contra producción

| id | codigo | nombre |
|----|--------|--------|
| 1 | APROBADO | APROBADO |
| 2 | EN_PROGRESO | EN PROGRESO |
| 3 | RECHAZADO | RECHAZADO |
| 4 | BLOQUEADO | BLOQUEADO |
| 5 | CREADO | CREADO |
| 6 | ABIERTO | ABIERTO |
| 7 | EXPIRADO | EXPIRADO |
| 8 | REEMBOLSADO | REEMBOLSADO |

> ⚠️ El `codigo` es **`EN_PROGRESO` (con guion bajo)**, NO "EN PROGRESO".
> Hubo un bug por esto: el filtro de estado y los badges deben usar `EN_PROGRESO`.

---

## 3. `estados_por_tipo` — confirmado EN VIVO contra producción

Define qué estados aplican a cada tipo de movimiento (validación de la RPC
`cambiar_estado_movimiento`):

| tipo_movimiento | estado_id aplicables |
|-----------------|---------------------|
| `deposito`  | 1, 2, 3, 4 |
| `retiro`    | 1, 2, 3, 4 |
| `tarjeta`   | 1, 2, 3, 5, 6, 7 |
| `pago_pct`  | 1, 2, 3, 8 |
| `cobro_pct` | 1, 2, 3, 8 |

> Nota de implementación: la RPC normaliza el `movimientos.tipo` (display) al
> código de `estados_por_tipo` vía un `CASE` (`Depósito`→`deposito`, etc.) y
> solo valida si el tipo tiene estados definidos; si no, no bloquea.

---

## 4. Dos vocabularios DISTINTOS (fuente de bugs ya ocurridos)

| Campo | Tabla | Valores |
|-------|-------|---------|
| `movimientos.tipo` | movimientos | `deposito`, `retiro`, `tarjeta`, `pago_pct`, `cobro_pct` |
| `comisiones_cliente.tipo` | comisiones_cliente | `Depósito`, `Retiro`, `Link de pago`, `E-commerce` |

- Son **campos distintos en tablas distintas** con valores distintos.
- El filtro de "Tipo" en la UI de Movimientos mapea label visible → código real
  (`Depósito`→`deposito`, …). Solo ofrece los 5 códigos reales de `movimientos.tipo`
  (no `comision`/`impuesto`/`pago_servicio`, que no existen).
- `comisiones_cliente.operacion` es un **código único** (p.ej. `OP-123456`),
  NO la categoría; `tipo` es la categoría de 4 valores.

---

## 5. Inmutabilidad de `movimientos_transiciones` (REGLA DE NEGOCIO)

- La tabla es **append-only**: `REVOKE UPDATE, DELETE` para el rol público.
- Todo cambio de `movimientos.estado_id` dispara el trigger
  `trg_log_transicion_movimiento`, que inserta una fila con **`origen = 'coelsa'`**
  (automática, `admin_user_id = NULL`).
- Los cambios **manuales** desde el backoffice deben corregir esa fila a
  **`origen = 'manual'`** con el `admin_user_id` real, en la misma transacción.
  Lo hace la RPC `cambiar_estado_movimiento` (en `0002_movimientos_transiciones.sql`)
  como `SECURITY DEFINER` (puede UPDATE sobre la fila que acaba de insertar el trigger).
- **Nunca** debe agregarse un botón de editar/eliminar sobre `movimientos`
  ni sobre `movimientos_transiciones`. Un movimiento no se borra.

---

## 6. Estructura de autorización: `roles` / `recursos` / `permisos`

- `admin_users.rol` **ya no existe**; es `admin_users.rol_id` (FK a `roles.id`).
- Matriz: `permisos(rol_id, recurso_id, puede_leer, puede_crear,
  puede_modificar, puede_borrar)`.
- `recursos` tiene `codigo`/`nombre`/`modulo` (p.ej. módulos de la app).
- API ya conectada (`src/lib/api/roles-permisos.ts`): `listRoles`,
  `upsertRol`, `deleteRol`, `listRecursos`, `getPermisosByRol`, `upsertPermiso`.
- La UI "Roles y permisos" ya usa esta API (alta/baja de rol, toggle de matriz).
- La RPC `cambiar_estado_movimiento` valida que el usuario sea `roles.nombre = 'admin'`
  (join `admin_users → roles`).

---

## 7. Inventario de botones por módulo (al día de hoy)

Leyenda: ✅ Conectado · ❌ No aplica (no existe el botón) · ⚠️ Equivalente conectado.

| Módulo | Ver | Editar | Eliminar | Cambiar estado |
|--------|-----|--------|----------|----------------|
| **Clientes** | ✅ (`Ver detalle` → `$legajo`) | ❌ no existe (destino solo lectura) | ❌ no existe | ❌ no aplica (equiv.: Suspender/Reactivar ✅) |
| **Comisiones** | ✅ | ✅ (`upsertComision`) | ❌ no existe | ❌ no aplica (equiv.: Habilitar/Deshabilitar ✅) |
| **Movimientos** | ✅ | ❌ no existe | ❌ **no existe** (correcto: no se borra) | ✅ |
| **admin_users** | ✅ (detalle) | ❌ no existe | ❌ no existe | ❌ no aplica |
| **Roles/recursos/permisos** | ❌ no aplica (matriz visible) | ❌ edición de *rol* no existe (matriz de permisos ✅) | ✅ (`deleteRol`) | ❌ no aplica |
| **Comercios (index)** | ✅ | ✅ | ✅ | ✅ (Activar/Suspender) |
| **Comercios (transferencia)** | ✅ | ✅ | ✅ | ✅ (Activar/Suspender/Validar) |
| **Categorías (transferencia)** | ❌ no existe | ✅ | ✅ | ✅ (Activar/Desactivar) |
| **Resolvers** | ❌ no existe | ✅ | ✅ | ✅ (Activar/Desactivar) |
| **APIs: Usuarios** | ✅ | ✅ | ✅ | ✅ (Validar/Homologación/Suspender/Activar) |
| **APIs: Endpoints** | ❌ no existe | ✅ | ✅ | ✅ (Habilitar/Deshabilitar) |
| **APIs: Restricciones** | ❌ no existe | ✅ | ✅ | ✅ (Restringir/Sacar restricción) |
| **Integraciones (index)** | ✅ (cards semáforo) | ❌ no existe | ❌ no existe | ❌ no aplica (semáforo mock) |
| **Integraciones (logins)** | ❌ no existe | ❌ no existe | ❌ no existe | ❌ no aplica (semáforo mock) |
| **Impuestos: catálogo** | ✅ (detalle + alícuotas) | ✅ | ✅ | ✅ (Activar/Desactivar) |
| **Impuestos: alícuotas (sub-tabla detalle)** | ❌ no aplica (fila de tabla) | ✅ | ✅ | ✅ (Activar/Desactivar) |
| **Impuestos: asignaciones (usuarios)** | ✅ (cliente+impuesto embebidos en fila) | ✅ (legajo NO editable) | ✅ | ✅ (Activar/Desactivar) |
| **Impuestos: IB padrones** | ❌ no existe | ❌ no aplica (alta = cargar archivo) | ✅ | ❌ no aplica (estado lo maneja el proceso) |
| **Impuestos: IB normalización** | ✅ ("Ver preview" modal KPIs) | ❌ no existe | ❌ no existe | ✅ ("Aplicar" → aplicado=true, con confirmación) |
| **Impuestos: D/C excepciones** | ❌ no aplica (todo visible en grilla) | ❌ no existe edición (solo alta) | ❌ no existe | ✅ (Activar/Desactivar) |
| **Impuestos: D/C sync retroactivo** | ✅ ("Ver preview" modal KPIs) | ❌ no existe | ❌ no existe | ✅ ("Confirmar ejecución" → aplicado=true) |
| **Reportes de Impuestos** | ⚠️ sigue MOCK (sección "Demo") — pendiente módulo Administración→Reportes | ❌ | ❌ | ❌ |

Notas:
- Clientes: el botón antes decía "Ver / Editar" (engañoso); renombrado a
  **"Ver detalle"** en este turno. No hay edición persistente de cliente
  (solo `updateClienteEstado`).
- Movimientos: no existe botón "Eliminar" en ninguna pantalla (index ni
  sub-rutas). Coincide con la regla de inmutabilidad del punto 5.
- admin_users: solo "Ver detalles"; alta vía Edge Function `crear-admin`
  (ya corregida para insertar `admin_users` con `rol_id` + rollback). Editar/
  borrar/cambiar contraseña no implementados (no hay API de update/delete).

---

## 8. Guards de permisos (punto 7 — IMPLEMENTADO)

**Implementación:** `src/lib/permissions.ts` (hooks `usePermisos` + `useCan`,
cache de sesión en `sessionStorage`) y `src/components/permission-guard.tsx`
(`<PermissionGuard recurso="...">`).

- `usePermisos()` carga `getPermisosByRol(admin.rolId)` y la lista de `recursos`,
  y arma un `Map<recurso.codigo, Permiso>`. La **única** fuente de verdad es la
  tabla `permisos`: **no** se hace ningún atajo por nombre de rol (el rol Admin
  ya viene con todos los `puede_*` en `true` por el seed, así que se evalúa igual
  que cualquier otro rol).
- `useCan()` expone `can(accion, codigo)` → `boolean`.
- `<PermissionGuard recurso="...">` muestra "Sin permiso" (ícono candado) si el
  rol no tiene `puede_leer`; mientras carga, muestra "Cargando permisos…".
- Botones de acción se deshabilitan (`disabled`) según `puede_crear` /
  `puede_modificar` / `puede_borrar`.
- **Defense-in-depth:** los guards son UX. La validación real sigue en RLS +
  la RPC (`cambiar_estado_movimiento` ya chequea rol admin server-side).
- Aplicado **solo** a módulos ya conectados a datos reales. Rutas en mock
  (`src/data/*`) NO tienen guard (evita falsos "sin permiso").

### Mapeo ruta → recurso.codigo (ya aplicado)

| Ruta (archivo) | recurso.codigo |
|---|---|
| `admin.general.usuarios.index` | `usuarios` |
| `admin.general.usuarios.comisiones` | `usuarios` |
| `admin.general.usuarios.$legajo` | `usuarios` |
| `admin.general.movimientos.index` | `movimientos` |
| `admin.general.movimientos.{depositos,retiros,pagos-tarjeta,pagos-qr,cobros-qr,impuestos,comisiones}` | `movimientos` (7 sub-rutas conectadas, ver §15) |
| `admin.administracion.usuarios.index` | `usuarios_backoffice` |
| `admin.administracion.usuarios.roles` | `roles_permisos` |
| `admin.comercios.index` | `comercios` |
| `admin.comercios.apis.resolvers` | `resolvers` |

> Los `recurso.codigo` son los sembrados en `seed_recursos.sql` (producción). No
> se inventaron ni adaptaron códigos nuevos.

### Gating por módulo (lo que quedó conectado)

| Módulo | Guard ruta (`puede_leer`) | Botones deshabilitados por permiso |
|---|---|---|
| Clientes | `usuarios` | Suspender / Reactivar → `puede_modificar` |
| Comisiones | `usuarios` | "Nueva comisión" → `puede_crear`; Editar / Habilitar / Deshabilitar → `puede_modificar` |
| Movimientos | `movimientos` | "Cambiar estado" → `puede_modificar` |
| admin_users | `usuarios_backoffice` | "Nuevo usuario" → `puede_crear` |
| Roles y permisos | `roles_permisos` | "Nuevo rol" → `puede_crear`; checkboxes de matriz → `puede_modificar`; borrar rol → `puede_borrar` |

---

## 8b. Módulos conectados a las 4 nuevas tablas (Comercios / Resolvers)

Implementado en este turno. Capa de datos en `src/lib/api/comercios.ts` y
`src/lib/api/resolvers.ts`; hooks en `src/hooks/useComercios.ts` y
`src/hooks/useResolvers.ts`.

| Ruta (archivo) | Tabla(s) reales | recurso.codigo | Paginación | Filtros |
|---|---|---|---|---|
| `admin.comercios.index.tsx` | `comercios` (+ join `clientes`, `codigos_categoria`, `puntos_venta`) | `comercios` | server-side (react-query) | Estado y Nivel (dropdowns) + búsqueda usuario/legajo |
| `admin.comercios.transferencia.index.tsx` | `comercios` (+ join `puntos_venta`, `codigos_categoria`, `clientes`) | `comercios` | server-side (react-query) | Estado y Nivel (dropdowns) + búsqueda usuario/legajo |
| `admin.comercios.transferencia.categorias.tsx` | `codigos_categoria` | `comercios` | server-side (react-query) | Estado (dropdown) + búsqueda codigo/nombre/descripcion |
| `admin.comercios.apis.resolvers.tsx` | `resolvers` | `resolvers` | server-side | Estado (dropdown) + búsqueda nombre/CUIT/URL |
| `admin.comercios.apis.index.tsx` | `api_usuarios` | `apis_externas` | server-side (react-query) | Estado (dropdown) + búsqueda código/usuario/nombre |
| `admin.comercios.apis.endpoints.tsx` | `api_endpoints` | `apis_externas` | server-side (react-query) | Estado/Grupo/Método (dropdowns) + búsqueda nombre/path/descripción |
| `admin.comercios.apis.restricciones.tsx` | `api_restricciones` (+ join `api_usuarios`) | `apis_externas` | server-side (react-query) | Estado (dropdown) + búsqueda usuario/email/nombre/código |

- Capa de `codigos_categoria` en `src/lib/api/codigos-categoria.ts` (list/CRUD +
  activar-desactivar) y hook `src/hooks/useCodigosCategoria.ts`. El alta de
  comercio usa este catálogo para elegir `categoria_id`.
- **Alta de comercio:** el `legajo` se elige desde un selector de `clientes`
  existentes (FK real). No se acepta texto libre. `categoria_id` se elige desde
  `codigos_categoria` (muestra `codigo · nombre`).
- **Alta/edición de resolver:** el `cuit` se valida a 11 dígitos antes de guardar
  (coincide con el `CHECK` de la columna).
- **APIs externas (nuevo):** 3 tablas nuevas (`api_usuarios`, `api_endpoints`, `api_restricciones`),
  CRUD completo en `src/lib/api/api-usuarios.ts|api-endpoints.ts|api-restricciones.ts`,
  hooks en `src/hooks/useApiUsuarios.ts|useApiEndpoints.ts|useApiRestricciones.ts`.
  - `api_usuarios.codigo_usuario_api` (antes "legajo" en mock) — código numérico libre, NO es `clientes.legajo` (LPF/LPJ-CUIT). Label en UI: "Código de usuario API".
  - `api_restricciones` usa FK real `api_usuario_id` → `api_usuarios.id` (CASCADE). Join trae email/nombre_completo desde `api_usuarios` (no duplicados).
- Todas las rutas conectadas muestran estados explícitos: loading (spinner),
  error (con reintentar; distingue "sin permiso" de error genérico vía
  `DataAccessError.permission`) y vacío (inbox).
- Botones deshabilitados por `useCan` según `puede_crear` / `puede_modificar` /
  `puede_borrar` sobre el recurso correspondiente.
- PermissionGuard: recurso `"apis_externas"` en las 3 sub-rutas nuevas.

> ⚠️ Todo `admin.comercios.link-pago.*` sigue consumiendo el contexto mock
> `src/contexts/comercios.tsx`. El bloque Link de pago (`link-pago.index`,
> `link-pago.metodos-pago` y el catálogo `metodosPagoIniciales` de tipos de
> tarjeta/cuotas TEN/TNA/coeficiente) es un modelo de datos distinto y nuevo,
> **no especificado**, y permanece en mock por instrucción explícita.
> 
> **Módulo Comercios (rutas conectables): 100% cerrado.** Rutas conectadas a BD real:
> `admin.comercios.index`, `admin.comercios.transferencia.index`,
> `admin.comercios.transferencia.categorias`,
> `admin.comercios.apis.resolvers`,
> `admin.comercios.apis.index`, `admin.comercios.apis.endpoints`,
> `admin.comercios.apis.restricciones`.
> Solo `link-pago.*` queda pendiente de especificación de modelo real.

---

## 9. Regla de negocio: "legajo siempre es un cliente"

Confirmada por el cliente y de aplicación obligatoria en cualquier tabla nueva
que tenga una columna `legajo`:

- Toda columna `legajo` que represente a un **cliente** debe tener **FK real
  hacia `clientes.legajo`**, nunca texto libre sin constraint.
- Única excepción conocida: `admin_users.legajo` (namespace distinto, personal de
  backoffice, formato `ADM-XXXX`) — **no** lleva esa FK a `clientes`.
- Aplicado ya: `comercios.legajo` → FK a `clientes.legajo` (el alta exige cliente
  existente) y `movimientos.legajo` (denormalizado, validado contra
  `clientes.legajo` en los 120.000 registros existentes).

> **Módulo Comercios (rutas conectables): 100% cerrado.** Rutas conectadas a BD real:
> `admin.comercios.index`, `admin.comercios.transferencia.index`,
> `admin.comercios.transferencia.categorias`,
> `admin.comercios.apis.resolvers`,
> `admin.comercios.apis.index`, `admin.comercios.apis.endpoints`,
> `admin.comercios.apis.restricciones`.
> Solo `link-pago.*` queda pendiente de especificación de modelo real.

---

## 10. Gestor de Integraciones (ex Gestor de Logins) — conectado parcialmente

Se conectó el catálogo de integraciones (`integraciones` table) y se aplicó
`PermissionGuard recurso="gestor_integraciones"` a las dos rutas existentes:

| Ruta | Tabla real | recurso.codigo | Estado |
|---|---|---|---|
| `admin.configuracion.index` | `integraciones` (id, nombre, proveedor, created_at) | `gestor_integraciones` | ✅ Conectada (identidad + semáforo mock) |
| `admin.configuracion.logins` | `integraciones` (mismo catálogo) | `gestor_integraciones` | ✅ Conectada (DataTable con semáforo mock) |

**Catálogo real creado (`integraciones`):**
```sql
CREATE TABLE integraciones (
  id          TEXT PRIMARY KEY,   -- formato real: "pct:wondersoft", etc.
  nombre      TEXT NOT NULL,       -- nombre de negocio, ej. "Wondersoft (QR)"
  proveedor   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
RLS activado + política mínima (authenticated). Datos: 8 integraciones reales (pct:, cpf:, bank., pds:).

**Distinción importante — catálogo real vs. métricas operativas pendientes:**

| Dato | Fuente actual | Estado |
|---|---|---|
| `id`, `nombre`, `proveedor` | **Tabla real `integraciones`** | ✅ Real |
| `salud` (ok/warning/error), `ultimaEjecucion`, `proximaEjecucion`, `ejecuciones`, `tiempoRestante`, `programacion` | **Mock de referencia** (hardcoded en componente) | ⏳ Pendiente sistema de monitoreo/cron real |
| Vista técnica (`ms-login-providers` v1.24.7, Redis/PostgreSQL IPs, versión, cron) | **Mock de referencia** (hardcoded) | ⏳ Pendiente sistema de monitoreo real |

> ⚠️ Las métricas operativas (semáforo, última/próxima ejecución, tiempo restante, conexiones Redis/PostgreSQL, estado del servicio) son **datos de REFERENCIA (mock)**. Provenirían de un sistema de monitoreo/cron real que **aún no existe**. No se crearon tablas para ellas porque llenarlas a mano sería "mock disfrazado de dato real" — más engañoso que el array actual. Quedan documentadas explícitamente como pendientes de un sistema de monitoreo/cron real, no solo de tabla.

**Implementación:**
- Capa de datos: `src/lib/api/integraciones.ts` + hook `src/hooks/useIntegraciones.ts`
- Mapper: `toIntegracion` en `src/lib/api/mappers.ts`
- Rutas: `admin.configuracion.index.tsx` (vista negocio + vista técnica), `admin.configuracion.logins.tsx` (DataTable)
- Ambas rutas: `PermissionGuard recurso="gestor_integraciones"` (antes sin protección alguna)
- Mock de métricas operativas marcado visualmente como "datos de REFERENCIA (mock)" en UI y comentado en código
- 8 integraciones reales sembradas en la tabla (pct:wondersoft, pds:pago_mis_cuentas, bank.bdc_conecta, cpf:coelsa_cpf, pct:coelsa_cpf, pct:coelsa_cvu, pct:coelsa_cvu, pct:coelsa_debin)

---

## 11. Sistema de Notificaciones — ⚠️ CAPA DE DATOS LISTA, RUTA AÚN EN MOCK

> **Corrección (auditoría final):** esta sección afirmaba que
> `admin.notificaciones.index` estaba conectado con CRUD completo y
> `PermissionGuard recurso="sistema_notificaciones"`. **Eso es FALSO en el
> código actual**: la ruta sigue 100% en mock (`eventosIniciales` hardcodeado),
> ningún archivo consume los hooks, y el guard nunca se aplicó. Se corrige el
> documento para reflejar la realidad. Lo construido y verificable hoy:

**Capa de datos construida (SIN consumidor):**

| Pieza | Archivo | Estado |
|-------|---------|--------|
| API eventos | `src/lib/api/eventos-notificacion.ts` | ✅ existe, ❌ sin uso |
| API canales | `src/lib/api/canales-notificacion.ts` | ✅ existe, ❌ sin uso |
| API códigos error | `src/lib/api/codigos-error.ts` | ✅ existe, ❌ sin uso |
| Hooks | `useEventosNotificacion`, `useCanalesNotificacion`, `useCodigosError` | ✅ existen, ❌ sin uso |

**Tablas reales (según diseño original de la conexión):**
`codigos_error` (~10 códigos reales sembrados desde capturas legacy,
audiencia default `tecnico`), `canales_notificacion` (Email/Telegram/WhatsApp),
`eventos_notificacion` (eventos+incidentes fusionados).

**Ruta:** `admin.notificaciones.index` — ❌ MOCK (`eventosIniciales`
hardcodeado). Layout `admin.notificaciones.tsx` = Outlet pelado, SIN guard.

**Pendiente para conectar (trabajo real pendiente, NO hecho):**
1. Reescribir `admin.notificaciones.index.tsx` contra `useEventosNotificacion`
   (CRUD + filtros server-side: Tipo, Estado entrega, Audiencia, Canal).
2. Aplicar `<PermissionGuard recurso="sistema_notificaciones">`.
3. Decidir destino del catálogo `codigos_error` (¿ruta propia o solo embebido?).

> ⚠️ Igual que antes: NO crear tablas para métricas operativas de envío (logs
> de entrega, reintentos, latencia) sin sistema de colas/monitoreo real.
> Catálogo `codigos_error` incompleto a propósito (solo los ~10 reales
> confirmados; los ~400 restantes requieren exportación del legacy).

---

## 12. Módulo Impuestos — conectado (4 rutas contra 7 tablas reales)

Se conectaron las 4 rutas del módulo (`admin.comercios.impuestos.*`) a las 7
tablas creadas por `supabase/migrations/0004_impuestos_completo.sql`
(ejecutada y verificada en producción). Todas usan
`PermissionGuard recurso="impuestos"` (un solo código de recurso para todo el
módulo).

| Ruta | Tabla(s) | Contenido |
|---|---|---|
| `admin.comercios.impuestos.index` | `impuestos` + `impuestos_alicuotas` (embebidas) | CRUD catálogo; detalle modal incluye sub-tabla de alícuotas con su propio CRUD |
| `admin.comercios.impuestos.usuarios` | `impuestos_asignaciones` (+ joins `impuestos`, `clientes`) | CRUD asignaciones; alta exige legajo formato LPF/LPJ-CUIT existente (FK real, error 23503 se traduce a mensaje claro); legajo no editable en edición |
| `admin.comercios.impuestos.ingresos-brutos(.index)` | `ib_padrones`, `ib_normalizacion_preview` | Alta padrón (impuesto activo + nombre + archivo), grilla con progreso/estado; normalización retroactiva preview-first; **Reportes de Impuestos sigue MOCK (badge "Demo")** |
| `admin.comercios.impuestos.debitos-creditos` | `dc_excepciones`, `dc_sync_retroactivo` | Alta excepción (dirección Ambos/Entrantes/Salientes), toggle estado, sync retroactivo preview-first con cards explicativas |

**Reglas de negocio implementadas:**

1. **Tipo="Ambos" en D/C** → el formulario ofrece Ambos/Entrantes/Salientes.
   Si se elige Ambos, `createDcExcepcionAmbos` inserta **2 filas**
   (una `direccion='Entrantes'`, una `'Salientes'`). La tabla solo acepta esos
   dos valores por CHECK — nunca se persiste 'Ambos'.
2. **Preview-first (IB normalización y D/C sync):** "Ver preview" crea/lee un
   registro con `aplicado=false` y muestra KPIs desde los JSON. NUNCA marca
   aplicado=true al ver el preview. Solo la acción explícita ("Aplicar" /
   "Confirmar ejecución" con confirmación intermedia) ejecuta
   `setNormalizacionAplicado(id,true)` / `setDcSyncRetroactivoAplicado(id,true)`.
   El INSERT de sync retroactivo fuerza `aplicado:false` server-side desde el
   frontend (la tabla tiene default false).
3. **CUIT de D/C**: validado frontend (11 dígitos, sin separadores) y por CHECK
   regex en BD. El error 23514 se traduce a mensaje entendible.
4. **Legajo de asignaciones**: string LPF/LPJ-CUIT (FK real a `clientes.legajo`,
   regla §9). El error FK 23503 se traduce: "El legajo no existe en clientes".

**Implementación:**
- Capa de datos: `src/lib/api/impuestos.ts` (impuestos, alícuotas,
  asignaciones, padrones, previews IB) y `src/lib/api/dc-excepciones.ts`
  (excepciones + sync retroactivo).
- Hooks: `useImpuestos`, `useAlicuotas`, `useImpuestosAsignaciones`,
  `useImpuestosForAsignacion`, `useIbPadrones`, `useIbNormalizacionPreviews`,
  `useLatestNormalizacionPreview` (en `src/hooks/useImpuestos.ts`);
  `useDcExcepciones`, `useDcSyncRetroactivos` (en `src/hooks/useDcExcepciones.ts`).
- Mappers nuevos en `mappers.ts`: `toImpuesto`, `toAlicuota`,
  `toImpuestoAsignacion`, `toIbPadron`, `toIbNormalizacionPreview`,
  `toDcExcepcion`, `toDcSyncRetroactivo`.
- Tipos nuevos en `types.ts`: `Impuesto*`, `Alicuota*`, `ImpuestoAsignacion*`,
  `IbPadron*`, `IbNormalizacionPreview*`, `DcExcepcion*` (con
  `TipoDcExcepcion = 'Alta manual'|'Convenio multilateral'|'Exención'` — distinto
  de `TipoImpuesto`), `DcSyncRetroactivo*`, `DireccionDcExcepcion`.

### Incidente documentado: permisos vacíos bloqueó TODOS los roles

Durante la conexión de este módulo se detectó que el seed original de
`permisos` hacía `CROSS JOIN roles × recursos` cuando `recursos` aún estaba
vacío → resultado silencioso: **0 filas en `permisos`**. Consecuencia: con el
modelo fail-closed de `<PermissionGuard>`, **todos los roles quedaban sin
permisos (incluido Admin)** y toda la app mostraba "Sin permiso" / botones
deshabilitados.

- Causa raíz: seed dependiente de otra tabla sembrada DESPUÉS, sin error
  visible (un CROSS JOIN sobre vacío produce vacío, no error).
- Corrección aplicada: re-seed explícito de la matriz completa:
  **7 roles ('Admin','Customer','Accounting','Management','User','Compliance',
  'Reader' — nombres capitalizados exactos de prod) × 9 recursos =
  63 filas en `permisos`.**
- Lección: cualquier seed nuevo de matriz debe verificar conteo > 0 post-run
  (o usar FK + NOT NULL + assert de cantidad). Documentar siempre el orden de
  seeding (roles → recursos → permisos).

### Fuera de alcance (queda mock)

- **Reportes de Impuestos** (dentro de ingresos-brutos.index): pertenece al
  módulo Administración → Reportes, actualmente bloqueado por inputs externos.
  Se muestra con badge "Demo".
- El procesamiento REAL de archivos de padrón (parser Excel→asignaciones) y el
  cálculo real de KPIs de normalización/sync: requieren backend/proceso ETL que
  no existe; hoy el preview se persiste como registro auditable con KPIs de
  referencia.

---

## 13. Pendientes conocidos

- `supabase db pull` real no se ejecutó (sin CLI/credenciales en este entorno);
  `0003_schema_produccion.sql` es el snapshot manual equivalente.
- Aún no se aplicaron guards a rutas de mock (`src/data/*`). Cuando se conecten
  a datos reales, aplicar `<PermissionGuard>` con el `recurso.codigo`
  correspondiente según la lista del punto 7 del mensaje original (alertas,
  soporte, módulos, configuración, compliance, etc.).
- ~~**RIESGO CONOCIDO — ficha de Clientes (`$legajo`) sin guard**~~ →
  **RESUELTO (ver §14).** La ficha ahora usa datos reales y
  `<PermissionGuard recurso="usuarios">`.

---

## 14. Ficha de cliente (`admin.general.usuarios.$legajo`) — conectada

Se resolvió el último gap de seguridad conocido: la ficha de detalle de un
cliente estaba en mocks (`lib/users`) **y sin `PermissionGuard`** (cualquier
usuario autenticado podía verla). Ahora:

- **Datos reales**: lee `clientes` por legajo (`getClienteByLegajo`, hook nuevo
  `useClienteByLegajo`), y sus relaciones:
  - Comisiones → `comisiones_cliente` por `cliente_id`
    (configuración arancelaria real, no cargos cobrados).
  - Movimientos recientes → `movimientos` por `legajo` (últimos 10).
  - Impuestos asignados → `impuestos_asignaciones` por `cliente_legajo`.
- **Guard**: `<PermissionGuard recurso="usuarios">` (mismo recurso que el
  listado; misma entidad de negocio).
- **Acciones**: Suspender/Reactivar con confirmación, gated por
  `can("modificar", "usuarios")`; invalida `["clientes"]`.

### Auditoría previa (mock vs. tabla real) — mismatches encontrados

De ~30 campos del mock (`UserData`), solo ~8 tienen fuente real. Se descartó
reutilizar `UserModal` porque habría obligado a seguir inventando datos.

| Mock | Realidad DB | Resolución |
|---|---|---|
| CUIT "20-12345678-9" (con guiones) | CHECK `^[0-9]{11}$` sin separadores | Se muestra el CUIT real |
| 9 estados ("Activado", "Registrado", "Pre-activado"…) | Solo `activo/suspendido/rechazado` | Mapeo directo a los 3 reales |
| `nombre` + `apellido` separados | Una sola columna `nombre` | Se usa `nombre` |
| Legajo derivado vía `legajoDesdeCuit()` sobre CUIT con guiones | Legajo LPF/LPJ-CUIT11 almacenado (invariante `legajo_deriva_de_cuit`) | Se usa el legajo almacenado |
| Subcuentas + movimientos por subcuenta | NO existe tabla `subcuentas` (verificado en migraciones) | Sección eliminada |
| Documentos, validaciones automáticas, alertas/bloqueos/parámetros, dirección, género, PEP, entidad | Sin tablas asociadas | No se muestran (nota visible en UI lo aclara) |
| Comisiones como cargos cobrados ("$1.250 por transferencia") | `comisiones_cliente` = configuración arancelaria | Se renderiza la config real (modalidad/%/fijo/%IVA/estado) |

### Nota

El botón "Ver detalle" del listado de Clientes ya navegaba a `$legajo`; no se
necesitaron cambios de navegación. Los mocks de `lib/users.ts` siguen usados
por otras pantallas aún no conectadas (no se borraron en esta pasada).

---

## 15. Sub-rutas de Movimientos — conectadas (7 rutas, 1 componente compartido)

Las 7 sub-rutas de `/admin/general/movimientos` pasaron de mock
(`getClientePorUsuario` / `impuestosIniciales` / `desgloseDemo`) a datos reales
reutilizando `listMovimientos` (misma lógica de query que el índice general,
sin duplicar):

| Ruta | Filtro server-side | Notas |
|---|---|---|
| `…movimientos.depositos` | `tipo = 'deposito'` | Mapeo directo |
| `…movimientos.retiros` | `tipo = 'retiro'` | Mapeo directo |
| `…movimientos.pagos-tarjeta` | `tipo = 'tarjeta'` | Campos `medioPago`/`cuotas` del mock NO existen en la tabla → descartados (documentado en la descripción de la ruta) |
| `…movimientos.pagos-qr` | `tipo = 'pago_pct'` | `qrIdTx`→`id_txn`; `cuitMerchant`→`clientes.cuit` |
| `…movimientos.cobros-qr` | `tipo = 'cobro_pct'` | `montoTotal`→`monto_operacion`, `montoNeto`→`monto_cobrado`; `tipoQr`/`estadoQr` sin fuente → descartados; comisión y neto visibles en el detalle |
| `…movimientos.impuestos` | **NO es un tipo**: `conImpuesto: true` (`impuesto > 0`) sobre TODOS los tipos | Vista transversal de la columna `impuesto` (retención al cliente); banner explica que no hay desglose por nombre/tipo de impuesto |
| `…movimientos.comisiones` | **NO es un tipo**: `conComision: true` (`comision > 0`) sobre TODOS los tipos | Vista transversal de comisiones cobradas. El mock calculaba comisión/IVA/total con tasas demo (`desgloseDemo`); la tabla real ya los tiene almacenados por fila (`comision`, `impuesto`, `monto_cobrado`). Campo `modalidad` del mock: es configuración (`comisiones_cliente.modalidad`), no existe por movimiento → descartado |

**Robustez de los filtros transversales (NULL / 0):**
- `movimientos.impuesto` y `movimientos.comision` son
  `numeric not null default 0` (`0003_schema_produccion.sql:126-127`) → una fila
  NULL es imposible a nivel de esquema.
- Los predicados generados son `> 0`: filas con valor 0 (p.ej. cliente con
  retención/comisión en 0) quedan excluidas de las vistas correspondientes.
  (Doble cobertura: aun si NULL existiera, `NULL > 0` evalúa NULL ≠ true.)

**Implementación:**
- Componente compartido nuevo: `src/components/movimientos-subroute.tsx`
  (`MovimientosSubRoute { titulo, descripcion, tipoCode?, soloConImpuesto?,
  soloConComision? }`).
- API extendida (sin duplicar): `listMovimientos` acepta `conImpuesto?: boolean`
  → `.gt("impuesto", 0)` y `conComision?: boolean` → `.gt("comision", 0)`.
- **Filtro de Estado por sub-ruta**: con tipo fijo se usa `estados_por_tipo`
  (join client-side con el catálogo `estados_movimiento`) para ofrecer solo los
  estados válidos de ese tipo, tanto en el filtro como en las opciones destino
  del cambio de estado. En las vistas transversales (impuestos, comisiones) se
  ofrece el catálogo completo (la RPC valida igual server-side).
- **Guard**: `<PermissionGuard recurso="movimientos">` en las 7 (mismo recurso
  que el índice).
- Estándar completo: paginación server-side (`countMode: "estimated"`),
  búsqueda con debounce, loading/error/vacío explícitos, acciones Ver detalles /
  Cambiar estado (gated por `can("modificar","movimientos")`, vía RPC
  `cambiar_estado_movimiento`) / Ver movimientos del cliente.
- Columnas numéricas condicionales: "Retención impuesto" visible solo en la
  vista de impuestos; "Comisión cobrada" + "IVA sobre comisión" + "Monto
  cobrado" visibles solo en la vista de comisiones.
