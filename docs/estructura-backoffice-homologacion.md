# Estructura monitoreada del backoffice de homologación (admin.homologation.molipay.com.ar)

> Documento generado a partir del análisis del bundle de la SPA de homologación (Vue 3 + Vuetify), descargado vía fetch y guardado en `%TEMP%\homolog-bundle.js`.
> Fecha de captura: 2026. Vigencia: el bundle puede cambiar en el entorno de homologación sin previo aviso.

---

## 1. Metodología

1. Se descargó el HTML del sitio y se localizó el script principal del bundle (una sola pieza de ~2 MB, minificada).
2. Se volcó a `%TEMP%\homolog-bundle.js`.
3. Se extrajo con expresiones regulares:
   - Definición del menú lateral (`const OH=[...]`).
   - Tabla de rutas de Vue Router (`qqe=[...]`).
   - Todos los endpoints del BFF (`/bff/v1/...`).
   - Nombres de componentes y sus templates render (vue-html → h() functions).
   - Columnas de tablas y opciones de filtros.

---

## 2. Stack tecnológico observado

- **Framework**: Vue 3 (Composition API, `setup()` + `ref`/`reactive`).
- **UI**: Vuetify 3 (`v-card`, `v-data-table`, `v-chip`, `v-btn`, `v-tabs`, `v-pagination`, `v-icon`, `v-dialog`).
- **Enrutador**: Vue Router 4 (rutas con `name`, guards `beforeEnter`, layout `oce`).
- **HTTP**: composable `useFetch` (`{exec, isFetching, data, params}.get().json()`).
- **State de usuario**: `localStorage` (`Pr.get("user")`, `Pr.get("token")`).
- **Internacionalización**: `@intlify/core-base` (cadenas `es-AR`).
- **Gráficos/extra**: librería de Ionic (`@ionic/...`) presente en el bundle, bootstrap iconos.

---

## 3. Menú lateral completo (secciones y ítems)

Constante `OH` — 15 ítems agrupados en 4 secciones:

| Sección | Ítem | Ruta | Habilitado cuando |
|---|---|---|---|
| General | Usuarios | `/users` | siempre |
| General | Soporte | `/support` | siempre |
| General | Alertas | `/alerts` | siempre |
| General | Movimientos | `/movements` | siempre |
| Administración | Usuarios Backoffice | `/backoffice` | siempre |
| Administración | Reportes | `/reports` | siempre |
| Administración | Registros | `/registers` | siempre (solo móvil = `onlyMobile:true`) |
| Módulos | Modulos | `/modules` | siempre (solo móvil) |
| Módulos | Pagos con transferencia | `/pct` | flag `pct` |
| Módulos | Links de Pago | `/payment-links` | flag `blp` |
| Módulos | Impuestos | `/taxes` | flag `taxes` |
| Módulos | APIs Externas | `/api-external` | flag `api_external` |
| Configuración | Gestor de Logins | `/login-manager` | siempre |
| Configuración | Gestor de mensajes de error | `/error-manager` | siempre |
| Configuración | Mensajes de Telegram | `/telegram-manager` | siempre |

- `enabled` puede ser booleano (`true`) o una string que se evalúa contra los permisos/roles del usuario logueado (`pct`, `blp`, `taxes`, `api_external`).
- `onlyMobile:true` indica ítems que la nav de escritorio oculta (Registros, Modulos, PCT).

---

## 4. Rutas del router

Rutas de la aplicación (todas bajo layout autenticado, guard `jqe` → verifica sesión):

| Ruta | Nombre | Componente |
|---|---|---|
| `/` | home | `dce` |
| `/sign-in` | sign-in | `_ce` (layout transparente) |
| `/users` | users | `Ove` |
| `/users/:id` | edit-kyc | `BBe` |
| `/users/:id/history` | history-change-kyc | `n7e` |
| `/support` | support | `Uxe` |
| `/alerts` | alerts | `dSe` |
| `/movements` | movements | `MCe` |
| `/backoffice` | backoffice | `rke` |
| `/reports` | reports | `$4e` |
| `/registers` | registers | `rRe` |
| `/modules` | modules | `TRe` |
| `/pct` | pct | `b3e` |
| `/merchants/:id` | merchant-detail | `m7e` |
| `/payment-links` | payment-links | `IMe` |
| `/taxes` | taxes | `lGe` |
| `/api-external` | api-external | `bje` |
| `/api-external/user/:id` | api-external-user-detail | `Yje` |
| `/login-manager` | login-manager | `r9e` |
| `/error-manager` | error-manager | `EWe` |
| `/telegram-manager` | telegram-manager | `Gqe` |
| `/:pathMatch(.*)` | error | `ice` |

Rutas públicas/fuera de layout: `/` (home, guarda a `/users`), `/sign-in` (guarda a `/users` si ya hay sesión).

---

## 5. Endpoints del BFF observados

### 5.1 Gestión de usuarios
- `GET/POST /bff/v1/users`
- `GET /bff/v1/users/deposits` (+ `/csv`)
- `GET /bff/v1/users/kyc` (+ `/csv`)
- `GET /bff/v1/user-taxes`
- `GET /bff/v1/user-taxes/debitos-creditos/exemptions` (+ `/{id}`)

### 5.2 Soporte
- `GET /bff/v1/supports/transactions`

### 5.3 Alertas / bloqueos
- `GET /bff/v1/alerts` (+ `/csv`)
- `GET /bff/v1/alerts/params`
- `GET /bff/v1/alerts/users` (+ `/params`)
- `GET /bff/v1/blockages` (+ `/csv`)
- `GET /bff/v1/blockages/params`
- `GET /bff/v1/blockages/users` (+ `/params`)
- `GET /bff/v1/blocking_rules`

### 5.4 Movimientos
- `GET /bff/v1/movements` (+ `/csv`)
- `GET /bff/v1/commissions` (+ `/users`, `/users/csv`)
- `GET /bff/v1/charged-taxes`
- `GET /bff/v1/withdrawals` (+ `/csv`)
- `GET /bff/v1/wallets` (+ `/csv`, `/users`)
- `GET /bff/v1/tracking/exchange`

### 5.5 Usuarios Backoffice
- `GET/POST /bff/v1/admin_users`
- `GET /bff/v1/admin_users/all`
- `POST /bff/v1/admin_users/{userId}/sanitize-balance`
- `GET/POST /bff/v1/roles`
- `GET/POST /bff/v1/permissions`
- `GET/POST /bff/v1/feature_flags`

### 5.6 Reportes
- `GET /bff/v1/reports/bank_conciliations`
- `GET /bff/v1/reports/commissions`

### 5.7 Registros
- `GET /bff/v1/registry/founds` (+ `/csv`, `/{email}`)

### 5.8 Módulos
- PCT: `GET /bff/v1/pcts/payments` (+ `/csv`), `/collections` (+ `/csv`), `/merchants` (+ `/{id}`), `/resolvers` (+ `/{id}`), `/category_codes` (+ `/{id}`)
- BLP: `GET /bff/v1/blp/payments` (+ `/csv`), `/merchants`, `/payment_methods`
- Taxes: `GET /bff/v1/taxes` (+ `/{id}`, `/padron/{id}`), `POST /bff/v1/taxes/retroactive-normalization/preview`, `/apply`
- APIs Externas: `GET /bff/v1/api-external/endpoints` (+ `/{id}`), `/restrictions` (+ `/{id}`), `/users` (+ `/{id}`), `/logs/user/{id}`
- Comercios: `GET /bff/v1/business/subaccounts`

### 5.9 Configuración
- Logins: `POST /bff/v1/login-provider/execute`, `/execute-login`, `GET /bff/v1/login-provider/status`, `/next-execution`, `/parallel-stats`, `/log-level`
- Errores: `GET/POST/PUT/DELETE /bff/v1/error-manager/error-codes` (+ `/{id}`)
- Telegram: `GET/POST /bff/v1/telegram/users` (+ `PUT /{id}`, `POST /{id}/activate`), `GET/POST /bff/v1/telegram/messages` (+ `/send-test`), `GET /bff/v1/telegram/logs`

### 5.10 Otros
- `POST /bff/v1/login` (autenticación)
- `POST /bff/v1/register`
- `GET /bff/v1/compliance`

---

## 6. Detalle por módulo

### 6.1 Usuarios (`/users`, `Ove`)
- Tabla principal con filtros por búsqueda general y por estado.
- Estados posibles de usuario: `REGISTERED`, `KYC_IN_PROGRESS`, `PENDING_VALIDATION`, `ACTIVATED`, `PRE_ACTIVATED`, `PENDING_EMAIL_VERIFICATION`, `REJECTED`, `SUSPENDED`, `DEACTIVATED`, `DISABLE` (entre otros).
- Map de chip por estado (colores): verde → `ACTIVATED`/`PRE_ACTIVATED`; ámbar → `KYC_IN_PROGRESS`/`PENDING_VALIDATION`/`PENDING_EMAIL_VERIFICATION`/`REGISTERED`; rojo → `REJECTED`/`SUSPENDED`/`DEACTIVATED`/`DISABLE`.
- Edición KYC en `/users/:id` (`edit-kyc`) y historial de cambios de KYC en `/users/:id/history`.
- Acciones: exportar CSV (`/csv`), ver detalle.

### 6.2 Soporte (`/support`, `Uxe`)
- Tabla de transacciones del módulo soporte (`/bff/v1/supports/transactions`).
- Buscador por email del usuario; exporta CSV.

### 6.3 Alertas (`/alerts`, `dSe`)
- Tabla de alertas y de bloqueos, con búsqueda por email.
- Parámetros de alertas y de bloqueos en subvistas (`/alerts/params`, `/blockages/params`).
- CRUD de reglas de bloqueo (`/blocking_rules`).

### 6.4 Movimientos (`/movements`, `MCe`)
- Tabla de movimientos con búsqueda, filtros y exportación CSV.
- Submódulos: comisiones, impuestos cargados, retiros, wallets, tracking de exchange.
- Columnas observadas en tablas del módulo: `operation`, `type`, `amount`, `status`, `description` (mapa `title`/`key`).

### 6.5 Usuarios Backoffice (`/backoffice`, `rke`)
- Tabla `BackofficeUsers`: filtros por `username[like]`, `lastname[like]`, `email[like]`, `status[eq]`; orden por `lastname`; paginación.
- Estados: `ACTIVATED`, `DEACTIVATED`, `NOT_VERIFIED`, `PENDING_EMAIL_VERIFICATION`, `SUSPENDED`, `PENDING_VALIDATION`.
- Roles: `Admin`, `Soporte`, `Técnico`.
- Acciones: sanitizar balance (`POST /admin_users/{id}/sanitize-balance`), alta/edición/estado.

### 6.6 Reportes (`/reports`, `$4e`)
- Grilla de cards con 9 reportes (ver detalle en sección 8).

### 6.7 Registros (`/registers`, `rRe`)
- Búsqueda de fondos por email (`/registry/founds/{email}`).
- Exportación CSV de fondos (`/registry/founds/csv`).
- Acción de sanitizar saldo disponible solo para rol `Admin` (check `roles.includes("Admin")`).

### 6.8 Módulos (`/modules`, `TRe`)
- Landing con cards que llevan a: Pagos con transferencia, Links de Pago, Impuestos, APIs Externas (mismas rutas del menú).

### 6.9 Pagos con transferencia (`/pct`, `b3e`)
- Tabs: Pagos (`/pcts/payments`), Cobros/colecciones (`/pcts/collections`), Resolvers, Códigos de categoría, Comercios (`/pcts/merchants`, detalle en `/merchants/:id`).
- Cada listado con CSV.

### 6.10 Links de Pago (`/payment-links`, `IMe`)
- Tabla de pagos BLP (`/blp/payments` + CSV), comercios BLP (`/blp/merchants`), métodos de pago (`/blp/payment_methods`).

### 6.11 Impuestos (`/taxes`, `lGe`)
- Tabla de impuestos (`/taxes`), detalle con alícuotas (`TaxDetailModal`: ID, Nombre, Descripción, Activo, Creado, Actualizado + grid de alícuotas `code/rate/description/is_active`).
- Padrón (`/taxes/padron/{id}`).
- Normalización retroactiva: preview + apply (`/retroactive-normalization/preview`, `/apply`).

### 6.12 APIs Externas (`/api-external`, `bje`)
- Tabs: Endpoints (`/api-external/endpoints`), Restricciones (`/api-external/restrictions`), Usuarios (`/api-external/users`, detalle en `/user/:id`).
- Logs de consumo por usuario (`/api-external/logs/user/{id}`).

### 6.13 Gestor de Logins (`/login-manager`, `r9e`)
- **Planificador de logins automáticos** (no actividad de sesiones).
- Tabla 1 "jobs": Nombre, Programación (`schedule`), Última Ejecución (`lastExecution`), Próxima Ejecución (`nextExecution`), Tiempo Restante (`timeUntilNextFormatted`), Ejecuciones (`executionCount`).
- Tabla 2 "providers": Nombre, URL, Método.
- Acción global "Ejecutar todos" (`POST /login-provider/execute`), ejecución individual (`execute-login`), estadísticas de paralelismo (`parallel-stats`), estado (`status`), nivel de log (`log-level`).

### 6.14 Gestor de mensajes de error (`/error-manager`, `EWe`)
- Tabla de códigos de error (`/error-manager/error-codes`), paginada por `id` desc.
- Estados por rango HTTP: 2xx → success, 3xx → warning, 4xx/5xx → error.
- Acciones: ver detalle, editar código (toast "Código de error actualizado"), eliminar (toast "Código de error eliminado"), reprocesar.

### 6.15 Mensajes de Telegram (`/telegram-manager`, `Gqe`)
- 3 tabs: **Usuarios** (`TelegramUsers`), **Mensajes** (`TelegramMessages`), **Logs** (`TelegramLogs`).
- Usuarios: CRUD (`type`, `telegram_id`, `user_id`; default `type:"SUPPORT"`), alta/edición/activación.
- Mensajes: listado + envío de prueba (`/telegram/messages/send-test`).
- Logs: historial (`/telegram/logs`).

---

## 7. Patrones de UI reutilizados (Vuetify)

- **Layout principal**: `oce` con guard `jqe` (auth) + drawer de menú + topbar.
- **Tablas**: `v-data-table` con `v-chip` para estados, `v-pagination` paginado (perPage 10/25/50...).
- **Cards**: `v-card` + `v-card-title`, `v-card-text`, `v-card-actions`.
- **Forms**: `v-form` + `v-text-field`, selects `v-select` con `density:"compact"`.
- **Diálogos**: `v-dialog` para modales de detalle (p. ej. TaxDetailModal, LoginDetailModal).
- **Tabs**: `v-tabs` + `v-tab` para submódulos (movements, pct, api-external, telegram-manager).
- **Toast**: `add()` de composable `Pt()` (Vuetify snackbar) con `type: success/info/error`.
- **Copiar texto**: directiva `v-clipboard` (`Jqe` → `SA`).

---

## 8. Estructura de la grilla de Reportes

9 cards, cada una con ícono + título (la descripción larga de Movimientos se muestra en tooltip):

1. Conciliaciones Bancarias
2. Reportes BCRA
3. Reportes AFIP
4. Reportes de Comisiones
5. Reportes de Movimientos — "Personas físicas y jurídicas fuera de la plataforma"
6. Actividad de Usuarios
7. Reportes de Impuestos
8. Conciliaciones BLP
9. Reportes de Impuestos (Nuevo)

---

## 9. Cosas aún no verificadas

- Textos literales de columnas de todas las tablas (solo se capturaron mapas `title/key` sueltos).
- Detalles exactos de los modales de alta/edición de Usuarios Backoffice (se infieren de los endpoints).
- Permisos por rol por ruta (guards del menú evalúan flags contra `user.roles`).
- Estructura de algunos payloads POST/PUT (se ven forms `{type, telegram_id, user_id}` en Telegram, `{page, perPage, orderBy, descending}` en listados).

---

## 10. Consideraciones de seguridad (input para el rebuild)

> Hallazgos del análisis del bundle. No se encontraron secretos reales en el cliente (0 API keys, 0 credenciales, 0 claves privadas; los hits de `password` son campos de formulario y el único `Bearer` es el patrón genérico de header).

### 10.1 Qué es normal y no requiere acción
- Rutas, nombres de componentes y paths del BFF legibles en el bundle: inherente a cualquier SPA (Vue/React/Angular). La ofuscación no lo resuelve.
- Minificado sin ofuscación: estándar de industria.

### 10.2 Riesgos observados en el original → recomendaciones para el nuevo admin

| Riesgo observado en original | Recomendación para el nuevo admin |
|---|---|
| Token en `localStorage` (`Pr.get("token")`) | Cookie `httpOnly` + `SameSite=Strict`; el front nunca manipula el token. |
| Gating de UI por `roles.includes("Admin")` | Mantenerlo para UX, pero **jamás** como única defensa; cada endpoint del BFF debe chequear rol server-side. |
| Flags de feature (`enabled:"pct"`) en el menú | OK si vienen del backend autenticado; no hardcodear permisos en el cliente. |
| Superficie BFF 100% enumerable | Rate-limit + authz por ruta en el BFF; logs de auditoría en endpoints sensibles (`sanitize-balance`, `execute-login`). |
| Sin ofuscación | Aceptable, siempre que no haya secretos en el bundle (ya cumple). |

### 10.3 Checklist de seguridad para el rebuild (lo que controlamos)
1. **Auth**: sesión server-side, cookie `httpOnly`, renovación con refresh token.
2. **RBAC**: el router del backoffice y cada ruta BFF validan rol/permiso; el cliente solo oculta lo que no puede usar.
3. **CSRF**: token doble en cookies + header.
4. **Auditoría**: toda acción sobre `admin_users`, `login-provider`, `telegram/users`, `error-codes` queda logueada con legajo.
5. **Validación**: el BFF re-valida payloads (no confía en lo que manda el form).

### 10.4 Conclusión
Plataforma original de comportamiento SPA normal; no comprometida por lo reconstruido. Su seguridad reposa 100% en que el BFF enforce authz server-side. El rebuild es la oportunidad de corregir los patrones riesgosos (localStorage token, gating client-side) y centralizar la autorización en el backend.
