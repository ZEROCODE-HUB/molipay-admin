import { useState, type ReactNode } from "react";
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
} from "lucide-react";
import { Badge, Input } from "./portal-shell";
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
  pep: string;
  subcuentas: Subcuenta[];
  documentos: UserDocument[];
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

const statusOptions: { value: UserStatus; label: string }[] = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
  { value: "pending", label: "Pendiente" },
  { value: "blocked", label: "Bloqueado" },
];

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

export function UserModal({
  open,
  onClose,
  user,
  onUserChange,
}: {
  open: boolean;
  onClose: () => void;
  user: UserData | null;
  onUserChange?: (updated: UserData) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabName>("personal");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [subPage, setSubPage] = useState(1);
  const subPageSize = 5;

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
      (updated as any)[key] = Number(editingValue);
    } else if (key === "status") {
      updated.status = editingValue as UserStatus;
    } else {
      (updated as any)[key] = editingValue;
    }
    onUserChange(updated);
    setEditingField(null);
    setEditingValue("");
  };

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
        <span className="text-sm font-medium truncate">{value || "—"}</span>
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
      <div>
        {user.subcuentas.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
            Sin subcuentas
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="px-3 py-2 text-left font-semibold text-xs">ID</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs">Legajo</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs">Email</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs">CVU</th>
                  <th className="px-3 py-2 text-center font-semibold text-xs">Estado</th>
                  <th className="px-3 py-2 text-center font-semibold text-xs">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSubs.map((sub) => (
                  <tr key={sub.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium text-xs">{sub.id}</td>
                    <td className="px-3 py-2 text-xs">{sub.legajo}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{sub.email}</td>
                    <td className="px-3 py-2 text-muted-foreground text-xs font-mono">
                      {sub.cvu}
                    </td>
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-card rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between z-10 rounded-t-lg">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg">
              {user.tipoPersona === "juridica" ? "Persona Jurídica" : "Persona Física"}
            </h3>
            <Badge tone={statusTone[user.status]}>{statusLabel[user.status]}</Badge>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Identity Card */}
          <div className="bg-muted/30 rounded-lg p-4 border border-border space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ficha de identidad
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Nombre completo</div>
                <div className="text-sm font-semibold mt-0.5">
                  {user.nombre} {user.apellido}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="text-sm font-semibold mt-0.5">{user.email}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Tipo de cuenta</div>
                <div className="text-sm font-semibold mt-0.5">{user.tipoCuenta}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">CUIT</div>
                <div className="text-sm font-semibold mt-0.5">{user.cuit}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Productos</div>
                <div className="text-sm font-semibold mt-0.5">
                  Bancarias: {user.cantidadCuentasBancarias} · Virtuales:{" "}
                  {user.cantidadCuentasVirtuales}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">PEP</div>
                <div className="text-sm font-semibold mt-0.5">{user.pep}</div>
              </div>
            </div>
          </div>

          {/* Sub-section / Tab Navigation */}
          <div className="flex flex-wrap gap-1 border-b border-border pb-0">
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

          {/* Tab Content */}
          <div className="min-h-[200px]">{tabContent[activeTab]}</div>

          {/* Placeholder sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Validaciones automáticas — pendiente de definición
            </div>
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Contexto operativo — pendiente de definición
            </div>
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Riesgo y monitoreo — pendiente de definición
            </div>
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Módulos y productos — pendiente de definición
            </div>
          </div>
        </div>
      </div>

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
