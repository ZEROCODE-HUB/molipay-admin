import { Globe,Landmark,Link2 } from "lucide-react";
import {
type FieldDef,
type HistoryRecord,
type ModuleVinculado,
type MovementOperational,
type ParameterAlert,
type ParameterBlock,
type UserData,
type UserDocument,
type UserStatus,
type ValidationAutomatica,
} from "./customer-modal.types";

export const statusLabel: Record<UserStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  pending: "Pendiente",
  blocked: "Bloqueado",
};

export const statusTone: Record<UserStatus, "success" | "neutral" | "warn" | "danger"> = {
  active: "success",
  inactive: "neutral",
  pending: "warn",
  blocked: "danger",
};

export const docLabels: Record<UserDocument["tipo"], string> = {
  id_frente: "ID Frente",
  id_dorso: "ID Dorso",
  servicio: "Servicio",
  selfie: "Selfie",
};

export const validationTone: Record<
  ValidationAutomatica["estado"],
  "success" | "neutral" | "warn" | "danger"
> = {
  Ok: "success",
  Pendiente: "neutral",
  "En proceso": "warn",
  Fallida: "danger",
};

export const statusOptions: { value: UserStatus; label: string }[] = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
  { value: "pending", label: "Pendiente" },
  { value: "blocked", label: "Bloqueado" },
];

export const DEFAULT_PARAMS_ALERTS: ParameterAlert[] = [
  { label: "Depósitos por mes", valor: "10" },
  { label: "Depósitos salario mínimo por transferencia", valor: "5" },
  { label: "Transferencias por hora", valor: "10" },
  { label: "Operaciones repetitivas", valor: "5" },
  { label: "Volumen anormal", valor: "$ 1.000.000 – $ 5.000.000" },
  { label: "Política a menores", valor: "Bloquear" },
];

export const DEFAULT_PARAMS_BLOCK: ParameterBlock[] = [
  { label: "Salarios mínimos por persona", valor: "15" },
  { label: "Salarios mínimos por empresa", valor: "50" },
];

export const DEFAULT_MODULES: ModuleVinculado[] = [
  {
    clave: "pct",
    titulo: "PCT",
    cantidad: 0,
    verLabel: "Ver comercios PCT",
    vacioMsg: "No se encontró comercio PCT asociado",
    ruta: "/admin/comercios/transferencia",
  },
  {
    clave: "blp",
    titulo: "Links de Pago",
    cantidad: 0,
    verLabel: "Ver links de pago",
    vacioMsg: "No se encontró link de pago asociado",
    ruta: "/admin/comercios/link-pago",
  },
  {
    clave: "api",
    titulo: "API Externa",
    cantidad: 0,
    verLabel: "Ver usuarios API",
    vacioMsg: "No se encontró usuario API asociado",
    ruta: "/admin/comercios/apis",
  },
];

export const MODULE_POPUP_META: Record<
  ModuleVinculado["clave"],
  { titulo: string; descripcion: string; verTodosLabel: string; columnas: [string, string, string] }
> = {
  pct: {
    titulo: "Comercios PCT del usuario",
    descripcion: "Comercios vinculados a pagos con transferencia (PCT)",
    verTodosLabel: "Ver todos los comercios PCT",
    columnas: ["Comercio", "CUIT", "Estado"],
  },
  blp: {
    titulo: "Links de pago del usuario",
    descripcion: "Links de pago generados para el usuario",
    verTodosLabel: "Ver todos los links PCT",
    columnas: ["Link", "Método", "Estado"],
  },
  api: {
    titulo: "Usuarios API del usuario",
    descripcion: "Usuarios de API externa vinculados al titular",
    verTodosLabel: "Ver todos los usuarios API",
    columnas: ["Usuario", "Clave pública", "Estado"],
  },
};

export const modIcon: Record<ModuleVinculado["clave"], typeof Landmark> = {
  pct: Landmark,
  blp: Link2,
  api: Globe,
};

export const personalFields: FieldDef[] = [
  { key: "legajo", label: "Legajo" },
  { key: "email", label: "Email" },
  { key: "fechaRegistro", label: "Fecha de registro" },
  { key: "tipoCuenta", label: "Tipo de cuenta" },
  {
    key: "status",
    label: "Estado",
    type: "select",
    options: statusOptions.map((o) => ({ value: o.value, label: o.label })),
    renderValue: (u) => statusLabel[u.status],
  },
  { key: "cantidadCuentasBancarias", label: "Cant. cuentas bancarias", type: "number" },
  { key: "cantidadCuentasVirtuales", label: "Cant. cuentas virtuales", type: "number" },
  { key: "nombre", label: "Nombre" },
  { key: "apellido", label: "Apellido" },
  { key: "cuit", label: "CUIT" },
  {
    key: "genero",
    label: "Género",
    type: "select",
    options: [
      { value: "Masculino", label: "Masculino" },
      { value: "Femenino", label: "Femenino" },
      { value: "Otro", label: "Otro" },
      { value: "-", label: "-" },
    ],
  },
  { key: "direccion", label: "Dirección" },
  { key: "numeroDireccion", label: "Número de dirección" },
  { key: "ciudad", label: "Ciudad" },
  { key: "estadoProvincia", label: "Estado / Provincia" },
  { key: "codigoPostal", label: "Código postal" },
  { key: "fechaNacimiento", label: "Fecha de nacimiento" },
];

export const complianceFields: FieldDef[] = [
  { key: "ocupacion", label: "Ocupación" },
  { key: "origenFondos", label: "Origen de fondos" },
  {
    key: "pep",
    label: "PEP",
    type: "select",
    options: [
      { value: "Sí", label: "Sí" },
      { value: "No", label: "No" },
    ],
  },
];

export const companyFields: FieldDef[] = [
  { key: "cuitEmpresa", label: "CUIT de la empresa" },
  {
    key: "tipoEmpresa",
    label: "Tipo de empresa",
    type: "select",
    options: [
      { value: "SA", label: "SA" },
      { value: "SRL", label: "SRL" },
      { value: "Monotributo", label: "Monotributo" },
      { value: "Autónomo", label: "Autónomo" },
    ],
  },
  { key: "nombreLegal", label: "Nombre legal" },
  { key: "nombreComercial", label: "Nombre comercial" },
  { key: "fechaInscripcion", label: "Fecha de inscripción" },
];

export function getFieldValue(user: UserData, field: FieldDef): string {
  if (field.renderValue) return field.renderValue(user);
  const val = user[field.key];
  if (typeof val === "number") return String(val);
  return String(val ?? "");
}

export const btnSmallPrimary =
  "inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-moli-red-dark active:bg-moli-red-darker transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const btnSmallOutline =
  "inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-card text-foreground text-xs font-semibold hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const MOCK_HISTORY: HistoryRecord[] = [
  {
    id: "h-1",
    campo: "Ocupación",
    valorAnterior: "Empleado",
    valorNuevo: "Comerciante",
    fecha: "07/08/2026",
    hora: "14:22",
    usuario: "admin.operaciones",
  },
  {
    id: "h-2",
    campo: "Origen de fondos",
    valorAnterior: "Salario",
    valorNuevo: "Actividad comercial",
    fecha: "07/08/2026",
    hora: "14:20",
    usuario: "admin.operaciones",
  },
  {
    id: "h-3",
    campo: "Email",
    valorAnterior: "juan.perez@oldmail.com",
    valorNuevo: "juan.perez@email.com",
    fecha: "02/08/2026",
    hora: "09:05",
    usuario: "soporte.nivel2",
  },
  {
    id: "h-4",
    campo: "Estado",
    valorAnterior: "Pendiente",
    valorNuevo: "Activo",
    fecha: "28/07/2026",
    hora: "17:41",
    usuario: "compliance.team",
  },
  {
    id: "h-5",
    campo: "Dirección",
    valorAnterior: "Av. Corrientes 1200",
    valorNuevo: "Av. Corrientes 1234",
    fecha: "15/07/2026",
    hora: "11:30",
    usuario: "admin.operaciones",
  },
  {
    id: "h-6",
    campo: "Teléfono",
    valorAnterior: "+54 9 11 5555 0101",
    valorNuevo: "+54 9 11 5555 0189",
    fecha: "10/07/2026",
    hora: "16:12",
    usuario: "soporte.nivel1",
  },
  {
    id: "h-7",
    campo: "Ficha creada",
    valorAnterior: "—",
    valorNuevo: "Registro inicial del usuario",
    fecha: "12/01/2024",
    hora: "10:00",
    usuario: "system",
  },
];

export function getHistory(user: UserData): HistoryRecord[] {
  if (getLastDigitLegajo(user.legajo) === "8") return [];
  return MOCK_HISTORY;
}

export function getLastDigitLegajo(legajo: string): string {
  const m = legajo.match(/\d+$/);
  return m ? m[0].slice(-1) : "";
}

export function buildMovementsOperationals(user: UserData): MovementOperational[] {
  if (getLastDigitLegajo(user.legajo) === "5") return [];
  const base = user.legajo.replace(/[^a-zA-Z0-9]/g, "") || "usr";
  const kinds = ["Depósito", "Retiro", "Transferencia", "Cobro QR", "Pago de tarjeta", "Comisión"];
  const statuses = ["Acreditado", "Pendiente", "Rechazado"];
  return Array.from({ length: 14 }, (_, i) => ({
    id: `mov-${base}-${i + 1}`,
    tipo: kinds[i % kinds.length],
    detalle: `TX-2026-08-0${(i % 9) + 1}-${1000 + i}`,
    monto: `$ ${((i + 1) * 3250 + i * 137).toLocaleString("es-AR")}`,
    fecha: `0${(i % 9) + 1}/08/2026`,
    estado: statuses[i % statuses.length],
  }));
}

export const fmtARS = (n: number) => "$ " + n.toLocaleString("es-AR");

export const fmtMov = (n: number) =>
  (n >= 0 ? "+" : "") + "$ " + Math.abs(n).toLocaleString("es-AR");
