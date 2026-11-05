import { getRouteApi } from "@tanstack/react-router";
import {
  ADDRESS_DE_OPERATION,
  type Customer,
  type StatusCustomer,
  type TaxAssignment,
} from "@/infrastructure/supabase/legacy/types";
import { downloadText } from "@/shared/lib/download";
import { type Column } from "@/shared/ui/data-table";
import { type HistoryChange, type Validation } from "@/features/customers/customer-detail.supabase";
import { type TabKey } from "./customer-detail.types";

export const route = getRouteApi("/admin/general/usuarios/$legajo");

export const statusLabel: Record<StatusCustomer, string> = {
  pendiente_verificacion: "Pendiente de verificación de email",
  registrado: "Registrado",
  preactivado: "Preactivado",
  activado: "Activado",
  suspendido: "Suspendido",
  deshabilitado: "Deshabilitado",
  eliminado: "Eliminado",
  activo: "Activado",
  rechazado: "Deshabilitado",
} as Record<StatusCustomer, string>;

export const statusTone: Record<StatusCustomer, "success" | "danger" | "warn" | "neutral"> = {
  pendiente_verificacion: "warn",
  registrado: "warn",
  preactivado: "warn",
  activado: "success",
  suspendido: "danger",
  deshabilitado: "neutral",
  eliminado: "danger",
  activo: "success",
  rechazado: "neutral",
} as Record<StatusCustomer, "success" | "danger" | "warn" | "neutral">;

export const TABS: { key: TabKey; label: string }[] = [
  { key: "identificacion", label: "Datos personales" },
  { key: "movimientos", label: "Movimientos" },
  { key: "impuestos", label: "Impuestos" },
  { key: "subcuentas", label: "Subcuentas y CVUs" },
  { key: "documentos", label: "Documentos" },
  { key: "onboarding", label: "Onboarding" },
  { key: "validaciones", label: "Validaciones automáticas" },
  { key: "riesgo", label: "Riesgo y monitoreo" },
  { key: "contexto", label: "Contexto operativo" },
  { key: "modulos", label: "Módulos y productos" },
  { key: "historial", label: "Historial" },
];

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR");
}

export function fmtDateHour(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-AR");
}

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  downloadText(filename, csv, "text/csv;charset=utf-8;");
}

export const historyColumns: Column<HistoryChange>[] = [
  { key: "campo", label: "Campo", render: (r) => r.campo },
  { key: "valorAnterior", label: "Valor anterior", render: (r) => r.valorAnterior ?? "—" },
  { key: "valorNuevo", label: "Valor nuevo", render: (r) => r.valorNuevo ?? "—" },
  { key: "fecha", label: "Fecha", render: (r) => r.fecha },
  { key: "hora", label: "Hora", render: (r) => r.hora ?? "—" },
  { key: "usuario", label: "Usuario", render: (r) => r.usuario ?? "—" },
];

export const validationsColumns: Column<Validation>[] = [
  { key: "proveedor", label: "Proveedor", render: (r) => r.proveedor },
  { key: "estado", label: "Estado", render: (r) => r.estado },
  { key: "fecha", label: "Fecha", render: (r) => r.fecha },
];

export function operationLabel(a: TaxAssignment) {
  if (!a.operacion) return "Todas las operaciones";
  return `${a.operacion} · ${ADDRESS_DE_OPERATION[a.operacion] === "Saliente" ? "Pay-Out" : "Pay-In"}`;
}

export function fieldsIdentificacion(c: Customer) {
  const partes = c.nombre.trim().split(/\s+/);
  const apellidoDerivado = c.tipoPersona === "juridica" ? "—" : partes.slice(1).join(" ") || "—";
  const nameDerivado = c.tipoPersona === "juridica" ? c.nombre : (partes[0] ?? c.nombre);
  const personal: { label: string; valor: string }[] = [
    { label: "Legajo", valor: c.legajo },
    { label: "Email", valor: c.correo },
    { label: "Fecha de registro", valor: fmtDate(c.fechaAlta) },
    {
      label: "Tipo de cuenta",
      valor: c.tipoPersona === "juridica" ? "Persona Jurídica" : "Persona Física",
    },
    { label: "Estado", valor: statusLabel[c.estado] ?? c.estado },
    { label: "Cant. cuentas bancarias", valor: "—" },
    { label: "Cant. cuentas virtuales", valor: "—" },
    { label: "Nombre", valor: nameDerivado },
    { label: "Apellido", valor: apellidoDerivado },
    { label: "CUIT", valor: c.cuitCuil ?? c.cuit ?? "—" },
    { label: "Género", valor: c.genero ?? "—" },
    { label: "Dirección", valor: c.direccion ?? "—" },
    { label: "Número de dirección", valor: c.direccion2 ?? "—" },
    { label: "Ciudad", valor: c.ciudad ?? "—" },
    { label: "Estado / Provincia", valor: c.provincia ?? "—" },
    { label: "Código postal", valor: c.cp ?? "—" },
    { label: "Fecha de nacimiento", valor: c.fechaNacimiento ? fmtDate(c.fechaNacimiento) : "—" },
  ];
  const compliance: { label: string; valor: string }[] = [
    { label: "Ocupación", valor: c.ocupacion ?? "—" },
    { label: "Origen de fondos", valor: c.origenFondos ?? "—" },
    { label: "PEP", valor: c.esPep ? "Sí" : c.esPep === false ? "No" : "—" },
  ];
  const company: { label: string; valor: string }[] = [
    { label: "CUIT de la empresa", valor: c.cuit ?? "—" },
    { label: "Tipo de empresa", valor: c.tipoSociedad ?? "—" },
    {
      label: "Nombre legal",
      valor: c.nombreLegal ?? (c.tipoPersona === "juridica" ? c.nombre : "—"),
    },
    { label: "Nombre comercial", valor: c.nombreFantasia ?? "—" },
    {
      label: "Fecha de inscripción",
      valor: c.fechaInscripcion ? fmtDate(c.fechaInscripcion) : "—",
    },
  ];
  return { personal, compliance, empresa: company };
}

export function esUrlImagen(url: string | null): boolean {
  return !!url && /\.(jpe?g|png|gif|webp|jfif|avif|bmp)(\?|$)/i.test(url);
}
