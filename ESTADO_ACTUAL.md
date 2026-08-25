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
- **DECISIÓN DE SEGURIDAD INTENCIONAL (confirmada):** `movimientos` NO tiene
  políticas de INSERT/UPDATE para `authenticated`, y así debe seguir:
  *movimientos nunca debe tener INSERT/UPDATE abierto para authenticated —
  todo cambio pasa por RPC controlada (`cambiar_estado_movimiento`,
  SECURITY DEFINER), nunca por escritura directa del cliente.* La ausencia
  de esas políticas NO es un gap de RLS pendiente: es el diseño correcto,
  y cualquier auditoría futura debe tratarla como tal.

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
- ⚠️ **Corrección (verificado contra `information_schema` en producción):**
  `movimientos.impuesto` y `movimientos.comision` son
  `numeric NOT NULL, SIN default` — cada INSERT debe calcular el valor
  explícitamente. Una afirmación previa de este documento ("default 0",
  tomada del texto hoy desalineado de `0003_schema_produccion.sql:126-127`)
  era incorrecta respecto a producción.
- La ausencia de default es **decisión intencional en campos fiscales**:
  preferimos que un INSERT sin estos valores falle fuerte antes que guardar
  silenciosamente 0.
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

---

## 16. Consolidación del schema — `0005_consolidacion_schema_real.sql` (FUENTE DE VERDAD)

Reconstrucción verbatim del estado real de producción (2026-08-23) desde
`information_schema.columns`, `pg_constraint`, `pg_policies`, `pg_indexes`,
`pg_proc` y `pg_get_viewdef`, exportados por el cliente en CSV. Las migraciones
0001-0004 quedan en el repo **con cabecera de desalineadas**; para reconstruir
un entorno nuevo, la referencia estructural es 0005 (no aplicar sobre prod:
documenta lo ya existente).

**26 tablas + 1 vista** (`auditoria_legajos`), 104 constraints con nombres reales,
23 políticas RLS en 3 patrones (admin-gated / authenticated ALL / SELECT-only),
índices y funciones verbatim.

### Hallazgos de la auditoría de schema real

| # | Hallazgo | Impacto | Estado |
|---|---|---|---|
| GAP-1 | La RPC `cambiar_estado_movimiento` nunca existió en producción — **RESUELTO**: 0006 aplicada y verificada el 2026-08-23 (ver INCIDENTE + Cierre abajo) | Botón "Cambiar estado" operativo nuevamente; verificación post-aplicación incluyó exposición vía PostgREST y rechazo de autorización a llamadas sin usuario | ✅ **RESUELTO 2026-08-23** |
| GAP-2 | `handle_new_admin_user()` insertaba sobre `admin_users.rol` (columna eliminada; hoy `rol_id`) — **RESUELTO**: 0007 aplicada y verificada el 2026-08-23 (ver Resolución abajo) | Trigger de signup vivo y roto + conflicto descubierto con `crear-admin`; ambos caminos de alta quedaron operativos (V1/V2 verdes + Edge deployada) | ✅ **RESUELTO 2026-08-23** |
| GAP-5 | **4 tablas consultadas por la capa API NO existían en producción** (PGRST205 verificado por sondeo REST): `integraciones`, `canales_notificacion`, `eventos_notificacion`, `codigos_error` | `admin.configuracion.index` y `admin.configuracion.logins` consumen `useIntegraciones` → **rotas** al cargar. Las 3 de Notificaciones sin consumidor activo (módulo pausado) | ✅ **RESUELTO 2026-08-24** (0009 aplicada pieza a pieza, P0-P3 verdes; V5 pendiente de sesión viva) |
| ANOM-1 | Índice duplicado real: `movimientos_legajo_idx` ≡ `idx_movimientos_legajo` | Solo costo de escritura | 🟡 Cosmético |
| ANOM-2 | `conciliaciones.monto_diferencia` es **nullable** en prod (migraciones decían `not null default 0`) | Corregido documental; sin acción DDL decidida | ✅ Documentado |
| ANOM-3 | Vista `auditoria_legajos` sin `security_invoker` (reloptions = null, confirmado 2026-08-23) — **RESUELTO**: ALTER VIEW aplicado el mismo día (ver Resolución abajo) | Bypass owner-privilege cerrado; verificación discriminante: sondeo anon pasó de `200 []` a error de servidor (invoker activo) | ✅ **RESUELTO 2026-08-23** |
| GAP-4 | Auto-recursión RLS en el patrón admin-gated — **RESUELTO**: 0008 aplicada pieza a pieza el 2026-08-23 (ver Resolución abajo) | Recursión `42P17` eliminada; `is_admin()` como único punto de verdad del predicado admin-gated; vista endurecida plenamente utilizable | ✅ **RESUELTO 2026-08-23** (verificación con admin real: pendiente primera sesión viva) |
| CONF-1 | `movimientos.comision/impuesto`: NOT NULL **sin default** en prod | Confirmado contra `information_schema`; §15 corregido | ✅ Verificado |
| CONF-2 | `movimientos` tiene UNA sola política (SELECT admin-gated); sin INSERT/UPDATE = diseño intencional (§5) | Confirmado contra `pg_policies` | ✅ Verificado |
| CONF-3 | REVOKE UPDATE/DELETE sobre `movimientos_transiciones`: **VIGENTE** — sondeo REST como anon devolvió `42501 permission denied for table movimientos_transiciones` | La capa append-only por privilegios está activa además de la política RLS | ✅ Verificado |
| PEND-2 | `admin_users.rol_id` nullable → **RESUELTO**: `ALTER COLUMN rol_id SET NOT NULL` aplicado y verificado el 2026-08-23 (`is_nullable = NO` vía information_schema) | Integridad de la FK lógica rol garantizada a nivel DDL | ✅ **RESUELTO 2026-08-23** |

### Incidente documentado: RPC `cambiar_estado_movimiento` nunca existió en producción (GAP-1)

Durante la consolidación del schema real (2026-08-23) se detectó que la RPC que
soporta el cambio manual de estado de movimientos **nunca fue creada en
producción**, aunque el panel y su documentación la daban por operativa.

- **Qué se rompió:** el botón "Cambiar estado" de Movimientos (índice y las 7
  sub-rutas). Cadena: UI → Edge Function `cambiar-estado-movimiento` →
  `rpc("cambiar_estado_movimiento")` → **función inexistente** → error.
- **Impacto real conocido:** la funcionalidad de cambio manual de estado
  **lleva rota en producción desde que se implementó** y nadie lo detectó
  porque nunca se probó en vivo contra prod. No es un riesgo teórico ni una
  degradación parcial: cada uso real del botón falló/fallaría con error desde
  el día uno. Que ya tengamos el diagnóstico y el fix propuesto no reduce el
  impacto: estuvo roto todo ese tiempo sin saberlo.
- **Desde cuándo:** desde la implementación de la acción de cambio de estado
  en el panel (la DDL candidata vive en `0002_movimientos_transiciones.sql`,
  que solo existe como archivo — nunca se aplicó esa parte a prod).
- **Cómo se detectó:** export completo de `pg_proc` durante la auditoría de
  schema (solo existen 6 funciones públicas; ninguna es la RPC) + sondeo
  directo a la API REST con la firma exacta `(p_comentario,
  p_movimiento_id, p_nuevo_estado_id)` → HTTP 404 `PGRST202 "Could not find
  the function public.cambiar_estado_movimiento(...) in the schema cache"`.
- **Por qué no se había notado:** el panel aún no tiene usuarios reales ni
  uso operativo en producción; ninguna sesión anterior ejecutó el botón
  contra prod.
- **Fix propuesto (NO aplicado):** `0006_fix_rpc_cambiar_estado.sql` con la
  DDL verbatim de 0002. Requiere aprobación explícita y aplicación manual.
  Mientras esté abierto, cualquier flujo que dependa del cambio manual de
  estado debe considerarse roto en prod.
- **Lección:** toda DDL "candidata" debe trazarse con estado
  (aplicada/no-aplicada) y verificarse post-aplicación contra el catálogo
  (`pg_proc`/`information_schema`), igual que los seeds (lección del
  incidente de permisos).

### Cierre del incidente GAP-1 (RESUELTO el 2026-08-23)

**Causa raíz real:** el primer `CREATE FUNCTION` nunca llegó completo a la base —
al pegar el bloque en el SQL Editor se cortó a mitad del statement (no fue un
problema de proyecto equivocado ni de caché de PostgREST). La re-aplicación
completa de `0006_fix_rpc_cambiar_estado.sql` (v2) en el proyecto
`doqghevvrfufsynwkzxj` resolvió el incidente.

**Evidencia de cierre (4 sondas independientes):**

| # | Verificación | Resultado |
|---|---|---|
| 1 | `SELECT proname FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname LIKE 'cambiar%'` (SQL Editor) | **1 fila**: `cambiar_estado_movimiento` |
| 2 | Sondeo REST GET `/rest/v1/rpc/cambiar_estado_movimiento` | 404 PGRST202 pero con hint *"Perhaps you meant to call the function public.cambiar_estado_movimiento(p_comentario, p_movimiento_id, p_nuevo_estado_id)"* — ese hint solo existe cuando la función **está en el schema cache** de PostgREST |
| 3 | Sondeo REST POST con JSON malformado | **HTTP 400** (parse error) — antes de existir devolvía 404 PGRST202 |
| 4 | Sondeo REST POST con firma exacta, como anon | **HTTP 401** — la función **se ejecutó** y su guard interno rechazó al anon (`auth.uid() = null` → excepción `42501 'No autenticado'`, mapeada por PostgREST a 401): comportamiento exactamente esperado del guard admin |

Control paralelo durante todo el sondeo: `GET /rest/v1/estados_movimiento` → 200 `[]`
(canal anon sano; el `[]` es lo esperado porque su RLS es SELECT TO authenticated).

**Versión aplicada (v2, diferencias vs DDL original de 0002):** A1
`lower(r.nombre) = 'admin'` (inmune a capitalización, igual que políticas RLS);
A2 retorno incluye `estado_anterior`; A3 guard temprano no-op cuando el nuevo
estado es igual al actual. Detalle completo en la cabecera de `0006`.

**Estado: INCIDENTE CERRADO.** La RPC quedó restaurada y verificada (existe,
está expuesta en PostgREST y su guard rechaza correctamente a anónimos). La
lección queda reforzada: la verificación obligatoria post-aplicación (query de
cabecera de 0006) detectó en minutos que la primera aplicación no había
aterrizado.

**Corrección de honestidad sobre esta cierre:** el párrafo original decía que
el botón "vuelve a estar operativo end-to-end". Era falso y no debí escribirlo:
un sondeo posterior reveló que la Edge Function `cambiar-estado-movimiento`
**nunca estuvo deployada** (el gateway devolvía `404 NOT_FOUND` para ambas
funciones del repo). Con la RPC sola, el botón seguía roto. La cadena se
completó el mismo 2026-08-23 con el primer deploy de la Edge (verificado:
OPTIONS → `200 "ok"`, POST `{}` → error JSON propio del handler llegando a la
RPC). Fin-to-end real recién ahí; la prueba definitiva será el primer uso vivo.

### Resolución GAP-2 (2026-08-23): trigger de alta de admins apuntando a columna eliminada

**Causa raíz:** el refactor `rol` → `rol_id` nunca migró la función del trigger.
Con el trigger VIVO (`on_auth_admin_user_created`, confirmado con salida verbatim
de `pg_trigger`), **ambos caminos de alta estaban muertos por la misma causa**:

1. *Signup directo*: el insert en `auth.users` disparaba la función rota → error.
2. *Edge `crear-admin`* (`supabase/functions/crear-admin/index.ts`): su paso 2
   (`auth.admin.createUser`, L83) dispara el mismo trigger; y aunque el trigger
   no rompiera, el insert posterior de la Edge (L101, sin manejo de conflicto)
   chocaría contra la fila fantasma del trigger → duplicate key `23505` → el
   rollback coordinado (L112) **borra el usuario recién creado**. Bucle de fallo
   garantizado, no simple "pisado de rol".

**Fix aplicado — `0007_fix_gap2_anom3.sql` Sección 1** (decisiones aprobadas):
B1 default `'Reader'` cuando el meta no trae rol (el viejo `'operador'` no existe
en el catálogo real); B2 `RAISE EXCEPTION` si ni el rol pedido ni Reader existen
(falla ruidosa, jamás `rol_id` NULL); B3 insert con columnas explícitas y
`v_rol_id roles.id%TYPE`; **B4 opt-out**: si `raw_user_meta_data.admin_via_edge
= 'true'`, el trigger retorna sin insertar — la Edge escribe su fila autoritativa
(rol resuelto exacto, legajo UPPERCASE, `activo: true`) sin colisión posible.
Edición acompañante: L87 de la Edge agrega `admin_via_edge: true` al metadata.

**Verificaciones post-aplicación (todas verdes):**
| # | Verificación | Resultado |
|---|---|---|
| V1 | `pg_get_functiondef('public.handle_new_admin_user()'::regprocedure)` | Contiene `rol_id` + guard `admin_via_edge`; sin rastro de la lista vieja `(id, legajo, email, nombre, rol)` |
| V2 | Trigger query | `on_auth_admin_user_created`, `tgenabled = 'O'` |
| V3 | Sondeo runtime `/functions/v1/crear-admin` post-deploy | OPTIONS → `200 "ok"`; POST `{}` → `400 {"error":"Faltan email, password o nombre"}` (handler vivo) |

La Edge `crear-admin` recibió su **primer deploy** el 2026-08-23. Pendiente
behavioral definitivo: primera alta real de admin.

### Resolución ANOM-3 (2026-08-23): vista auditoria_legajos endurecida

Evidencia previa pegada verbatim: `reloptions = null`. Aplicado
`ALTER VIEW public.auditoria_legajos SET (security_invoker = true);`
(verificación discriminante: sondeo anon pasó de `HTTP 200 []` a error de
servidor — el flip prueba que el invoker activó; el error específico destapó
GAP-4, ver abajo). Cambio de comportamiento aceptado: no-admins obtienen
error/denial al consultar la vista; los admins la leerán normal una vez
reparadas las políticas de GAP-4.

### GAP-4 (nuevo hallazgo, 2026-08-23): auto-recursión RLS en el patrón admin-gated

Sondas como anon tras endurecer la vista:

```
admin_users        → HTTP 500 42P17 "infinite recursion detected in policy for relation admin_users"
clientes           → HTTP 500 42P17 (misma raíz)
comisiones_cliente → HTTP 500 42P17 (misma raíz)
```

Las políticas usan el patrón inline `EXISTS (SELECT 1 FROM admin_users au JOIN
roles ...)`; la de `admin_users` se autorreferencia → recursión infinita en
cualquier evaluación RLS. **Invisible desde siempre** porque todas las lecturas
del panel van por Edge Functions con SERVICE_ROLE (bypasea RLS) y nadie había
consultado estas tablas por camino RLS directo.

- **Impacto:** cualquier futura query directa cliente→Supabase autenticada sobre
  esas 3 tablas revienta con 500; la vista endurecida devuelve error a admins
  hasta que esto se repare.
- **Fix propuesto (0008, NO escrito aún):** helper `public.is_admin()` returns
  boolean `LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'`
  (rompe la recursión por construcción) + reescritura de las 6 políticas
  (ALL+SELECT × 3 tablas) para usarlo. Requiere propuesta formal, revisión y
  aplicación pieza a pieza como 0007.
- **Estado: 🔴 PENDIENTE** — siguiente ítem de la agenda tras PEND-2.

### Resolución GAP-4 (2026-08-23): recursión RLS eliminada con helper `is_admin()`

**Causa raíz:** políticas admin-gated con el predicado inline duplicado
(`EXISTS (SELECT 1 FROM admin_users au JOIN roles ...)`) — la de la propia
`admin_users` se autorreferenciaba y reventaba cualquier evaluación RLS que
la alcanzara, directa o transitivamente (clientes, comisiones_cliente y la
vista endurecida heredaban el 500 por tocar `admin_users`).

**Fix aplicado — `0008_fix_recursion_rls.sql`, pieza a pieza:**

| Pieza | Contenido | Verificación |
|---|---|---|
| P0 | Helper `public.is_admin()` (`LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'`) + COMMENT | V0: `prosecdef=true`, `provolatile='s'`, `search_path=public` ✓; sonda intermedia: baseline intacto (nada usaba el helper aún) |
| P1 | admin_users: drop autotargeteado (solo políticas cuya expresión referencia `admin_users`) + recreate `manage_admins`/`select_all_admins` con `is_admin()`; **`select_own` preservada intacta** | V1 real: 3 filas exactas. Doble ejecución accidental sin daño (segunda pasada no encontró qué dropear y falló limpio en CREATE existente) |
| P2 | clientes → `clientes_admin_all` / `clientes_admin_select` | V2 real ✓ |
| P3 | comisiones_cliente → `comisiones_cliente_admin_all` / `_select` | V3 real: 7 filas totales, cero EXISTS inline restante |
| P4 | Sondeo final agente | Las 4 endpoints en `200 []`; control `estados_movimiento` sano |

**Hallazgo durante P1 (mejor a lo previsto):** el flip fue global ya con P1 —
defusado el nodo autorreferencial, las políticas de las otras tablas dejaron
de recursar aunque aún tuvieran el EXISTS inline. P2/P3 se completaron igual
por decisión del revisor: eliminar lógica duplicada, único punto de verdad.

**Sobre `select_own`:** excluida del fix con fundamento documentado — expresión
pura (`auth.uid() = id`) sin subquery, no participa de la recursión (hipótesis
del revisor confirmada); no puede evitar el 500 sola porque SELECT evalúa en
OR todas las políticas aplicables.

**⚠️ Pendiente explícito NO probado:** todas las verificaciones son como
anon (`[]` = políticas resueltos falso). Que `is_admin()` devuelve `true`
para un admin real con sesión viva —y que por lo tanto admins ven datos y
escriben— **queda pendiente de la primera sesión viva**, igual que las altas
de admin (0007). No dar por probado lo que solo está estructuralmente verde.

### Catálogos semilla fuera de alcance de 0005
0005 documenta estructura únicamente. Para un clone fresco habrá que sembrar
además: `roles`, `recursos`, `permisos` (matriz), `estados_movimiento`,
 `estados_por_tipo`, `codigos_categoria`. **Corrección 2026-08-24**: `codigos_error`
e `integraciones` SÍ se crearon en producción mediante `0009` (GAP-5 resuelto);
junto con `canales_notificacion` y `eventos_notificacion`. El sondeo PGRST205 de
GAP-5 había probado que ninguna existía; hoy las 4 existen (con seeds reales de
6 integraciones y 10 códigos de error). Los "8 integraciones reales" del
 párrafo original se recortaron a 6 confirmadas por el revisor (las 2 restantes
 no tenían evidencia de captura); los "10 códigos de error reales" son los de
 `CODIGOS_ERROR_SEED` (sin inventar los ~400 restantes).

### Cierre del incidente GAP-5 (2026-08-24): 4 tablas fantasma creadas en producción

**Causa raíz:** las 4 tablas (`integraciones`, `codigos_error`,
`canales_notificacion`, `eventos_notificacion`) fueron documentadas como creadas
en sesiones anteriores pero **jamás se versionaron ni aplicaron** a este proyecto
Supabase. Root cause idéntico al de GAP-1: DDL "candidata" que vivía solo como
archivo/snippet y nunca aterrizó en la base (patrón de proyecto/pestaña
equivocada). El sondeo REST lo confirmó de forma determinante: `404 PGRST205`
("Could not find the table") para las 4, y `information_schema.columns` devolvía
cero filas. No hubo pérdida de datos de negocio reales — los contenidos vivían
solo en fixtures de código (`CODIGOS_ERROR_SEED`, `CANALES_NOTIFICACION_SEED`,
`INTEGRACIONES`).

**Impacto real conocido:**
- `admin.configuracion.index` y `admin.configuracion.logins` consumen
  `useIntegraciones` → **rotas al cargar** (PGRST205) hasta hoy.
- Las 3 tablas de Notificaciones (`codigos_error`, `canales_notificacion`,
  `eventos_notificacion`) tenían capa de datos + hooks construidos (§11) pero
  **sin consumidor activo** (módulo pausado); el PGRST205 las habría roto igual
  si se conectaban.

**Fix aplicado — `0009_crear_tablas_faltantes_gap5.sql`, pieza a pieza:**

| Pieza | Tabla | Semilla | Verificación |
|---|---|---|---|
| P0 | `integraciones` | 6 integraciones reales (Wondersoft, Pago Mis Cuentas, BDC Conecta, COELSA CPF/CVU/DEBIN) | V0: `SELECT count(*) = 6` ✓ |
| P1 | `codigos_error` | 10 códigos reales (de `CODIGOS_ERROR_SEED`) | V1: `SELECT count(*) = 10` ✓ |
| P2 | `canales_notificacion` | sin seed (config runtime) | V2: 7 columnas exactas ✓ |
| P3 | `eventos_notificacion` (+FK `codigos_error.id`, índices) | sin seed | V3: 12 columnas + 1 FK resuelta sin ambigüedad ✓ |

- RLS: patrón B del proyecto (`authenticated ALL true`) en las 4.
- Trigger `set_updated_at()` (ya existente en prod) en las 4.
- `codigos_error`: CHECK `audiencia` (tecnico/admin/cliente) y `canal_defecto`
  (Email/Telegram/WhatsApp); dominios calzados 1:1 con `types.ts`.
- `eventos_notificacion`: única FK `codigo_error_id → codigos_error(id)` (nullable)
  → el embed `codigos_error(codigo, mensaje)` resuelve sin ambigüedad.
- Seeds acotados a lo **confirmado en código/capturas**: 6 integraciones (no las
  8 del borrador, sin evidencia) y 10 códigos (NO los ~400 inventados).

**Sondeos V4 (flip anon 404→200) por pieza:** `GET /rest/v1/{tabla}?limit=1`
pasó de `404 PGRST205` a `200 []` para las 4 (verificación estructural de
PostgREST cache tras cada pieza).

**⚠️ Pendiente explícito NO probado (V5):** la verificación end-to-end de que
`admin.configuracion.index` y `admin.configuracion.logins` cargan su listado
real sin error (antes PGRST205) **queda pendiente de la primera sesión viva de
admin** en el navegador. La estructura está verde (V0-V4), pero no se da por
probado lo que solo está estructuralmente verde — igual que GAP-4/0007.

---

## 17. Incidente: módulo Alícuotas roto en lectura y escritura (typo de estado)

**Fecha:** 2026-08-24 | **Estado:** ✅ RESUELTO (código alineado a prod, tsc/lint verdes)

### Causa raíz
El código que consulta y escribe `impuestos_alicuotas.estado` usaba el valor
`"Activa"` / `"Inactiva"` (con la `a` final), pero el `CHECK` real de producción
es `Activo` / `Inactivo` (fuente de verdad `0005_consolidacion_schema_real.sql:391-392`,
`impuestos_alicuotas_estado_check CHECK (estado = ANY (ARRAY['Activo'::text,
'Inactivo'::text]))`). El `CHECK` `"Activa"/"Inactiva"` venía de `0004_impuestos_completo.sql`
(línea 69), que está **marcado como DESALINEADO con producción desde su cabecera**
(0004:1-6) y no debe usarse como referencia. El código de la app se escribió
contra ese `0004` equivocado → desalineado con prod. Es el mismo patrón de
desalineación ya documentado en §16.

### Impacto (lectura Y escritura rotas en Alícuotas)
- **Escritura:** `createAlicuota` (default `estado: input.estado ?? "Activa"`) y
  `setAlicuotaEstado(estado: "Activa" | "Inactiva")` mandan `"Activa"/"Inactiva"`
  → violan el `CHECK` → error `23514` al guardar en producción.
- **Lectura:** el filtro `listAlicuotas` hace `eq("estado", estado)` con el tipo
  `"Activa"/"Inactiva"`; si la UI envía `"Activa"`, no matchea las filas `Activo`
  de prod → grilla de alícuotas vacía.
- El catálogo `impuestos` (no alícuotas) ya usaba `Activo/Inactivo` correcto en
  todo el código; solo `impuestos_alicuotas` tenía el typo.

### Detección
Sondeo manual al sembrar `impuestos_alicuotas`: `INSERT ... estado='Activa'`
falló por `CHECK`, y al auditar si el mismo typo existía en el código se
encontró que **toda la capa Alícuotas** (tipos, API y UI) usaba `"Activa"/"Inactiva"`.
`tsc` lo confirmó: `admin.comercios.impuestos.index.tsx` (archivo `.tsx`, no
`.ts`, por eso escapó al primer grep) tipaba el form contra `"Activa" | "Inactiva"`
incompatible con el tipo ya corregido de la API.

### Fix aplicado (commit posterior a este documento)
Alineación `"Activa" → "Activo"` y `"Inactiva" → "Inactivo"` en los 4 archivos:
- `src/lib/api/types.ts` (tipos `AlicuotaRow`, `Alicuota`, `AlicuotaInput`, `AlicuotaFilters`)
- `src/lib/api/impuestos.ts` (filtro, default de `createAlicuota`, param de `setAlicuotaEstado`)
- `src/data/impuestos.ts` (mock `Alicuota` + datos de ejemplo)
- `src/routes/admin.comercios.impuestos.index.tsx` (form, badge, toggle, `<option>`)

### Verificación
- `npx tsc --noEmit`: exit 0 (antes fallaba con TS2322/TS2367 en la ruta UI).
- `npx eslint` sobre los 4 archivos: exit 0.
- Confirmación de negocio: el seed de `impuestos_alicuotas` (bloque B) corre con
  `estado='Activo'`/`'Inactivo'` y devuelve `count = 4` en producción.

---

## §18 — Restauración de tabs del detalle de cliente (persona física/jurídica)

### Reporte
El usuario reportó que en el detalle de usuario ("persona física y jurídica") existía
una "estructura tabular muy completa" en la primera versión (con tabs: datos
personales, subcuentas, documentos, etc.) y que "ahora mismo eso no existe". Alcance
acordado: **UI + crear las tablas de respaldo que faltaban**. Regla del usuario: si
no hay datos de alguna parte, salir vacío, pero **no modificar la estructura de la v1**.

### Hallazgo de auditoría
- La v1 (`src/components/user-modal.tsx`, `UserModal`) usaba **datos mock**
  (`MOCK_HISTORIAL`, `user.subcuentas`/`user.documentos` eran arrays hardcodeados).
  Por eso la ficha conectada actual decía "los datos del mock anterior no tienen
  tablas asociadas". O sea: las tablas `subcuentas`/`documentos` **nunca existieron
  en el schema real** (no aparecen en ninguna migración previa; verificado en prod
  vía `information_schema`: 0 filas).
- La v1 tenía 9 tabs: `identificacion, contexto, validaciones, riesgo, modulos,
  financiero, documentos, subcuentas, historial`.

### Fix aplicado
- **Migración `0010_crear_subcuentas_documentos.sql`** (aplicada en prod, sin errores):
  - `subcuentas` (hijo de `clientes.legajo` FK ON DELETE CASCADE) con columnas
    alineadas al tipo `Subcuenta` de la v1 (saldo_disponible/retenido/conciliado,
    tipo enum `Operativa/Recaudacion/Garantias/Sueldos`, estado `Activa/Pausada`).
  - `documentos` (hijo de `clientes.legajo`) con `tipo` enum
    `id_frente/id_dorso/servicio/selfie`, `url`, `label`.
  - RLS **admin-gated**, idéntico al patrón de `clientes` (0005:793-809):
    `select` + `all` policies con `EXISTS (admin_users JOIN roles WHERE lower(r.nombre)='admin')`.
- **Capa de datos nueva:**
  - `src/lib/api/subcuentas.ts` (`listSubcuentas`, `createSubcuenta`).
  - `src/lib/api/documentos.ts` (`listDocumentos`, `createDocumento`, `DOCUMENTO_LABELS`).
- **`src/routes/admin.general.usuarios.$legajo.tsx`** reescrita con las 9 tabs de la v1:
  - `identificacion`: grupos Datos personales / Empresa (solo jurídica) / Compliance,
    mapeando campos reales de `clientes`; el resto (`dirección`, `género`, `PEP`,
    empresa, etc.) muestra `—` (sin fuente real todavía).
  - `contexto`: sub-tabs Movimientos / Impuestos (reusa queries existentes).
  - `subcuentas` / `documentos`: tablas con alta (form inline) contra las nuevas tablas.
  - `validaciones` / `riesgo` (sub-tabs Alertas/Bloqueos) / `modulos` / `historial`:
    estructura preservada de la v1, con `—`/vacío (sin tabla de respaldo aún).
  - `financiero`: Comisiones (reusa sección existente).
  - Se preserva toda la funcionalidad previa: cambio de estado (suspender/reactivar),
    manejo de loading/error/not-found, y las tabs Movimientos/Impuestos/Comisiones.

### Verificación
- `npx tsc --noEmit`: exit 0.
- `npx eslint` sobre los 3 archivos ts/tsx: exit 0 (32 errores de formato prettier
  corregidos con `--fix`).
- Migración `0010` ejecutada en prod sin errores (es `if not exists`, idempotente).

### Pendiente / nota
- Las tabs `validaciones`, `riesgo`, `modulos`, `historial` **no tienen tabla de
  respaldo real en prod** (auditoría: la única vista parecida, `auditoria_legajos`,
  es "tabla vacía, sin PK ni lógica: no conectar" según `0003:25`/`0005:577` y sirve
  para detectar legajos inválidos, no es log de cambios). En la v1 eran 100% mock
  (`getHistorial`→`MOCK_HISTORIAL`, `user.validacionesAutomaticas`, `DEFAULT_MODULOS`
  + random). Por eso se renderizan **estructuradas pero vacías**, fiel a la v1
  (DataTable con columnas, sub-tabs, botones Editar/Recargar/Ir a alertas con
  navegación real a `/admin/general/alertas`, `/admin/general/alertas/bloqueos`,
  `/admin/general/alertas/parametros-*`, `/admin/modulos`).
- **Historial de movimientos** SÍ está cableado a datos reales: reusa
  `movimientosQuery` (tabla `movimientos` real). **Historial de cambios** queda vacío
  (no existe log de cambios de cliente en prod).
- Si el usuario quiere datos no vacíos en `validaciones`/`riesgo`/`modulos`/`historial
  de cambios`, hay que crear las tablas de respaldo correspondientes (fuera de
  alcance de este arreglo; requeriría nueva migración + seed).

### Segunda iteración: tablas de respaldo para ver datos (0011) — PENDIENTE APLICAR
- El usuario pidió "creemos esas tablas para ver los datos" en `validaciones`/
  `riesgo`/`modulos`/`historial`. Se crearon:
  - `supabase/migrations/0011_crear_tablas_detalle_cliente.sql`: 5 tablas hijas de
    `clientes.legajo` (FK ON DELETE CASCADE, RLS admin-gated idempotente vía DO block):
    `historial_cambios` (campo, valor_anterior, valor_nuevo, fecha, hora, usuario),
    `validaciones` (proveedor, estado, fecha), `alertas` (tipo, fecha, estado),
    `bloqueos` (parametro, valor), `cliente_modulos` (clave enum pct/blp/api, titulo,
    cantidad, detalle).
  - `supabase/seed/0011_detalle_cliente.sql`: 1 fila por cliente real existente
    (sin inventar legajos) en cada tabla, para que las tabs muestren datos de ejemplo.
  - `src/lib/api/detalle-cliente.ts`: `listHistorialCambios`, `listValidaciones`,
    `listAlertas`, `listBloqueos`, `listClienteModulos` (tipos + mappers tipados).
- La ruta `admin.general.usuarios.$legajo.tsx` quedó cableada a las 5 queries reales
  (loading/error/vacío por tab). Las 4 tabs ahora muestran datos al aplicar 0011+seed.
- **Pendiente:** el usuario debe ejecutar `0011_crear_tablas_detalle_cliente.sql` y
  luego `supabase/seed/0011_detalle_cliente.sql` en Supabase SQL Editor (agente sin
  credenciales de BD). Tras aplicar, verificar en pantalla.

