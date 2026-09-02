// Tipos alineados 1:1 con el esquema REAL de Supabase (verificado vía information_schema).
// El repo local (0001_init.sql) está desactualizado; esta es la única fuente de verdad.
// Reglas clave:
//  - movimientos.estado_id  -> smallint FK a estados_movimiento.id (NO texto libre).
//  - admin_users.rol_id     -> uuid FK a roles.id (NO columna "rol" texto).
//  - comisiones_cliente.operacion = código único (text); tipo = categoría (text, 4 valores).

export type TipoPersona = "fisica" | "juridica";
export const TIPOS_PERSONA: TipoPersona[] = ["fisica", "juridica"];

export type EstadoCliente = "activo" | "suspendido" | "rechazado";
export const ESTADOS_CLIENTE: EstadoCliente[] = ["activo", "suspendido", "rechazado"];

// --- admin_users (rol_id FK a roles) --------------------------------------

export type AdminUserRow = {
  id: string;
  legajo: string;
  email: string;
  nombre: string;
  activo: boolean;
  rol_id: string;
  created_at: string;
  updated_at: string;
};

export type AdminUser = {
  id: string;
  legajo: string;
  email: string;
  nombre: string;
  activo: boolean;
  rolId: string;
  createdAt: string;
  updatedAt: string;
};

// --- clientes --------------------------------------------------------------

export type ClienteRow = {
  id: string;
  legajo: string;
  tipo_persona: TipoPersona;
  correo: string;
  nombre: string;
  cuit: string;
  estado: EstadoCliente;
  fecha_alta: string;
  created_at: string;
  updated_at: string;
};

export type Cliente = {
  id: string;
  legajo: string;
  tipoPersona: TipoPersona;
  correo: string;
  nombre: string;
  cuit: string;
  estado: EstadoCliente;
  fechaAlta: string;
  createdAt: string;
  updatedAt: string;
};

// --- comisiones_cliente ----------------------------------------------------

export type TipoOperacion = "Depósito" | "Retiro" | "Link de pago" | "E-commerce";
export type ModalidadComision = "Porcentaje" | "Fijo";
export type EstadoComision = "Habilitado" | "Deshabilitado";

export const TIPOS_OPERACION: TipoOperacion[] = [
  "Depósito",
  "Retiro",
  "Link de pago",
  "E-commerce",
];
export const ESTADOS_COMISION: EstadoComision[] = ["Habilitado", "Deshabilitado"];

export type ComisionClienteRow = {
  id: string;
  cliente_id: string;
  operacion: string;
  tipo: TipoOperacion;
  modalidad: ModalidadComision;
  porcentaje: number | null;
  monto_fijo: number | null;
  porcentaje_impuesto: number;
  estado: EstadoComision;
  descripcion: string | null;
  created_at: string;
  updated_at: string;
};

export type ComisionCliente = {
  id: string;
  clienteId: string;
  operacion: string;
  tipo: TipoOperacion;
  modalidad: ModalidadComision;
  porcentaje: number | null;
  montoFijo: number | null;
  porcentajeImpuesto: number;
  estado: EstadoComision;
  descripcion: string | null;
  createdAt: string;
  updatedAt: string;
  cliente?: {
    legajo: string;
    correo: string;
    cuit: string;
    nombre: string;
    tipoPersona: TipoPersona;
  } | null;
};

// --- movimientos (estado_id FK a estados_movimiento) ----------------------

export type MovimientoRow = {
  id: string;
  cliente_id: string;
  legajo: string;
  id_txn: string;
  tipo: string;
  cvu: string | null;
  monto_operacion: number;
  comision: number;
  impuesto: number;
  monto_cobrado: number;
  fecha: string;
  created_at: string;
  estado_id: number;
  estados_movimiento?:
    | {
        codigo: string;
        nombre: string;
        es_final: boolean;
      }[]
    | null;
  clientes?:
    | {
        correo: string;
        nombre: string;
        cuit: string;
      }[]
    | null;
};

export type Movimiento = {
  id: string;
  clienteId: string;
  legajo: string;
  idTxn: string;
  tipo: string;
  cvu: string | null;
  montoOperacion: number;
  comision: number;
  impuesto: number;
  montoCobrado: number;
  fecha: string;
  createdAt: string;
  estadoId: number;
  estadoCodigo?: string;
  estadoNombre?: string;
  esFinal?: boolean;
  cliente?: {
    correo: string;
    nombre: string;
    cuit: string;
  } | null;
};

/** Códigos de estado (estados_movimiento.codigo) para filtros de UI. */
export const ESTADOS_MOVIMIENTO_CODES = [
  "APROBADO",
  "EN_PROGRESO",
  "RECHAZADO",
  "BLOQUEADO",
  "CREADO",
  "ABIERTO",
  "EXPIRADO",
  "REEMBOLSADO",
] as const;

/** Alias legible para los filtros de UI. */
export const ESTADOS_MOVIMIENTO = ESTADOS_MOVIMIENTO_CODES;

// --- catálogos: roles / recursos / permisos / estados ---------------------

export type RolRow = {
  id: string;
  nombre: string;
  descripcion: string | null;
  created_at: string;
  updated_at: string;
};

export type Rol = {
  id: string;
  nombre: string;
  descripcion: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecursoRow = {
  id: string;
  codigo: string;
  nombre: string;
  modulo: string;
};

export type Recurso = {
  id: string;
  codigo: string;
  nombre: string;
  modulo: string;
};

export type PermisoRow = {
  id: string;
  rol_id: string;
  recurso_id: string;
  puede_leer: boolean;
  puede_crear: boolean;
  puede_modificar: boolean;
  puede_borrar: boolean;
};

export type Permiso = {
  id: string;
  rolId: string;
  recursoId: string;
  puedeLeer: boolean;
  puedeCrear: boolean;
  puedeModificar: boolean;
  puedeBorrar: boolean;
};

export type EstadoMovimientoRow = {
  id: number;
  codigo: string;
  nombre: string;
  es_final: boolean;
  requiere_conciliacion: boolean;
  created_at: string;
};

export type EstadoMovimiento = {
  id: number;
  codigo: string;
  nombre: string;
  esFinal: boolean;
  requiereConciliacion: boolean;
  createdAt: string;
};

export type EstadoPorTipoRow = {
  tipo_movimiento: string;
  estado_id: number;
};

export type EstadoPorTipo = {
  tipoMovimiento: string;
  estadoId: number;
};

// --- conciliaciones --------------------------------------------------------

export type ConciliacionRow = {
  id: string;
  movimiento_id: string;
  fecha_conciliacion: string;
  estado_conciliacion: string;
  monto_diferencia: number;
  archivo_origen: string | null;
  created_at: string;
};

export type Conciliacion = {
  id: string;
  movimientoId: string;
  fechaConciliacion: string;
  estadoConciliacion: string;
  montoDiferencia: number;
  archivoOrigen: string | null;
  createdAt: string;
};

// --- conciliaciones_archivos (persistencia de carga CSV) -------------------
export type ConciliacionArchivoRow = {
  id: string;
  nombre_archivo: string;
  fecha_carga: string;
  storage_path: string | null;
  estado: string;
  tipo: "bancaria" | "blp";
  archivo_origen: string | null;
  created_at: string;
  created_by: string | null;
};

export type ConciliacionArchivo = {
  id: string;
  nombreArchivo: string;
  fechaCarga: string;
  storagePath: string | null;
  estado: string;
  tipo: "bancaria" | "blp";
  archivoOrigen: string | null;
  createdAt: string;
  createdBy: string | null;
};

// --- comercios (tabla real: comercios / puntos_venta / codigos_categoria) --
//
// Regla de negocio (confirmada por el cliente): `comercios.legajo` es una FK
// REAL hacia `clientes.legajo` — nunca texto libre sin constraint. Cualquier
// columna `legajo` que represente a un cliente debe tener FK a `clientes.legajo`.
// La única excepción conocida es `admin_users.legajo` (namespace distinto,
// formato ADM-XXXX), que NO lleva esa FK.

export type EstadoComercio =
  "Activado" | "Desactivado" | "Pendiente de aprobación" | "Rechazado" | "Suspendido";

export const ESTADOS_COMERCIO: EstadoComercio[] = [
  "Activado",
  "Desactivado",
  "Pendiente de aprobación",
  "Rechazado",
  "Suspendido",
];

export type NivelComercio =
  "Pequeño" | "Mediano" | "Grande" | "Premium" | "Estándar" | "Básico" | "Enterprise";

export const NIVELES_COMERCIO: NivelComercio[] = [
  "Pequeño",
  "Mediano",
  "Grande",
  "Premium",
  "Estándar",
  "Básico",
  "Enterprise",
];

export type PuntoVentaRow = {
  id: string;
  comercio_id: string;
  nombre: string;
  estado: "Activado" | "Desactivado";
  created_at: string;
};

export type PuntoVenta = {
  id: string;
  comercioId: string;
  nombre: string;
  estado: "Activado" | "Desactivado";
  createdAt: string;
};

export type CodigoCategoriaRow = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  estado: "activo" | "inactivo";
  created_at: string;
  updated_at: string;
};

export type CodigoCategoria = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  estado: "activo" | "inactivo";
  createdAt: string;
  updatedAt: string;
};

export type CodigoCategoriaInput = {
  codigo: string;
  nombre: string;
  descripcion: string;
  estado?: "activo" | "inactivo";
};

export type ComercioClienteRow = {
  legajo: string;
  nombre: string;
  cuit: string;
  tipo_persona: TipoPersona;
  correo: string;
};

export type ComercioRow = {
  id: string;
  usuario: string;
  legajo: string;
  categoria_id: number | null;
  estado: EstadoComercio;
  nivel: NivelComercio;
  created_at: string;
  updated_at: string;
  clientes?:
    | {
        legajo: string;
        nombre: string;
        cuit: string;
        tipo_persona: TipoPersona;
        correo: string;
      }[]
    | null;
  codigos_categoria?: CodigoCategoriaRow[] | null;
  puntos_venta?: PuntoVentaRow[] | null;
};

export type Comercio = {
  id: string;
  usuario: string;
  legajo: string;
  cliente: {
    legajo: string;
    nombre: string;
    cuit: string;
    tipoPersona: TipoPersona;
    correo: string;
  } | null;
  categoriaId: number | null;
  categoria: CodigoCategoria | null;
  nivel: NivelComercio;
  estado: EstadoComercio;
  puntosVenta: PuntoVenta[];
  createdAt: string;
  updatedAt: string;
};

export type ComercioInput = {
  usuario: string;
  legajo: string;
  categoriaId: number | null;
  nivel: NivelComercio;
  estado: EstadoComercio;
};

export type ClienteSelect = {
  legajo: string;
  nombre: string;
  correo: string;
};

// --- resolvers (tabla real: resolvers) -------------------------------------

export type ResolverEstado = "Activo" | "Inactivo";
export const ESTADOS_RESOLVER: ResolverEstado[] = ["Activo", "Inactivo"];

export type ResolverRow = {
  id: string;
  nombre: string;
  cuit: string;
  url: string;
  estado: ResolverEstado;
  nombre_reverso: string;
  formato_web: string;
  pcp_id: string;
  id_pcp: string;
  token: string;
  as_header: boolean;
  soa: boolean;
  created_at: string;
  updated_at: string;
};

export type Resolver = {
  id: string;
  nombre: string;
  cuit: string;
  url: string;
  estado: ResolverEstado;
  nombreReverso: string;
  formatoWeb: string;
  pcpId: string;
  idPcp: string;
  token: string;
  asHeader: boolean;
  soa: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ResolverInput = {
  nombre: string;
  cuit: string;
  url: string;
  estado: ResolverEstado;
  nombreReverso: string;
  formatoWeb: string;
  pcpId: string;
  idPcp: string;
  token: string;
  asHeader: boolean;
  soa: boolean;
};

// --- APIs externas (api_usuarios / api_endpoints / api_restricciones) ------

export type EstadoApiUsuario =
  "Pendiente Validación" | "Homologación" | "Producción" | "Suspendido" | "Deshabilitado";

export const ESTADOS_API_USUARIO: EstadoApiUsuario[] = [
  "Pendiente Validación",
  "Homologación",
  "Producción",
  "Suspendido",
  "Deshabilitado",
];

export type MetodoHttp = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
export const METODOS_HTTP: MetodoHttp[] = ["GET", "POST", "PUT", "DELETE", "PATCH"];

export type GrupoEndpoint =
  "Autenticación" | "Enlaces de pago" | "QR" | "SubAccounts" | "Transfer" | "User" | "Webhooks";

export const GRUPOS_ENDPOINT: GrupoEndpoint[] = [
  "Autenticación",
  "Enlaces de pago",
  "QR",
  "SubAccounts",
  "Transfer",
  "User",
  "Webhooks",
];

export type EstadoEndpoint = "Habilitado" | "Deshabilitado";
export const ESTADOS_ENDPOINT: EstadoEndpoint[] = ["Habilitado", "Deshabilitado"];

export type EstadoRestriccion = "Restringiendo" | "No restringiendo";
export const ESTADOS_RESTRICCION: EstadoRestriccion[] = ["Restringiendo", "No restringiendo"];

// --- api_usuarios -----------------------------------------------------------

export type ApiUsuarioRow = {
  id: string;
  codigo_usuario_api: string;
  usuario: string;
  nombre_completo: string;
  estado: EstadoApiUsuario;
  created_at: string;
  updated_at: string;
};

export type ApiUsuario = {
  id: string;
  codigoUsuarioApi: string;
  usuario: string;
  nombreCompleto: string;
  estado: EstadoApiUsuario;
  createdAt: string;
  updatedAt: string;
};

export type ApiUsuarioInput = {
  codigoUsuarioApi: string;
  usuario: string;
  nombreCompleto: string;
  estado?: EstadoApiUsuario;
};

// --- api_endpoints ----------------------------------------------------------

export type ApiEndpointRow = {
  id: string;
  nombre: string;
  path: string;
  metodo: MetodoHttp;
  descripcion: string | null;
  grupo: GrupoEndpoint;
  estado: EstadoEndpoint;
  rec: boolean;
  created_at: string;
  updated_at: string;
};

export type ApiEndpoint = {
  id: string;
  nombre: string;
  path: string;
  metodo: MetodoHttp;
  descripcion: string | null;
  grupo: GrupoEndpoint;
  estado: EstadoEndpoint;
  rec: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApiEndpointInput = {
  nombre: string;
  path: string;
  metodo: MetodoHttp;
  descripcion?: string | null;
  grupo: GrupoEndpoint;
  estado: EstadoEndpoint;
  rec: boolean;
};

// --- api_restricciones ------------------------------------------------------

export type ApiRestriccionRow = {
  id: string;
  api_usuario_id: string;
  estado: EstadoRestriccion;
  fecha_creacion: string;
  fecha_expiracion: string | null;
  created_at: string;
  api_usuarios?:
    | {
        id: string;
        codigo_usuario_api: string;
        usuario: string;
        nombre_completo: string;
        estado: EstadoApiUsuario;
      }[]
    | null;
};

export type ApiRestriccion = {
  id: string;
  apiUsuarioId: string;
  apiUsuario: {
    id: string;
    codigoUsuarioApi: string;
    usuario: string;
    nombreCompleto: string;
    estado: EstadoApiUsuario;
  } | null;
  estado: EstadoRestriccion;
  fechaCreacion: string;
  fechaExpiracion: string | null;
  createdAt: string;
};

export type ApiRestriccionInput = {
  apiUsuarioId: string;
  estado: EstadoRestriccion;
  fechaExpiracion: string | null; // YYYY-MM-DD
};

// --- integraciones (catálogo) ------------------------------------------------

export type IntegracionRow = {
  id: string;
  nombre: string;
  proveedor: string;
  created_at: string;
};

export type Integracion = {
  id: string;
  nombre: string;
  proveedor: string;
  createdAt: string;
};

export type IntegracionInput = {
  id: string;
  nombre: string;
  proveedor: string;
};

// --- Notificaciones (catálogos + eventos) ------------------------------------

export type AudienciaError = "tecnico" | "admin" | "cliente";
export const AUDIENCIAS_ERROR: AudienciaError[] = ["tecnico", "admin", "cliente"];

export type CodigoErrorRow = {
  id: string;
  codigo: string;
  mensaje: string;
  audiencia: AudienciaError;
  canal_defecto: "Email" | "Telegram" | "WhatsApp";
  descripcion: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type CodigoError = {
  id: string;
  codigo: string;
  mensaje: string;
  audiencia: AudienciaError;
  canalDefecto: "Email" | "Telegram" | "WhatsApp";
  descripcion: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CodigoErrorInput = {
  codigo: string;
  mensaje: string;
  audiencia?: AudienciaError;
  canalDefecto: "Email" | "Telegram" | "WhatsApp";
  descripcion?: string | null;
  activo?: boolean;
};

export type CanalNotificacionRow = {
  id: string;
  nombre: string;
  tipo: "Email" | "Telegram" | "WhatsApp";
  configuracion: Record<string, unknown> | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type CanalNotificacion = {
  id: string;
  nombre: string;
  tipo: "Email" | "Telegram" | "WhatsApp";
  configuracion: Record<string, unknown> | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CanalNotificacionInput = {
  nombre: string;
  tipo: "Email" | "Telegram" | "WhatsApp";
  configuracion?: Record<string, unknown> | null;
  activo?: boolean;
};

export type TipoEventoNotificacion = "evento" | "incidente";
export type EstadoEntrega = "pendiente" | "enviado" | "fallido" | "reintentando";

export type EventoNotificacionRow = {
  id: string;
  tipo: TipoEventoNotificacion;
  codigo_error_id: string | null;
  titulo: string;
  mensaje: string;
  audiencia: "Admin" | "Cliente" | "Ambos";
  canal: "Email" | "Telegram" | "WhatsApp";
  estado_entrega: EstadoEntrega;
  fecha: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  codigos_error?: { codigo: string; mensaje: string }[] | null;
};

export type EventoNotificacion = {
  id: string;
  tipo: TipoEventoNotificacion;
  codigoErrorId: string | null;
  titulo: string;
  mensaje: string;
  audiencia: "Admin" | "Cliente" | "Ambos";
  canal: "Email" | "Telegram" | "WhatsApp";
  estadoEntrega: EstadoEntrega;
  fecha: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  codigoError?: { codigo: string; mensaje: string } | null;
};

export type EventoNotificacionInput = {
  tipo: TipoEventoNotificacion;
  codigoErrorId: string | null;
  titulo: string;
  mensaje: string;
  audiencia: "Admin" | "Cliente" | "Ambos";
  canal: "Email" | "Telegram" | "WhatsApp";
  metadata?: Record<string, unknown> | null;
};

export type EventoNotificacionFiltros = {
  page: number;
  pageSize: number;
  search?: string;
  tipo?: TipoEventoNotificacion;
  audiencia?: "Admin" | "Cliente" | "Ambos";
  canal?: "Email" | "Telegram" | "WhatsApp";
  estadoEntrega?: EstadoEntrega;
  fechaDesde?: string;
  fechaHasta?: string;
};

// --- impuestos -------------------------------------------------------------

export type TipoImpuesto = "Porcentaje" | "Fijo" | "Otro";
export type EstadoImpuesto = "Activo" | "Inactivo";

export type ImpuestoRow = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  tipo: TipoImpuesto;
  monto: number | null;
  estado: EstadoImpuesto;
  created_at: string;
  updated_at: string;
};

export type Impuesto = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  tipo: TipoImpuesto;
  monto: number | null;
  estado: EstadoImpuesto;
  alicuotas: Alicuota[];
  createdAt: string;
  updatedAt: string;
};

export type ImpuestoInput = {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  tipo: TipoImpuesto;
  monto: number | null;
  estado: EstadoImpuesto;
};

export type ImpuestoFilters = Pagination & {
  search?: string;
  estado?: EstadoImpuesto;
};

export type AlicuotaRow = {
  id: string;
  impuesto_id: string;
  codigo: string;
  tasa: number;
  descripcion: string | null;
  estado: "Activo" | "Inactivo";
  created_at: string;
  updated_at?: string;
};

export type Alicuota = {
  id: string;
  impuestoId: string;
  codigo: string;
  tasa: number;
  descripcion: string | null;
  estado: "Activo" | "Inactivo";
  createdAt: string;
  updatedAt: string;
};

export type AlicuotaInput = {
  impuesto_id: string;
  codigo: string;
  tasa: number;
  descripcion?: string | null;
  estado: "Activo" | "Inactivo";
};

export type AlicuotaFilters = Pagination & {
  impuesto_id?: string;
  search?: string;
  estado?: "Activo" | "Inactivo";
};

export type ImpuestoAsignacionRow = {
  id: string;
  legajo: string;
  impuesto_id: string;
  tipo: TipoImpuesto;
  monto: number | null;
  estado: EstadoImpuesto;
  fecha_asignacion: string | null;
  impuestos?: { codigo: string; nombre: string; tipo: TipoImpuesto; monto: number | null }[] | null;
  clientes?:
    | { legajo: string; nombre: string; cuit: string; tipo_persona: TipoPersona; correo: string }[]
    | null;
};

export type ImpuestoAsignacion = {
  id: string;
  clienteLegajo: string;
  impuestoId: string;
  tipo: TipoImpuesto;
  monto: number | null;
  estado: EstadoImpuesto;
  fechaAsignacion: string | null;
  impuesto: { codigo: string; nombre: string; tipo: TipoImpuesto; monto: number | null } | null;
  cliente: {
    legajo: string;
    nombre: string;
    cuit: string;
    tipoPersona: TipoPersona;
    correo: string;
  } | null;
};

export type ImpuestoAsignacionInput = {
  cliente_legajo: string;
  impuesto_id: string;
  tipo: TipoImpuesto;
  monto: number | null;
  estado: EstadoImpuesto;
  fecha_asignacion?: string | null;
};

export type ImpuestoAsignacionFilters = Pagination & {
  search?: string;
  cliente_legajo?: string;
  impuesto_id?: string;
  estado?: EstadoImpuesto;
};

export type EstadoPadron = "Cargando" | "Procesando" | "Finalizado" | "Error";

export type IbPadronRow = {
  id: string;
  impuesto_id: string;
  nombre: string;
  archivo: string;
  estado: EstadoPadron;
  progreso: number;
  created_at: string;
};

export type IbPadron = {
  id: string;
  impuestoId: string;
  nombre: string;
  archivo: string;
  estado: EstadoPadron;
  progreso: number;
  createdAt: string;
};

export type IbPadronInput = {
  impuesto_id: string;
  nombre: string;
  archivo: string;
  estado?: EstadoPadron;
  progreso?: number;
};

export type IbPadronFilters = Pagination & {
  search?: string;
  impuesto_id?: string;
  estado?: EstadoPadron;
};

export type IbNormalizacionPreviewRow = {
  id: string;
  padron_id: string;
  kpis_json: Record<string, unknown> | null;
  creados_json: unknown[] | null;
  desactivados_json: unknown[] | null;
  omitidos_json: unknown[] | null;
  aplicado: boolean;
  created_at: string;
};

export type IbNormalizacionPreview = {
  id: string;
  padronId: string;
  kpisJson: Record<string, unknown> | null;
  creadosJson: unknown[] | null;
  desactivadosJson: unknown[] | null;
  omitidosJson: unknown[] | null;
  aplicado: boolean;
  createdAt: string;
};

export type IbNormalizacionPreviewInput = {
  padron_id: string;
  kpis_json?: Record<string, unknown> | null;
  creados_json?: unknown[] | null;
  desactivados_json?: unknown[] | null;
  omitidos_json?: unknown[] | null;
  aplicado?: boolean;
};

export type IbNormalizacionPreviewFilters = Pagination & {
  padron_id?: string;
  aplicado?: boolean;
};

export type DireccionDcExcepcion = "Entrantes" | "Salientes";
export type TipoDcExcepcion = "Alta manual" | "Convenio multilateral" | "Exención";

export type DcExcepcionRow = {
  id: string;
  usuario: string;
  cuit: string;
  tipo: TipoDcExcepcion;
  direccion: DireccionDcExcepcion;
  motivo: string | null;
  vigencia_desde: string | null;
  vigencia_hasta: string | null;
  autorizacion_codigo: string | null;
  estado: EstadoImpuesto;
  fecha_creacion: string;
  fecha_actualizacion: string;
};

export type DcExcepcion = {
  id: string;
  email: string;
  cuit: string;
  tipo: TipoDcExcepcion;
  direccion: DireccionDcExcepcion;
  motivo: string | null;
  vigenciaDesde: string | null;
  vigenciaHasta: string | null;
  autorizacionCodigo: string | null;
  estado: EstadoImpuesto;
  createdAt: string;
  updatedAt: string;
};

export type DcExcepcionInput = {
  email: string;
  cuit: string;
  tipo: TipoDcExcepcion;
  direccion: DireccionDcExcepcion;
  motivo?: string | null;
  vigencia_desde?: string | null;
  vigencia_hasta?: string | null;
  autorizacion_codigo?: string | null;
  estado: EstadoImpuesto;
};

export type DcExcepcionFilters = Pagination & {
  search?: string;
  cuit?: string;
  direccion?: DireccionDcExcepcion;
  estado?: EstadoImpuesto;
};

export type DcSyncRetroactivoRow = {
  id: string;
  cuit: string;
  desde: string;
  hasta: string;
  preview_json: Record<string, unknown> | null;
  aplicado: boolean;
  created_at: string;
};

export type DcSyncRetroactivo = {
  id: string;
  cuit: string;
  desde: string;
  hasta: string;
  previewJson: Record<string, unknown> | null;
  aplicado: boolean;
  createdAt: string;
};

export type DcSyncRetroactivoInput = {
  cuit: string;
  desde: string;
  hasta: string;
  preview_json?: Record<string, unknown> | null;
  aplicado?: boolean;
};

export type DcSyncRetroactivoFilters = Pagination & {
  search?: string;
  cuit?: string;
  aplicado?: boolean;
};

// --- util ------------------------------------------------------------------

export type Pagination = {
  page: number;
  pageSize: number;
};

export type Page<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
};
