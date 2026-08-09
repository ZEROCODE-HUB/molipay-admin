import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Upload,
  Pencil,
  Check,
  Settings,
  Shield,
  UserX,
  UserCheck,
  Trash2,
  RefreshCw,
  ExternalLink,
  Landmark,
  Link2,
  Globe,
  ShieldAlert,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Badge, Input } from "./portal-shell";
import { FormDialog } from "./form-dialog";
import type { ActionItem } from "./actions-dropdown";

export type UserStatus = "active" | "inactive" | "pending" | "blocked";

export type UserDocument = {
  id: string;
  tipo: "id_frente" | "id_dorso" | "servicio" | "selfie";
  url?: string;
  label: string;
};

export type Subcuenta = {
  id: string;
  legajo: string;
  email: string;
  alias: string;
  cvu: string;
  saldo: string;
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
    ruta: "/admin/modulos/transferencia",
  },
  {
    clave: "blp",
    titulo: "Links de Pago",
    cantidad: 0,
    verLabel: "Ver links de pago",
    vacioMsg: "No se encontró link de pago asociado",
    ruta: "/admin/modulos/link-pago",
  },
  {
    clave: "api",
    titulo: "API Externa",
    cantidad: 0,
    verLabel: "Ver usuarios API",
    vacioMsg: "No se encontró usuario API asociado",
    ruta: "/admin/modulos/apis",
  },
];

const modIcon: Record<ModuloVinculado["clave"], typeof Landmark> = {
  pct: Landmark,
  blp: Link2,
  api: Globe,
};

type TabName = "personal" | "compliance" | "empresa" | "documentos" | "subcuentas";

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

const subcuentaActions: ActionItem[] = [
  { label: "Ver configuración", icon: Settings, onClick: () => {} },
  { label: "Validar", icon: Shield, onClick: () => {} },
  { label: "Suspender", icon: UserX, variant: "danger", onClick: () => {} },
  { label: "Reactivar", icon: UserCheck, onClick: () => {} },
  { label: "Eliminar", icon: Trash2, variant: "danger", onClick: () => {} },
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
  const [activeTab, setActiveTab] = useState<TabName>("personal");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [subPage, setSubPage] = useState(1);
  const subPageSize = 5;

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

  const [editAlertasOpen, setEditAlertasOpen] = useState(false);
  const [editAlertasDraft, setEditAlertasDraft] =
    useState<ParametroAlerta[]>(DEFAULT_PARAMS_ALERTAS);
  const [editBloqueoOpen, setEditBloqueoOpen] = useState(false);
  const [editBloqueoDraft, setEditBloqueoDraft] =
    useState<ParametroBloqueo[]>(DEFAULT_PARAMS_BLOQUEO);

  const [cargarSubcuentasOpen, setCargarSubcuentasOpen] = useState(false);
  const [subcuentaForm, setSubcuentaForm] = useState({
    legajo: "",
    email: "",
    alias: "",
    cvu: "",
  });

  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setValidaciones(user.validacionesAutomaticas ?? []);
      setParametrosAlertas(user.parametrosAlertas ?? DEFAULT_PARAMS_ALERTAS);
      setParametrosBloqueo(user.parametrosBloqueo ?? DEFAULT_PARAMS_BLOQUEO);
      setModulos(user.modulos ?? DEFAULT_MODULOS);
    }
  }, [user]);

  if (!open || !user) return null;

  const totalSubPages = Math.max(1, Math.ceil(user.subcuentas.length / subPageSize));
  const safeSubPage = Math.min(subPage, totalSubPages);
  const paginatedSubs = user.subcuentas.slice(
    (safeSubPage - 1) * subPageSize,
    safeSubPage * subPageSize,
  );

  const existingDocs = user.documentos.filter((d) => d.url);
  const missingDocTypes: UserDocument["tipo"][] = (
    ["id_frente", "id_dorso", "servicio", "selfie"] as UserDocument["tipo"][]
  ).filter((t) => !user.documentos.some((d) => d.tipo === t && d.url));

  const productos = user.productos ?? [];
  const comisiones = user.comisiones ?? [];
  const impuestos = user.impuestos ?? [];
  const alertas = user.alertas ?? [];
  const bloqueos = user.bloqueos ?? [];
  const entidad = user.entidad ?? {
    maximoSubcuentas: 0,
    redireccionAutomatica: false,
    presionOperativa: "—",
  };
  const cvuInformados = user.subcuentas.filter((s) => s.cvu).length;
  const cvuRecientes = user.subcuentas.slice(0, 3);

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
    const nueva: Subcuenta = {
      id: `SUB-${Date.now()}`,
      legajo: subcuentaForm.legajo || `SUB-${Date.now()}`,
      email: subcuentaForm.email || user.email,
      alias: subcuentaForm.alias || "nueva.subcuenta",
      cvu: subcuentaForm.cvu,
      saldo: "$ 0",
      estado: "activa",
    };
    onUserChange({ ...user, subcuentas: [...user.subcuentas, nueva] });
    setSubcuentaForm({ legajo: "", email: "", alias: "", cvu: "" });
    setCargarSubcuentasOpen(false);
    toast.success("Subcuenta cargada");
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

  const tabContent: Record<TabName, ReactNode> = {
    personal: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        {personalFields.map(renderFieldRow)}
      </div>
    ),
    compliance: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        {complianceFields.map(renderFieldRow)}
      </div>
    ),
    empresa: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        {empresaFields.map(renderFieldRow)}
      </div>
    ),
    documentos: (
      <div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {existingDocs.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => setPreviewImg(doc.url!)}
              className="group relative aspect-[3/4] rounded-lg border border-border overflow-hidden bg-muted hover:ring-2 hover:ring-ring transition"
            >
              <img
                src={doc.url}
                alt={doc.label}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <span className="text-[10px] text-white font-medium">{doc.label}</span>
              </div>
            </button>
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
    subcuentas: (
      <div className="space-y-4">
        {user.tipoPersona === "fisica" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiTile label="CVUs informadas" value={String(cvuInformados)} />
              <KpiTile label="Máximo de subcuentas" value={String(entidad.maximoSubcuentas)} />
              <KpiTile
                label="Redirección automática"
                value={entidad.redireccionAutomatica ? "Sí" : "No"}
              />
              <KpiTile label="Presión operativa" value={entidad.presionOperativa} />
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={abrirExencion} className={btnSmallOutline}>
                Eximir CUIT principal
              </button>
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
          </>
        )}

        {user.subcuentas.length === 0 ? (
          <EmptyMsg>Sin subcuentas</EmptyMsg>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="px-3 py-2 text-left font-display font-semibold text-xs">ID</th>
                  <th className="px-3 py-2 text-left font-display font-semibold text-xs">Legajo</th>
                  <th className="px-3 py-2 text-left font-display font-semibold text-xs">Email</th>
                  <th className="px-3 py-2 text-left font-display font-semibold text-xs">CVU</th>
                  <th className="px-3 py-2 text-center font-display font-semibold text-xs">
                    Estado
                  </th>
                  <th className="px-3 py-2 text-center font-display font-semibold text-xs">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedSubs.map((sub) => (
                  <tr key={sub.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium text-xs font-mono tabular-nums">
                      {sub.id}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono tabular-nums">{sub.legajo}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{sub.email}</td>
                    <td className="px-3 py-2 text-muted-foreground text-xs font-mono">{sub.cvu}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge tone={sub.estado === "activa" ? "success" : "neutral"}>
                        {sub.estado}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="inline-flex items-center gap-1">
                        {subcuentaActions.slice(0, 2).map((act) => {
                          const Icon = act.icon;
                          return Icon ? (
                            <button
                              key={act.label}
                              type="button"
                              onClick={act.onClick}
                              className="p-1 rounded hover:bg-muted text-muted-foreground"
                              title={act.label}
                            >
                              <Icon size={14} />
                            </button>
                          ) : null;
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalSubPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 bg-muted/20 border-t text-xs text-muted-foreground">
                <span>{user.subcuentas.length} subcuentas</span>
                <div className="flex items-center gap-2">
                  <span>
                    Pág. {safeSubPage} de {totalSubPages}
                  </span>
                  <div className="flex gap-0.5">
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-muted disabled:opacity-30"
                      disabled={safeSubPage <= 1}
                      onClick={() => setSubPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-muted disabled:opacity-30"
                      disabled={safeSubPage >= totalSubPages}
                      onClick={() => setSubPage((p) => Math.min(totalSubPages, p + 1))}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    ),
  };

  const tabs: { key: TabName; label: string; show: boolean }[] = [
    { key: "personal", label: "Datos personales", show: true },
    { key: "compliance", label: "Financiero & Compliance", show: true },
    { key: "empresa", label: "Datos de la empresa", show: user.tipoPersona === "juridica" },
    { key: "documentos", label: "Documentos", show: true },
    { key: "subcuentas", label: "Subcuentas & CVU", show: true },
  ];

  const visibleTabs = tabs.filter((t) => t.show);

  const resumenCards = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Estado actual */}
      <div className="bg-muted/30 rounded-lg p-4 border border-border space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Estado actual
        </div>
        <div>
          <Badge tone={statusTone[user.status]}>{statusLabel[user.status]}</Badge>
        </div>
        <button
          type="button"
          onClick={abrirExencion}
          className={btnSmallOutline + " w-full justify-center"}
        >
          Eximir débitos y créditos
        </button>
        {exenciones.length > 0 && (
          <div className="text-[11px] text-muted-foreground border-t border-border pt-2">
            Última exención:{" "}
            <span className="text-foreground font-medium">
              {exenciones[exenciones.length - 1].motivo}
            </span>
          </div>
        )}
      </div>

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
      </div>

      {/* Operativa */}
      <div className="bg-muted/30 rounded-lg p-4 border border-border space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Operativa
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
      </div>

      {/* Productos */}
      <div className="bg-muted/30 rounded-lg p-4 border border-border space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Productos
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
        {productos.map((p) => (
          <div key={p.id}>
            <div className="text-xs text-muted-foreground">{p.nombre}</div>
            <div className="text-sm font-semibold mt-0.5 tabular-nums">
              {p.cantidad}
              {p.detalle ? ` · ${p.detalle}` : ""}
            </div>
          </div>
        ))}
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
    <SectionCard
      title="Contexto operativo"
      actions={
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => go("/admin/general/movimientos")}
            className={btnSmallOutline}
          >
            <ExternalLink size={13} /> Ver movimientos
          </button>
          <button
            type="button"
            onClick={() => go("/admin/general/movimientos/impuestos")}
            className={btnSmallOutline}
          >
            <ExternalLink size={13} /> Ver impuestos
          </button>
          <button
            type="button"
            onClick={() => go("/admin/general/alertas")}
            className={btnSmallOutline}
          >
            <ExternalLink size={13} /> Ver alertas
          </button>
        </div>
      }
    >
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CVUs recientes */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-2 bg-muted/40 border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            CVUs recientes
          </div>
          {cvuRecientes.length === 0 ? (
            <EmptyMsg>Sin CVUs</EmptyMsg>
          ) : (
            <ul className="divide-y divide-border/60">
              {cvuRecientes.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="text-xs font-mono truncate">{s.cvu}</span>
                  <Badge tone={s.estado === "activa" ? "success" : "neutral"}>{s.estado}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Últimas comisiones */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-2 bg-muted/40 border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Últimas comisiones
          </div>
          {comisiones.length === 0 ? (
            <EmptyMsg>Sin comisiones</EmptyMsg>
          ) : (
            <ul className="divide-y divide-border/60">
              {comisiones.slice(0, 3).map((c) => (
                <li key={c.id} className="px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium truncate">{c.tipo}</span>
                    <span className="text-xs font-semibold tabular-nums">{c.monto}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {c.fecha} · {c.origen}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Impuestos recientes */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-2 bg-muted/40 border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Impuestos recientes
          </div>
          {impuestos.length === 0 ? (
            <EmptyMsg>Sin impuestos recientes</EmptyMsg>
          ) : (
            <ul className="divide-y divide-border/60">
              {impuestos.slice(0, 3).map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{i.nombre}</div>
                    <div className="text-[11px] text-muted-foreground">{i.fecha}</div>
                  </div>
                  <span className="text-xs font-semibold tabular-nums">{i.monto}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Alertas y bloqueos */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-2 bg-muted/40 border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Alertas y bloqueos
          </div>
          {alertas.length === 0 && bloqueos.length === 0 ? (
            <EmptyMsg>Sin alertas ni bloqueos</EmptyMsg>
          ) : (
            <ul className="divide-y divide-border/60">
              {alertas.slice(0, 2).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{a.tipo}</div>
                    <div className="text-[11px] text-muted-foreground">{a.fecha}</div>
                  </div>
                  <Badge tone={a.estado === "Pendiente" ? "warn" : "neutral"}>{a.estado}</Badge>
                </li>
              ))}
              {bloqueos.slice(0, 2).map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{b.tipo}</div>
                    <div className="text-[11px] text-muted-foreground">{b.fecha}</div>
                  </div>
                  <Badge tone={b.estado === "Activo" ? "danger" : "neutral"}>{b.estado}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SectionCard>
  );

  const riesgoSection = (
    <SectionCard
      title="Riesgo y monitoreo"
      actions={
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => go("/admin/general/alertas")}
            className={btnSmallOutline}
          >
            <ExternalLink size={13} /> Ir a alertas
          </button>
          <button
            type="button"
            onClick={() => go("/admin/general/alertas/bloqueos")}
            className={btnSmallOutline}
          >
            <ExternalLink size={13} /> Ir a bloqueos
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                <>
                  <div className="text-xs text-muted-foreground">
                    Vinculados:{" "}
                    <span className="font-semibold text-foreground tabular-nums">{m.cantidad}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => go(m.ruta)}
                    className={`${btnSmallOutline} mt-auto self-start`}
                  >
                    <ExternalLink size={13} /> {m.verLabel}
                  </button>
                </>
              ) : (
                <div className="text-xs text-muted-foreground">{m.vacioMsg}</div>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );

  const seccionesFisica = (
    <div className="space-y-6">
      {validacionesSection}
      {contextoSection}
      {riesgoSection}
      {modulosSection}
    </div>
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
          <div className="flex items-center gap-3">
            <h3 className="font-display font-semibold text-lg">
              Ver y editar usuario —{" "}
              {user.tipoPersona === "juridica" ? "Persona Jurídica" : "Persona Física"}
            </h3>
            <Badge tone={statusTone[user.status]}>{statusLabel[user.status]}</Badge>
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
          <div className="hidden md:block min-h-[200px]">{tabContent[activeTab]}</div>

          {/* Mobile: stacked sections */}
          <div className="block md:hidden space-y-6">
            {visibleTabs.map((tab) => (
              <div key={tab.key}>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  {tab.label}
                </div>
                {tabContent[tab.key]}
              </div>
            ))}
          </div>

          {/* Secciones exclusivas de Persona Física */}
          {user.tipoPersona === "fisica" && seccionesFisica}
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

      {/* Modal: Cargar subcuentas */}
      {cargarSubcuentasOpen && (
        <FormDialog
          open={cargarSubcuentasOpen}
          onClose={() => setCargarSubcuentasOpen(false)}
          title="Cargar subcuentas"
          description={`Alta de subcuenta para ${user.nombre} ${user.apellido}`}
          onSubmit={guardarSubcuenta}
          submitLabel="Cargar subcuenta"
          size="lg"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Legajo</label>
              <Input
                value={subcuentaForm.legajo}
                onChange={(e) => setSubcuentaForm({ ...subcuentaForm, legajo: e.target.value })}
                placeholder="SUB-XXX"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Email</label>
              <Input
                value={subcuentaForm.email}
                onChange={(e) => setSubcuentaForm({ ...subcuentaForm, email: e.target.value })}
                placeholder={user.email}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Alias</label>
              <Input
                value={subcuentaForm.alias}
                onChange={(e) => setSubcuentaForm({ ...subcuentaForm, alias: e.target.value })}
                placeholder="mi.alias"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">CVU</label>
              <Input
                value={subcuentaForm.cvu}
                onChange={(e) => setSubcuentaForm({ ...subcuentaForm, cvu: e.target.value })}
                placeholder="0000003100..."
              />
            </div>
          </div>
        </FormDialog>
      )}

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
