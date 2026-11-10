// Tipos alineados 1:1 con el esquema REAL de Supabase (verificado vía information_schema).
// El repo local (0001_init.sql) está desactualizado; esta es la única fuente de verdad.
// Reglas clave:
//  - movimientos.estado_id  -> smallint FK a estados_movimiento.id (NO texto libre).
//  - admin_users.rol_id     -> uuid FK a roles.id (NO columna "rol" texto).
//  - comisiones_cliente.operacion = código único (text); tipo = categoría (text, 4 valores).

export type KindPerson = "fisica" | "juridica";
export const KINDS_PERSON: KindPerson[] = ["fisica", "juridica"];

export type StatusCustomer =
  | "pendiente_verificacion"
  | "registrado"
  | "preactivado"
  | "activado"
  | "suspendido"
  | "deshabilitado"
  | "eliminado"
  // legacy compat (datos existentes antes de 0019)
  | "activo"
  | "rechazado";
export const STATUSES_CUSTOMER: StatusCustomer[] = [
  "pendiente_verificacion",
  "registrado",
  "preactivado",
  "activado",
  "suspendido",
  "deshabilitado",
  "eliminado",
];

// --- clientes --------------------------------------------------------------

export type CustomerRow = {
  id: string;
  legajo: string;
  tipo_persona: KindPerson;
  correo: string;
  nombre: string;
  cuit: string;
  estado: StatusCustomer;
  fecha_alta: string;
  created_at: string;
  updated_at: string;
  email_verificado?: boolean | null;
  onboarding_completo?: boolean | null;
  cbu?: string | null;
  cbu_cancelado?: boolean | null;
  genero?: string | null;
  cuit_cuil?: string | null;
  fecha_nacimiento?: string | null;
  ocupacion?: string | null;
  origen_fondos?: string | null;
  es_pep?: boolean | null;
  tipo_sociedad?: string | null;
  nombre_legal?: string | null;
  nombre_fantasia?: string | null;
  fecha_inscripcion?: string | null;
  direccion?: string | null;
  direccion2?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  cp?: string | null;
  estado_onboarding?: string | null;
  limite_transferencia?: number | null;
  limite_ops_diarias?: number | null;
  limite_monto_diario?: number | null;
};

export type Customer = {
  id: string;
  legajo: string;
  tipoPersona: KindPerson;
  correo: string;
  nombre: string;
  cuit: string;
  estado: StatusCustomer;
  fechaAlta: string;
  createdAt: string;
  updatedAt: string;
  emailVerificado?: boolean;
  onboardingCompleto?: boolean;
  cbu?: string | null;
  cbuCancelado?: boolean;
  genero?: string | null;
  cuitCuil?: string | null;
  fechaNacimiento?: string | null;
  ocupacion?: string | null;
  origenFondos?: string | null;
  esPep?: boolean;
  tipoSociedad?: string | null;
  nombreLegal?: string | null;
  nombreFantasia?: string | null;
  fechaInscripcion?: string | null;
  direccion?: string | null;
  direccion2?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  cp?: string | null;
  estadoOnboarding?: string | null;
  limiteTransferencia?: number | null;
  limiteOpsDiarias?: number | null;
  limiteMontoDiario?: number | null;
};

// --- comisiones_cliente ----------------------------------------------------

export type KindOperation = "Depósito" | "Retiro" | "Link de pago" | "E-commerce";
export type ModalidadFee = "Porcentaje" | "Fijo";
export type StatusFee = "Habilitado" | "Deshabilitado";

export const KINDS_OPERATION: KindOperation[] = [
  "Depósito",
  "Retiro",
  "Link de pago",
  "E-commerce",
];
export const STATUSES_FEE: StatusFee[] = ["Habilitado", "Deshabilitado"];

export type FeeCustomerRow = {
  id: string;
  cliente_id: string;
  /** CVU/subcuenta a la que aplica; null = comisión del cliente (respaldo). */
  subcuenta_id: string | null;
  operacion: string;
  tipo: KindOperation;
  modalidad: ModalidadFee;
  porcentaje: number | null;
  monto_fijo: number | null;
  porcentaje_impuesto: number;
  estado: StatusFee;
  descripcion: string | null;
  created_at: string;
  updated_at: string;
};

export type FeeCustomer = {
  id: string;
  clienteId: string;
  /** CVU al que aplica la comisión (null = comisión del cliente, respaldo). */
  subcuentaId: string | null;
  subcuenta?: { cbu: string | null; nombre: string | null } | null;
  operacion: string;
  tipo: KindOperation;
  modalidad: ModalidadFee;
  porcentaje: number | null;
  montoFijo: number | null;
  porcentajeImpuesto: number;
  estado: StatusFee;
  descripcion: string | null;
  createdAt: string;
  updatedAt: string;
  cliente?: {
    legajo: string;
    correo: string;
    cuit: string;
    nombre: string;
    tipoPersona: KindPerson;
  } | null;
};

// --- movimientos (estado_id FK a estados_movimiento) ----------------------

export type MovementRow = {
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
  comercio_id?: string | null;
  bandera?: string | null;
  /** FK a banderas.id (comercio_banderas.id) */
  bandera_id?: string | null;
  destinatario_nombre?: string | null;
  destinatario_cuit?: string | null;
  destinatario_banco?: string | null;
  estados_movimiento?:
    | {
        codigo: string;
        nombre: string;
        es_final: boolean;
      }
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

export type Movement = {
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
  comercioId?: string | null;
  /** Texto de la bandera (denormalizado, para display). FK real: bandera_id */
  bandera?: string | null;
  /** FK a banderas.id (comercio_banderas.id) */
  banderaId?: string | null;
  destinatarioNombre?: string | null;
  destinatarioCuit?: string | null;
  destinatarioBanco?: string | null;
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
export const STATUSES_MOVEMENT_CODES = [
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
export const STATUSES_MOVEMENT = STATUSES_MOVEMENT_CODES;

// --- catálogos: estados -----------------------------------------------------

export type StatusMovementRow = {
  id: number;
  codigo: string;
  nombre: string;
  es_final: boolean;
  requiere_conciliacion: boolean;
  created_at: string;
};

export type StatusMovement = {
  id: number;
  codigo: string;
  nombre: string;
  esFinal: boolean;
  requiereConciliacion: boolean;
  createdAt: string;
};

export type StatusByKindRow = {
  tipo_movimiento: string;
  estado_id: number;
};

export type StatusByKind = {
  tipoMovimiento: string;
  estadoId: number;
};

// --- conciliaciones --------------------------------------------------------

export type ReconciliationRow = {
  id: string;
  movimiento_id: string;
  fecha_conciliacion: string;
  estado_conciliacion: string;
  monto_diferencia: number;
  archivo_origen: string | null;
  created_at: string;
};

export type Reconciliation = {
  id: string;
  movimientoId: string;
  fechaConciliacion: string;
  estadoConciliacion: string;
  montoDiferencia: number;
  archivoOrigen: string | null;
  createdAt: string;
};

// --- conciliaciones_archivos (persistencia de carga CSV) -------------------
export type ReconciliationFileRow = {
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

export type ReconciliationFile = {
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

export type StatusMerchant =
  | "Activado"
  | "Desactivado"
  | "Pendiente de aprobación"
  | "Rechazado"
  | "Suspendido";

export const STATUSES_MERCHANT: StatusMerchant[] = [
  "Activado",
  "Desactivado",
  "Pendiente de aprobación",
  "Rechazado",
  "Suspendido",
];

export type LevelMerchant =
  | "Pequeño"
  | "Mediano"
  | "Grande"
  | "Premium"
  | "Estándar"
  | "Básico"
  | "Enterprise";

export const LEVELS_MERCHANT: LevelMerchant[] = [
  "Pequeño",
  "Mediano",
  "Grande",
  "Premium",
  "Estándar",
  "Básico",
  "Enterprise",
];

export type StatusQr =
  | "Pendiente de aprobación"
  | "Pendiente de aprobacion"
  | "Activado"
  | "Desactivado"
  | "Rechazado"
  | "Suspendido"
  | "Eliminado";
export const STATUSES_QR: StatusQr[] = [
  "Pendiente de aprobación",
  "Activado",
  "Desactivado",
  "Rechazado",
  "Suspendido",
  "Eliminado",
];

export type PointSaleRow = {
  id: string;
  comercio_id: string;
  nombre: string;
  estado: StatusQr;
  created_at: string;
  tipo?: string | null;
  cajero?: string | null;
  qr_url?: string | null;
  alias?: string | null;
  comercios?: {
    id: string;
    usuario: string;
    legajo: string;
    clientes?: { nombre: string; correo: string }[] | null;
  } | null;
};

export type PointSale = {
  id: string;
  comercioId: string;
  nombre: string;
  estado: StatusQr;
  createdAt: string;
  tipo?: string | null;
  cajero?: string | null;
  qrUrl?: string | null;
  alias?: string | null;
  comercio?: {
    id: string;
    usuario: string;
    legajo: string;
    clienteNombre?: string;
    clienteCorreo?: string;
  } | null;
};

export type CodeCategoryRow = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  estado: "activo" | "inactivo";
  created_at: string;
  updated_at: string;
};

export type CodeCategory = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  estado: "activo" | "inactivo";
  createdAt: string;
  updatedAt: string;
};

export type CodeCategoryInput = {
  codigo: string;
  nombre: string;
  descripcion: string;
  estado?: "activo" | "inactivo";
};

export type MerchantCustomerRow = {
  legajo: string;
  nombre: string;
  cuit: string;
  tipo_persona: KindPerson;
  correo: string;
};

export type MerchantBrandStatus = "Activo" | "Inactivo";

export type MerchantBrandRow = {
  id: string;
  comercio_id: string;
  bandera: string;
  bandera_id: string | null;
  metodo_key: string | null;
  comision_molipay: number;
  comision_payway: number;
  comision_neta: number;
  estado: MerchantBrandStatus;
  created_at: string;
  updated_at: string;
};

export type MerchantBrand = {
  id: string;
  comercioId: string;
  bandera: string;
  banderaId: string | null;
  metodoKey: string | null;
  comisionMolipay: number;
  comisionPayway: number;
  comisionNeta: number;
  estado: MerchantBrandStatus;
  createdAt: string;
  updatedAt: string;
};

export type MerchantBrandInput = {
  bandera: string;
  comisionMolipay: number;
  comisionPayway: number;
  estado?: MerchantBrandStatus;
};

export type MerchantRow = {
  id: string;
  usuario: string;
  legajo: string;
  nombre_comercio?: string | null;
  categoria_id: number | null;
  estado: StatusMerchant;
  nivel: LevelMerchant;
  ejecutivo_responsable_id?: string | null;
  site_id?: string | null;
  created_at: string;
  updated_at: string;
  clientes?:
    | {
        legajo: string;
        nombre: string;
        cuit: string;
        tipo_persona: KindPerson;
        correo: string;
      }[]
    | null;
  codigos_categoria?: CodeCategoryRow[] | null;
  puntos_venta?: PointSaleRow[] | null;
};

export type Merchant = {
  id: string;
  usuario: string;
  legajo: string;
  nombreComercio?: string | null;
  cliente: {
    legajo: string;
    nombre: string;
    cuit: string;
    tipoPersona: KindPerson;
    correo: string;
  } | null;
  categoriaId: number | null;
  categoria: CodeCategory | null;
  nivel: LevelMerchant;
  estado: StatusMerchant;
  ejecutivoResponsableId?: string | null;
  ejecutivo: {
    id: string;
    nombre: string;
    email: string;
  } | null;
  siteId?: string | null;
  puntosVenta: PointSale[];
  createdAt: string;
  updatedAt: string;
};

export type MerchantInput = {
  usuario: string;
  legajo: string;
  nombreComercio?: string | null;
  categoriaId: number | null;
  nivel: LevelMerchant;
  estado: StatusMerchant;
  ejecutivoResponsableId?: string | null;
  siteId?: string | null;
};

export type CustomerSelect = {
  legajo: string;
  nombre: string;
  correo: string;
  cuit?: string;
  tipoPersona?: KindPerson;
};

// --- resolvers (tabla real: resolvers) -------------------------------------

export type ResolverStatus = "Activo" | "Inactivo";
export const STATUSES_RESOLVER: ResolverStatus[] = ["Activo", "Inactivo"];

export type ResolverRow = {
  id: string;
  nombre: string;
  cuit: string;
  url: string;
  estado: ResolverStatus;
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
  estado: ResolverStatus;
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
  estado: ResolverStatus;
  nombreReverso: string;
  formatoWeb: string;
  pcpId: string;
  idPcp: string;
  token: string;
  asHeader: boolean;
  soa: boolean;
};

// --- APIs externas (api_usuarios / api_endpoints / api_restricciones) ------

export type StatusApiUser =
  | "Pendiente Validación"
  | "Homologación"
  | "Producción"
  | "Suspendido"
  | "Deshabilitado";

export const STATUSES_API_USER: StatusApiUser[] = [
  "Pendiente Validación",
  "Homologación",
  "Producción",
  "Suspendido",
  "Deshabilitado",
];

export type MethodHttp = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
export const METHODS_HTTP: MethodHttp[] = ["GET", "POST", "PUT", "DELETE", "PATCH"];

export type GrupoEndpoint =
  | "Autenticación"
  | "Enlaces de pago"
  | "QR"
  | "SubAccounts"
  | "Transfer"
  | "User"
  | "Webhooks"
  | "Cobros"
  | "Consultas"
  | "Contracargos"
  | "Transferencias";

export const GRUPOS_ENDPOINT: GrupoEndpoint[] = [
  "Autenticación",
  "Enlaces de pago",
  "QR",
  "SubAccounts",
  "Transfer",
  "User",
  "Webhooks",
  "Cobros",
  "Consultas",
  "Contracargos",
  "Transferencias",
];

export type StatusEndpoint = "Habilitado" | "Deshabilitado";
export const STATUSES_ENDPOINT: StatusEndpoint[] = ["Habilitado", "Deshabilitado"];

export type StatusRestriction = "Restringiendo" | "No restringiendo";
export const STATUSES_RESTRICTION: StatusRestriction[] = ["Restringiendo", "No restringiendo"];

// --- api_usuarios -----------------------------------------------------------

export type ApiUserRow = {
  id: string;
  codigo_usuario_api: string;
  usuario: string;
  nombre_completo: string;
  estado: StatusApiUser;
  created_at: string;
  updated_at: string;
};

export type ApiUser = {
  id: string;
  codigoUsuarioApi: string;
  usuario: string;
  nombreCompleto: string;
  estado: StatusApiUser;
  createdAt: string;
  updatedAt: string;
};

export type ApiUserInput = {
  codigoUsuarioApi: string;
  usuario: string;
  nombreCompleto: string;
  estado?: StatusApiUser;
};

// --- api_endpoints ----------------------------------------------------------

export type ApiEndpointRow = {
  id: string;
  nombre: string;
  path: string;
  metodo: MethodHttp;
  descripcion: string | null;
  grupo: GrupoEndpoint;
  estado: StatusEndpoint;
  rec: boolean;
  created_at: string;
  updated_at: string;
};

export type ApiEndpoint = {
  id: string;
  nombre: string;
  path: string;
  metodo: MethodHttp;
  descripcion: string | null;
  grupo: GrupoEndpoint;
  estado: StatusEndpoint;
  rec: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApiEndpointInput = {
  nombre: string;
  path: string;
  metodo: MethodHttp;
  descripcion?: string | null;
  grupo: GrupoEndpoint;
  estado: StatusEndpoint;
  rec: boolean;
};

// --- api_restricciones ------------------------------------------------------

export type ApiRestrictionRow = {
  id: string;
  api_usuario_id: string;
  estado: StatusRestriction;
  fecha_creacion: string;
  fecha_expiracion: string | null;
  created_at: string;
  api_usuarios?:
    | {
        id: string;
        codigo_usuario_api: string;
        usuario: string;
        nombre_completo: string;
        estado: StatusApiUser;
      }[]
    | null;
};

export type ApiRestriction = {
  id: string;
  apiUsuarioId: string;
  apiUsuario: {
    id: string;
    codigoUsuarioApi: string;
    usuario: string;
    nombreCompleto: string;
    estado: StatusApiUser;
  } | null;
  estado: StatusRestriction;
  fechaCreacion: string;
  fechaExpiracion: string | null;
  createdAt: string;
};

export type ApiRestrictionInput = {
  apiUsuarioId: string;
  estado: StatusRestriction;
  fechaExpiracion: string | null; // YYYY-MM-DD
};

// --- integraciones (catálogo) ------------------------------------------------

export type IntegrationRow = {
  id: string;
  nombre: string;
  proveedor: string;
  created_at: string;
};

export type Integration = {
  id: string;
  nombre: string;
  proveedor: string;
  createdAt: string;
};

export type IntegrationInput = {
  id: string;
  nombre: string;
  proveedor: string;
};

// --- Notificaciones (catálogos + eventos) ------------------------------------

export type AudienciaError = "tecnico" | "admin" | "cliente";
export const AUDIENCIAS_ERROR: AudienciaError[] = ["tecnico", "admin", "cliente"];

export type CodeErrorRow = {
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

export type CodeError = {
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

export type CodeErrorInput = {
  codigo: string;
  mensaje: string;
  audiencia?: AudienciaError;
  canalDefecto: "Email" | "Telegram" | "WhatsApp";
  descripcion?: string | null;
  activo?: boolean;
};

export type ChannelNotificationRow = {
  id: string;
  nombre: string;
  tipo: "Email" | "Telegram" | "WhatsApp";
  configuracion: Record<string, unknown> | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type ChannelNotification = {
  id: string;
  nombre: string;
  tipo: "Email" | "Telegram" | "WhatsApp";
  configuracion: Record<string, unknown> | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ChannelNotificationInput = {
  nombre: string;
  tipo: "Email" | "Telegram" | "WhatsApp";
  configuracion?: Record<string, unknown> | null;
  activo?: boolean;
};

export type KindEventNotification = "evento" | "incidente";
export type StatusEntrega = "pendiente" | "enviado" | "fallido" | "reintentando";

export type EventNotificationRow = {
  id: string;
  tipo: KindEventNotification;
  codigo_error_id: string | null;
  titulo: string;
  mensaje: string;
  audiencia: "Admin" | "Cliente" | "Ambos";
  canal: "Email" | "Telegram" | "WhatsApp";
  estado_entrega: StatusEntrega;
  fecha: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  codigos_error?: { codigo: string; mensaje: string }[] | null;
};

export type EventNotification = {
  id: string;
  tipo: KindEventNotification;
  codigoErrorId: string | null;
  titulo: string;
  mensaje: string;
  audiencia: "Admin" | "Cliente" | "Ambos";
  canal: "Email" | "Telegram" | "WhatsApp";
  estadoEntrega: StatusEntrega;
  fecha: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  codigoError?: { codigo: string; mensaje: string } | null;
};

export type EventNotificationInput = {
  tipo: KindEventNotification;
  codigoErrorId: string | null;
  titulo: string;
  mensaje: string;
  audiencia: "Admin" | "Cliente" | "Ambos";
  canal: "Email" | "Telegram" | "WhatsApp";
  metadata?: Record<string, unknown> | null;
};

export type EventNotificationFilters = {
  page: number;
  pageSize: number;
  search?: string;
  tipo?: KindEventNotification;
  audiencia?: "Admin" | "Cliente" | "Ambos";
  canal?: "Email" | "Telegram" | "WhatsApp";
  estadoEntrega?: StatusEntrega;
  fechaDesde?: string;
  fechaHasta?: string;
};

// --- impuestos -------------------------------------------------------------

export type AmbitoTax = "Externo" | "Interno";
export const AMBITOS_TAX: AmbitoTax[] = ["Externo", "Interno"];

export type KindTax = "Porcentaje" | "Fijo" | "Otro";
export type StatusTax = "Activo" | "Inactivo";

// Catalogo: tabla `taxes`. Valores en ingles en la base, etiquetas en espanol en la UI.
export type TaxRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  scope: "external" | "internal";
  status: "active" | "inactive";
  rate_source: "fixed" | "taxpayer_registry" | "manual";
  created_at: string;
  updated_at: string;
};

/** De donde sale la alicuota: tax_rates (Fija), padron de IIBB (Padron) o asignacion por cliente (Manual). */
export type SourceRate = "Fija" | "Padrón" | "Manual";
export const SOURCES_RATE: SourceRate[] = ["Fija", "Padrón", "Manual"];

export type Tax = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  estado: StatusTax;
  ambito: AmbitoTax;
  fuenteAlicuota: SourceRate;
  alicuotas: Rate[];
  createdAt: string;
  updatedAt: string;
};

export type TaxInput = {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  estado: StatusTax;
  ambito: AmbitoTax;
  fuenteAlicuota: SourceRate;
};

export type TaxFilters = Pagination & {
  search?: string;
  estado?: StatusTax;
};

// Alicuotas fijas: tabla `tax_rates`.
export type TaxRateRow = {
  id: string;
  tax_id: string;
  code: string;
  calculation_type: "percentage" | "fixed_amount";
  value: number;
  direction: "inbound" | "outbound" | "both";
  description: string | null;
  status: "active" | "inactive";
  valid_from: string;
  valid_to: string | null;
  created_at: string;
  updated_at: string;
};

export type KindCalculoRate = "Porcentaje" | "Monto fijo";
/** Entrante = ingreso de fondos (Pay-In), Saliente = egreso (Pay-Out). */
export type AddressRate = "Entrante" | "Saliente" | "Ambas";
export const ADDRESSES_RATE: AddressRate[] = ["Entrante", "Saliente", "Ambas"];

export type Rate = {
  id: string;
  impuestoId: string;
  codigo: string;
  tipoCalculo: KindCalculoRate;
  valor: number;
  direccion: AddressRate;
  descripcion: string | null;
  estado: StatusTax;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RateInput = {
  codigo: string;
  tipoCalculo: KindCalculoRate;
  valor: number;
  direccion: AddressRate;
  descripcion?: string | null;
  estado: StatusTax;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
};

export type RateFilters = Pagination & {
  impuesto_id?: string;
  search?: string;
  estado?: StatusTax;
};

/**
 * Operacion a la que aplica una asignacion (null = todas). Define la direccion
 * de la alicuota: Retiro = Pay-Out (saliente); el resto = Pay-In (entrante).
 */
export type OperationTax = KindOperation;
export const OPERATIONS_TAX: OperationTax[] = KINDS_OPERATION;
export const ADDRESS_DE_OPERATION: Record<OperationTax, "Entrante" | "Saliente"> = {
  Depósito: "Entrante",
  Retiro: "Saliente",
  "Link de pago": "Entrante",
  "E-commerce": "Entrante",
};

export type TaxAssignmentRow = {
  id: string;
  client_legajo: string;
  tax_id: string;
  operation_type: "deposit" | "withdrawal" | "payment_link" | "ecommerce" | null;
  status: "active" | "inactive";
  custom_calculation_type: "percentage" | "fixed_amount" | null;
  custom_rate: number | string | null;
  assigned_at: string | null;
  updated_at: string | null;
  taxes?:
    | {
        code: string;
        name: string;
        rate_source: TaxRow["rate_source"];
        tax_rates?: TaxRateRow[] | null;
      }[]
    | null;
  clientes?:
    | { legajo: string; nombre: string; cuit: string; tipo_persona: KindPerson; correo: string }[]
    | null;
};

export type TaxAssignment = {
  id: string;
  clienteLegajo: string;
  impuestoId: string;
  /** null = todas las operaciones. */
  operacion: OperationTax | null;
  estado: StatusTax;
  /** Solo impuestos de fuente Manual. */
  tipoCalculo: KindCalculoRate | null;
  alicuotaPropia: number | null;
  fechaAsignacion: string | null;
  updatedAt: string | null;
  impuesto: {
    codigo: string;
    nombre: string;
    fuenteAlicuota: SourceRate;
    alicuotas: Rate[];
  } | null;
  cliente: {
    legajo: string;
    nombre: string;
    cuit: string;
    tipoPersona: KindPerson;
    correo: string;
  } | null;
};

export type TaxAssignmentInput = {
  cliente_legajo: string;
  impuesto_id: string;
  operacion: OperationTax | null;
  estado: StatusTax;
  /** Solo impuestos de fuente Manual; en el resto va null. */
  tipo_calculo: KindCalculoRate | null;
  alicuota_propia: number | null;
};

export type TaxAssignmentFilters = Pagination & {
  search?: string;
  cliente_legajo?: string;
  impuesto_id?: string;
  estado?: StatusTax;
};

/** Alicuota que regiria hoy un impuesto para un comercio (tax_rate_preview). */
export type RatePrevista = {
  direccion: "Entrante" | "Saliente";
  codigo: string | null;
  tipoCalculo: KindCalculoRate;
  valor: number;
  padronId: string | null;
  nota: string | null;
};

export type StatusRegistry =
  | "Cargando"
  | "Procesando"
  | "Finalizado"
  | "Error"
  | "Borrador"
  | "Vigente"
  | "Reemplazado";

// --- banderas (catálogo) / banderas_cuotas ----------------------------------

export type BrandCatalogRow = {
  id: string;
  nombre: string;
  tipo: string;
  dias_habiles_acreditacion: number;
  estado: string;
  created_at: string | null;
  updated_at: string | null;
};

export type BrandCatalog = {
  id: string;
  nombre: string;
  tipo: string;
  diasHabilesAcreditacion: number;
  estado: "Activo" | "Inactivo";
  createdAt: string;
  updatedAt: string;
};

export type BrandInstallmentRow = {
  id: string;
  bandera_id: string;
  cuotas: number;
  ten: number;
  coeficiente: number;
  estado: string;
};

export type BrandInstallment = {
  id: string;
  banderaId: string;
  cuotas: number;
  ten: number;
  coeficiente: number;
  estado: "Activo" | "Inactivo";
};

// --- comercio_banderas_cuotas -----------------------------------------------

export type MerchantBrandInstallmentRow = {
  id: string;
  comercio_bandera_id: string;
  cuotas: number;
  tasa_mensual: number;
  estado: string;
};

export type MerchantBrandInstallment = {
  id: string;
  comercioBanderaId: string;
  cuotas: number;
  tasaMensual: number;
  estado: "Activo" | "Inactivo";
};

// --- lotes_venta (vista) ----------------------------------------------------

/**
 * Join a `comercios` tal como lo devuelve PostgREST.
 *
 * Puede ser ARRAY o OBJECT, y no es un detalle menor: PostgREST devuelve
 * **object** para relaciones to-one (comercio_id -> comercios.id) y **array**
 * para las one-to-many. El tipo anterior solo declaraba `[]`, asi que
 * `Array.isArray(...)` siempre daba false, el mapper leia `null` y TypeScript
 * no se quejaba de nada: la columna quedaba en "—" y el legajo caia al
 * fallback del uuid, que es exactamente el comportamiento roto de la pagina de
 * lotes.
 *
 * Se tipea aceptando las dos formas para que ningun mapper vuelva a asumir una
 * sola.
 */
export type MerchantJoined =
  | {
      id: string;
      usuario: string;
      legajo: string;
      nombre_comercio: string | null;
      /** Identificador del sitio / establecimiento en Payway. Es el
       *  valor que va en la columna `ESTABLECIMIENTO` del CSV de
       *  liquidación: el motor de match lo usa para resolver comercio. */
      site_id?: string | null;
    }
  | {
      id: string;
      usuario: string;
      legajo: string;
      nombre_comercio: string | null;
      site_id?: string | null;
    }[];

export type BatchSaleRow = {
  comercio_id: string;
  bandera: string;
  fecha: string;
  cantidad_operaciones: number;
  importe_bruto: number;
  impuestos: number;
  comision: number;
  importe_neto: number;
  /**
   * La vista `v_lotes_venta` (schema remoto) expone el join a `comercios`
   * como columnas PLANAS (`comercios_id`, `comercios_usuario`, ...), NO como
   * embed PostgREST. Intentar `comercios(id, ...)` en el select dejaba el
   * nombre y el legajo vacíos (la vista no tiene relación embebible).
   */
  comercios_id?: string | null;
  comercios_usuario?: string | null;
  comercios_legajo?: string | null;
  comercios_nombre_comercio?: string | null;
};

export type BatchSale = {
  comercioId: string;
  bandera: string;
  fecha: string;
  cantidadOperaciones: number;
  importeBruto: number;
  impuestos: number;
  comision: number;
  /** Valor que devuelve la vista (sum(monto_cobrado)). NO es el neto de la
   *  venta: la spec manda usar netoEstimado = Bruto − Impuestos − Comisión. */
  importeNeto: number;
  /** Neto estimado = importeBruto − impuestos − comision (fórmula corregida). */
  netoEstimado: number;
  comercio?: { id: string; usuario: string; legajo: string; nombreComercio: string | null } | null;
};

// --- lotes_acreditacion / lote_movimientos / adelantos (real Supabase) -----

export type StatusBatch =
  | "Programado"
  | "Pendiente"
  | "Acreditado"
  | "Contracargo"
  | "Cancelado"
  | "Liquidado";
export const STATUSES_BATCH: StatusBatch[] = [
  "Programado",
  "Pendiente",
  "Acreditado",
  "Contracargo",
  "Cancelado",
  "Liquidado",
];

export type BatchCreditRow = {
  id: string;
  codigo: string;
  comercio_id: string;
  /** Texto denormalizado (para display). FK real: bandera_id */
  bandera: string;
  /** FK a banderas.id */
  bandera_id?: string | null;
  fecha: string;
  cantidad_operaciones: number;
  importe_bruto: number;
  impuestos: number;
  tasa_payway_pct: number;
  tasa_payway_monto: number;
  tasa_molipay_pct: number;
  tasa_molipay_monto: number;
  cuotas: number | null;
  costo_payway_pago_unico: number | null;
  contracargo_monto: number;
  comision_cierre_lote_pct: number | null;
  comision_cierre_lote_monto: number | null;
  importe_neto: number;
  estado: StatusBatch;
  es_estimado: boolean;
  dias_habiles_aplicados: number | null;
  fecha_estimada_recalcular: boolean;
  resuelto_por: string | null;
  fecha_resolucion: string | null;
  notas_resolucion: string | null;
  created_at: string;
  updated_at: string;
  iva_monto: number | null;
  iibb_monto: number | null;
  debito_credito_monto: number | null;
  /** Fecha real del cobro de Payway. null mientras el lote es Programado. */
  fecha_cobro_real: string | null;
  comercios?: MerchantJoined | null;
  // Modulo de acreditaciones (v_lotes_acreditacion)
  origen?: "venta" | "archivo";
  legacy?: boolean;
  establecimiento?: string | null;
  neto_payway?: number | null;
  costo_servicio_payway?: number | null;
  impuestos_payway?: number | null;
  iva_tasa_monto?: number | null;
  impuestos_detalle?: unknown;
  compensacion_adelantos?: number | null;
  recuperacion_deuda?: number | null;
  retencion_contracargos?: number | null;
  retencion_pendiente?: number | null;
  neto_a_acreditar?: number | null;
  conciliado?: boolean;
  es_negativo?: boolean;
  fecha_acreditacion?: string | null;
  calculado_at?: string | null;
  subestado?: string | null;
  motivo_no_elegible?: string | null;
  elegible?: boolean;
  contracargos?: number | null;
  comercio_nombre?: string | null;
  comercio_legajo?: string | null;
  comercio_usuario?: string | null;
};

export type BatchCredit = {
  id: string;
  codigo: string;
  comercioId: string;
  /** Texto denormalizado (para display). FK real: banderaId */
  bandera: string;
  /** FK a banderas.id */
  banderaId?: string | null;
  fecha: string;
  cantidadOperaciones: number;
  importeBruto: number;
  impuestos: number;
  tasaPaywayPct: number;
  tasaPaywayMonto: number;
  tasaMolipayPct: number;
  tasaMolipayMonto: number;
  cuotas: number | null;
  costoPaywayPagoUnico: number | null;
  contracargoMonto: number;
  comisionCierreLotePct: number | null;
  comisionCierreLoteMonto: number | null;
  importeNeto: number;
  estado: StatusBatch;
  esEstimado: boolean;
  diasHabilesAplicados: number | null;
  fechaEstimadaRecalcular: boolean;
  resueltoPor: string | null;
  fechaResolucion: string | null;
  notasResolucion: string | null;
  createdAt: string;
  updatedAt: string;
  ivaMonto: number | null;
  iibbMonto: number | null;
  debitoCreditoMonto: number | null;
  /** Fecha real del cobro de Payway. null mientras el lote es Programado. */
  fechaCobroReal: string | null;
  comercio?: {
    id: string;
    usuario: string;
    legajo: string;
    nombreComercio: string | null;
    siteId: string | null;
  } | null;
  // compat mock
  importeFinal?: number;
  // Modulo de acreditaciones: el calculo lo hace la base (lote_calculo).
  /** venta: proyeccion desde las ventas (Programado). archivo: renglon del archivo de Payway. */
  origen: "venta" | "archivo";
  /** Lote del flujo anterior: solo lectura. */
  legacy: boolean;
  establecimiento: string | null;
  netoPayway: number | null;
  costoServicioPayway: number | null;
  impuestosPayway: number | null;
  ivaTasaMonto: number | null;
  impuestosDetalle: {
    asignacion_id: string;
    codigo: string;
    nombre: string;
    tipo: string;
    alicuota: number | null;
    monto: number;
    aplica_a: string;
    nota: string | null;
    fuente?: string | null;
  }[];
  /** Retencion de contracargos de ventas del lote (aplicada al calcular). */
  retencionContracargos: number;
  /** Contracargos de ventas del lote que se retendran al acreditar. */
  retencionPendiente: number;
  compensacionAdelantos: number;
  recuperacionDeuda: number;
  netoAcreditar: number | null;
  conciliado: boolean;
  esNegativo: boolean;
  fechaAcreditacion: string | null;
  /** listo, negativo, no_conciliado, sin_tasa, programado, liquidado, acreditado, legacy... */
  subestado: string | null;
  motivoNoElegible: string | null;
  /** Se puede acreditar (Listo o Negativo). */
  elegible: boolean;
  contracargos: number;
};

export type BatchMovementRow = {
  lote_id: string;
  movimiento_id: string;
};

/** Pendiente = Solicitado, Aprobado = Ofertado (con tasa). Aceptado lo pone la empresa; Compensado, el sistema. */
export type StatusAdvance =
  | "Pendiente"
  | "Aprobado"
  | "Aceptado"
  | "Rechazado"
  | "Acreditado"
  | "Compensado"
  | "Cancelado";
export const STATUSES_ADVANCE: StatusAdvance[] = [
  "Pendiente",
  "Aprobado",
  "Aceptado",
  "Rechazado",
  "Acreditado",
  "Compensado",
  "Cancelado",
];

export type AdvanceRow = {
  transaction_id?: string | null;
  transactions?: { id_txn: string | null; monto_operacion: number | string; bandera: string | null } | null;
  id: string;
  comercio_id: string;
  monto_solicitado: number;
  plazo_original_dias: number;
  plazo_adelantado_dias: number;
  tasa_interes_pct: number | null;
  estado: StatusAdvance;
  motivo: string | null;
  fecha_acreditacion: string | null;
  monto_por_acreditar: number | null;
  fecha_solicitud: string;
  fecha_resolucion: string | null;
  resuelto_por: string | null;
  created_at: string;
  updated_at: string;
  monto_ofertado?: number | null;
  descuento?: number | null;
  neto_a_recibir?: number | null;
  compensado?: number | null;
  modelo?: "legacy" | "v2";
  rechazo_motivo?: string | null;
  aceptado_at?: string | null;
};

export type Advance = {
  /** Venta que se adelanta. Null en los adelantos anteriores al modelo por operacion. */
  operacion: { id: string; referencia: string; monto: number; bandera: string | null } | null;
  id: string;
  comercioId: string;
  montoSolicitado: number;
  plazoOriginalDias: number;
  plazoAdelantadoDias: number;
  tasaInteresPct: number | null;
  estado: StatusAdvance;
  motivo: string | null;
  fechaAcreditacion: string | null;
  montoPorAcreditar: number | null;
  fechaSolicitud: string;
  fechaResolucion: string | null;
  resueltoPor: string | null;
  createdAt: string;
  updatedAt: string;
  /** Monto aprobado en la oferta (puede diferir del solicitado). */
  montoOfertado: number | null;
  /** Descuento por tasa (monto × tasa). */
  descuento: number | null;
  /** Lo que recibe el comercio: monto − descuento. */
  netoARecibir: number | null;
  /** Ya descontado de liquidaciones posteriores. */
  compensado: number;
  modelo: "legacy" | "v2";
  rechazoMotivo: string | null;
  aceptadoAt: string | null;
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
