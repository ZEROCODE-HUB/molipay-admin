import { useEffect, useState, type ReactNode, type MouseEvent as ReactMouseEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  X,
  Upload,
  Pencil,
  Check,
  Trash2,
  RefreshCw,
  ExternalLink,
  Landmark,
  Link2,
  Globe,
  ShieldAlert,
  Plus,
  Eye,
  Key,
  Pause,
  Lock,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Download,
  Filter,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { Badge, Input, BtnOutline } from "./portal-shell";
import { useDemoMode } from "@/contexts/demo-mode";
import { FormDialog } from "./form-dialog";
import { ConfirmDialog } from "./confirm-dialog";
import { DataTable, type Column } from "./data-table";
import { useDocumentoUrl } from "@/lib/api/use-documento-url";
import { DOCUMENTO_LABELS } from "@/lib/api/documentos";

function DocumentoMiniCard({
  url,
  legajo,
  label,
  onOpen,
}: {
  url: string | null;
  legajo: string;
  label: string;
  onOpen: (url: string) => void;
}) {
  const resolved = useDocumentoUrl(url, legajo);

  const descargar = async (e: ReactMouseEvent) => {
    e.stopPropagation();
    if (!resolved) return;
    const ext = url ? "." + url.split(".").pop() : "";
    const nombre = `${label}${ext}`;
    try {
      const res = await fetch(resolved);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(resolved, "_blank", "noreferrer");
    }
  };

  return (
    <button
      type="button"
      disabled={!resolved}
      onClick={() => resolved && onOpen(resolved)}
      className="group relative aspect-[3/4] rounded-lg border border-border overflow-hidden bg-muted hover:ring-2 hover:ring-ring transition disabled:cursor-default"
    >
      {resolved ? (
        <img
          src={resolved}
          alt={label}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] text-muted-foreground">
          {url ? "Cargando…" : "Sin archivo"}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
        <span className="text-[10px] text-white font-medium">{label}</span>
      </div>
      {resolved && (
        <span
          role="button"
          tabIndex={-1}
          title="Descargar documento"
          onClick={descargar}
          className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-md bg-black/55 text-white hover:bg-black/75"
        >
          <Download size={12} />
        </span>
      )}
    </button>
  );
}

export type UserStatus = "active" | "inactive" | "pending" | "blocked";

export type UserDocument = {
  id: string;
  tipo: "id_frente" | "id_dorso" | "servicio" | "selfie";
  url?: string;
  label: string;
};

export type MovimientoSub = {
  tipo: "ingreso" | "egreso";
  titulo: string;
  txid: string;
  cbu: string;
  entidad: string;
  fecha: string;
  hora: string;
  monto: number;
};

export type Subcuenta = {
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
  movimientos: MovimientoSub[];
};

export type HistorialRegistro = {
  id: string;
  campo: string;
  valorAnterior: string;
  valorNuevo: string;
  fecha: string;
  hora: string;
  usuario: string;
};

export type MovimientoOperativo = {
  id: string;
  tipo: string;
  detalle: string;
  monto: string;
  fecha: string;
  estado: string;
};

export type TipoPersona = "fisica" | "juridica";

export type ProductoUsuario = {
  id: string;
  nombre: string;
  detalle?: string;
  cantidad: number;
};

export type ValidacionAutomatica = {
  id: string;
  proveedor: string;
  estado: "Ok" | "En proceso" | "Fallida" | "Pendiente";
  fecha: string;
};

export type ComisionUsuario = {
  id: string;
  tipo: string;
  monto: string;
  fecha: string;
  origen: string;
};

export type ImpuestoUsuario = {
  id: string;
  nombre: string;
  monto: string;
  fecha: string;
};

export type AlertaUsuario = {
  id: string;
  tipo: string;
  fecha: string;
  estado: string;
};

export type ParametroAlerta = { label: string; valor: string };
export type ParametroBloqueo = { label: string; valor: string };

export type ModuloVinculado = {
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
  tipoPersona: TipoPersona;
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
  subcuentas: Subcuenta[];
  documentos: UserDocument[];
  productos?: ProductoUsuario[];
  validacionesAutomaticas?: ValidacionAutomatica[];
  comisiones?: ComisionUsuario[];
  impuestos?: ImpuestoUsuario[];
  alertas?: AlertaUsuario[];
  bloqueos?: AlertaUsuario[];
  parametrosAlertas?: ParametroAlerta[];
  parametrosBloqueo?: ParametroBloqueo[];
  modulos?: ModuloVinculado[];
  entidad?: {
    controlSubcuentas?: boolean;
    maximoSubcuentas: number;
    redireccionAutomatica: boolean;
    presionOperativa: string;
  };
};

const statusLabel: Record<UserStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  pending: "Pendiente",
  blocked: "Bloqueado",
};

const statusTone: Record<UserStatus, "success" | "neutral" | "warn" | "danger"> = {
  active: "success",
  inactive: "neutral",
  pending: "warn",
  blocked: "danger",
};

const docLabels: Record<UserDocument["tipo"], string> = {
  id_frente: "ID Frente",
  id_dorso: "ID Dorso",
  servicio: "Servicio",
  selfie: "Selfie",
};

const validacionTone: Record<
  ValidacionAutomatica["estado"],
  "success" | "neutral" | "warn" | "danger"
> = {
  Ok: "success",
  Pendiente: "neutral",
  "En proceso": "warn",
  Fallida: "danger",
};

const statusOptions: { value: UserStatus; label: string }[] = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
  { value: "pending", label: "Pendiente" },
  { value: "blocked", label: "Bloqueado" },
];

const DEFAULT_PARAMS_ALERTAS: ParametroAlerta[] = [
  { label: "Depósitos por mes", valor: "10" },
  { label: "Depósitos salario mínimo por transferencia", valor: "5" },
  { label: "Transferencias por hora", valor: "10" },
  { label: "Operaciones repetitivas", valor: "5" },
  { label: "Volumen anormal", valor: "$ 1.000.000 – $ 5.000.000" },
  { label: "Política a menores", valor: "Bloquear" },
];

const DEFAULT_PARAMS_BLOQUEO: ParametroBloqueo[] = [
  { label: "Salarios mínimos por persona", valor: "15" },
  { label: "Salarios mínimos por empresa", valor: "50" },
];

const DEFAULT_MODULOS: ModuloVinculado[] = [
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

const MODULO_POPUP_META: Record<
  ModuloVinculado["clave"],
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

const modIcon: Record<ModuloVinculado["clave"], typeof Landmark> = {
  pct: Landmark,
  blp: Link2,
  api: Globe,
};

type TabName =
  | "identificacion"
  | "contexto"
  | "validaciones"
  | "riesgo"
  | "modulos"
  | "financiero"
  | "documentos"
  | "subcuentas"
  | "historial";

type FieldDef = {
  key: keyof UserData;
  label: string;
  type?: "text" | "number" | "select";
  options?: { value: string; label: string }[];
  renderValue?: (user: UserData) => string;
};

const personalFields: FieldDef[] = [
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

const complianceFields: FieldDef[] = [
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

const empresaFields: FieldDef[] = [
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

function getFieldValue(user: UserData, field: FieldDef): string {
  if (field.renderValue) return field.renderValue(user);
  const val = user[field.key];
  if (typeof val === "number") return String(val);
  return String(val ?? "");
}

function SectionCard({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <h4 className="font-display font-semibold text-sm">{title}</h4>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function KpiTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-muted/30 rounded-lg border border-border p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-display font-semibold text-lg text-foreground mt-0.5 tabular-nums truncate">
        {value}
      </div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

const btnSmallPrimary =
  "inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-moli-red-dark active:bg-moli-red-darker transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const btnSmallOutline =
  "inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-card text-foreground text-xs font-semibold hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

function EmptyMsg({ children }: { children: ReactNode }) {
  return (
    <div className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
      {children}
    </div>
  );
}

const MOCK_HISTORIAL: HistorialRegistro[] = [
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

function getHistorial(user: UserData): HistorialRegistro[] {
  if (getUltimoDigitoLegajo(user.legajo) === "8") return [];
  return MOCK_HISTORIAL;
}

function getUltimoDigitoLegajo(legajo: string): string {
  const m = legajo.match(/\d+$/);
  return m ? m[0].slice(-1) : "";
}

function buildMovimientosOperativos(user: UserData): MovimientoOperativo[] {
  if (getUltimoDigitoLegajo(user.legajo) === "5") return [];
  const base = user.legajo.replace(/[^a-zA-Z0-9]/g, "") || "usr";
  const tipos = ["Depósito", "Retiro", "Transferencia", "Cobro QR", "Pago de tarjeta", "Comisión"];
  const estados = ["Acreditado", "Pendiente", "Rechazado"];
  return Array.from({ length: 14 }, (_, i) => ({
    id: `mov-${base}-${i + 1}`,
    tipo: tipos[i % tipos.length],
    detalle: `TX-2026-08-0${(i % 9) + 1}-${1000 + i}`,
    monto: `$ ${((i + 1) * 3250 + i * 137).toLocaleString("es-AR")}`,
    fecha: `0${(i % 9) + 1}/08/2026`,
    estado: estados[i % estados.length],
  }));
}

const fmtARS = (n: number) => "$ " + n.toLocaleString("es-AR");

const fmtMov = (n: number) => (n >= 0 ? "+" : "") + "$ " + Math.abs(n).toLocaleString("es-AR");

const historialColumns: Column<HistorialRegistro>[] = [
  {
    key: "campo",
    label: "Campo actualizado",
    sortable: true,
    filterable: true,
    render: (r) => <span className="font-medium">{r.campo}</span>,
  },
  {
    key: "valorAnterior",
    label: "Valor anterior",
    render: (r) => <span className="text-muted-foreground line-through">{r.valorAnterior}</span>,
  },
  {
    key: "valorNuevo",
    label: "Valor nuevo",
    sortable: true,
    filterable: true,
    render: (r) => <span className="text-foreground font-medium">{r.valorNuevo}</span>,
  },
  {
    key: "fecha",
    label: "Fecha y hora",
    sortable: true,
    filterable: "date",
    render: (r) => (
      <span className="text-muted-foreground tabular-nums">
        {r.fecha} {r.hora}
      </span>
    ),
  },
  {
    key: "usuario",
    label: "Actualizado por",
    sortable: true,
    filterable: true,
    render: (r) => <span className="font-mono text-xs">{r.usuario}</span>,
  },
];

const movimientosOperativosColumns: Column<MovimientoOperativo>[] = [
  {
    key: "detalle",
    label: "Movimiento",
    sortable: true,
    filterable: true,
    render: (r) => <span className="font-mono text-xs">{r.detalle}</span>,
  },
  {
    key: "tipo",
    label: "Tipo",
    sortable: true,
    filterable: "enum",
    filterOptions: ["Depósito", "Retiro", "Transferencia", "Cobro QR", "Pago de tarjeta", "Comisión"],
    render: (r) => <span className="font-medium">{r.tipo}</span>,
  },
  {
    key: "monto",
    label: "Monto",
    sortable: true,
    render: (r) => <span className="font-semibold tabular-nums">{r.monto}</span>,
  },
  {
    key: "fecha",
    label: "Fecha",
    sortable: true,
    filterable: "date",
    render: (r) => <span className="text-muted-foreground tabular-nums">{r.fecha}</span>,
  },
  {
    key: "estado",
    label: "Estado",
    sortable: true,
    filterable: "enum",
    filterOptions: ["Acreditado", "Pendiente", "Rechazado"],
    render: (r) => (
      <Badge
        tone={r.estado === "Acreditado" ? "success" : r.estado === "Pendiente" ? "warn" : "danger"}
      >
        {r.estado}
      </Badge>
    ),
  },
];

const impuestosOperativosColumns: Column<ImpuestoUsuario>[] = [
  {
    key: "nombre",
    label: "Impuesto",
    sortable: true,
    filterable: true,
    render: (r) => <span className="font-medium">{r.nombre}</span>,
  },
  {
    key: "monto",
    label: "Monto",
    sortable: true,
    render: (r) => <span className="font-semibold tabular-nums">{r.monto}</span>,
  },
  {
    key: "fecha",
    label: "Fecha",
    sortable: true,
    filterable: "date",
    render: (r) => <span className="text-muted-foreground tabular-nums">{r.fecha}</span>,
  },
];

const alertasOperativasColumns: Column<AlertaUsuario>[] = [
  {
    key: "tipo",
    label: "Alerta",
    sortable: true,
    filterable: true,
    render: (r) => <span className="font-medium">{r.tipo}</span>,
  },
  {
    key: "fecha",
    label: "Fecha",
    sortable: true,
    filterable: "date",
    render: (r) => <span className="text-muted-foreground tabular-nums">{r.fecha}</span>,
  },
  {
    key: "estado",
    label: "Estado",
    sortable: true,
    filterable: "enum",
    filterOptions: ["Pendiente", "Revisado", "Resuelto"],
    render: (r) => (
      <Badge tone={r.estado === "Pendiente" ? "warn" : r.estado === "Resuelto" ? "success" : "neutral"}>
        {r.estado}
      </Badge>
    ),
  },
];

const bloqueosOperativosColumns: Column<AlertaUsuario>[] = [
  {
    key: "tipo",
    label: "Bloqueo",
    sortable: true,
    filterable: true,
    render: (r) => <span className="font-medium">{r.tipo}</span>,
  },
  {
    key: "fecha",
    label: "Fecha",
    sortable: true,
    filterable: "date",
    render: (r) => <span className="text-muted-foreground tabular-nums">{r.fecha}</span>,
  },
  {
    key: "estado",
    label: "Estado",
    sortable: true,
    filterable: "enum",
    filterOptions: ["Activo", "Inactivo"],
    render: (r) => (
      <Badge tone={r.estado === "Activo" ? "danger" : "neutral"}>{r.estado}</Badge>
    ),
  },
];

export function UserModal({
  open,
  onClose,
  user,
  onUserChange,
  inline = false,
}: {
  open: boolean;
  onClose: () => void;
  user: UserData | null;
  onUserChange?: (updated: UserData) => void;
  inline?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabName>("identificacion");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const [contextoSubTab, setContextoSubTab] = useState<"movimientos" | "impuestos">(
    "movimientos",
  );
  const [riesgoSubTab, setRiesgoSubTab] = useState<"alertas" | "bloqueos">("alertas");

  const [validaciones, setValidaciones] = useState<ValidacionAutomatica[]>([]);
  const [parametrosAlertas, setParametrosAlertas] =
    useState<ParametroAlerta[]>(DEFAULT_PARAMS_ALERTAS);
  const [parametrosBloqueo, setParametrosBloqueo] =
    useState<ParametroBloqueo[]>(DEFAULT_PARAMS_BLOQUEO);
  const [modulos, setModulos] = useState<ModuloVinculado[]>(DEFAULT_MODULOS);

  const [exencionOpen, setExencionOpen] = useState(false);
  const [exencionForm, setExencionForm] = useState({
    cuit: "",
    direccion: "Entrada",
    motivo: "",
    desde: "",
    hasta: "",
  });
  const [exenciones, setExenciones] = useState<
    { cuit: string; direccion: string; motivo: string; desde: string; hasta: string }[]
  >([]);

  const [moduloPopup, setModuloPopup] = useState<ModuloVinculado["clave"] | null>(null);

  const [entidadDraft, setEntidadDraft] = useState({
    controlSubcuentas: true,
    maximoSubcuentas: 0,
    redireccionAutomatica: false,
  });

  const [editAlertasOpen, setEditAlertasOpen] = useState(false);
  const [editAlertasDraft, setEditAlertasDraft] =
    useState<ParametroAlerta[]>(DEFAULT_PARAMS_ALERTAS);
  const [editBloqueoOpen, setEditBloqueoOpen] = useState(false);
  const [editBloqueoDraft, setEditBloqueoDraft] =
    useState<ParametroBloqueo[]>(DEFAULT_PARAMS_BLOQUEO);

  const [cargarSubcuentasOpen, setCargarSubcuentasOpen] = useState(false);
  const [subDetail, setSubDetail] = useState<Subcuenta | null>(null);
  const [subEliminar, setSubEliminar] = useState<Subcuenta | null>(null);
  const [editSub, setEditSub] = useState<Subcuenta | null>(null);
  const [subPage, setSubPage] = useState(1);
  const SUB_PAGE_SIZE = 10;
  const [subcuentaForm, setSubcuentaForm] = useState({
    nombre: "",
    tipo: "Operativa",
    resp: "",
    lim: "",
    saldoInicial: "0",
    activarInmediato: true,
  });

  const navigate = useNavigate();
  const { role } = useDemoMode();
  const canEximir = role === "admin";

  useEffect(() => {
    if (user) {
      setValidaciones(user.validacionesAutomaticas ?? []);
      setParametrosAlertas(user.parametrosAlertas ?? DEFAULT_PARAMS_ALERTAS);
      setParametrosBloqueo(user.parametrosBloqueo ?? DEFAULT_PARAMS_BLOQUEO);
      setModulos(user.modulos ?? DEFAULT_MODULOS);
      setEntidadDraft({
        controlSubcuentas: user.entidad?.controlSubcuentas ?? true,
        maximoSubcuentas: user.entidad?.maximoSubcuentas ?? 0,
        redireccionAutomatica: user.entidad?.redireccionAutomatica ?? false,
      });
    }
  }, [user]);

  if (!open || !user) return null;

  const existingDocs = user.documentos.filter((d) => d.url);
  const missingDocTypes: UserDocument["tipo"][] = (
    ["id_frente", "id_dorso", "servicio", "selfie"] as UserDocument["tipo"][]
  ).filter((t) => !user.documentos.some((d) => d.tipo === t && d.url));

  const productos = user.productos ?? [];
  const comisiones = user.comisiones ?? [];
  const ultimoDigito = getUltimoDigitoLegajo(user.legajo);
  const impuestos = ultimoDigito === "5" ? [] : (user.impuestos ?? []);
  const alertas = ultimoDigito === "6" ? [] : (user.alertas ?? []);
  const bloqueos = ultimoDigito === "6" ? [] : (user.bloqueos ?? []);
  const entidad = user.entidad ?? {
    controlSubcuentas: true,
    maximoSubcuentas: 0,
    redireccionAutomatica: false,
    presionOperativa: "—",
  };
  const cvuInformados = user.subcuentas.filter((s) => s.cbu).length;
  const cvuRecientes = user.subcuentas.slice(0, 3);
  const movimientosOperativos = buildMovimientosOperativos(user);

  const filasModuloPopup = (clave: ModuloVinculado["clave"], cantidad: number) => {
    const estados = ["Activo", "Pendiente", "Suspendido"];
    const base = user.legajo.replace(/[^a-zA-Z0-9]/g, "") || "usr";
    const rows: { col1: string; col2: string; col3: string }[] = [];
    for (let i = 0; i < Math.max(0, Math.min(cantidad, 8)); i++) {
      const estado = estados[i % estados.length];
      if (clave === "pct") {
        rows.push({
          col1: `Comercio PCT ${i + 1}`,
          col2: user.cuit || "30-00000000-0",
          col3: estado,
        });
      } else if (clave === "blp") {
        rows.push({
          col1: `Link de pago ${i + 1}`,
          col2: ["CREDIT_CARD", "DEBIT_CARD", "PREPAID_CARD", "PAGOFACIL"][i % 4],
          col3: estado,
        });
      } else {
        rows.push({
          col1: `Usuario API ${i + 1}`,
          col2: `pk_${base.slice(0, 8)}_${i + 1}`,
          col3: estado,
        });
      }
    }
    return rows;
  };

  const go = (to: string) => {
    if (!inline) onClose();
    navigate({ to });
  };

  const handleFileUpload = (tipo: UserDocument["tipo"]) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        const updated: UserData = {
          ...user,
          documentos: [
            ...user.documentos,
            { id: `doc-${Date.now()}`, tipo, url, label: docLabels[tipo] },
          ],
        };
        onUserChange?.(updated);
        setPreviewImg(url);
      }
    };
    input.click();
  };

  const startEdit = (key: string) => {
    setEditingField(key);
    const val = user[key as keyof UserData];
    setEditingValue(typeof val === "number" ? String(val) : String(val ?? ""));
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditingValue("");
  };

  const saveEdit = (key: string) => {
    if (!onUserChange) return;
    const updated = { ...user };
    const fieldDef = [...personalFields, ...complianceFields, ...empresaFields].find(
      (f) => f.key === key,
    );
    if (fieldDef?.type === "number") {
      (updated as Record<string, unknown>)[key] = Number(editingValue);
    } else if (key === "status") {
      updated.status = editingValue as UserStatus;
    } else {
      (updated as Record<string, unknown>)[key] = editingValue;
    }
    onUserChange(updated);
    setEditingField(null);
    setEditingValue("");
  };

  const abrirExencion = () => {
    setExencionForm((f) => ({ ...f, cuit: f.cuit || user.cuit }));
    setExencionOpen(true);
  };

  const guardarExencion = () => {
    setExenciones((prev) => [
      ...prev,
      {
        cuit: exencionForm.cuit || user.cuit,
        direccion: exencionForm.direccion,
        motivo: exencionForm.motivo || "Sin motivo",
        desde: exencionForm.desde || "Hoy",
        hasta: exencionForm.hasta || "Abierta",
      },
    ]);
    setExencionOpen(false);
    setExencionForm({ cuit: "", direccion: "Entrada", motivo: "", desde: "", hasta: "" });
    toast.success("Exención de débitos y créditos registrada");
  };

  const aplicarParametrosEntidad = () => {
    if (!onUserChange) return;
    const actual = user.entidad ?? {
      controlSubcuentas: true,
      maximoSubcuentas: 0,
      redireccionAutomatica: false,
      presionOperativa: "—",
    };
    onUserChange({
      ...user,
      entidad: {
        ...actual,
        controlSubcuentas: entidadDraft.controlSubcuentas,
        maximoSubcuentas: entidadDraft.maximoSubcuentas,
        redireccionAutomatica: entidadDraft.redireccionAutomatica,
      },
    });
    toast.success("Parámetros de entidad aplicados");
  };

  const forzarValidacion = () => {
    const hoy = new Date().toLocaleDateString("es-AR");
    setValidaciones((prev) => [
      {
        id: `val-${Date.now()}`,
        proveedor: "Validación forzada",
        estado: "En proceso",
        fecha: hoy,
      },
      ...prev,
    ]);
    toast.success("Validación automática en proceso");
  };

  const abrirEditarAlertas = () => {
    setEditAlertasDraft(parametrosAlertas);
    setEditAlertasOpen(true);
  };
  const guardarAlertas = () => {
    setParametrosAlertas(editAlertasDraft);
    setEditAlertasOpen(false);
    toast.success("Parámetros de alertas actualizados");
  };

  const abrirEditarBloqueo = () => {
    setEditBloqueoDraft(parametrosBloqueo);
    setEditBloqueoOpen(true);
  };
  const guardarBloqueo = () => {
    setParametrosBloqueo(editBloqueoDraft);
    setEditBloqueoOpen(false);
    toast.success("Parámetros de bloqueo actualizados");
  };

  const recargarModulos = () => {
    const nueva = modulos.map((m) => ({ ...m, cantidad: Math.floor(Math.random() * 6) }));
    setModulos(nueva);
    toast.info("Detección de módulos actualizada");
  };

  const guardarSubcuenta = () => {
    if (!onUserChange) return;
    const id = editSub?.id ?? `SUB-${Date.now()}`;
    const saldoInicial = Number(subcuentaForm.saldoInicial) || 0;
    const nueva: Subcuenta = {
      id,
      nombre: subcuentaForm.nombre || `Subcuenta ${id}`,
      apellido: editSub?.apellido ?? user.apellido,
      email: user.email,
      cbu: `0000003 10001111${String(Date.now()).slice(-6)} 01`,
      tipo: subcuentaForm.tipo as Subcuenta["tipo"],
      estado: subcuentaForm.activarInmediato ? "Activa" : "Pausada",
      disp: saldoInicial,
      ret: 0,
      conc: saldoInicial,
      ing: fmtARS(saldoInicial),
      egr: "$ 0",
      resp: subcuentaForm.resp || "—",
      lim: subcuentaForm.lim || "Sin limite",
      retirosHab: subcuentaForm.activarInmediato,
      movimientos: [],
    };
    onUserChange({
      ...user,
      subcuentas: editSub
        ? user.subcuentas.map((s) => (s.id === editSub.id ? nueva : s))
        : [...user.subcuentas, nueva],
    });
    setSubcuentaForm({
      nombre: "",
      tipo: "Operativa",
      resp: "",
      lim: "",
      saldoInicial: "0",
      activarInmediato: true,
    });
    setEditSub(null);
    setCargarSubcuentasOpen(false);
    toast.success(editSub ? "Subcuenta actualizada" : "Subcuenta cargada");
  };

  const abrirEditarSubcuenta = (sub: Subcuenta) => {
    setEditSub(sub);
    setSubcuentaForm({
      nombre: sub.nombre,
      tipo: sub.tipo,
      resp: sub.resp,
      lim: sub.lim,
      saldoInicial: String(sub.disp),
      activarInmediato: sub.estado === "Activa",
    });
    setCargarSubcuentasOpen(true);
  };

  const eliminarSubcuenta = (sub: Subcuenta) => {
    if (!onUserChange) return;
    onUserChange({ ...user, subcuentas: user.subcuentas.filter((s) => s.id !== sub.id) });
    toast.success("Subcuenta eliminada");
  };

  const monoFields = new Set([
    "legajo",
    "cuit",
    "cuitEmpresa",
    "numeroDireccion",
    "codigoPostal",
    "fechaRegistro",
    "fechaInscripcion",
    "fechaNacimiento",
  ]);

  const renderField = (def: FieldDef) => {
    const key = def.key;
    const isEditing = editingField === key;
    const value = getFieldValue(user, def);

    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          {def.type === "select" && def.options ? (
            <select
              className="w-full h-8 rounded border border-input bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              autoFocus
            >
              {def.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <Input
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              type={def.type === "number" ? "number" : "text"}
              className="h-8 text-sm"
              autoFocus
            />
          )}
          <button
            type="button"
            onClick={() => saveEdit(key)}
            className="p-1 rounded hover:bg-primary/10 text-primary shrink-0"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      );
    }

    return (
      <div className="group flex items-center justify-between gap-2">
        <span
          className={`text-sm font-medium truncate ${
            monoFields.has(key) ? "font-mono tabular-nums" : ""
          }`}
        >
          {value || "—"}
        </span>
        <button
          type="button"
          onClick={() => startEdit(key)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground transition-opacity shrink-0"
        >
          <Pencil size={12} />
        </button>
      </div>
    );
  };

  const renderFieldRow = (def: FieldDef) => (
    <div key={def.key} className="border-b border-border pb-2">
      <div className="text-xs text-muted-foreground mb-0.5">{def.label}</div>
      {renderField(def)}
    </div>
  );

  const tabContent: Record<TabName, () => ReactNode> = {
    identificacion: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        {(user.tipoPersona === "juridica"
          ? [...personalFields, ...empresaFields]
          : personalFields
        ).map(renderFieldRow)}
      </div>
    ),
    contexto: () => contextoSection,
    validaciones: () => validacionesSection,
    riesgo: () => riesgoSection,
    modulos: () => modulosSection,
    financiero: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        {complianceFields.map(renderFieldRow)}
      </div>
    ),
    historial: () => (
      <SectionCard title="Historial de cambios">
        <DataTable
          columns={historialColumns}
          data={getHistorial(user)}
          keyExtractor={(r) => r.id}
          emptyMessage="No hay cambios registrados"
          pageSize={5}
        />
      </SectionCard>
    ),
    documentos: () => (
      <div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {existingDocs.map((doc) => (
            <DocumentoMiniCard
              key={doc.id}
              url={doc.url ?? null}
              legajo={user.legajo}
              label={DOCUMENTO_LABELS[doc.tipo] ?? doc.label}
              onOpen={(u) => u && setPreviewImg(u)}
            />
          ))}
          {missingDocTypes.map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => handleFileUpload(tipo)}
              className="group relative aspect-[3/4] rounded-lg border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-2 hover:border-ring hover:bg-muted/50 transition cursor-pointer"
            >
              <Upload size={20} className="text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-medium">
                {docLabels[tipo]}
              </span>
              <span className="text-[9px] text-muted-foreground/60">Subir imagen</span>
            </button>
          ))}
        </div>
      </div>
    ),
    subcuentas: () => (
      <div className="space-y-4">
        {user.tipoPersona === "juridica" && (
          <SectionCard
            title="Parámetros de entidad"
            actions={
              <button type="button" onClick={aplicarParametrosEntidad} className={btnSmallPrimary}>
                <Check size={14} /> Aplicar cambios de parámetros
              </button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="text-xs font-semibold text-muted-foreground">
                  Control de subcuentas
                </div>
                <input
                  type="checkbox"
                  checked={entidadDraft.controlSubcuentas}
                  onChange={(e) =>
                    setEntidadDraft((d) => ({ ...d, controlSubcuentas: e.target.checked }))
                  }
                  className="h-4 w-4 rounded accent-[var(--color-primary)]"
                />
              </div>
              <div className="rounded-lg border border-border p-3">
                <label className="text-xs font-semibold text-muted-foreground block mb-2">
                  Máximo de subcuentas
                </label>
                <Input
                  type="number"
                  min={0}
                  value={String(entidadDraft.maximoSubcuentas)}
                  onChange={(e) =>
                    setEntidadDraft((d) => ({
                      ...d,
                      maximoSubcuentas: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="text-xs font-semibold text-muted-foreground">
                  Redirección automática de subcuenta
                </div>
                <input
                  type="checkbox"
                  checked={entidadDraft.redireccionAutomatica}
                  onChange={(e) =>
                    setEntidadDraft((d) => ({ ...d, redireccionAutomatica: e.target.checked }))
                  }
                  className="h-4 w-4 rounded accent-[var(--color-primary)]"
                />
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground mt-3">
              Los cambios se guardan de forma independiente, sin afectar el resto del perfil.
            </div>
          </SectionCard>
        )}

        {user.tipoPersona === "fisica" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiTile label="CVUs informadas" value={String(cvuInformados)} />
            <KpiTile label="Máximo de subcuentas" value={String(entidad.maximoSubcuentas)} />
            <KpiTile
              label="Redirección automática"
              value={entidad.redireccionAutomatica ? "Sí" : "No"}
            />
            <KpiTile label="Presión operativa" value={entidad.presionOperativa} />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {canEximir && (
            <button type="button" onClick={abrirExencion} className={btnSmallOutline}>
              Eximir CUIT principal
            </button>
          )}
          <button
            type="button"
            onClick={() => go("/admin/general/usuarios/cvu")}
            className={btnSmallOutline}
          >
            Ir a usuarios con CVU
          </button>
          <button
            type="button"
            onClick={() => setCargarSubcuentasOpen(true)}
            className={btnSmallPrimary}
          >
            <Plus size={14} /> Cargar subcuentas
          </button>
        </div>

        {(() => {
          const totalPages = Math.max(1, Math.ceil(user.subcuentas.length / SUB_PAGE_SIZE));
          const paginated = user.subcuentas.slice(
            (subPage - 1) * SUB_PAGE_SIZE,
            subPage * SUB_PAGE_SIZE,
          );
          return (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="bg-muted/50 border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2.5 font-semibold">Nombre</th>
                      <th className="px-4 py-2.5 font-semibold">Apellido</th>
                      <th className="px-4 py-2.5 font-semibold">Email</th>
                      <th className="px-4 py-2.5 font-semibold">Estado</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((sub) => (
                      <tr key={sub.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2.5 text-xs font-medium">{sub.nombre}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{sub.apellido}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{sub.email}</td>
                        <td className="px-4 py-2.5">
                          <Badge tone={sub.estado === "Activa" ? "success" : "neutral"}>
                            {sub.estado}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1 justify-end">
                            <button
                              type="button"
                              onClick={() => setSubDetail(sub)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-card hover:bg-muted transition"
                              title="Ver detalle"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => abrirEditarSubcuenta(sub)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-card hover:bg-muted transition"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSubEliminar(sub)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-card hover:bg-red-50 hover:text-red-600 transition"
                              title="Borrar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {paginated.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8">
                          <EmptyMsg>Sin subcuentas</EmptyMsg>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-muted-foreground">
                <span>
                  {user.subcuentas.length === 0
                    ? "0 registros"
                    : `${(subPage - 1) * SUB_PAGE_SIZE + 1}–${Math.min(
                        subPage * SUB_PAGE_SIZE,
                        user.subcuentas.length,
                      )} de ${user.subcuentas.length}`}
                </span>
                <div className="flex gap-1">
                  <BtnOutline
                    className="h-7 px-2 text-[11px]"
                    disabled={subPage <= 1}
                    onClick={() => setSubPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </BtnOutline>
                  <BtnOutline
                    className="h-7 px-2 text-[11px]"
                    disabled={subPage >= totalPages}
                    onClick={() => setSubPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Siguiente
                  </BtnOutline>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    ),
  };

  const tabs: { key: TabName; label: string; show: boolean }[] = [
    { key: "identificacion", label: "Identificación", show: true },
    { key: "contexto", label: "Contexto operativo", show: true },
    { key: "validaciones", label: "Validaciones automáticas", show: true },
    { key: "riesgo", label: "Riesgo y monitoreo", show: true },
    { key: "modulos", label: "Módulos y productos", show: true },
    { key: "financiero", label: "Financiero & Compliance", show: true },
    { key: "documentos", label: "Documentos", show: true },
    { key: "subcuentas", label: "Subcuentas & CVU", show: true },
    { key: "historial", label: "Historial de cambios", show: true },
  ];

  const visibleTabs = tabs.filter((t) => t.show);

  const resumenCards = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Identificación */}
      <div className="bg-muted/30 rounded-lg p-4 border border-border space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Identificación
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Nombre completo</div>
          <div className="text-sm font-semibold mt-0.5">
            {user.nombre} {user.apellido}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Email</div>
          <div className="text-sm font-semibold mt-0.5 truncate">{user.email}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Tipo de cuenta</div>
          <div className="text-sm font-semibold mt-0.5">{user.tipoCuenta}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">CUIT</div>
          <div className="text-sm font-semibold mt-0.5 font-mono tabular-nums">{user.cuit}</div>
        </div>
        {canEximir && (
          <button
            type="button"
            onClick={abrirExencion}
            className={btnSmallOutline + " w-full justify-center"}
          >
            Eximir débitos y créditos
          </button>
        )}
        {exenciones.length > 0 && (
          <div className="text-[11px] text-muted-foreground border-t border-border pt-2">
            Última exención:{" "}
            <span className="text-foreground font-medium">
              {exenciones[exenciones.length - 1].motivo}
            </span>
          </div>
        )}
      </div>

      {/* Contexto operativo */}
      <div className="bg-muted/30 rounded-lg p-4 border border-border space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Contexto operativo
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Documentos cargados</div>
          <div className="flex flex-wrap gap-1">
            {existingDocs.length === 0 ? (
              <span className="text-xs text-muted-foreground">Sin documentos</span>
            ) : (
              existingDocs.map((d) => (
                <Badge key={d.id} tone="neutral">
                  {d.label}
                </Badge>
              ))
            )}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Validaciones auto KYC</div>
          <div className="text-sm font-semibold mt-0.5">
            {validaciones.length === 0 ? "Sin registros" : `${validaciones.length} registro(s)`}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">PEP</div>
          <div className="text-sm font-semibold mt-0.5">{user.pep}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Alertas y bloqueos</div>
          <div className="text-sm font-semibold mt-0.5 tabular-nums">
            {alertas.length + bloqueos.length}
          </div>
        </div>
      </div>

      {/* Módulos y productos */}
      <div className="bg-muted/30 rounded-lg p-4 border border-border space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Módulos y productos
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Cuentas bancarias</div>
          <div className="text-sm font-semibold mt-0.5 tabular-nums">
            {user.cantidadCuentasBancarias}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Cuentas virtuales (CVU)</div>
          <div className="text-sm font-semibold mt-0.5 tabular-nums">
            {user.cantidadCuentasVirtuales}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Módulos activos</div>
          <div className="text-sm font-semibold mt-0.5 tabular-nums">
            {modulos.filter((m) => m.cantidad > 0).length}
          </div>
        </div>
      </div>
    </div>
  );

  const validacionesSection = (
    <SectionCard
      title="Validaciones automáticas"
      actions={
        <button type="button" onClick={forzarValidacion} className={btnSmallPrimary}>
          <RefreshCw size={14} /> Forzar nueva validación
        </button>
      }
    >
      {validaciones.length === 0 ? (
        <EmptyMsg>El usuario no tiene validaciones automáticas registradas</EmptyMsg>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {validaciones.map((v) => (
            <div
              key={v.id}
              className="rounded-lg border border-border p-3 flex items-start justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{v.proveedor}</div>
                <div className="text-xs text-muted-foreground mt-0.5 font-mono tabular-nums">
                  {v.fecha}
                </div>
              </div>
              <Badge tone={validacionTone[v.estado]}>{v.estado}</Badge>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );

  const contextoSection = (
    <SectionCard title="Contexto operativo">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
        <KpiTile label="CVUs" value={String(cvuRecientes.length)} />
        <KpiTile label="Comisiones" value={String(comisiones.length)} />
        <KpiTile label="Impuestos" value={String(impuestos.length)} />
        <KpiTile label="Alertas" value={String(alertas.length)} />
        <KpiTile label="Bloqueos" value={String(bloqueos.length)} />
        <KpiTile
          label="Módulos inferidos"
          value={String(modulos.filter((m) => m.cantidad > 0).length)}
        />
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border mb-4">
        {(
          [
            { key: "movimientos", label: "Ver movimientos" },
            { key: "impuestos", label: "Ver impuestos" },
          ] as const
        ).map((st) => (
          <button
            key={st.key}
            type="button"
            onClick={() => setContextoSubTab(st.key)}
            className={`px-3 py-2 text-xs font-semibold rounded-t-md transition-colors ${
              contextoSubTab === st.key
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {contextoSubTab === "movimientos" ? (
        <div className="space-y-3">
          <DataTable
            columns={movimientosOperativosColumns}
            data={movimientosOperativos}
            keyExtractor={(m) => m.id}
            emptyMessage="Sin movimientos para este usuario"
            pageSize={5}
          />
          <button
            type="button"
            onClick={() => go("/admin/general/movimientos")}
            className={btnSmallOutline}
          >
            <ExternalLink size={13} /> Ir a página de movimientos
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <DataTable
            columns={impuestosOperativosColumns}
            data={impuestos}
            keyExtractor={(i) => i.id}
            emptyMessage="Sin impuestos para este usuario"
            pageSize={5}
          />
          <button
            type="button"
            onClick={() => go("/admin/general/movimientos/impuestos")}
            className={btnSmallOutline}
          >
            <ExternalLink size={13} /> Ir a página de impuestos
          </button>
        </div>
      )}
    </SectionCard>
  );

  const riesgoSection = (
    <SectionCard title="Riesgo y monitoreo">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Parámetros de alertas
            </div>
            <button type="button" onClick={abrirEditarAlertas} className={btnSmallOutline}>
              <Pencil size={12} /> Editar
            </button>
          </div>
          <ul className="space-y-2">
            {parametrosAlertas.map((p) => (
              <li key={p.label} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">{p.label}</span>
                <span className="font-semibold tabular-nums text-right">{p.valor}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ShieldAlert size={13} /> Parámetros de bloqueo
            </div>
            <button type="button" onClick={abrirEditarBloqueo} className={btnSmallOutline}>
              <Pencil size={12} /> Editar
            </button>
          </div>
          <ul className="space-y-2">
            {parametrosBloqueo.map((p) => (
              <li key={p.label} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">{p.label}</span>
                <span className="font-semibold tabular-nums text-right">{p.valor}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border mb-4">
        {(
          [
            { key: "alertas", label: "Ver alertas" },
            { key: "bloqueos", label: "Ver bloqueos" },
          ] as const
        ).map((st) => (
          <button
            key={st.key}
            type="button"
            onClick={() => setRiesgoSubTab(st.key)}
            className={`px-3 py-2 text-xs font-semibold rounded-t-md transition-colors ${
              riesgoSubTab === st.key
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {riesgoSubTab === "alertas" ? (
        <div className="space-y-3">
          <DataTable
            columns={alertasOperativasColumns}
            data={alertas}
            keyExtractor={(a) => a.id}
            emptyMessage="Sin alertas para este usuario"
            pageSize={5}
          />
          <button
            type="button"
            onClick={() => go("/admin/general/alertas")}
            className={btnSmallOutline}
          >
            <ExternalLink size={13} /> Ir a alertas
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <DataTable
            columns={bloqueosOperativosColumns}
            data={bloqueos}
            keyExtractor={(b) => b.id}
            emptyMessage="Sin bloqueos para este usuario"
            pageSize={5}
          />
          <button
            type="button"
            onClick={() => go("/admin/general/alertas/bloqueos")}
            className={btnSmallOutline}
          >
            <ExternalLink size={13} /> Ir a bloqueos
          </button>
        </div>
      )}
    </SectionCard>
  );

  const modulosSection = (
    <SectionCard
      title="Módulos y productos"
      actions={
        <button type="button" onClick={recargarModulos} className={btnSmallOutline}>
          <RefreshCw size={13} /> Recargar
        </button>
      }
    >
      <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {modulos.map((m) => {
            const Icon = modIcon[m.clave];
            return (
              <div key={m.clave} className="rounded-lg border border-border p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-md bg-muted/60 text-muted-foreground">
                    <Icon size={16} />
                  </span>
                  <div className="font-display font-semibold text-sm">{m.titulo}</div>
                </div>
                {m.cantidad > 0 ? (
                  <div className="text-xs text-muted-foreground">
                    Vinculados:{" "}
                    <span className="font-semibold text-foreground tabular-nums">{m.cantidad}</span>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">{m.vacioMsg}</div>
                )}
                <button
                  type="button"
                  onClick={() => setModuloPopup(m.clave)}
                  className={`${btnSmallOutline} mt-auto self-start`}
                >
                  <ExternalLink size={13} /> {m.verLabel}
                </button>
              </div>
            );
          })}
        </div>
        {productos.length > 0 && (
          <div className="mt-5 pt-5 border-t border-border">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Productos vinculados
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {productos.map((p) => (
                <div key={p.id} className="rounded-lg border border-border p-3">
                  <div className="text-xs font-medium text-muted-foreground">{p.nombre}</div>
                  <div className="text-sm font-semibold mt-0.5 tabular-nums">
                    {p.cantidad}
                    {p.detalle ? ` · ${p.detalle}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    </SectionCard>
  );

  return (
    <div
      className={inline ? "w-full" : "fixed inset-0 z-[60] flex items-center justify-center p-4"}
    >
      {!inline && <div className="absolute inset-0 bg-black/50" onClick={onClose} />}

      <div
        className={`relative bg-card rounded-lg w-full flex flex-col ${
          inline ? "shadow-none" : "max-w-6xl max-h-[92vh] shadow-xl"
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between z-10 rounded-t-lg">
          <div className="flex items-center gap-4 flex-wrap">
            <h3 className="font-display font-semibold text-lg">
              Ver y editar usuario —{" "}
              {user.tipoPersona === "juridica" ? "Persona Jurídica" : "Persona Física"}
            </h3>
            <Badge
              tone={statusTone[user.status]}
              className="px-3.5 py-1.5 text-sm rounded-lg"
            >
              {statusLabel[user.status]}
            </Badge>
          </div>
          {!inline && (
            <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Cards superiores de resumen */}
          {resumenCards}

          {/* Desktop: Tab Navigation */}
          <div className="hidden md:flex flex-wrap gap-1 border-b border-border pb-0">
            {visibleTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2 text-xs font-semibold rounded-t-md transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary/10 text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Desktop: Tab Content */}
          <div className="hidden md:block min-h-[200px]">{tabContent[activeTab]()}</div>

          {/* Mobile: stacked sections */}
          <div className="block md:hidden space-y-6">
            {visibleTabs.map((tab) => (
              <div key={tab.key}>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  {tab.label}
                </div>
                {tabContent[tab.key]()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal: Eximir débitos y créditos / Eximir CUIT principal */}
      {exencionOpen && (
        <FormDialog
          open={exencionOpen}
          onClose={() => setExencionOpen(false)}
          title="Eximir débitos y créditos"
          description={`Exención de impuestos para ${user.nombre} ${user.apellido}`}
          onSubmit={guardarExencion}
          submitLabel="Guardar exención"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">CUIT</label>
              <Input
                value={exencionForm.cuit}
                onChange={(e) => setExencionForm({ ...exencionForm, cuit: e.target.value })}
                placeholder="20-12345678-9"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                Dirección
              </label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                value={exencionForm.direccion}
                onChange={(e) => setExencionForm({ ...exencionForm, direccion: e.target.value })}
              >
                <option value="Entrada">Entrada</option>
                <option value="Salida">Salida</option>
                <option value="Ambos">Ambos</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Motivo</label>
              <Input
                value={exencionForm.motivo}
                onChange={(e) => setExencionForm({ ...exencionForm, motivo: e.target.value })}
                placeholder="Ej.: error de duplicación de cargos"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                Vigencia desde
              </label>
              <Input
                type="date"
                value={exencionForm.desde}
                onChange={(e) => setExencionForm({ ...exencionForm, desde: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                Vigencia hasta
              </label>
              <Input
                type="date"
                value={exencionForm.hasta}
                onChange={(e) => setExencionForm({ ...exencionForm, hasta: e.target.value })}
              />
            </div>
          </div>
        </FormDialog>
      )}

      {/* Modal: Editar parámetros de alertas */}
      {editAlertasOpen && (
        <FormDialog
          open={editAlertasOpen}
          onClose={() => setEditAlertasOpen(false)}
          title="Editar parámetros de alertas"
          description={`Parámetros específicos del usuario ${user.legajo}`}
          onSubmit={guardarAlertas}
          submitLabel="Guardar cambios"
          size="lg"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {editAlertasDraft.map((p, i) => (
              <div key={p.label}>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  {p.label}
                </label>
                <Input
                  value={p.valor}
                  onChange={(e) => {
                    const next = [...editAlertasDraft];
                    next[i] = { ...p, valor: e.target.value };
                    setEditAlertasDraft(next);
                  }}
                />
              </div>
            ))}
          </div>
        </FormDialog>
      )}

      {/* Modal: Editar parámetros de bloqueo */}
      {editBloqueoOpen && (
        <FormDialog
          open={editBloqueoOpen}
          onClose={() => setEditBloqueoOpen(false)}
          title="Editar parámetros de bloqueo"
          description={`Parámetros específicos del usuario ${user.legajo}`}
          onSubmit={guardarBloqueo}
          submitLabel="Guardar cambios"
          size="lg"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {editBloqueoDraft.map((p, i) => (
              <div key={p.label}>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  {p.label}
                </label>
                <Input
                  value={p.valor}
                  onChange={(e) => {
                    const next = [...editBloqueoDraft];
                    next[i] = { ...p, valor: e.target.value };
                    setEditBloqueoDraft(next);
                  }}
                />
              </div>
            ))}
          </div>
        </FormDialog>
      )}

      {/* Modal: Cargar / Editar subcuentas */}
      {cargarSubcuentasOpen && (
        <FormDialog
          open={cargarSubcuentasOpen}
          onClose={() => {
            setCargarSubcuentasOpen(false);
            setEditSub(null);
          }}
          title={editSub ? "Editar subcuenta" : "Cargar subcuentas"}
          description={
            editSub
              ? `Modifica los datos de la subcuenta ${editSub.nombre}.`
              : `Alta de subcuenta para ${user.nombre} ${user.apellido}`
          }
          onSubmit={guardarSubcuenta}
          submitLabel={editSub ? "Guardar cambios" : "Cargar subcuenta"}
          size="lg"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                Nombre de la subcuenta
              </label>
              <Input
                value={subcuentaForm.nombre}
                onChange={(e) => setSubcuentaForm({ ...subcuentaForm, nombre: e.target.value })}
                placeholder="Ej. Sucursal Sur"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Tipo</label>
              <select
                value={subcuentaForm.tipo}
                onChange={(e) => setSubcuentaForm({ ...subcuentaForm, tipo: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              >
                <option value="Operativa">Operativa</option>
                <option value="Recaudacion">Recaudacion</option>
                <option value="Garantias">Garantias</option>
                <option value="Sueldos">Sueldos</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                Responsable
              </label>
              <Input
                value={subcuentaForm.resp}
                onChange={(e) => setSubcuentaForm({ ...subcuentaForm, resp: e.target.value })}
                placeholder="Usuario o area"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                Límite diario (ARS)
              </label>
              <Input
                value={subcuentaForm.lim}
                onChange={(e) => setSubcuentaForm({ ...subcuentaForm, lim: e.target.value })}
                placeholder="$ 0,00"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                Saldo inicial
              </label>
              <Input
                type="number"
                value={subcuentaForm.saldoInicial}
                onChange={(e) =>
                  setSubcuentaForm({ ...subcuentaForm, saldoInicial: e.target.value })
                }
                placeholder="0"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={subcuentaForm.activarInmediato}
              onChange={(e) =>
                setSubcuentaForm({ ...subcuentaForm, activarInmediato: e.target.checked })
              }
              className="h-4 w-4 rounded accent-[var(--color-primary)]"
            />
            Activar inmediatamente al crear
          </label>
        </FormDialog>
      )}

      {/* Modal: Detalle de módulo vinculado */}
      {moduloPopup &&
        (() => {
          const meta = MODULO_POPUP_META[moduloPopup];
          const mod = modulos.find((mm) => mm.clave === moduloPopup);
          const filas = filasModuloPopup(moduloPopup, mod?.cantidad ?? 0);
          return (
            <FormDialog
              open={!!moduloPopup}
              onClose={() => setModuloPopup(null)}
              title={meta.titulo}
              description={`${meta.descripcion} · ${user.nombre} ${user.apellido} (${mod?.cantidad ?? 0})`}
              size="lg"
              submitLabel={meta.verTodosLabel}
              hideCancel
              onSubmit={() => {
                const m = modulos.find((mm) => mm.clave === moduloPopup);
                if (m) go(m.ruta);
                setModuloPopup(null);
              }}
            >
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm min-w-[420px]">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-3 py-2 text-left font-display font-semibold text-xs">
                        {meta.columnas[0]}
                      </th>
                      <th className="px-3 py-2 text-left font-display font-semibold text-xs">
                        {meta.columnas[1]}
                      </th>
                      <th className="px-3 py-2 text-center font-display font-semibold text-xs">
                        {meta.columnas[2]}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-3 py-2 text-xs font-medium">{f.col1}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground font-mono">
                          {f.col2}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Badge
                            tone={
                              f.col3 === "Activo"
                                ? "success"
                                : f.col3 === "Pendiente"
                                  ? "warn"
                                  : "neutral"
                            }
                          >
                            {f.col3}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {filas.length === 0 && (
                      <tr>
                        <td colSpan={3}>
                          <EmptyMsg>Sin registros vinculados a este módulo</EmptyMsg>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </FormDialog>
          );
        })()}

      <ConfirmDialog
        open={!!subEliminar}
        onClose={() => setSubEliminar(null)}
        title="Eliminar subcuenta"
        message={`¿Estás seguro de eliminar la subcuenta "${subEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => {
          if (subEliminar) eliminarSubcuenta(subEliminar);
          setSubEliminar(null);
        }}
      />

      {/* Modal: Detalle de subcuenta (paridad con MollyPay-Enterprises /app/subcuentas) */}
      {subDetail && <SubDetailModal sub={subDetail} onClose={() => setSubDetail(null)} />}

      {/* Image Preview */}
      {previewImg && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70"
          onClick={() => setPreviewImg(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh]">
            <img
              src={previewImg}
              alt="Preview"
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setPreviewImg(null)}
              className="absolute -top-3 -right-3 p-1.5 bg-card rounded-full shadow-lg border hover:bg-muted"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SubDetailModal({ sub, onClose }: { sub: Subcuenta; onClose: () => void }) {
  const [editEmail, setEditEmail] = useState(false);
  const [emailVal, setEmailVal] = useState(sub.email);
  const [moveOpen, setMoveOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterTipo, setFilterTipo] = useState<"todos" | "ingreso" | "egreso">("todos");
  const [filterSearch, setFilterSearch] = useState("");

  const allMoves = sub.movimientos ?? [];
  const moves = allMoves.filter((m) => {
    if (filterTipo !== "todos" && m.tipo !== filterTipo) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      if (!m.txid.toLowerCase().includes(q) && !m.entidad.toLowerCase().includes(q) && !m.cbu.includes(q))
        return false;
    }
    return true;
  });

  const totalDepositos = allMoves
    .filter((m) => m.tipo === "ingreso")
    .reduce((a, m) => a + m.monto, 0);
  const totalRetiros = allMoves
    .filter((m) => m.tipo === "egreso")
    .reduce((a, m) => a + m.monto, 0);
  const totalComisiones = allMoves
    .filter((m) => m.entidad === "Moli Financial S.A.")
    .reduce((a, m) => a + m.monto, 0);

  const confirmAction = (accion: string, detalle: string): boolean =>
    window.confirm(`¿Estas seguro de que queres ${accion}?\n\n${detalle}`);

  return (
    <div className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative bg-card w-full sm:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col shadow-xl rounded-t-xl sm:rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="sticky top-0 bg-card border-b px-5 sm:px-6 py-4 flex items-center justify-between z-10 shrink-0">
          <h2 className="text-base font-semibold">Detalles de Subcuenta</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted transition text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-7">
          {/* ══ BLOQUE: Informacion general ══ */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Informacion general</h3>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirmAction(
                        "cambiar la contrasena de esta subcuenta",
                        "Se enviara un enlace de restablecimiento al email del responsable.",
                      )
                    )
                      toast.success("Enlace de restablecimiento enviado");
                  }}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md border bg-card hover:bg-muted transition text-muted-foreground hover:text-foreground"
                  title="Cambiar contrasena"
                >
                  <Key size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirmAction(
                        sub.estado === "Activa" ? "pausar esta subcuenta" : "reactivar esta subcuenta",
                        "Los fondos quedaran " +
                          (sub.estado === "Activa"
                            ? "congelados hasta que la reactives."
                            : "disponibles nuevamente."),
                      )
                    )
                      toast.success(sub.estado === "Activa" ? "Subcuenta pausada" : "Subcuenta reactivada");
                  }}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md border bg-card hover:bg-muted transition text-muted-foreground hover:text-foreground"
                  title={sub.estado === "Activa" ? "Deshabilitar cuenta" : "Reactivar cuenta"}
                >
                  <Pause size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirmAction(
                        "eliminar esta subcuenta",
                        "Esta accion es irreversible. Todos los fondos seran transferidos a la cuenta madre.",
                      )
                    )
                      toast.success("Subcuenta eliminada");
                  }}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md border bg-card hover:bg-red-50 hover:text-red-600 transition text-muted-foreground"
                  title="Eliminar subcuenta"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Nombre
                  </span>
                  <p className="font-semibold mt-0.5">{sub.nombre}</p>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Email
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {editEmail ? (
                      <div className="flex items-center gap-1 flex-1">
                        <Input
                          value={emailVal}
                          onChange={(e) => setEmailVal(e.target.value)}
                          className="h-8 text-sm flex-1 min-w-0"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setEditEmail(false);
                            toast.success("Email actualizado");
                          }}
                          className="h-8 px-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded border"
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditEmail(false);
                            setEmailVal(sub.email);
                          }}
                          className="h-8 px-2 text-xs text-muted-foreground hover:bg-muted rounded border"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-muted-foreground">{emailVal}</span>
                        <button
                          type="button"
                          onClick={() => setEditEmail(true)}
                          className="text-muted-foreground hover:text-foreground transition"
                          title="Editar email"
                        >
                          <Pencil size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge tone={sub.estado === "Activa" ? "success" : "warn"}>
                  {sub.estado === "Activa" ? "Activo" : "Desactivado"}
                </Badge>
                <Badge tone={sub.retirosHab ? "success" : "neutral"}>
                  <Lock size={11} className="inline mr-0.5" />
                  Retiros {sub.retirosHab ? "Habilitados" : "Deshabilitados"}
                </Badge>
              </div>
            </div>
          </section>

          {/* ══ BLOQUE: Informacion financiera ══ */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Informacion financiera</h3>
              <button
                type="button"
                onClick={() => setMoveOpen(true)}
                className="h-7 w-7 inline-flex items-center justify-center rounded-md border bg-card hover:bg-muted transition text-muted-foreground hover:text-foreground"
                title="Mover fondos"
              >
                <Building2 size={13} />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Balance actual
                </div>
                <div className="font-display tabular-nums text-base font-semibold mt-1">
                  {fmtARS(sub.disp)}
                </div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Total depositos
                </div>
                <div className="font-display tabular-nums text-base font-semibold mt-1 text-emerald-700">
                  {fmtARS(totalDepositos)}
                </div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Total retiros
                </div>
                <div className="font-display tabular-nums text-base font-semibold mt-1 text-red-700">
                  {fmtARS(totalRetiros)}
                </div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Total comisiones
                </div>
                <div className="font-display tabular-nums text-base font-semibold mt-1">
                  {fmtARS(totalComisiones)}
                </div>
              </div>
            </div>
          </section>

          {/* ══ BLOQUE: Historial de movimientos ══ */}
          <section>
            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
              <h3 className="text-sm font-semibold">Historial de movimientos</h3>
              <div className="flex gap-2">
                <BtnOutline className="h-8 px-3 text-[11px]" onClick={() => toast.success("Reporte descargado (demo)")}>
                  <Download size={12} /> DESCARGAR REPORTE
                </BtnOutline>
                <BtnOutline className="h-8 px-3 text-[11px]" onClick={() => setFilterOpen(!filterOpen)}>
                  <Filter size={12} /> FILTRAR{filterOpen && <ChevronUp size={11} className="ml-1" />}
                </BtnOutline>
              </div>
            </div>

            {filterOpen && (
              <div className="mb-3 p-3 bg-muted/30 rounded-lg border space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                      Buscar
                    </label>
                    <Input
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      placeholder="TXID, CBU o entidad..."
                      className="h-9 text-sm w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                      Tipo
                    </label>
                    <select
                      value={filterTipo}
                      onChange={(e) => setFilterTipo(e.target.value as "todos" | "ingreso" | "egreso")}
                      className="h-9 px-3 rounded-md border bg-card text-sm w-full"
                    >
                      <option value="todos">Todos</option>
                      <option value="ingreso">Ingresos</option>
                      <option value="egreso">Egresos</option>
                    </select>
                  </div>
                </div>
                {moves.length < allMoves.length && (
                  <p className="text-[11px] text-muted-foreground">
                    {moves.length} de {allMoves.length} movimientos
                  </p>
                )}
              </div>
            )}

            <div className="max-h-[280px] overflow-y-auto border rounded-lg divide-y">
              {moves.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">
                  Sin movimientos registrados
                </p>
              ) : (
                moves.map((m, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 hover:bg-muted/30 transition">
                    <span
                      className="mt-0.5 h-8 w-8 shrink-0 rounded-full inline-flex items-center justify-center text-xs"
                      style={{
                        background:
                          m.tipo === "ingreso"
                            ? "rgba(5,150,105,0.12)"
                            : "rgba(220,38,38,0.12)",
                      }}
                    >
                      {m.tipo === "ingreso" ? (
                        <ArrowDownLeft size={15} className="text-emerald-700" />
                      ) : (
                        <ArrowUpRight size={15} className="text-red-700" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-sm font-semibold">{m.titulo}</p>
                          <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                            {m.txid}
                          </p>
                        </div>
                        <span
                          className={`font-mono tabular-nums text-sm font-semibold whitespace-nowrap shrink-0 ${
                            m.tipo === "ingreso" ? "text-emerald-700" : "text-red-700"
                          }`}
                        >
                          {fmtMov(m.tipo === "ingreso" ? m.monto : -m.monto)}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                        <span>CBU/CVU: {m.cbu}</span>
                        <span>{m.entidad}</span>
                        <span>
                          {m.fecha} · {m.hora}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* ── Mover fondos sub-dialog ── */}
        {moveOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMoveOpen(false)} />
            <div
              className="relative bg-card rounded-lg max-w-md w-full p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Mover fondos</h3>
                <button
                  type="button"
                  onClick={() => setMoveOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Direccion
                  </label>
                  <select className="w-full h-10 px-3 rounded-md border bg-card text-sm mt-1">
                    <option>Cuenta madre → {sub.nombre}</option>
                    <option>{sub.nombre} → Cuenta madre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Monto (ARS)
                  </label>
                  <Input placeholder="0,00" className="mt-1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Concepto
                  </label>
                  <Input placeholder="Fondeo, barrido, etc." className="mt-1" />
                </div>
                <button
                  type="button"
                  className={btnSmallPrimary + " w-full justify-center mt-2"}
                  onClick={() => {
                    setMoveOpen(false);
                    toast.success("Movimiento interno realizado");
                  }}
                >
                  Transferir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
