# Reporte: Homologación `admin.homologation.molipay.com.ar` vs Admin local

> Análisis extraído del bundle JS de la SPA de homologación (Vue + Vuetify) y comparado contra tu código local (`src/routes`, `src/components`). Sólo análisis — nada implementado.

## 1. Mapa de módulos: coincidencias y huecos

| Homologación (Vue) | Admin local | Estado |
|---|---|---|
| Usuarios (tabs: Físicas, Jurídicas, CVU, Comisiones) | `admin/general/usuarios` (mismos 4 tabs) | ✅ Igual |
| Movimientos (tabs: Todos, Depósitos, Retiros, Comisiones, Impuestos, [Tarjeta, PCT]) | `admin/general/movimientos` (mismos + QR) | 🔶 Casi igual |
| Alertas (Listado, Bloqueos, Params alertas, Params bloqueos) | `admin/general/alertas` (mismos 4 tabs) | ✅ Igual |
| **Soporte** | `admin/administracion/soporte` | ✅ Igual |
| **Usuarios Backoffice** | `admin/administracion/usuarios` | ✅ Igual |
| Reportes | `admin/administracion/reportes` | ✅ Igual |
| Registros | `admin/administracion/registros` | ✅ Igual |
| Modulos (salud) | `admin/modulos` | ✅ Igual |
| Pagos con transferencia (Comercios, Resolvers, Códigos categoría) | `admin/modulos/transferencia` (mismos 3 tabs) | ✅ Igual |
| **Links de Pago (Comercios + Métodos de Pago)** | `admin/modulos/link-pago` | ❌ **VACÍO** (EmptyState "pendiente") |
| Impuestos (catálogo, usuarios, IIBB, débitos/créditos) | `admin/modulos/impuestos` (mismos 4 tabs) | ✅ Igual |
| **APIs Externas (Usuarios + Endpoints + Restricciones)** | `admin/modulos/apis` | 🔶 **1 sola tabla, sin tabs** |
| Gestor de Logins | `admin/configuracion` | 🔶 Distinto enfoque |
| Gestor de mensajes de error | `admin/configuracion/mensajes` | ✅ Igual |
| Telegram | `admin/configuracion/telegram` | ✅ Igual |
| **Detalle de usuario KYC** (`/users/:id`) | `UserModal` | 🔶 Parcial |
| **Historial de cambios KYC** (`/users/:id/history`) | — | ❌ **No existe** |

---

## 2. GAPS para incorporar (por prioridad)

### 🔴 A. Módulos completos que faltan

**A1. Link de pago** (`admin.modulos.link-pago.tsx` es un placeholder)
- Homologación tiene 2 tabs: **Comercios** y **Métodos de Pago** (CREDIT_CARD, DEBIT_CARD, PREPAID_CARD, PAGOFACIL, RAPIPAGO).
- Columna "Método" con tipos de pago; modal de creación de método.

**A2. APIs Externas** (`admin.modulos.apis.tsx` es una sola tabla "Integraciones")
- Homologación tiene 3 tabs: **Usuarios** · **Endpoints** · **Restricciones**.
- Columnas tab Usuarios: `Nombre | Clave Pública | Descripción | Creado | Activa | Acciones`.
- Columnas tab Endpoints: `Nombre | Path | Method | Descripción | Categoría | Habilitado | Requiere Permiso | Editar | Cambiar estado`.
- Columnas tab Restricciones/logs: `Timestamp | IP | Client ID | Method | Endpoint | Status | Response Time | Detalle`.
- **Modal de detalle de log**: Request Params / Request Query / Request Body / Response Body (JSON pretty-printed).

### 🟠 B. Detalle de usuario KYC — secciones que faltan en tu `UserModal`

Homologación organiza el detalle en secciones que hoy no tenés:
1. **Datos del usuario** — edición inline de identidad, domicilio, datos comerciales (tu tab "Datos personales" cubre esto).
2. **Parámetros de entidad** — `auto_redirect_subaccounts` y `maximum_subaccounts` con guardado independiente. ❌ Falta.
3. **Validaciones automáticas** — resultado por proveedor: AFIP, BCRA, Renaper (claves formateadas + "forzar validación"). ❌ Falta.
4. **Contexto operativo** — CVUs, comisiones, impuestos, alertas, bloqueos del usuario con carga diferida y contadores. ❌ Falta (tu modal muestra saldo/CBU estáticos, sin comisiones/impuestos/alertas del usuario).
5. **Riesgo y monitoreo** — sección de riesgo del usuario. ❌ Falta.
6. **Módulos del usuario** — contadores/links a PCT, Link de pago, API externa del usuario. ❌ Falta.
7. **Subcuentas** — homologación tiene tabla con acciones **Editar · Suspender · Reactivar · Borrar** + **modal "Validación de Subcuenta"** (Aprobar/Rechazar con checkboxes de Parámetros de alertas, Parámetros de bloqueo, Comisiones). Tu tab "Subcuentas & CVU" existe pero sin esas acciones. 🔶 Parcial.
8. **Historial de cambios** (ruta `/users/:id/history`) — navegación "Ver historial" desde el detalle. ❌ No existe en tu app.

### 🟡 C. Columnas y nomenclatura que faltan en tablas existentes

| Tabla | Homologación | Local | Falta |
|---|---|---|---|
| Personas físicas | `CUIT/CUIL | Email | Nombre | Estado | Fecha registro` | `Legajo, Usuario, Nombres, Apellidos, Estado, Fecha` | **Columna CUIT/CUIL** |
| Movimientos | tabs genéricos por tipo + acción **Reembolsar** | tabs + estados/columnas por tipo | Coincide (ya agregaste Reembolsar/Bloqueado) |
| Movimientos | tabs **"Pagos PCT" / "Cobros PCT"** | tabs "Pagos QR" / "Cobros QR" | 🔶 Revisar nomenclatura PCT vs QR |
| Login manager | tabla de ejecuciones: `Nombre, Programación, Última Ejecución, Próxima Ejecución, Tiempo Restante, Ejecuciones` + botones **Ejecutar/Ejecutar todos** + health (Redis, BD, cron) | tabla de actividad de inicios de sesión (usuario, email, ip, estado) | 🔶 Es otro concepto: homologación gestiona **ejecución de logins programados**, tu local muestra historial de logins |

---

## 3. Recomendación de enfoque (sin romper tu UI)

Tu estructura gana: **mantené la navegación por tabs (`TabLayout`), `DataTable`, `UserModal`, `Badge`, `ConfirmDialog`** y la estética Molly. Lo que hay que agregar:

1. **Link de pago**: creá `admin.modulos.link-pago` como layout de tabs (como `transferencia.tsx`) con páginas "Comercios" y "Métodos de Pago" usando `DataTable` + `FormDialog`.
2. **APIs externas**: convertí `admin.modulos.apis.tsx` en layout de 3 tabs reusando `DataTable`; el detalle de log como modal con `<pre>`.
3. **UserModal**: añadir secciones/tabs "Parámetros de entidad", "Validaciones", "Riesgo", "Contexto operativo", y botón "Ver historial" apuntando a una nueva ruta de historial KYC.
4. **Personas físicas**: agregar columna `CUIT/CUIL` a `admin.general.usuarios.index.tsx`.

Los archivos a tocar serían (cuando implementes): `src/routes/admin.modulos.link-pago.tsx`, `src/routes/admin.modulos.apis.tsx`, `src/components/user-modal.tsx`, `src/routes/admin.general.usuarios.index.tsx`, y nuevas rutas de historial/submódulos.

---

## 4. Apéndice — Estructura de navegación de homologación

Menú lateral (Vue):

- **General**: Usuarios `/users` · Soporte `/support` · Alertas `/alerts` · Movimientos `/movements`
- **Administración**: Usuarios Backoffice `/backoffice` · Reportes `/reports` · Registros `/registers`
- **Módulos**: Modulos `/modules` · Pagos con transferencia `/pct` · Links de Pago `/payment-links` · Impuestos `/taxes` · APIs Externas `/api-external`
- **Configuración**: Gestor de Logins `/login-manager` · Gestor de mensajes de error `/error-manager` · Mensajes de Telegram `/telegram-manager`

Tabs internos por módulo:

- `/users`: Personas Físicas · Personas Jurídicas · Usuarios con CVU · Carga de comisiones
- `/movements`: Todos los movimientos · Depósitos · Retiros · Cobro de comisiones · Impuestos cobrados · [Pagos con tarjeta · Pagos PCT · Cobros PCT] (condicionales según módulo habilitado)
- `/alerts`: Listado de alertas · Listado de bloqueos · Parámetros de alertas · Parámetros de bloqueos
- `/pct`: Comercios · Resolvers · Códigos de Categoría
- `/payment-links`: Comercios · Métodos de Pago
- `/taxes`: Impuestos · Usuarios con Impuestos · Ingresos Brutos · Débitos y Créditos
- `/api-external`: Usuarios · Endpoints · Restricciones · (+ detalle `/api-external/user/:id`)
- `/users/:id` (edit-kyc): Datos del usuario · Documentos · Subcuentas · Parámetros de entidad · Validaciones automáticas · Contexto operativo · Riesgo y monitoreo · Módulos (+ `/users/:id/history` historial de cambios)
