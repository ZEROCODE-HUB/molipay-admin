import { type LucideIcon } from "lucide-react";

export type ReportDef = {
  key: string;
  name: string;
  icon: LucideIcon;
  color: string;
  description: string;
};

export type Archivo = {
  archivo: string;
  fecha: string;
  estado: "Analizado" | "Pendiente";
  downloadRows: Record<string, unknown>[];
  bankRows?: import("@/features/payment-links/reconciliation/parse").BankRow[];
  rawFile?: File | null;
  storagePath?: string | null;
};

export type AfipParams = {
  montoTransaccion: string;
  montoSaldo: string;
};

export type AfipRow = { fecha: string; b8125: string; b8126: string };

/* ---------- Reportes de Comisiones ---------- */

export type Fee = {
  periodo: string;
  tipo: string;
  cantidad: number;
  monto: string;
  comision: string;
  enCurso: boolean;
};

/* ---------- Reportes de Movimientos (CUIT) ---------- */

export type Movimiento = {
  coelsaId: string;
  legajo: string;
  email: string;
  cvu: string;
  dia: string;
  hora: string;
  tipo: "Depósito" | "Retiro";
  monto: string;
  cvuRemitente: string;
  cuitRemitente: string;
  nombreRemitente: string;
};

/* ---------- Actividad de Usuarios ---------- */

export type Actividad = {
  campo: string;
  valorAnterior: string;
  valorNuevo: string;
  fecha: string;
  hora: string;
  usuario: string;
};

/* ---------- Reportes de Impuestos ---------- */

export type Tax = {
  id: string;
  reporte: string;
  periodo: string;
  tramo: string;
  creado: string;
  presentado: "Sí" | "No";
  pagado: "Sí" | "No";
  totalRegistros: number;
  totalMovimientos: number;
  totalMonto: string;
  totalRetenciones: string;
};

/* ---------- Conciliaciones BLP ---------- */

export type BlpFile = {
  archivo: string;
  fecha: string;
  estado: "Presentada" | "Liquidada" | "Pendiente" | "En proceso";
};
