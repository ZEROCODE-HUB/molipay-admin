# Comportamiento de la plataforma Moli (Panel Admin)

_Documento generado automáticamente por `scripts/gen-docs.mjs` a partir del código fuente (2026-08-16)._

> Fuente de verdad: el código de este repositorio. Refleja el comportamiento implementado, no una captura en vivo del navegador.

## Mapa de secciones

### Root
- **Admin** — `/admin`

### Administración
- **Registros** — `/admin/administracion/registros`
- **Actividad en backoffice — Admin Panel** — `/admin/administracion/registros/actividad`
- **Total de fondos — Admin Panel** — `/admin/administracion/registros/total`
- **Reportes — Admin Panel** — `/admin/administracion/reportes`
- **Soporte** — `/admin/administracion/soporte`
- **Bloqueo de funciones — Admin Panel** — `/admin/administracion/soporte/bloqueo`
- **Usuarios** — `/admin/administracion/usuarios`
- **Roles y permisos — Admin Panel** — `/admin/administracion/usuarios/roles`

### Comercios
- **Comercios — Admin — Moli** — `/admin/comercios`
- **APIs externas — Admin — Moli** — `/admin/comercios/apis`
- **APIs externas — Endpoints — Admin — Moli** — `/admin/comercios/apis/endpoints`
- **APIs externas — Restricciones — Admin — Moli** — `/admin/comercios/apis/restricciones`
- **Impuestos — Admin — Moli** — `/admin/comercios/impuestos`
- **Débitos y créditos — Admin — Moli** — `/admin/comercios/impuestos/debitos-creditos`
- **Ingresos Brutos — Admin — Moli** — `/admin/comercios/impuestos/ingresos-brutos`
- **Usuarios con impuestos — Admin — Moli** — `/admin/comercios/impuestos/usuarios`
- **Link de pago — Admin — Moli** — `/admin/comercios/link-pago`
- **Métodos de pago — Link de pago — Admin — Moli** — `/admin/comercios/link-pago/metodos-pago`
- **Pagos con transferencia — Admin — Moli** — `/admin/comercios/transferencia`
- **Códigos de categoría — Admin — Moli** — `/admin/comercios/transferencia/categorias`
- **Resolvers — Pagos con transferencia — Admin Molly** — `/admin/comercios/transferencia/resolvers`

### Configuración
- **Configuración — Admin — Moli** — `/admin/configuracion`
- **Configuraciones de login — Admin — Moli** — `/admin/configuracion/configuraciones`
- **Logins configurados — Admin — Moli** — `/admin/configuracion/logins`

### General
- **Alertas — Admin Molly** — `/admin/general/alertas`
- **Listado de bloqueos — Admin Panel** — `/admin/general/alertas/bloqueos`
- **Parámetros de alertas — Admin Panel** — `/admin/general/alertas/parametros-alertas`
- **Parámetros de bloqueos — Admin Panel** — `/admin/general/alertas/parametros-bloqueos`
- **Movimientos — Admin Molly** — `/admin/general/movimientos`
- **Cobros QR — Movimientos — Admin Molly** — `/admin/general/movimientos/cobros-qr`
- **Cobro de comisiones — Movimientos — Admin Molly** — `/admin/general/movimientos/comisiones`
- **Depósitos — Movimientos — Admin Molly** — `/admin/general/movimientos/depositos`
- **Impuestos cobrados — Movimientos — Admin Molly** — `/admin/general/movimientos/impuestos`
- **Pagos QR — Movimientos — Admin Molly** — `/admin/general/movimientos/pagos-qr`
- **Pagos con tarjeta — Movimientos — Admin Molly** — `/admin/general/movimientos/pagos-tarjeta`
- **Retiros — Movimientos — Admin Molly** — `/admin/general/movimientos/retiros`
- **Usuarios — Admin Molly** — `/admin/general/usuarios`
- **Ficha de usuario — Admin Molly** — `/admin/general/usuarios/$legajo`
- **Carga de comisiones — Usuarios — Admin Molly** — `/admin/general/usuarios/comisiones`
- **Usuarios con CVU — Usuarios — Admin Molly** — `/admin/general/usuarios/cvu`
- **Personas jurídicas — Usuarios — Admin Molly** — `/admin/general/usuarios/juridicas`

### Comunicación
- **Comunicación de incidentes — Admin Panel** — `/admin/incidentes`

### Sistema
- **Salud de módulos — Admin — Moli** — `/admin/modulos`

### Sistema
- **Sistema de Notificaciones — Admin — Moli** — `/admin/notificaciones`

### Registros
- **Registros** — `/administracion/registros`

### Reportes
- **Reportes** — `/administracion/reportes`

### Soporte
- **Soporte** — `/administracion/soporte`

### Usuarios
- **Usuarios** — `/administracion/usuarios`

## Detalle por ruta

### Admin
- **Ruta:** `/admin`

### Registros
- **Ruta:** `/admin/administracion/registros`

### Actividad en backoffice — Admin Panel
- **Ruta:** `/admin/administracion/registros/actividad`
- **Capacidades detectadas:**
  - Tabla de datos (DataTable)
  - Filtros de columna
  - Acciones por fila (ActionsDropdown)
  - Estado interactivo (useState)
- **Columnas / campos detectados:** Evento, Tipo, Usuario, Recurso, Acción, Fecha

### Total de fondos — Admin Panel
- **Ruta:** `/admin/administracion/registros/total`

### Reportes — Admin Panel
- **Ruta:** `/admin/administracion/reportes`
- **Descripción:** Transacciones diarias subidas por el banco.
- **Capacidades detectadas:**
  - Tabla de datos (DataTable)
  - Filtros de columna
  - Modales de alta/edición (FormDialog)
  - Carga de archivos (FileDropzone)
  - Descargas (CSV / Excel / TXT / ZIP)
  - Estado interactivo (useState)
- **Columnas / campos detectados:** Nombre del archivo, Fecha, Analizar conciliación, Apartado A, Apartado B, Padrón, B-8-1-25, B-8-1-26, Período, Tipo, Cantidad, Monto, Comisión, Detalle, Estado, Legajo, Email, Hora, Tipo de transacción, Nombre, Destino, CUIT, Destinatario, CVU, CVU de balance, Tramo, Fecha de creación, Presentado, Pagado, Descargar conciliación
- **Filtros por lista (enum):** Depósito, Retiro, Accreditado, Pendiente, Rechazado, OK, Error, Tramo 1, Tramo 2, Tramo 3, Sí, No
- **Acciones / botones detectados:** Cerrar, Exportar TXT, Buscar, Guardar

### Soporte
- **Ruta:** `/admin/administracion/soporte`

### Bloqueo de funciones — Admin Panel
- **Ruta:** `/admin/administracion/soporte/bloqueo`
- **Capacidades detectadas:**
  - Tabla de datos (DataTable)
  - Filtros de columna
  - Modales de alta/edición (FormDialog)
  - Confirmación (ConfirmDialog)
  - Acciones por fila (ActionsDropdown)
  - Estado interactivo (useState)
- **Columnas / campos detectados:** Tipo de bloqueo, Usuario, Correo, Fecha del bloqueo, Acciones
- **Acciones / botones detectados:** Nuevo bloqueo

### Usuarios
- **Ruta:** `/admin/administracion/usuarios`

### Roles y permisos — Admin Panel
- **Ruta:** `/admin/administracion/usuarios/roles`
- **Capacidades detectadas:**
  - Confirmación (ConfirmDialog)
  - Estado interactivo (useState)
- **Acciones / botones detectados:** Crear rol

### Comercios — Admin — Moli
- **Ruta:** `/admin/comercios`

### APIs externas — Admin — Moli
- **Ruta:** `/admin/comercios/apis`

### APIs externas — Endpoints — Admin — Moli
- **Ruta:** `/admin/comercios/apis/endpoints`
- **Capacidades detectadas:**
  - Tabla de datos (DataTable)
  - Filtros de columna
  - Modales de alta/edición (FormDialog)
  - Confirmación (ConfirmDialog)
  - Acciones por fila (ActionsDropdown)
  - Estado interactivo (useState)
- **Columnas / campos detectados:** Nombre del endpoint, Path, Tipo de endpoint, Descripción, Grupo de endpoints, Estado, REC
- **Filtros por lista (enum):** Habilitado, Deshabilitado

### APIs externas — Restricciones — Admin — Moli
- **Ruta:** `/admin/comercios/apis/restricciones`
- **Capacidades detectadas:**
  - Tabla de datos (DataTable)
  - Filtros de columna
  - Estado interactivo (useState)
- **Columnas / campos detectados:** Email, Legajo, Nombre completo, Estado, Fecha de creación, Fecha de expiración
- **Filtros por lista (enum):** Restringiendo, No restringiendo

### Impuestos — Admin — Moli
- **Ruta:** `/admin/comercios/impuestos`

### Débitos y créditos — Admin — Moli
- **Ruta:** `/admin/comercios/impuestos/debitos-creditos`
- **Capacidades detectadas:**
  - Tabla de datos (DataTable)
  - Filtros de columna
  - Modales de alta/edición (FormDialog)
  - Confirmación (ConfirmDialog)
  - Acciones por fila (ActionsDropdown)
  - Estado interactivo (useState)
- **Columnas / campos detectados:** Usuario, CUIT, Dirección / Tipo, Motivo, Vigencia, Estado, Alta, Actualización
- **Filtros por lista (enum):** Entrantes, Salientes, Ambos, Activo, Inactivo

### Ingresos Brutos — Admin — Moli
- **Ruta:** `/admin/comercios/impuestos/ingresos-brutos`

### Usuarios con impuestos — Admin — Moli
- **Ruta:** `/admin/comercios/impuestos/usuarios`
- **Capacidades detectadas:**
  - Tabla de datos (DataTable)
  - Filtros de columna
- **Columnas / campos detectados:** Legajo, Usuario, Nombre completo, Impuesto aplicado, Tipo de impuesto, Monto, Estado, Fecha de asignación
- **Filtros por lista (enum):** Porcentaje, Fijo, Otro, Activo, Inactivo

### Link de pago — Admin — Moli
- **Ruta:** `/admin/comercios/link-pago`

### Métodos de pago — Link de pago — Admin — Moli
- **Ruta:** `/admin/comercios/link-pago/metodos-pago`
- **Capacidades detectadas:**
  - Tabla de datos (DataTable)
  - Filtros de columna
  - Acciones por fila (ActionsDropdown)
  - Estado interactivo (useState)
- **Columnas / campos detectados:** ID, Nombre, Tipo, Estado
- **Acciones / botones detectados:** Agregar cuota, Cancelar

### Pagos con transferencia — Admin — Moli
- **Ruta:** `/admin/comercios/transferencia`

### Códigos de categoría — Admin — Moli
- **Ruta:** `/admin/comercios/transferencia/categorias`
- **Capacidades detectadas:**
  - Tabla de datos (DataTable)
  - Filtros de columna
  - Modales de alta/edición (FormDialog)
  - Confirmación (ConfirmDialog)
  - Acciones por fila (ActionsDropdown)
  - Estado interactivo (useState)
- **Columnas / campos detectados:** Código, Nombre, Descripción, Estado
- **Filtros por lista (enum):** activo, inactivo
- **Acciones / botones detectados:** + Nueva categoría

### Resolvers — Pagos con transferencia — Admin Molly
- **Ruta:** `/admin/comercios/transferencia/resolvers`
- **Capacidades detectadas:**
  - Tabla de datos (DataTable)
  - Filtros de columna
  - Modales de alta/edición (FormDialog)
  - Acciones por fila (ActionsDropdown)
  - Estado interactivo (useState)
- **Columnas / campos detectados:** Nombre del resolver, CUIT del resolver, URL del resolver, Estado
- **Acciones / botones detectados:** Nuevo resolver

### Configuración — Admin — Moli
- **Ruta:** `/admin/configuracion`

### Configuraciones de login — Admin — Moli
- **Ruta:** `/admin/configuracion/configuraciones`
- **Capacidades detectadas:**
  - Tabla de datos (DataTable)
  - Filtros de columna
- **Columnas / campos detectados:** Nombre, URL, Método
- **Filtros por lista (enum):** GET, POST, PUT, PATCH

### Logins configurados — Admin — Moli
- **Ruta:** `/admin/configuracion/logins`
- **Capacidades detectadas:**
  - Tabla de datos (DataTable)
  - Filtros de columna
- **Columnas / campos detectados:** Nombre, Programación, Última ejecución, Próxima ejecución, Tiempo restante, Ejecuciones

### Alertas — Admin Molly
- **Ruta:** `/admin/general/alertas`

### Listado de bloqueos — Admin Panel
- **Ruta:** `/admin/general/alertas/bloqueos`
- **Capacidades detectadas:**
  - Tabla de datos (DataTable)
  - Filtros de columna
  - Acciones por fila (ActionsDropdown)
  - Estado interactivo (useState)
- **Columnas / campos detectados:** Legajo, Usuario, Nombre, Tipo, Estado, Compliance, Fecha
- **Filtros por lista (enum):** Activo, Pendiente, Resuelto
- **Acciones / botones detectados:** Guardar, Cancelar

### Parámetros de alertas — Admin Panel
- **Ruta:** `/admin/general/alertas/parametros-alertas`
- **Capacidades detectadas:**
  - Estado interactivo (useState)
- **Columnas / campos detectados:** Límite de depósito excedido, Depósito por empresa (monto máx.), Salario mínimo (cantidad), Depósitos de salario mínimo por transferencia, Límite de depósito mensual, Monto del límite de depósito mensual, Depósito de un mismo origen por mes, Intentos fallidos permitidos, Tiempo de evaluación de retiros fallidos (segundos), Operaciones repetitivas, Umbral de operaciones repetidas, Límite de depósito horario, Transferencias por hora, Afinidad entre cuentas, Afinidad entre cuentas (umbral), Alerta de volumen habilitada, Monto mínimo por operación, Monto máximo por operación, Transferencia a menor, Política
- **Acciones / botones detectados:** Guardar configuración

### Parámetros de bloqueos — Admin Panel
- **Ruta:** `/admin/general/alertas/parametros-bloqueos`
- **Capacidades detectadas:**
  - Estado interactivo (useState)
- **Acciones / botones detectados:** Guardar configuración

### Movimientos — Admin Molly
- **Ruta:** `/admin/general/movimientos`

### Cobros QR — Movimientos — Admin Molly
- **Ruta:** `/admin/general/movimientos/cobros-qr`
- **Capacidades detectadas:**
  - Tabla de datos (DataTable)
  - Filtros de columna
  - Confirmación (ConfirmDialog)
  - Acciones por fila (ActionsDropdown)
  - Estado interactivo (useState)
- **Columnas / campos detectados:** Usuario, Legajo, Tipo QR, Estado QR, Monto Total, Comisión, Monto Neto, Estado, Fecha

### Cobro de comisiones — Movimientos — Admin Molly
- **Ruta:** `/admin/general/movimientos/comisiones`
- **Capacidades detectadas:**
  - Tabla de datos (DataTable)
  - Filtros de columna
  - Acciones por fila (ActionsDropdown)
  - Estado interactivo (useState)
- **Columnas / campos detectados:** Legajo, Usuario, Operación, Tipo, Monto de comisión, Monto de operación, ID de operación, Estado, Fecha
- **Filtros por lista (enum):** Porcentaje, Fijo, Otro, APROBADO, EN PROGRESO, RECHAZADO, BLOQUEADO

### Depósitos — Movimientos — Admin Molly
- **Ruta:** `/admin/general/movimientos/depositos`
- **Capacidades detectadas:**
  - Tabla de datos (DataTable)
  - Filtros de columna
  - Acciones por fila (ActionsDropdown)
  - Estado interactivo (useState)
- **Columnas / campos detectados:** Legajo, ID, CVU/CBU, Usuario, Nombre completo, Destino, CUIT destino, Monto, Fecha, Estado
- **Filtros por lista (enum):** APROBADO, EN PROGRESO, RECHAZADO, BLOQUEADO

### Impuestos cobrados — Movimientos — Admin Molly
- **Ruta:** `/admin/general/movimientos/impuestos`
- **Capacidades detectadas:**
  - Tabla de datos (DataTable)
  - Filtros de columna
  - Acciones por fila (ActionsDropdown)
  - Estado interactivo (useState)
- **Columnas / campos detectados:** Legajo, Usuario, Nombre completo, ID de transacción, Impuesto, Monto original, Monto impuesto, Estado, Fecha de cobro
- **Filtros por lista (enum):** APROBADO, EN PROGRESO, RECHAZADO, BLOQUEADO

### Pagos QR — Movimientos — Admin Molly
- **Ruta:** `/admin/general/movimientos/pagos-qr`
- **Capacidades detectadas:**
  - Tabla de datos (DataTable)
  - Filtros de columna
  - Acciones por fila (ActionsDropdown)
  - Estado interactivo (useState)
- **Columnas / campos detectados:** Usuario, Legajo, QR ID TX, Monto, CUIT Merchant, Estado, Fecha

### Pagos con tarjeta — Movimientos — Admin Molly
- **Ruta:** `/admin/general/movimientos/pagos-tarjeta`
- **Capacidades detectadas:**
  - Tabla de datos (DataTable)
  - Filtros de columna
  - Acciones por fila (ActionsDropdown)
  - Estado interactivo (useState)
- **Columnas / campos detectados:** Legajo, Usuario, Monto, Medio de pago, Cuotas, Estado, Fecha

### Retiros — Movimientos — Admin Molly
- **Ruta:** `/admin/general/movimientos/retiros`
- **Capacidades detectadas:**
  - Tabla de datos (DataTable)
  - Filtros de columna
  - Acciones por fila (ActionsDropdown)
  - Estado interactivo (useState)
- **Columnas / campos detectados:** Legajo, ID, CVU/CBU, Usuario, Nombre completo, Destino, CUIT destino, Monto, Fecha, Estado
- **Filtros por lista (enum):** APROBADO, EN PROGRESO, RECHAZADO, BLOQUEADO

### Usuarios — Admin Molly
- **Ruta:** `/admin/general/usuarios`

### Ficha de usuario — Admin Molly
- **Ruta:** `/admin/general/usuarios/$legajo`
- **Capacidades detectadas:**
  - Estado interactivo (useState)
- **Acciones / botones detectados:** Volver a la lista

### Carga de comisiones — Usuarios — Admin Molly
- **Ruta:** `/admin/general/usuarios/comisiones`
- **Capacidades detectadas:**
  - Tabla de datos (DataTable)
  - Filtros de columna
  - Modales de alta/edición (FormDialog)
  - Confirmación (ConfirmDialog)
  - Acciones por fila (ActionsDropdown)
  - Estado interactivo (useState)
- **Columnas / campos detectados:** Legajo, Usuario, Código de operación, Operación, Tipo, Estado, Monto, Descripción
- **Filtros por lista (enum):** Depósito, Retiro, Link de pago, E-commerce, Fijo, Porcentaje, Habilitado, Deshabilitado

### Usuarios con CVU — Usuarios — Admin Molly
- **Ruta:** `/admin/general/usuarios/cvu`
- **Capacidades detectadas:**
  - Tabla de datos (DataTable)
  - Filtros de columna
  - Modales de alta/edición (FormDialog)
  - Confirmación (ConfirmDialog)
  - Acciones por fila (ActionsDropdown)
  - Estado interactivo (useState)
- **Columnas / campos detectados:** Legajo, Usuario, Nombre, Apellido, CVU, CBK, Alias, Estado
- **Filtros por lista (enum):** Habilitado, Deshabilitado, Suspendido

### Personas jurídicas — Usuarios — Admin Molly
- **Ruta:** `/admin/general/usuarios/juridicas`
- **Capacidades detectadas:**
  - Tabla de datos (DataTable)
  - Filtros de columna
  - Confirmación (ConfirmDialog)
  - Acciones por fila (ActionsDropdown)
  - Estado interactivo (useState)
- **Columnas / campos detectados:** Legajo, Usuario, Razón Social, Tipo, Estado, Fecha de registro, Subcuentas
- **Filtros por lista (enum):** SA, SRL, Activado, Registrado, Pre-activado, En progreso, Pendiente de verificación de email, Pendiente de aprobación, Suspendido, Rechazado, Deshabilitado

### Comunicación de incidentes — Admin Panel
- **Ruta:** `/admin/incidentes`
- **Capacidades detectadas:**
  - Tabla de datos (DataTable)
  - Filtros de columna
  - Estado interactivo (useState)
- **Columnas / campos detectados:** ID, Asunto, Segmento, Fecha, Estado
- **Filtros por lista (enum):** Todos, Módulo QR, Módulo Link de pago, Comercios, Usuarios activos, Enviado, Borrador
- **Acciones / botones detectados:** Enviar difusión

### Salud de módulos — Admin — Moli
- **Ruta:** `/admin/modulos`

### Sistema de Notificaciones — Admin — Moli
- **Ruta:** `/admin/notificaciones`

### Registros
- **Ruta:** `/administracion/registros`
- _No se encontró el archivo de ruta para analizar._

### Reportes
- **Ruta:** `/administracion/reportes`
- _No se encontró el archivo de ruta para analizar._

### Soporte
- **Ruta:** `/administracion/soporte`
- _No se encontró el archivo de ruta para analizar._

### Usuarios
- **Ruta:** `/administracion/usuarios`
- _No se encontró el archivo de ruta para analizar._

