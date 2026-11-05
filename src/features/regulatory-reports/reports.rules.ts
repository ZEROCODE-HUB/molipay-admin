import {
Banknote,
BarChart3,
FileSpreadsheet,
FileText,
Landmark,
Receipt,
Users,
} from "lucide-react";
import { downloadText } from "@/shared/lib/download";
import {
type Actividad,
type AfipParams,
type AfipRow,
type Archivo,
type BlpFile,
type Movimiento,
type ReportDef,
type Tax,
} from "./reports.types";

export const reports: ReportDef[] = [
  {
    key: "conciliaciones",
    name: "Conciliaciones Bancarias",
    icon: Banknote,
    color: "text-blue-500",
    description: "Transacciones diarias subidas por el banco.",
  },
  {
    key: "bcra",
    name: "Reportes BCRA",
    icon: Receipt,
    color: "text-emerald-500",
    description: "Reportes regulatorios para el Banco Central.",
  },
  {
    key: "afip",
    name: "Reportes AFIP",
    icon: FileText,
    color: "text-orange-500",
    description: "Regímenes informativos (ARCA / ex AFIP).",
  },
  {
    key: "comisiones",
    name: "Reportes de Comisiones",
    icon: BarChart3,
    color: "text-purple-500",
    description: "Comisiones por período y tipo de operación.",
  },
  {
    key: "movimientos",
    name: "Reportes de Movimientos",
    icon: FileText,
    color: "text-teal-500",
    description: "Movimientos de personas físicas y jurídicas fuera de la plataforma.",
  },
  {
    key: "actividad",
    name: "Actividad de Usuarios",
    icon: Users,
    color: "text-indigo-500",
    description: "Actividad registrada por legajo de backoffice.",
  },
  {
    key: "impuestos",
    name: "Reportes de Impuestos",
    icon: FileSpreadsheet,
    color: "text-red-500",
    description: "Retenciones presentadas y pagadas por período.",
  },
  {
    key: "conciliaciones-blp",
    name: "Conciliaciones BLP",
    icon: Landmark,
    color: "text-cyan-500",
    description: "Conciliación de archivos Payway (pagos y liquidaciones).",
  },
  {
    key: "unidad-negocio",
    name: "Reporte por Unidad de Negocio",
    icon: BarChart3,
    color: "text-amber-500",
    description: "Cuánto genera cada unidad: CVU, CVU chica U, QR, Link de Pago, E-commerce.",
  },
];

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  const cols = Object.keys(rows[0] ?? {});
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    cols.map(escape).join(","),
    ...rows.map((r) => cols.map((c) => escape(r[c])).join(",")),
  ];
  downloadText(filename, lines.join("\n"));
}

export const RECONCILIATION_COLS = [
  "FECHA_NEGOCIO",
  "ID_DEBIN",
  "TIPO_MOV_COELSA",
  "CBU",
  "CTA_BT_DEL_CBU",
  "BT_SBO",
  "BT_TOP",
  "DENOMINACION",
  "CUIT",
  "IMPORTE_COELSA",
  "ESTADO_COELSA",
  "ASTO_ESTADO",
  "CVU",
  "CUIT_VIRTUAL",
  "CVU_2",
  "CUIT_VIRTUAL_2",
  "CBU_2",
  "CUIT_2",
  "CONCEPTO",
  "MISMO_TIT",
  "DETALLE",
  "CVU_CREDITO",
  "FECHA_HORA_COELSA",
];

export const FILES_INITIALS: Archivo[] = [];

export const afipParamsInitials: AfipParams = {
  montoTransaccion: "500000",
  montoSaldo: "100000",
};

export const afipData: AfipRow[] = [
  { fecha: "01/08/2026", b8125: "B-8-1-25_202608.xlsx", b8126: "B-8-1-26_202608.xlsx" },
  { fecha: "01/07/2026", b8125: "B-8-1-25_202607.xlsx", b8126: "B-8-1-26_202607.xlsx" },
  { fecha: "01/06/2026", b8125: "B-8-1-25_202606.xlsx", b8126: "B-8-1-26_202606.xlsx" },
  { fecha: "01/05/2026", b8125: "B-8-1-25_202605.xlsx", b8126: "B-8-1-26_202605.xlsx" },
];

export const MOVEMENTS: Record<string, Movimiento[]> = {
  "30123456789": [
    {
      coelsaId: "COELSA-0001",
      legajo: "LPF-20123456789",
      email: "jperez@email.com",
      cvu: "1234567890123456789012",
      dia: "2026-07-28",
      hora: "14:32",
      tipo: "Depósito",
      monto: "$ 50.000",
      cvuRemitente: "1234567890123456789012",
      cuitRemitente: "30123456789",
      nombreRemitente: "Juan Pérez",
    },
    {
      coelsaId: "COELSA-0002",
      legajo: "LPF-20123456789",
      email: "jperez@email.com",
      cvu: "1234567890123456789012",
      dia: "2026-07-26",
      hora: "09:15",
      tipo: "Retiro",
      monto: "$ 5.000",
      cvuRemitente: "1234567890123456789023",
      cuitRemitente: "20123456789",
      nombreRemitente: "María García",
    },
    {
      coelsaId: "COELSA-0003",
      legajo: "LPF-20123456789",
      email: "jperez@email.com",
      cvu: "1234567890123456789012",
      dia: "2026-07-20",
      hora: "10:45",
      tipo: "Depósito",
      monto: "$ 120.000",
      cvuRemitente: "1234567890123456789934",
      cuitRemitente: "30555666777",
      nombreRemitente: "María García",
    },
  ],
  "20123456789": [
    {
      coelsaId: "COELSA-0004",
      legajo: "LPF-27234567890",
      email: "mgarcia@email.com",
      cvu: "1234567890123456789023",
      dia: "2026-07-28",
      hora: "11:00",
      tipo: "Depósito",
      monto: "$ 200.000",
      cvuRemitente: "1234567890123456789012",
      cuitRemitente: "30123456789",
      nombreRemitente: "Juan Pérez",
    },
    {
      coelsaId: "COELSA-0005",
      legajo: "LPF-27234567890",
      email: "mgarcia@email.com",
      cvu: "1234567890123456789023",
      dia: "2026-07-22",
      hora: "08:30",
      tipo: "Retiro",
      monto: "$ 25.000",
      cvuRemitente: "1234567890123456789023",
      cuitRemitente: "30555666777",
      nombreRemitente: "Carlos López",
    },
  ],
  "30987654321": [
    {
      coelsaId: "COELSA-0006",
      legajo: "LPF-20345678901",
      email: "clopez@email.com",
      cvu: "1234567890123456789034",
      dia: "2026-07-25",
      hora: "16:00",
      tipo: "Depósito",
      monto: "$ 75.000",
      cvuRemitente: "1234567890123456789012",
      cuitRemitente: "30123456789",
      nombreRemitente: "Ana Martínez",
    },
  ],
};

export const ACTIVIDAD_BASE: Record<string, Actividad[]> = {
  "ADM-001": [
    {
      campo: "Estado",
      valorAnterior: "Pendiente",
      valorNuevo: "Activo",
      fecha: "15/07/2026",
      hora: "14:32",
      usuario: "admin.operaciones",
    },
    {
      campo: "Email",
      valorAnterior: "mrodriguez@oldmail.com",
      valorNuevo: "mrodriguez@molipay.com",
      fecha: "15/07/2026",
      hora: "11:15",
      usuario: "admin.operaciones",
    },
    {
      campo: "Rol",
      valorAnterior: "Reader",
      valorNuevo: "Admin",
      fecha: "14/07/2026",
      hora: "16:48",
      usuario: "soporte.nivel2",
    },
    {
      campo: "Ocupación",
      valorAnterior: "Empleado",
      valorNuevo: "Comerciante",
      fecha: "14/07/2026",
      hora: "09:00",
      usuario: "admin.operaciones",
    },
  ],
  "ADM-002": [
    {
      campo: "Parámetros de bloqueo",
      valorAnterior: "Límite $ 500.000",
      valorNuevo: "Límite $ 100.000",
      fecha: "15/07/2026",
      hora: "10:00",
      usuario: "admin.operaciones",
    },
    {
      campo: "Parámetros de alertas",
      valorAnterior: "Volumen anormal $ 1.000.000–$ 5.000.000",
      valorNuevo: "Volumen anormal $ 500.000–$ 2.000.000",
      fecha: "13/07/2026",
      hora: "08:30",
      usuario: "soporte.nivel1",
    },
  ],
  "ADM-003": [
    {
      campo: "Nombre",
      valorAnterior: "Pedro Sánchez",
      valorNuevo: "Pedro Sánchez Gómez",
      fecha: "12/07/2026",
      hora: "15:20",
      usuario: "admin.operaciones",
    },
    {
      campo: "Estado",
      valorAnterior: "Activo",
      valorNuevo: "Suspendido",
      fecha: "10/07/2026",
      hora: "09:45",
      usuario: "soporte.nivel2",
    },
  ],
};

export function parseDateDMY(v: string): Date | null {
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(+m[3], +m[2] - 1, +m[1]);
}

export const TAXES_AVAILABLES = ["Ganancias", "Ingresos Brutos", "IVA", "Débito/Crédito (Sellos)"];

export const taxesData: Tax[] = [
  {
    id: "IMP-0001",
    reporte: "Ganancias",
    periodo: "2026-06",
    tramo: "Tramo 1",
    creado: "2026-07-05",
    presentado: "Sí",
    pagado: "Sí",
    totalRegistros: 1240,
    totalMovimientos: 1240,
    totalMonto: "$ 8.450.000",
    totalRetenciones: "$ 1.690.000",
  },
  {
    id: "IMP-0002",
    reporte: "Ingresos Brutos",
    periodo: "2026-05",
    tramo: "Tramo 2",
    creado: "2026-06-10",
    presentado: "Sí",
    pagado: "Sí",
    totalRegistros: 980,
    totalMovimientos: 980,
    totalMonto: "$ 5.120.000",
    totalRetenciones: "$ 512.000",
  },
  {
    id: "IMP-0003",
    reporte: "IVA",
    periodo: "2026-04",
    tramo: "Tramo 1",
    creado: "2026-05-05",
    presentado: "Sí",
    pagado: "No",
    totalRegistros: 1530,
    totalMovimientos: 1530,
    totalMonto: "$ 12.300.000",
    totalRetenciones: "$ 2.460.000",
  },
  {
    id: "IMP-0004",
    reporte: "Débito/Crédito (Sellos)",
    periodo: "2026-06",
    tramo: "Tramo 3",
    creado: "2026-07-08",
    presentado: "No",
    pagado: "No",
    totalRegistros: 640,
    totalMovimientos: 640,
    totalMonto: "$ 3.210.000",
    totalRetenciones: "$ 320.000",
  },
];

export function generateTxtTax(r: Tax): string {
  return [
    `ID: ${r.id}`,
    `Reporte: ${r.reporte}`,
    `Periodo: ${r.periodo}`,
    `Tramo: ${r.tramo}`,
    `Fecha de creacion: ${r.creado}`,
    `Presentado: ${r.presentado}`,
    `Pagado: ${r.pagado}`,
    `Total registros: ${r.totalRegistros}`,
    `Total movimientos: ${r.totalMovimientos}`,
    `Total monto: ${r.totalMonto}`,
    `Total retenciones: ${r.totalRetenciones}`,
  ].join("\n");
}

export function generateXmlTax(r: Tax): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<reporte_impuesto>",
    `  <id>${esc(r.id)}</id>`,
    `  <reporte>${esc(r.reporte)}</reporte>`,
    `  <periodo>${esc(r.periodo)}</periodo>`,
    `  <tramo>${esc(r.tramo)}</tramo>`,
    `  <fecha_creacion>${esc(r.creado)}</fecha_creacion>`,
    `  <presentado>${esc(r.presentado)}</presentado>`,
    `  <pagado>${esc(r.pagado)}</pagado>`,
    `  <total_registros>${r.totalRegistros}</total_registros>`,
    `  <total_movimientos>${r.totalMovimientos}</total_movimientos>`,
    `  <total_monto>${esc(r.totalMonto)}</total_monto>`,
    `  <total_retenciones>${esc(r.totalRetenciones)}</total_retenciones>`,
    "</reporte_impuesto>",
  ].join("\n");
}

export const blpData: BlpFile[] = [
  { archivo: "Liquidada Payway 2026-07.csv", fecha: "2026-07-31", estado: "Liquidada" },
  { archivo: "Pagos Payway 2026-07.csv", fecha: "2026-07-30", estado: "Presentada" },
  { archivo: "Pagos Payway 2026-06.csv", fecha: "2026-06-30", estado: "Presentada" },
  { archivo: "Liquidada Payway 2026-06.csv", fecha: "2026-06-29", estado: "Liquidada" },
  { archivo: "Pagos Payway 2026-05.csv", fecha: "2026-05-30", estado: "En proceso" },
];
