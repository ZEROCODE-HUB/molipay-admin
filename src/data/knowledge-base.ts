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
    ],
    response:
      "Una transacción nace EN PROGRESO: el saldo se descuenta para el cliente, pero el dinero aún no salió realmente. La plataforma espera confirmación de la cuenta recaudadora del banco. Si confirma, se genera el ID COELSA —prueba definitiva de salida— y pasa a APROBADO. Si no, pasa a RECHAZADO y el saldo se revierte. Moli solo disponibiliza saldos; la verdad de si el dinero se movió vive en la cuenta recaudadora, y COELSA la certifica.",
  },
  {
    keywords: ["impuesto", "ganancias", "ingresos brutos", "retención", "débito", "crédito"],
    response:
      "Moli maneja dos tipos de impuestos, totalmente separados.\n\n(1) Impuestos propios de Molly: Ganancias (anual) e Ingresos Brutos sobre su comisión — es ganancia del negocio, gestionada por su contabilidad, no afecta al cliente.\n\n(2) Impuestos retenidos al cliente: Molly es agente de retención, no pagador. Se retienen dos impuestos por operación — Débito/crédito (0,6% en ingresos, 0,6% en egresos, transferido mensualmente) e Ingresos Brutos del cliente (porcentaje variable según base del organismo fiscal, transferido cada 10 días). Ese dinero nunca es ganancia de Molly: se retiene transitoriamente y se transfiere al organismo.",
  },
  {
    keywords: ["alerta", "bloqueo", "compliance", "suspender", "suspensión"],
    response:
      "Alerta = solo notifica, queda pendiente de revisión manual. Bloqueo = suspende la cuenta automáticamente hasta revisión de compliance.",
  },
  {
    keywords: [
      "comercios",
      "comercio",
      "pago por referencia",
      "transferencia",
      "link de pago",
      "apis externas",
    ],
    response:
      "La sección Comercios agrupa los módulos que usan los comercios para operar:\n\n• Gestión de comercios: listado centralizado de comercios con alta, edición y asociación a los canales de la plataforma.\n• Pago con transferencia (Transferencia): comercios habilitados para pagos con transferencia (PCT), con su conciliación y códigos de categoría.\n• Link de pago: cobro mediante un link, con métodos de pago configurables por comercio.\n• Impuestos: catálogo de impuestos, ingresos brutos, débitos/créditos y asignación a usuarios.\n• APIs externas: usuarios, endpoints, restricciones y resolvers de integración.",
  },
  {
    keywords: ["link de pago", "link-pago", "cobrar link", "métodos de pago", "medio de pago"],
    response:
      "Link de pago permite cobrar a un cliente mediante un link generado. Se configuran los métodos de pago (medios) disponibles por comercio, y se puede consultar el detalle y edición de cada método.",
  },
  {
    keywords: ["resolver", "resolvers", "pct", "pago con transferencia", "activar resolver"],
    response:
      "Los Resolvers PCT son las integraciones con los bancos/entidades para pagos con transferencia. Desde su sección se pueden activar, desactivar y editar (CUIT, nombre, URL, token, PCP ID, ID del PCP, formato web, nombre reverso, y los flags As header y SOA).",
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
    keywords: ["afip", "b-8-1-25", "b-8-1-26", "parámetros para reportes", "monto de transacción"],
    response:
      "Reportes AFIP: tabla con los regímenes B-8-1-25 y B-8-1-26 por fecha, con descarga Excel. Antes de generar se configuran los 'Parámetros para reportes' (monto de transacción por mes y monto de saldo a fin de mes); esos parámetros quedan incluidos en los reportes descargados.",
  },
  {
    keywords: ["comisiones", "reporte en curso", "período comisiones"],
    response:
      "Reportes de Comisiones: un reporte por período (primer día de mes). El período actual se marca como 'Reporte en curso' (badge y banner), con las comisiones acumuladas hasta el momento.",
  },
  {
    keywords: ["movimientos reporte", "reporte de movimientos", "buscar por cuit", "cuit"],
    response:
      "Reportes de Movimientos: se busca por CUIT (11 dígitos) y se listan los resultados en una tabla (Tipo Depósito/Retiro, Fecha, Detalle, Monto, Estado). Se puede descargar el Excel de los movimientos del CUIT consultado.",
  },
  {
    keywords: ["actividad de usuarios", "actividad usuarios", "legajo", "reporte actividad"],
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
    ],
    response:
      "Reportes de Impuestos: tabla paginada por Período (YYYY-MM), Tramo (1/2/3), Fecha de creación, Presentado y Pagado, con acciones Ver detalle, Descargar TXT y Descargar ZIP. 'Ver detalle' muestra información del reporte, KPIs (registros, movimientos, monto, retenciones) y estado, y permite 'Marcar como presentado' / 'Marcar como pagado'. 'Generar reporte' crea uno nuevo a partir de Fecha, Impuesto y Tramo.",
  },
  {
    keywords: ["usuarios backoffice", "roles", "personal", "administración usuarios"],
    response:
      "Administración → Usuarios backoffice: gestión del personal interno y sus roles. Desde aquí se administran las cuentas que operan el panel y sus permisos.",
  },
  {
    keywords: ["registros", "fondos", "actividad registros", "administración registros"],
    response:
      "Administración → Registros: agrupa el seguimiento de Fondos y la Actividad del sistema (movimientos de fondos y auditoría de operaciones).",
  },
  {
    keywords: ["soporte", "consultas frecuentes", "bloqueo de funciones", "administración soporte"],
    response:
      "Administración → Soporte: incluye Consultas frecuentes (FAQ de backoffice) y Bloqueo de funciones (habilta/deshabilita funcionalidades de la plataforma).",
  },
  {
    keywords: ["usuarios general", "personas físicas", "jurídicas", "cvu", "comisiones usuario"],
    response:
      "General → Usuarios: personas físicas, personas jurídicas, CVU y comisiones. Es el ABC de las cuentas de los usuarios de la plataforma.",
  },
  {
    keywords: ["movimientos general", "tipos de movimiento", "8 tipos"],
    response:
      "General → Movimientos: agrupa los 8 tipos de movimiento de la plataforma (depósitos, retiros, pagos QR, cobros QR, pagos con tarjeta, comisiones, impuestos, entre otros) para su consulta y análisis.",
  },
  {
    keywords: ["alertas general", "parámetros de alertas", "configuración de alertas"],
    response:
      "General → Alertas: listados de alertas y sus parámetros de configuración, para ajustar umbrales y reglas de notificación.",
  },
  {
    keywords: ["configuración", "integraciones", "notificaciones", "logins", "configuraciones"],
    response:
      "Configuración: Integraciones (conexiones externas), Notificaciones, Logins y Configuraciones generales de la plataforma.",
  },
  {
    keywords: ["apis externas", "endpoints", "restricciones api", "apis comercios"],
    response:
      "Comercios → APIs externas: gestión de endpoints de integración y sus restricciones de acceso para los comercios.",
  },
  {
    keywords: ["módulos", "salud de módulos", "sistema módulos"],
    response:
      "Sistema → Salud de módulos: panel de estado de los servicios/módulos de la plataforma (API Pública, KYC, conciliación, impuestos, transferencias, etc.).",
  },
];
