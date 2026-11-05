export type UserStatus = "active" | "inactive" | "pending" | "blocked";

export type UserDocument = {
  id: string;
  tipo: "id_frente" | "id_dorso" | "servicio" | "selfie";
  url?: string;
  label: string;
};

export type MovementSub = {
  tipo: "ingreso" | "egreso";
  titulo: string;
  txid: string;
  cbu: string;
  entidad: string;
  fecha: string;
  hora: string;
  monto: number;
};

export type Subaccount = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  cbu: string;
  tipo: "Operativa" | "Recaudacion" | "Garantias" | "Sueldos";
  estado: "Activa" | "Pausada";
  disp: number;
  ret: number;
  conc: number;
  ing: string;
  egr: string;
  resp: string;
  lim: string;
  retirosHab: boolean;
  validada?: boolean;
  movimientos: MovementSub[];
};

export type HistoryRecord = {
  id: string;
  campo: string;
  valorAnterior: string;
  valorNuevo: string;
  fecha: string;
  hora: string;
  usuario: string;
};

export type MovementOperational = {
  id: string;
  tipo: string;
  detalle: string;
  monto: string;
  fecha: string;
  estado: string;
};

export type KindPerson = "fisica" | "juridica";

export type ProductoUser = {
  id: string;
  nombre: string;
  detalle?: string;
  cantidad: number;
};

export type ValidationAutomatica = {
  id: string;
  proveedor: string;
  estado: "Ok" | "En proceso" | "Fallida" | "Pendiente";
  fecha: string;
};

export type FeeUser = {
  id: string;
  tipo: string;
  monto: string;
  fecha: string;
  origen: string;
};

export type TaxUser = {
  id: string;
  nombre: string;
  monto: string;
  fecha: string;
};

export type AlertUser = {
  id: string;
  tipo: string;
  fecha: string;
  estado: string;
};

export type ParameterAlert = { label: string; valor: string };
export type ParameterBlock = { label: string; valor: string };

export type ModuleVinculado = {
  clave: "pct" | "blp" | "api";
  titulo: string;
  cantidad: number;
  verLabel: string;
  vacioMsg: string;
  ruta: string;
};

export type UserData = {
  id: string;
  status: UserStatus;
  tipoPersona: KindPerson;
  legajo: string;
  email: string;
  tipoCuenta: string;
  cantidadCuentasBancarias: number;
  cantidadCuentasVirtuales: number;
  nombre: string;
  apellido: string;
  cuit: string;
  genero: string;
  ocupacion: string;
  origenFondos: string;
  direccion: string;
  numeroDireccion: string;
  ciudad: string;
  estadoProvincia: string;
  codigoPostal: string;
  fechaNacimiento: string;
  cuitEmpresa: string;
  tipoEmpresa: string;
  nombreLegal: string;
  nombreComercial: string;
  fechaInscripcion: string;
  fechaRegistro: string;
  pep: string;
  subcuentas: Subaccount[];
  documentos: UserDocument[];
  productos?: ProductoUser[];
  validacionesAutomaticas?: ValidationAutomatica[];
  comisiones?: FeeUser[];
  impuestos?: TaxUser[];
  alertas?: AlertUser[];
  bloqueos?: AlertUser[];
  parametrosAlertas?: ParameterAlert[];
  parametrosBloqueo?: ParameterBlock[];
  modulos?: ModuleVinculado[];
  entidad?: {
    controlSubcuentas?: boolean;
    maximoSubcuentas: number;
    redireccionAutomatica: boolean;
    presionOperativa: string;
  };
};

export type TabName =
  | "identificacion"
  | "contexto"
  | "validaciones"
  | "riesgo"
  | "modulos"
  | "financiero"
  | "documentos"
  | "subcuentas"
  | "historial";

export type FieldDef = {
  key: keyof UserData;
  label: string;
  type?: "text" | "number" | "select";
  options?: { value: string; label: string }[];
  renderValue?: (user: UserData) => string;
};
