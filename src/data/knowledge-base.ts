export type KbEntry = {
  keywords: string[];
  response: string;
};

export const KB: KbEntry[] = [
  {
    keywords: [
      "transacción",
      "movimiento",
      "estado",
      "COELSA",
      "en progreso",
      "aprobado",
      "rechazado",
      "pendiente",
      "saldo",
      "recaudadora",
    ],
    response:
      "Una transacción nace EN PROGRESO: el saldo se descuenta para el cliente, pero el dinero aún no salió realmente. La plataforma espera confirmación de la cuenta recaudadora del banco. Si confirma, se genera el ID COELSA —prueba definitiva de salida— y pasa a APROBADO. Si no, pasa a RECHAZADO y el saldo se revierte. Moli solo disponibiliza saldos; la verdad de si el dinero se movió vive en la cuenta recaudadora, y COELSA la certifica.",
  },
  {
    keywords: [
      "consultar id",
      "id de coelsa",
      "id coelsa",
      "coelsa consulta",
      "buscar depósito",
      "buscar retiro",
      "consultas frecuentes",
    ],
    response:
      "En Administración → Soporte → Consultas frecuentes podés consultar depósitos y retiros por ID de Coelsa (ej: COE-1293 para depósitos, COE-8841 para retiros). Elegís Depósito o Retiro, ingresás el ID y presionás Consultar. El resultado muestra Legajo, Nombre, Email, Monto, Estado (Acreditado/Pendiente/Rechazado), Fecha, y los datos del tercero (nombre, CVU y CUIT).",
  },
  {
    keywords: ["impuesto", "ganancias", "retención"],
    response:
      "Moli maneja dos tipos de impuestos, totalmente separados.\n\n(1) Impuestos propios de Molly: Ganancias (anual) e Ingresos Brutos sobre su comisión — es ganancia del negocio, gestionada por su contabilidad, no afecta al cliente.\n\n(2) Impuestos retenidos al cliente: Molly es agente de retención, no pagador. Se retienen dos impuestos por operación — Débito/crédito (0,6% en ingresos, 0,6% en egresos, transferido mensualmente) e Ingresos Brutos del cliente (porcentaje variable según base del organismo fiscal, transferido cada 10 días). Ese dinero nunca es ganancia de Molly: se retiene transitoriamente y se transfiere al organismo.",
  },
  {
    keywords: ["alerta", "bloqueo", "compliance", "suspender", "suspensión", "cuenta bloqueada"],
    response:
      "Alerta = solo notifica, queda pendiente de revisión manual. Bloqueo = suspende la cuenta automáticamente hasta revisión de compliance.",
  },
  {
    keywords: ["parámetros de alertas", "umbral alertas", "límite depósitos", "reglas de alerta"],
    response:
      "General → Alertas → Parámetros de alertas: se configuran los umbrales y reglas que generan alertas (por ejemplo 'Límite de depósitos excedidos'). Las alertas solo notifican y quedan pendientes de revisión manual; no suspenden la cuenta por sí solas.",
  },
  {
    keywords: ["parámetros de bloqueos", "umbral bloqueo", "bloqueo automático"],
    response:
      "General → Alertas → Parámetros de bloqueos: se configuran los umbrales que activan el bloqueo automático de una cuenta hasta revisión de compliance. A diferencia de las alertas, un bloqueo sí suspende la cuenta.",
  },
  {
    keywords: [
      "listado de bloqueos",
      "lista de bloqueos",
      "cuentas bloqueadas",
      "gestionar bloqueos",
      "bloqueos activos",
    ],
    response:
      "General → Alertas → Listado de bloqueos: gestión de cuentas bloqueadas automáticamente. Desde acá se revisan y administran los bloqueos generados por los parámetros de bloqueo.",
  },
  {
    keywords: [
      "comercios",
      "comercio",
      "pago por referencia",
      "transferencia",
      "link de pago",
      "gestión de comercios",
    ],
    response:
      "La sección Comercios agrupa los módulos que usan los comercios para operar:\n\n• Gestión de comercios: listado centralizado de comercios con alta, edición y asociación a los canales de la plataforma.\n• Pago con transferencia (Transferencia): comercios habilitados para pagos con transferencia (PCT), con su conciliación y códigos de categoría.\n• Link de pago: cobro mediante un link, con métodos de pago configurables por comercio.\n• Impuestos: catálogo de impuestos, ingresos brutos, débitos/créditos y asignación a usuarios.\n• APIs externas: usuarios, endpoints, restricciones y resolvers de integración.",
  },
  {
    keywords: [
      "gestion de comercios",
      "alta de comercio",
      "nuevo comercio",
      "asociar canal",
      "desasociar",
      "suspender comercio",
    ],
    response:
      "Gestión de comercios (Comercios → Gestión de comercios) es el listado centralizado de todos los comercios. Desde acá se puede: crear un comercio nuevo (usuario, legajo, nombre, categoría, nivel, estado), editar, ver el detalle con sus canales y puntos de venta, y eliminar. También se asocian/desasocian los canales PCT (pago con transferencia) y Link de pago, y se activa o suspende el comercio. Los cambios se reflejan en las demás vistas de Comercios.",
  },
  {
    keywords: [
      "link de pago",
      "link-pago",
      "cobrar link",
      "métodos de pago",
      "medio de pago",
      "agregar método",
    ],
    response:
      "Link de pago permite cobrar a un cliente mediante un link generado. Se configuran los métodos de pago (medios) disponibles por comercio, y se puede consultar el detalle y edición de cada método. En Comercios → Link de pago se administran los comercios habilitados para este canal (con su estado de aprobación) y en la pestaña 'Métodos de pago' los medios configurados.",
  },
  {
    keywords: ["métodos de pago link", "medios de pago link", "métodos de pago"],
    response:
      "Comercios → Link de pago → Métodos de pago: gestión de los métodos (medios) de pago disponibles para cobrar por link, con su configuración por comercio.",
  },
  {
    keywords: [
      "resolver",
      "resolvers",
      "pct",
      "pago con transferencia",
      "activar resolver",
      "debin",
    ],
    response:
      "Los Resolvers PCT son las integraciones con los bancos/entidades para pagos con transferencia. Desde su sección (Comercios → APIs externas → Resolvers) se pueden activar, desactivar y editar (CUIT, nombre, URL, token, PCP ID, ID del PCP, formato web, nombre reverso, y los flags As header y SOA).",
  },
  {
    keywords: ["códigos de categoría", "categoría transferencia", "códigos categoría"],
    response:
      "Comercios → Pago con transferencia → Códigos de categoría: administración de los códigos de categoría usados para las organizaciones en los pagos con transferencia.",
  },
  {
    keywords: [
      "usuarios con impuestos",
      "asignación impuestos",
      "impuestos a usuarios",
      "historial asignaciones",
    ],
    response:
      "Comercios → Impuestos → Usuarios con impuestos: historial de asignaciones de impuestos a usuarios. Acá se ve qué impuestos están aplicados a cada usuario.",
  },
  {
    keywords: [
      "débitos y créditos",
      "impuesto débito",
      "impuesto credito",
      "preview débito",
      "retención tarjeta",
    ],
    response:
      "Comercios → Impuestos → Débitos y créditos: gestión de las retenciones por débito y crédito (0,6% en ingresos y 0,6% en egresos, transferido mensualmente al organismo). Permite crear excepciones y ver un preview de cómo impacta la retención.",
  },
  {
    keywords: [
      "ingresos brutos",
      "impuesto ingresos brutos",
      "reportes ingresos brutos",
      "padrón ingresos",
    ],
    response:
      "Comercios → Impuestos → Ingresos brutos: gestión del impuesto de Ingresos Brutos del cliente. Incluye reportes por período (con estado de presentación y pago) y el padrón de Ingresos Brutos. Se retiene al cliente según la base del organismo fiscal y se transfiere cada 10 días; nunca es ganancia de Molly.",
  },
  {
    keywords: ["reportes", "reporte", "administración reportes"],
    response:
      "En Administración → Reportes hay un hub con tarjetas para cada tipo: Conciliaciones Bancarias, Reportes BCRA, Reportes AFIP, Reportes de Comisiones, Reportes de Movimientos, Actividad de Usuarios, Reportes de Impuestos y Conciliaciones BLP. Cada uno abre su propia vista con tablas, filtros y descargas.",
  },
  {
    keywords: [
      "conciliación bancaria",
      "conciliaciones bancarias",
      "analizar conciliación",
      "cargar archivo banco",
    ],
    response:
      "Conciliaciones Bancarias: el banco sube diariamente las transacciones. Se puede 'Cargar nuevo archivo' (nombre, fecha y archivo CSV/Excel) y 'Analizar' cualquier archivo; el análisis muestra resumen general, estadísticas, depósitos, retiros, fecha del análisis e IDs no encontrados, y permite descargar el archivo original.",
  },
  {
    keywords: [
      "bcra",
      "bsra",
      "siscen",
      "régimen informativo",
      "apartado a",
      "apartado b",
      "padrón",
    ],
    response:
      "Reportes BCRA (BSRA): incluye tarjetas de estado (SISCEN presentado, régimen de transparencia, información de clientes) y una tabla con Apartado A (CSV), Apartado B (XLS) y Padrón (XLS) por fecha (primer día de mes). Los botones descargan cada archivo.",
  },
  {
    keywords: [
      "afip",
      "reporte afip",
      "reportes afip",
      "b-8-1-25",
      "b-8-1-26",
      "b 8 1 25",
      "b 8 1 26",
      "parámetros para reportes",
      "monto de transacción",
      "monto de saldo",
    ],
    response:
      "Reportes AFIP: tabla con los regímenes B-8-1-25 y B-8-1-26 por fecha, con descarga Excel. Antes de generar se configuran los 'Parámetros para reportes' (monto de transacción por mes y monto de saldo a fin de mes); esos parámetros quedan incluidos en los reportes descargados.",
  },
  {
    keywords: ["comisiones", "reporte en curso", "período comisiones", "reportes de comisiones"],
    response:
      "Reportes de Comisiones: un reporte por período (primer día de mes). El período actual se marca como 'Reporte en curso' (badge y banner), con las comisiones acumuladas hasta el momento.",
  },
  {
    keywords: [
      "movimientos reporte",
      "reporte de movimientos",
      "reportes de movimientos",
      "buscar por cuit",
      "cuit",
      "reporte movimientos",
    ],
    response:
      "Reportes de Movimientos: se busca por CUIT (11 dígitos) y se listan los resultados en una tabla (Tipo Depósito/Retiro, Fecha, Detalle, Monto, Estado). Se puede descargar el Excel de los movimientos del CUIT consultado.",
  },
  {
    keywords: [
      "actividad de usuarios",
      "actividad usuarios",
      "legajo",
      "reporte actividad",
      "actividad backoffice",
    ],
    response:
      "Actividad de Usuarios: se busca por Legajo y rango de fechas. La tabla muestra Legajo, Email, Fecha, Hora, Tipo de transacción, Monto, Estado, Nombre, Destino, CUIT, Destinatario, CVU y CVU de balance; se puede exportar a Excel con esos mismos campos.",
  },
  {
    keywords: [
      "conciliación blp",
      "conciliaciones blp",
      "payway",
      "liquidada payway",
      "no requiere análisis",
      "cargar archivo blp",
    ],
    response:
      "Conciliaciones BLP: tabla de archivos Payway (pagos y liquidaciones) con Nombre del archivo, Fecha, y acciones Descargar y Analizar conciliación. Sólo se analizan los archivos en estado Presentada o Liquidada; si no lo están, el sistema indica que 'no requiere análisis'. También se puede 'Cargar nuevo archivo' (nombre, fecha y archivo BLP).",
  },
  {
    keywords: [
      "reporte de impuestos",
      "impuestos reporte",
      "tramo",
      "presentado",
      "pagado",
      "generar reporte",
      "descargar txt",
      "descargar zip",
    ],
    response:
      "Reportes de Impuestos: tabla paginada por Período (YYYY-MM), Tramo (1/2/3), Fecha de creación, Presentado y Pagado, con acciones Ver detalle, Descargar TXT y Descargar ZIP. 'Ver detalle' muestra información del reporte, KPIs (registros, movimientos, monto, retenciones) y estado, y permite 'Marcar como presentado' / 'Marcar como pagado'. 'Generar reporte' crea uno nuevo a partir de Fecha, Impuesto y Tramo.",
  },
  {
    keywords: [
      "usuarios backoffice",
      "roles",
      "personal",
      "administración usuarios",
      "cambiar contraseña",
      "staff",
      "equipo",
    ],
    response:
      "Administración → Usuarios backoffice: gestión del personal interno que opera el panel. Desde acá se administran las cuentas (nombre, apellido, email, rol y estado), se puede ver el detalle, editar, cambiar la contraseña y eliminar usuarios. Los estados posibles incluyen Activado, Desactivado, No verificado, Pendiente de verificación de email, Suspendido y Pendiente de validación.",
  },
  {
    keywords: [
      "roles y permisos",
      "rol admin",
      "rol compliance",
      "rol management",
      "rol accounting",
      "rol reader",
      "permisos",
      "recursos",
    ],
    response:
      "Administración → Usuarios → Roles y permisos: define los roles del backoffice y sus permisos por recurso (Usuarios, Movimientos, Alertas, Soporte, Backoffice, Reportes, Registros, Módulos, Configuración, Incidentes). Cada permiso tiene Leer, Modificar, Crear y Borrar. Roles base: Admin (todo), Compliance (lectura + modifica Alertas/Usuarios), Management (lectura + modifica todo salvo Configuración, crea Reportes/Incidentes), Accounting (solo lectura de Movimientos/Reportes/Registros), Reader (solo lectura) y User (sin permisos). Se pueden crear y editar roles.",
  },
  {
    keywords: [
      "registros",
      "fondos",
      "actividad registros",
      "administración registros",
      "fondos por usuario",
      "subcuentas",
    ],
    response:
      "Administración → Registros → Fondos por usuario: listado de los fondos de cada usuario con sus subcuentas (un mismo legajo puede tener varios CVU con distintos saldos). Muestra Legajo, Email, Nombre, CVU, Alias, Balance y Estado, con alertas de diferencias vs. banco. Permite ver el detalle de cada fondo y descargar el Excel.",
  },
  {
    keywords: [
      "total de fondos",
      "control crítico",
      "diferencia banco",
      "formula 1",
      "formula 2",
      "interno de usuarios",
      "impuestos cobrados",
    ],
    response:
      "Administración → Registros → Total de fondos: control crítico que detecta cuándo MoliPay informa a los clientes un monto mayor al real en la cuenta recaudadora. Usa dos fórmulas en ARS:\n\n• Fórmula 1: Interno de usuarios + Impuestos cobrados − Banco.\n• Fórmula 2: Interno de usuarios (nuevo) − Banco.\n\nSi la diferencia da negativa se marca en rojo; el objetivo es que siempre cuadre con el banco.",
  },
  {
    keywords: [
      "soporte",
      "consultas frecuentes",
      "bloqueo de funciones",
      "administración soporte",
      "bloqueo por función",
      "habilitar función",
      "deshabilitar función",
    ],
    response:
      "Administración → Soporte:\n\n• Consultas frecuentes: consultá depósitos y retiros por ID de Coelsa.\n• Bloqueo de funciones: habilita/deshabilita funcionalidades de la plataforma para todos o para un usuario puntual. Los tipos de bloqueo son Login, Registro, Depósito, Retiro, Transferencia interna y Comprar.",
  },
  {
    keywords: ["usuarios general", "personas físicas", "jurídicas", "cvu", "comisiones usuario"],
    response:
      "General → Usuarios: es el ABC de las cuentas de los usuarios de la plataforma, con pestañas:\n\n• Personas físicas: listado de usuarios (legajo, correo, nombres, apellidos, estado, fecha de registro) con acciones como suspender o eliminar.\n• Personas jurídicas: gestión de empresas.\n• Usuarios con CVU: habilitación de CVU.\n• Carga de comisiones: asignación de comisiones por usuario.",
  },
  {
    keywords: [
      "ficha de usuario",
      "detalle usuario",
      "ver usuario",
      "perfil usuario",
      "consulta usuario por legajo",
    ],
    response:
      "General → Usuarios → Ficha de usuario: desde el listado de personas físicas se accede a la ficha completa de un usuario (ruta /admin/general/usuarios/$legajo) con toda su información y operaciones.",
  },
  {
    keywords: [
      "personas jurídicas",
      "empresas",
      "reactivar persona jurídica",
      "reactivar juridica",
      "gestión de empresas",
    ],
    response:
      "General → Usuarios → Personas jurídicas: gestión de las empresas registradas en la plataforma, incluyendo la reactivación de personas jurídicas.",
  },
  {
    keywords: ["usuarios con cvu", "habilitar cvu", "sincronización cvu", "cvu de usuario"],
    response:
      "General → Usuarios → Usuarios con CVU: listado y gestión de los usuarios que tienen CVU, permitiendo habilitar la funcionalidad de CVU.",
  },
  {
    keywords: [
      "carga de comisiones",
      "comisiones por usuario",
      "deshabilitar comisión",
      "asignar comisión",
    ],
    response:
      "General → Usuarios → Carga de comisiones: asignación de comisiones a los usuarios, con la opción de deshabilitar la comisión de un usuario puntual.",
  },
  {
    keywords: [
      "movimientos",
      "movimientos general",
      "tipos de movimiento",
      "8 tipos",
      "todos los movimientos",
    ],
    response:
      "General → Movimientos: agrupa todos los movimientos de la plataforma en pestañas:\n\n• Todos los movimientos: historial completo (depósitos, retiros, comisiones, impuestos, pagos/cobros QR, tarjeta, etc.) con estado APROBADO / EN PROGRESO / RECHAZADO y detalle por movimiento.\n• Depósitos, Retiros, Cobro de comisiones, Impuestos cobrados, Pagos con tarjeta, Pagos QR y Cobros QR: cada pestaña filtra el historial por tipo.",
  },
  {
    keywords: [
      "alertas general",
      "parámetros de alertas",
      "configuración de alertas",
      "listado de alertas",
      "alertas pendientes",
      "revisar alerta",
      "marcar revisada",
    ],
    response:
      "General → Alertas: listado de alertas (depósito excedido, intento fallido, transferencia repetida, horario inusual, etc.) con estado Pendiente/Revisado/Resuelto. Incluye pestañas para ver el detalle, revisar y resolver cada alerta, y la configuración de Parámetros de alertas y Parámetros de bloqueos.",
  },
  {
    keywords: [
      "configuración",
      "integraciones",
      "logins",
      "configuraciones",
      "gestor de integraciones",
    ],
    response:
      "Configuración:\n\n• Gestor de Integraciones (Configuración): panel de estado de los logins de integración (Wondersoft QR, Pago Mis Cuentas, BDC Conecta, Coelsa CPF/CVU/DEBIN) con salud, última/próxima ejecución y ejecuciones totales. En modo desarrollador se ven controles técnicos (configurar logs, ejecutar todos o uno específico, actualizar datos).\n• Configuraciones de login: tabla de las URLs y métodos de cada login configurado.\n• Logins configurados: programación (cron), última/próxima ejecución, tiempo restante y ejecuciones de cada login.",
  },
  {
    keywords: [
      "configuraciones de login",
      "url de login",
      "método login",
      "endpoint login",
      "login providers",
    ],
    response:
      "Configuración → Configuraciones de login: tabla con cada login de integración, su URL y método HTTP (POST). Incluye Wondersoft, Pago Mis Cuentas, BDC Conecta y las integraciones de Coelsa (CPF, CVU, DEBIN).",
  },
  {
    keywords: [
      "logins configurados",
      "programación cron",
      "próxima ejecución",
      "ejecuciones login",
    ],
    response:
      "Configuración → Logins configurados: detalle de cada login de integración con su programación (cron, por ej. */15 * * * *), última y próxima ejecución, tiempo restante y total de ejecuciones.",
  },
  {
    keywords: [
      "apis externas",
      "endpoints",
      "restricciones api",
      "apis comercios",
      "super accounts",
      "subaccounts",
      "sub cuentas",
    ],
    response:
      "Comercios → APIs externas: gestión de la integración con los comercios:\n\n• Usuarios: usuarios de API habilitados, con su estado de integración.\n• Endpoints: endpoints de integración (incluye SubAccounts y el flag REC Sí/No) y su estado.\n• Restricciones: restricciones de acceso para los comercios.\n• Resolvers: integraciones con bancos/entidades para PCT.",
  },
  {
    keywords: [
      "endpoints",
      "subaccounts",
      "rec",
      "endpoint activar",
      "endpoint desactivar",
      "flag rec",
    ],
    response:
      "Comercios → APIs externas → Endpoints: lista los endpoints de integración disponibles (por ejemplo SubAccounts) con un flag REC (Sí/No). Se pueden activar, desactivar y ver el detalle de cada endpoint.",
  },
  {
    keywords: [
      "restricciones",
      "nueva restricción",
      "editar restricción",
      "restricciones api",
      "restringir comercio",
    ],
    response:
      "Comercios → APIs externas → Restricciones: restricciones de acceso/configuración para los comercios. Se pueden crear con 'Nueva restricción', editar y eliminar cada una.",
  },
  {
    keywords: [
      "módulos",
      "salud de módulos",
      "sistema módulos",
      "estado módulos",
      "estado servicios",
      "kyc",
      "kyb",
      "api pública",
      "webhooks",
    ],
    response:
      "Sistema → Salud de módulos: panel de estado de los servicios/módulos de la plataforma (API Pública, Procesador CVU, QR Realtime, Webhooks, Conciliación Batch, Módulo de Pagos, KYC/KYB, Notificaciones, Módulo de Impuestos, Transferencias). Cada módulo muestra Operativo/Degradado/Caído y su latencia, con estadísticas generales (totales, operativos, degradados, caídos y latencia promedio).",
  },
  {
    keywords: [
      "incidentes",
      "comunicación de incidentes",
      "mensaje de difusión",
      "nuevo mensaje",
      "segmento",
      "mantenimiento",
      "borrador",
      "enviado",
    ],
    response:
      "Comunicación → Incidentes: notificación proactiva a clientes ante incidentes o mantenimientos. Permite crear un 'Nuevo mensaje de difusión' (asunto, contenido y segmento: Todos, Módulo QR, Módulo Link de pago, Comercios, Usuarios activos). Hay un historial con estado Enviado o Borrador, y se puede ver el detalle de cada mensaje.",
  },
  {
    keywords: [
      "notificaciones",
      "centro de notificaciones",
      "eventos de negocio",
      "destinatarios",
      "canal telegram",
      "canal whatsapp",
      "canal email",
      "entregado",
    ],
    response:
      "Sistema → Notificaciones: centro de notificaciones de eventos de negocio (timeout con AFIP, procesador de pagos caído, acceso sospechoso, KYC vencido, etc.). Cada evento muestra a quién afecta, destinatarios (Admin, Cliente o Ambos), canal (Email, Telegram o WhatsApp) y si fue entregado.",
  },
];
