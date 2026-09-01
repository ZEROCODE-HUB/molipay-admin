import { createFileRoute } from "@tanstack/react-router";
import { useState, type ComponentType, type ReactNode } from "react";
import {
  ChevronLeft,
  Banknote,
  Receipt,
  FileText,
  BarChart3,
  Users,
  FileSpreadsheet,
  Landmark,
  Download,
  Search,
  Plus,
  type LucideIcon,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, Badge, BtnOutline, BtnPrimary, Input, Label } from "@/components/portal-shell";
import { DataTable, type Column } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { FileDropzone } from "@/components/file-dropzone";

export const Route = createFileRoute("/admin/administracion/reportes")({
  head: () => ({ meta: [{ title: "Reportes — Admin Panel" }] }),
  component: Page,
});

type ReportDef = {
  key: string;
  name: string;
  icon: LucideIcon;
  color: string;
  description: string;
};

const reports: ReportDef[] = [
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
];

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadExcel(filename: string, rows: Record<string, unknown>[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reporte");
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  const cols = Object.keys(rows[0] ?? {});
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    cols.map(escape).join(","),
    ...rows.map((r) => cols.map((c) => escape(r[c])).join(",")),
  ];
  downloadFile(filename, lines.join("\n"));
}

type Archivo = {
  archivo: string;
  fecha: string;
  estado: "Analizado" | "Pendiente";
  downloadRows: Record<string, unknown>[];
};

const CONCILIACION_COLS = [
  "FECHA_NEGOCIO",
  "ID_DEBIN",
  "TIPO_MOV_COELSA",
  "CBU",
  "CTA_BT_DEL_CUI",
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

const CONCILIACION_MOCK_ROWS: Record<string, unknown>[] = [
  {
    FECHA_NEGOCIO: "16/07/2026",
    ID_DEBIN: "DE-00123",
    TIPO_MOV_COELSA: "DEPOSITO",
    CBU: "0000000000000000000001",
    CTA_BT_DEL_CUI: "SI",
    BT_SBO: "0000000000000000000001",
    BT_TOP: "",
    DENOMINACION: "Molipay SRL",
    CUIT: "30123456789",
    IMPORTE_COELSA: 50000,
    ESTADO_COELSA: "OK",
    ASTO_ESTADO: "Acreditado",
    CVU: "1234567890123456789012",
    CUIT_VIRTUAL: "",
    CVU_2: "",
    CUIT_VIRTUAL_2: "",
    CBU_2: "",
    CUIT_2: "",
    CONCEPTO: "Deposito PSE",
    MISMO_TIT: "SI",
    DETALLE: "Deposito vía PSE",
    CVU_CREDITO: "1234567890123456789012",
    FECHA_HORA_COELSA: "2026-07-16 14:32",
  },
  {
    FECHA_NEGOCIO: "15/07/2026",
    ID_DEBIN: "RE-00456",
    TIPO_MOV_COELSA: "RETIRO",
    CBU: "0000000000000000000002",
    CTA_BT_DEL_CUI: "NO",
    BT_SBO: "",
    BT_TOP: "1234567890123456789002",
    DENOMINACION: "Juan Pérez",
    CUIT: "20123456789",
    IMPORTE_COELSA: 15000,
    ESTADO_COELSA: "OK",
    ASTO_ESTADO: "Acreditado",
    CVU: "1234567890123456789023",
    CUIT_VIRTUAL: "20123456789",
    CVU_2: "",
    CUIT_VIRTUAL_2: "",
    CBU_2: "",
    CUIT_2: "",
    CONCEPTO: "Retiro QR",
    MISMO_TIT: "NO",
    DETALLE: "Retiro QR",
    CVU_CREDITO: "",
    FECHA_HORA_COELSA: "2026-07-15 09:15",
  },
  {
    FECHA_NEGOCIO: "15/07/2026",
    ID_DEBIN: "DE-00789",
    TIPO_MOV_COELSA: "DEPOSITO",
    CBU: "0000000000000000000003",
    CTA_BT_DEL_CUI: "SI",
    BT_SBO: "0000000000000000000003",
    BT_TOP: "",
    DENOMINACION: "María García",
    CUIT: "30555666777",
    IMPORTE_COELSA: 250000,
    ESTADO_COELSA: "OK",
    ASTO_ESTADO: "Pendiente",
    CVU: "1234567890123456789934",
    CUIT_VIRTUAL: "",
    CVU_2: "",
    CUIT_VIRTUAL_2: "",
    CBU_2: "",
    CUIT_2: "",
    CONCEPTO: "Transferencia",
    MISMO_TIT: "SI",
    DETALLE: "Deposito transferencia",
    CVU_CREDITO: "1234567890123456789934",
    FECHA_HORA_COELSA: "2026-07-15 10:45",
  },
  {
    FECHA_NEGOCIO: "14/07/2026",
    ID_DEBIN: "RE-00321",
    TIPO_MOV_COELSA: "RETIRO",
    CBU: "0000000000000000000004",
    CTA_BT_DEL_CUI: "NO",
    BT_SBO: "",
    BT_TOP: "1234567890123456789004",
    DENOMINACION: "Comercio Express SRL",
    CUIT: "30987654321",
    IMPORTE_COELSA: 75000,
    ESTADO_COELSA: "OK",
    ASTO_ESTADO: "Acreditado",
    CVU: "1234567890123456789045",
    CUIT_VIRTUAL: "30987654321",
    CVU_2: "",
    CUIT_VIRTUAL_2: "",
    CBU_2: "",
    CUIT_2: "",
    CONCEPTO: "Pago de tarjeta",
    MISMO_TIT: "NO",
    DETALLE: "Pago de tarjeta",
    CVU_CREDITO: "",
    FECHA_HORA_COELSA: "2026-07-14 12:10",
  },
];

const ARCHIVOS_INICIALES: Archivo[] = [
  {
    archivo: "conciliacion_20260716.csv",
    fecha: "2026-07-16",
    estado: "Pendiente",
    downloadRows: CONCILIACION_MOCK_ROWS.slice(0, 1),
  },
  {
    archivo: "conciliacion_20260715.csv",
    fecha: "2026-07-15",
    estado: "Analizado",
    downloadRows: CONCILIACION_MOCK_ROWS.slice(1, 3),
  },
  {
    archivo: "conciliacion_20260714.csv",
    fecha: "2026-07-14",
    estado: "Analizado",
    downloadRows: [CONCILIACION_MOCK_ROWS[3]],
  },
  {
    archivo: "conciliacion_20260713.csv",
    fecha: "2026-07-13",
    estado: "Analizado",
    downloadRows: [],
  },
];

type AnalisisResumen = {
  total: number;
  encontrados: number;
  noEncontrados: number;
  noCompletados: number;
  depositos: { total: number; encontrados: number };
  retiros: { total: number; encontrados: number };
  idsDepositosNoEncontrados: string[];
  idsRetirosNoEncontrados: string[];
};

const ANALISIS_EJEMPLO: AnalisisResumen = {
  total: 1017,
  encontrados: 1017,
  noEncontrados: 0,
  noCompletados: 1,
  depositos: { total: 612, encontrados: 612 },
  retiros: { total: 405, encontrados: 405 },
  idsDepositosNoEncontrados: [],
  idsRetirosNoEncontrados: ["DEP-99812", "RET-44732"],
};

function AnalisisConciliacionModal({
  archivo,
  onClose,
}: {
  archivo: Archivo;
  onClose: () => void;
}) {
  const resumen = ANALISIS_EJEMPLO;
  const porcentaje =
    resumen.total > 0 ? Math.round((resumen.encontrados / resumen.total) * 10000) / 100 : 0;
  const ahora = new Date();
  const fechaAnalisis = `${String(ahora.getDate()).padStart(2, "0")}/${String(
    ahora.getMonth() + 1,
  ).padStart(2, "0")}/${ahora.getFullYear()} ${String(ahora.getHours()).padStart(2, "0")}:${String(
    ahora.getMinutes(),
  ).padStart(2, "0")}`;

  const Kpi = ({
    label,
    value,
    accent,
  }: {
    label: string;
    value: string | number;
    accent?: boolean;
  }) => (
    <div
      className={`rounded-lg border px-2.5 py-2.5 text-center ${
        accent ? "bg-primary/[0.06] border-primary/20" : "bg-muted/30 border-border/50"
      }`}
    >
      <div className="font-display text-[18px] font-semibold leading-none tracking-tight tabular-nums text-foreground">
        {value}
      </div>
      <div className="text-[10.5px] font-medium uppercase tracking-widest text-muted-foreground mt-1.5 leading-none">
        {label}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-3xl max-h-[88vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-3.5 flex justify-between items-start z-10">
          <div>
            <h3 className="font-display text-[15px] font-semibold leading-none">Análisis de conciliación</h3>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {archivo.archivo} · {archivo.fecha}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md leading-none">
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Resumen + éxito en una sola grilla compacta */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-display text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Resumen general
              </h4>
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {porcentaje}% éxito · {resumen.encontrados}/{resumen.total}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <Kpi label="Total" value={resumen.total} />
              <Kpi label="Encontrados" value={resumen.encontrados} accent />
              <Kpi label="No encontrados" value={resumen.noEncontrados} />
              <Kpi label="No completados" value={resumen.noCompletados} />
              <Kpi label="Éxito" value={`${porcentaje}%`} accent />
            </div>
          </Card>

          {/* Distribución por tipo - ocupa menos: 1 card en vez de 2 */}
          <Card className="p-4">
            <h4 className="font-display text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Distribución por tipo
            </h4>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <Kpi label="Depósitos · total" value={resumen.depositos.total} />
              <Kpi label="Depósitos · encontrados" value={resumen.depositos.encontrados} />
              <Kpi label="Retiros · total" value={resumen.retiros.total} />
              <Kpi label="Retiros · encontrados" value={resumen.retiros.encontrados} />
            </div>
          </Card>

          {/* IDs + meta en layout compacto de 2 columnas */}
          <div className="grid lg:grid-cols-[1.35fr_0.65fr] gap-4">
            <Card className="p-4">
              <h4 className="font-display text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                IDs no encontrados
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-semibold text-muted-foreground mb-1.5">Depósitos</div>
                  {resumen.idsDepositosNoEncontrados.length === 0 ? (
                    <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Sin IDs
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {resumen.idsDepositosNoEncontrados.map((id) => (
                        <span
                          key={id}
                          className="inline-flex rounded-md border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px]"
                        >
                          {id}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-muted-foreground mb-1.5">Retiros</div>
                  {resumen.idsRetirosNoEncontrados.length === 0 ? (
                    <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Sin IDs
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {resumen.idsRetirosNoEncontrados.map((id) => (
                        <span
                          key={id}
                          className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-mono text-[11px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300"
                        >
                          {id}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-4 flex flex-col justify-between">
              <div>
                <h4 className="font-display text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  Análisis
                </h4>
                <p className="font-mono text-xs font-medium tabular-nums">{fechaAnalisis}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  {resumen.encontrados} de {resumen.total} conciliados
                </p>
              </div>
              <BtnOutline
                className="mt-3 h-7 text-xs px-2.5 w-full justify-center"
                onClick={() =>
                  downloadFile(
                    archivo.archivo,
                    "id_transaccion,tipo,monto,fecha\nTXN-001,DEPOSITO,50000,2026-07-15\n",
                  )
                }
              >
                <Download size={14} /> Descargar original
              </BtnOutline>
            </Card>
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-5 py-3 flex justify-end">
          <BtnOutline onClick={onClose} className="h-8 text-xs px-4">
            Cerrar
          </BtnOutline>
        </div>
      </div>
    </div>
  );
}

function Conciliaciones() {
  const [archivos, setArchivos] = useState<Archivo[]>(ARCHIVOS_INICIALES);
  const [analisisTarget, setAnalisisTarget] = useState<Archivo | null>(null);
  const [cargando, setCargando] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    nombre: "",
    fecha: "",
    file: null as File | null,
  });

  const guardarArchivo = () => {
    if (!uploadForm.nombre.trim() || !uploadForm.fecha || !uploadForm.file) return;
    const nombreArchivo = uploadForm.file.name || uploadForm.nombre.trim();
    setArchivos((prev) => [
      {
        archivo: nombreArchivo,
        fecha: uploadForm.fecha,
        estado: "Pendiente",
        downloadRows: [],
      },
      ...prev,
    ]);
    setUploadForm({ nombre: "", fecha: "", file: null });
    setCargando(false);
    toast.success("Archivo cargado correctamente");
  };

  const columns: Column<Archivo>[] = [
    {
      key: "archivo",
      label: "Archivo",
      filterable: true,
      render: (r) => <span className="font-mono text-xs">{r.archivo}</span>,
    },
    {
      key: "fecha",
      label: "Fecha",
      filterable: "date",
      render: (r) => <span className="font-mono tabular-nums">{r.fecha}</span>,
    },
    {
      key: "analizar",
      label: "Acción",
      render: (r) => (
        <div className="flex items-center gap-1">
          <BtnOutline
            className="h-7 text-xs px-3"
            onClick={() => {
              downloadExcel(r.archivo.replace(".csv", ".xlsx"), r.downloadRows);
              toast.success("Archivo descargado correctamente");
            }}
          >
            <Download size={14} /> Descargar
          </BtnOutline>
          <BtnOutline className="h-7 text-xs px-3" onClick={() => setAnalisisTarget(r)}>
            Analizar
          </BtnOutline>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <p className="text-sm text-muted-foreground">
          El banco sube diariamente (día anterior) todas las transacciones.
        </p>
        <BtnPrimary type="button" className="h-9 text-sm" onClick={() => setCargando(true)}>
          <Plus size={14} /> Cargar CSV
        </BtnPrimary>
      </div>
      <DataTable columns={columns} data={archivos} keyExtractor={(r) => r.archivo} />

      {analisisTarget && (
        <AnalisisConciliacionModal
          archivo={analisisTarget}
          onClose={() => setAnalisisTarget(null)}
        />
      )}

      {cargando && (
        <FormDialog
          open
          onClose={() => setCargando(false)}
          title="Cargar archivo de conciliación"
          description="Ingresá el nombre, la fecha de carga y el archivo CSV."
          onSubmit={guardarArchivo}
          submitLabel="Guardar"
          cancelLabel="Cancelar"
          size="md"
        >
          <div>
            <Label htmlFor="conc-nombre">Nombre del archivo</Label>
            <Input
              id="conc-nombre"
              value={uploadForm.nombre}
              onChange={(e) => setUploadForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="conciliacion_20260801.csv"
            />
          </div>
          <div>
            <Label htmlFor="conc-fecha">Fecha de carga</Label>
            <input
              id="conc-fecha"
              type="date"
              value={uploadForm.fecha}
              onChange={(e) => setUploadForm((f) => ({ ...f, fecha: e.target.value }))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          <div>
            <Label>Archivo CSV</Label>
            <FileDropzone
              accept=".csv,.xlsx,.xls"
              onFile={(f) =>
                setUploadForm((fr) => ({ ...fr, file: f, nombre: f?.name ?? fr.nombre }))
              }
            />
          </div>
        </FormDialog>
      )}
    </div>
  );
}

/* ---------- Reportes BCRA (BSRA) ---------- */

function ReportesBCRA() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="bsra-fecha">Fecha</Label>
          <input
            id="bsra-fecha"
            type="month"
            defaultValue="2026-07"
            className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>
        <BtnOutline className="h-9 text-xs px-3">
          <Search size={14} /> Buscar
        </BtnOutline>
      </div>

      <BsraTabla />
    </div>
  );
}

type BsraRow = {
  fecha: string;
  apartadoA: string;
  apartadoB: string;
  padron: string;
};

const bsraData: BsraRow[] = [
  {
    fecha: "01/08/2026",
    apartadoA: "202608A.csv",
    apartadoB: "202608B.xls",
    padron: "202608P.xls",
  },
  {
    fecha: "01/07/2026",
    apartadoA: "202607A.csv",
    apartadoB: "202607B.xls",
    padron: "202607P.xls",
  },
  {
    fecha: "01/06/2026",
    apartadoA: "202606A.csv",
    apartadoB: "202606B.xls",
    padron: "202606P.xls",
  },
  {
    fecha: "01/05/2026",
    apartadoA: "202605A.csv",
    apartadoB: "202605B.xls",
    padron: "202605P.xls",
  },
];

function BsraTabla() {
  const columns: Column<BsraRow>[] = [
    {
      key: "aperturaA",
      label: "Apartado A",
      sortable: true,
      filterable: true,
      render: (r) => (
        <button
          type="button"
          onClick={() =>
            downloadExcel(r.apartadoA.replace(".csv", ".xls"), [
              { concepto: "Apertura A", valor: 0 },
            ])
          }
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <Download size={14} /> XLS
        </button>
      ),
    },
    {
      key: "aperturaB",
      label: "Apartado B",
      sortable: true,
      filterable: true,
      render: (r) => (
        <button
          type="button"
          onClick={() => downloadExcel(r.apartadoB, [{ concepto: "Apertura B", saldo: 0 }])}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <Download size={14} /> XLS
        </button>
      ),
    },
    {
      key: "padron",
      label: "Padrón",
      sortable: true,
      filterable: true,
      render: (r) => (
        <button
          type="button"
          onClick={() => downloadExcel(r.padron, [{ concepto: "Padrón", total: 0 }])}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <Download size={14} /> XLS
        </button>
      ),
    },
    {
      key: "fecha",
      label: "Fecha",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono text-xs tabular-nums">{r.fecha}</span>,
    },
  ];
  return (
    <DataTable columns={columns} data={bsraData} keyExtractor={(r) => r.fecha} pageSize={10} />
  );
}

type AfipParams = {
  montoTransaccion: string;
  montoSaldo: string;
};

const afipParamsIniciales: AfipParams = {
  montoTransaccion: "500000",
  montoSaldo: "100000",
};

/* ---------- Reportes AFIP (B-8-1-25 / B-8-1-26) ---------- */

function ReportesAFIP() {
  const [params, setParams] = useState<AfipParams>(afipParamsIniciales);

  const guardarParams = () => {
    toast.success("Parámetros para reportes actualizados");
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Parámetros para reportes
        </h4>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="afip-monto-txn">Monto de transacción por mes</Label>
            <Input
              id="afip-monto-txn"
              value={params.montoTransaccion}
              onChange={(e) => setParams({ ...params, montoTransaccion: e.target.value })}
              placeholder="Ej: 500000"
            />
          </div>
          <div>
            <Label htmlFor="afip-monto-saldo">Monto de saldo a fin de mes</Label>
            <Input
              id="afip-monto-saldo"
              value={params.montoSaldo}
              onChange={(e) => setParams({ ...params, montoSaldo: e.target.value })}
              placeholder="Ej: 100000"
            />
          </div>
        </div>
        <div className="mt-4">
          <BtnPrimary className="h-8 text-xs px-3" onClick={guardarParams}>
            Guardar
          </BtnPrimary>
        </div>
      </Card>

      <AfipTabla params={params} />
    </div>
  );
}

type AfipRow = { fecha: string; b8125: string; b8126: string };

const afipData: AfipRow[] = [
  { fecha: "01/08/2026", b8125: "B-8-1-25_202608.xlsx", b8126: "B-8-1-26_202608.xlsx" },
  { fecha: "01/07/2026", b8125: "B-8-1-25_202607.xlsx", b8126: "B-8-1-26_202607.xlsx" },
  { fecha: "01/06/2026", b8125: "B-8-1-25_202606.xlsx", b8126: "B-8-1-26_202606.xlsx" },
  { fecha: "01/05/2026", b8125: "B-8-1-25_202605.xlsx", b8126: "B-8-1-26_202605.xlsx" },
];

function AfipTabla({ params }: { params: AfipParams }) {
  const filaReporte = (r: AfipRow) => ({
    concepto: "Reporte AFIP",
    periodo: r.fecha,
    monto_transaccion_mes: params.montoTransaccion,
    monto_saldo_fin_mes: params.montoSaldo,
  });

  const columns: Column<AfipRow>[] = [
    {
      key: "b8125",
      label: "B8125",
      sortable: true,
      filterable: true,
      render: (r) => (
        <button
          type="button"
          onClick={() => downloadExcel(r.b8125, [filaReporte(r)])}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <Download size={14} /> XLS
        </button>
      ),
    },
    {
      key: "b8126",
      label: "B8126",
      sortable: true,
      filterable: true,
      render: (r) => (
        <button
          type="button"
          onClick={() => downloadExcel(r.b8126, [filaReporte(r)])}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <Download size={14} /> XLS
        </button>
      ),
    },
    {
      key: "fecha",
      label: "Fecha",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono text-xs tabular-nums">{r.fecha}</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={afipData}
      keyExtractor={(r) => r.fecha}
      pageSize={10}
      showDownloadButton={false}
    />
  );
}

/* ---------- Reportes de Comisiones ---------- */

type Comision = {
  periodo: string;
  tipo: string;
  cantidad: number;
  monto: string;
  comision: string;
  enCurso: boolean;
};

function ReportesComisiones() {
  const hoy = new Date();
  const pm = String(hoy.getMonth() + 1).padStart(2, "0");
  const py = hoy.getFullYear();
  const cursoMes = `01/${pm}/${py}`;

  const data: Comision[] = [
    {
      periodo: cursoMes,
      tipo: "Depósitos",
      cantidad: 820,
      monto: "$ 8.200.000",
      comision: "$ 123.000",
      enCurso: true,
    },
    {
      periodo: cursoMes,
      tipo: "Retiros",
      cantidad: 540,
      monto: "$ 5.400.000",
      comision: "$ 81.000",
      enCurso: true,
    },
    {
      periodo: "01/07/2026",
      tipo: "Depósitos",
      cantidad: 1245,
      monto: "$ 12.450.000",
      comision: "$ 186.750",
      enCurso: false,
    },
    {
      periodo: "01/07/2026",
      tipo: "Retiros",
      cantidad: 892,
      monto: "$ 8.920.000",
      comision: "$ 133.800",
      enCurso: false,
    },
    {
      periodo: "01/07/2026",
      tipo: "Transferencias",
      cantidad: 3456,
      monto: "$ 34.560.000",
      comision: "$ 518.400",
      enCurso: false,
    },
    {
      periodo: "01/06/2026",
      tipo: "Depósitos",
      cantidad: 1187,
      monto: "$ 11.870.000",
      comision: "$ 178.050",
      enCurso: false,
    },
    {
      periodo: "01/05/2026",
      tipo: "Depósitos",
      cantidad: 1050,
      monto: "$ 10.500.000",
      comision: "$ 157.500",
      enCurso: false,
    },
  ];
  const columns: Column<Comision>[] = [
    {
      key: "periodo",
      label: "Período",
      filterable: "date",
      sortable: true,
      render: (r) => (
        <span className="font-mono tabular-nums">
          {r.periodo}
          {r.enCurso ? (
            <Badge tone="warn" className="ml-1.5">
              En curso
            </Badge>
          ) : null}
        </span>
      ),
    },
    { key: "tipo", label: "Tipo", filterable: true, render: (r) => r.tipo },
    {
      key: "cantidad",
      label: "Cantidad",
      filterable: true,
      sortable: true,
      render: (r) => r.cantidad.toLocaleString(),
    },
    {
      key: "monto",
      label: "Monto cobrado",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.monto}</span>,
    },
    {
      key: "comision",
      label: "Comisión",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.comision}</span>,
    },
    {
      key: "xls",
      label: "XLS",
      render: (r) => (
        <button
          type="button"
          onClick={() =>
            downloadExcel(`comisiones_${r.periodo}_${r.tipo}.xlsx`, [
              {
                periodo: r.periodo,
                tipo: r.tipo,
                cantidad: r.cantidad,
                monto: r.monto,
                comision: r.comision,
              },
            ])
          }
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <Download size={14} /> XLS
        </button>
      ),
    },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge tone="warn">Reporte en curso</Badge>
        <span>
          Los períodos marcados como "En curso" corresponden al mes actual y reflejan las comisiones
          acumuladas hasta ahora. Al finalizar el mes se genera el reporte definitivo.
        </span>
      </div>
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.periodo + r.tipo}
        pageSize={10}
        showDownloadButton={false}
      />
    </div>
  );
}

/* ---------- Reportes de Movimientos (CUIT) ---------- */

type Movimiento = {
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

const MOVIMIENTOS: Record<string, Movimiento[]> = {
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

function ReportesMovimientos() {
  const [cuit, setCuit] = useState("");
  const [consulta, setConsulta] = useState("");
  const valido = /^\d{11}$/.test(cuit);
  const rows = consulta ? (MOVIMIENTOS[consulta] ?? []) : [];

  const columns: Column<Movimiento>[] = [
    {
      key: "coelsaId",
      label: "ID COELSA",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono text-xs">{r.coelsaId}</span>,
    },
    {
      key: "legajo",
      label: "Legajo",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.legajo}</span>,
    },
    { key: "email", label: "Email", filterable: true, render: (r) => r.email },
    {
      key: "cvu",
      label: "CVU",
      filterable: true,
      render: (r) => <span className="font-mono text-xs tabular-nums">{r.cvu}</span>,
    },
    {
      key: "dia",
      label: "Día",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono tabular-nums">{r.dia}</span>,
    },
    {
      key: "hora",
      label: "Hora",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.hora}</span>,
    },
    {
      key: "tipo",
      label: "Tipo",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Depósito", "Retiro"],
      render: (r) => r.tipo,
    },
    {
      key: "monto",
      label: "Monto",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.monto}</span>,
    },
    {
      key: "cvuRemitente",
      label: "CVU remitente",
      filterable: true,
      render: (r) => (
        <span className="font-mono text-xs tabular-nums">{r.cvuRemitente || "—"}</span>
      ),
    },
    {
      key: "cuitRemitente",
      label: "CUIT remitente",
      filterable: true,
      render: (r) => (
        <span className="font-mono tabular-nums text-xs">{r.cuitRemitente || "—"}</span>
      ),
    },
    {
      key: "nombreRemitente",
      label: "Nombre remitente",
      filterable: true,
      render: (r) => r.nombreRemitente || "—",
    },
  ];

  const excelRows = rows.map((r) => ({
    "ID COELSA": r.coelsaId,
    Legajo: r.legajo,
    Email: r.email,
    CVU: r.cvu,
    Día: r.dia,
    Hora: r.hora,
    Tipo: r.tipo,
    Monto: r.monto,
    "CVU remitente": r.cvuRemitente,
    "CUIT remitente": r.cuitRemitente,
    "Nombre remitente": r.nombreRemitente,
  }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Ingresá un CUIT (11 dígitos) para consultar y descargar en Excel los movimientos de personas
        físicas y jurídicas fuera de la plataforma.
      </p>
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <Label htmlFor="cuit-mov">CUIT</Label>
          <Input
            id="cuit-mov"
            value={cuit}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 11);
              setCuit(v);
              if (v.length !== 11) setConsulta("");
            }}
            placeholder="Ej: 20123456789"
          />
        </div>
        <button
          disabled={!valido}
          onClick={() => setConsulta(cuit)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Search size={14} /> Buscar
        </button>
      </div>
      {cuit.length > 0 && !valido && (
        <p className="text-xs text-amber-600">El CUIT debe tener 11 dígitos numéricos.</p>
      )}
      {valido && consulta && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BtnOutline onClick={() => downloadExcel(`movimientos_${consulta}.xlsx`, excelRows)}>
              <Download size={14} /> Descargar Excel
            </BtnOutline>
            <span className="text-sm text-muted-foreground">
              {rows.length} movimientos encontrados
            </span>
          </div>
        </div>
      )}
      {consulta &&
        valido &&
        (rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No se encontraron movimientos para el CUIT consultado.
          </p>
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            keyExtractor={(r) => r.coelsaId}
            pageSize={10}
            showDownloadButton={false}
          />
        ))}
    </div>
  );
}

/* ---------- Actividad de Usuarios ---------- */

type Actividad = {
  campo: string;
  valorAnterior: string;
  valorNuevo: string;
  fecha: string;
  hora: string;
  usuario: string;
};

const ACTIVIDAD_BASE: Record<string, Actividad[]> = {
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

function parseFechaDMY(v: string): Date | null {
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(+m[3], +m[2] - 1, +m[1]);
}

function ActividadUsuarios() {
  const [legajo, setLegajo] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [consultado, setConsultado] = useState(false);

  const filtrados = consultado
    ? (ACTIVIDAD_BASE[legajo] ?? []).filter(
        (a) =>
          (!desde || (parseFechaDMY(a.fecha) ?? 0) >= (parseFechaDMY(desde) ?? 0)) &&
          (!hasta || (parseFechaDMY(a.fecha) ?? 0) <= (parseFechaDMY(hasta) ?? 0)),
      )
    : [];

  const columns: Column<Actividad>[] = [
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

  const excelRows = filtrados.map((a) => ({
    "Campo actualizado": a.campo,
    "Valor anterior": a.valorAnterior,
    "Valor nuevo": a.valorNuevo,
    "Fecha y hora": `${a.fecha} ${a.hora}`,
    "Actualizado por": a.usuario,
  }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Ingresá un Legajo para consultar la actividad del usuario. Los datos se muestran como en el
        historial de cambios del detalle del usuario.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px]">
          <Label htmlFor="act-legajo">Legajo</Label>
          <Input
            id="act-legajo"
            value={legajo}
            onChange={(e) => {
              setLegajo(e.target.value);
              setConsultado(false);
            }}
            placeholder="Ej: ADM-001"
          />
        </div>
        <div className="min-w-[160px]">
          <Label htmlFor="act-desde">Desde</Label>
          <input
            id="act-desde"
            type="date"
            value={desde}
            onChange={(e) => {
              setDesde(e.target.value);
              setConsultado(false);
            }}
            className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>
        <div className="min-w-[160px]">
          <Label htmlFor="act-hasta">Hasta</Label>
          <input
            id="act-hasta"
            type="date"
            value={hasta}
            onChange={(e) => {
              setHasta(e.target.value);
              setConsultado(false);
            }}
            className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>
        <button
          disabled={!legajo}
          onClick={() => setConsultado(true)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Search size={14} /> Buscar
        </button>
      </div>
      {consultado && filtrados.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BtnOutline onClick={() => downloadExcel(`actividad_${legajo}.xlsx`, excelRows)}>
              <Download size={14} /> Descargar reporte
            </BtnOutline>
            <span className="text-sm text-muted-foreground">
              {filtrados.length} registros encontrados
            </span>
          </div>
        </div>
      )}
      {consultado && filtrados.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No se encontraron registros para la búsqueda realizada.
        </p>
      ) : consultado ? (
        <DataTable
          columns={columns}
          data={filtrados}
          keyExtractor={(r) => r.fecha + r.hora + r.campo}
          pageSize={10}
          showDownloadButton={false}
        />
      ) : null}
    </div>
  );
}

/* ---------- Reportes de Impuestos ---------- */

type Impuesto = {
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

const IMPUESTOS_DISPONIBLES = ["Ganancias", "Ingresos Brutos", "IVA", "Débito/Crédito (Sellos)"];

const impuestosData: Impuesto[] = [
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

function generarTxtImpuesto(r: Impuesto): string {
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

function generarXmlImpuesto(r: Impuesto): string {
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

function ImpuestoDetalleModal({
  impuesto,
  onClose,
  onMarcarPresentado,
  onMarcarPagado,
}: {
  impuesto: Impuesto;
  onClose: () => void;
  onMarcarPresentado: (id: string) => void;
  onMarcarPagado: (id: string) => void;
}) {
  const Field = ({ label, value }: { label: string; value: ReactNode }) => (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex justify-between items-start z-10">
          <div>
            <h3 className="font-display font-semibold text-lg">Detalle del reporte</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{impuesto.reporte}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Información del reporte
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="ID" value={<span className="font-mono">{impuesto.id}</span>} />
              <Field label="Reporte" value={impuesto.reporte} />
              <Field label="Período" value={impuesto.periodo} />
              <Field label="Tramo" value={impuesto.tramo} />
              <Field
                label="Fecha de creación"
                value={<span className="font-mono tabular-nums">{impuesto.creado}</span>}
              />
            </div>
          </Card>

          <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              KPIs
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
              <Field label="Total de registros" value={impuesto.totalRegistros} />
              <Field label="Total de movimientos" value={impuesto.totalMovimientos} />
              <Field
                label="Total de monto"
                value={<span className="font-mono">{impuesto.totalMonto}</span>}
              />
              <Field
                label="Total de retenciones"
                value={<span className="font-mono">{impuesto.totalRetenciones}</span>}
              />
            </div>
          </Card>

          <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Estado
            </h4>
            <div className="flex flex-wrap gap-6">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Presentado
                </div>
                <div className="mt-1">
                  <Badge tone={impuesto.presentado === "Sí" ? "success" : "danger"}>
                    {impuesto.presentado}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Pagado</div>
                <div className="mt-1">
                  <Badge tone={impuesto.pagado === "Sí" ? "success" : "danger"}>
                    {impuesto.pagado}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex flex-wrap justify-end gap-2">
          {impuesto.presentado === "No" && (
            <BtnPrimary className="h-9 text-sm" onClick={() => onMarcarPresentado(impuesto.id)}>
              Marcar como presentado
            </BtnPrimary>
          )}
          {impuesto.pagado === "No" && (
            <BtnOutline className="h-9 text-sm" onClick={() => onMarcarPagado(impuesto.id)}>
              Marcar como pagado
            </BtnOutline>
          )}
          <BtnOutline className="h-9 text-sm" onClick={onClose}>
            Cerrar
          </BtnOutline>
        </div>
      </div>
    </div>
  );
}

function ReportesImpuestos() {
  const [data, setData] = useState<Impuesto[]>(impuestosData);
  const [detalle, setDetalle] = useState<Impuesto | null>(null);
  const [generando, setGenerando] = useState(false);
  const [form, setForm] = useState({ fecha: "", impuesto: "", tramo: "" });

  const marcarPresentado = (id: string) => {
    setData((prev) => prev.map((d) => (d.id === id ? { ...d, presentado: "Sí" } : d)));
    setDetalle((prev) => (prev && prev.id === id ? { ...prev, presentado: "Sí" } : prev));
    toast.success("Reporte marcado como presentado");
  };

  const marcarPagado = (id: string) => {
    setData((prev) => prev.map((d) => (d.id === id ? { ...d, pagado: "Sí" } : d)));
    setDetalle((prev) => (prev && prev.id === id ? { ...prev, pagado: "Sí" } : prev));
    toast.success("Reporte marcado como pagado");
  };

  const generarReporte = () => {
    if (!form.fecha || !form.impuesto || !form.tramo) return;
    const id = `IMP-${String(data.length + 1).padStart(4, "0")}`;
    setData((prev) => [
      ...prev,
      {
        id,
        reporte: form.impuesto,
        periodo: form.fecha.slice(0, 7),
        tramo: form.tramo,
        creado: form.fecha,
        presentado: "No",
        pagado: "No",
        totalRegistros: 0,
        totalMovimientos: 0,
        totalMonto: "$ 0",
        totalRetenciones: "$ 0",
      },
    ]);
    setForm({ fecha: "", impuesto: "", tramo: "" });
    setGenerando(false);
    toast.success("Reporte generado correctamente");
  };

  const columns: Column<Impuesto>[] = [
    {
      key: "periodo",
      label: "Período",
      filterable: true,
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.periodo}</span>,
    },
    {
      key: "tramo",
      label: "Tramo",
      filterable: "enum",
      filterOptions: ["Tramo 1", "Tramo 2", "Tramo 3"],
      render: (r) => r.tramo,
    },
    {
      key: "creado",
      label: "Fecha de creación",
      filterable: "date",
      render: (r) => <span className="font-mono tabular-nums">{r.creado}</span>,
    },
    {
      key: "presentado",
      label: "Presentado",
      filterable: "enum",
      filterOptions: ["Sí", "No"],
      render: (r) => (
        <Badge tone={r.presentado === "Sí" ? "success" : "danger"}>{r.presentado}</Badge>
      ),
    },
    {
      key: "pagado",
      label: "Pagado",
      filterable: "enum",
      filterOptions: ["Sí", "No"],
      render: (r) => <Badge tone={r.pagado === "Sí" ? "success" : "danger"}>{r.pagado}</Badge>,
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <p className="text-sm text-muted-foreground">
          Reportes de presentación de impuestos por período y tramo.
        </p>
        <BtnPrimary type="button" className="h-9 text-sm" onClick={() => setGenerando(true)}>
          <Plus size={14} /> Generar reporte
        </BtnPrimary>
      </div>

      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        pageSize={10}
        showDownloadButton={false}
        actions={(r) => (
          <div className="flex items-center gap-1">
            <BtnOutline
              className="h-7 px-2 text-xs"
              onClick={() => setDetalle(r)}
              title="Ver detalle"
            >
              <FileText size={14} /> Ver detalle
            </BtnOutline>
            <BtnOutline
              className="h-7 px-2 text-xs"
              onClick={() => downloadFile(`${r.reporte}_${r.periodo}.txt`, generarTxtImpuesto(r))}
              title="Descargar TXT"
            >
              <Download size={14} /> TXT
            </BtnOutline>
            <BtnOutline
              className="h-7 px-2 text-xs"
              onClick={() => downloadFile(`${r.reporte}_${r.periodo}.xml`, generarXmlImpuesto(r))}
              title="Descargar XML"
            >
              <Download size={14} /> XML
            </BtnOutline>
            <BtnOutline
              className="h-7 px-2 text-xs"
              onClick={() => downloadFile(`${r.reporte}_${r.periodo}.zip`, "")}
              title="Descargar ZIP"
            >
              <Download size={14} /> ZIP
            </BtnOutline>
          </div>
        )}
      />

      {detalle && (
        <ImpuestoDetalleModal
          impuesto={detalle}
          onClose={() => setDetalle(null)}
          onMarcarPresentado={marcarPresentado}
          onMarcarPagado={marcarPagado}
        />
      )}

      {generando && (
        <FormDialog
          open
          onClose={() => setGenerando(false)}
          title="Generar reporte"
          description="Completá los datos para generar un nuevo reporte de impuesto."
          onSubmit={generarReporte}
          submitLabel="Generar reporte"
          size="md"
        >
          <div>
            <Label htmlFor="ri-fecha">Fecha</Label>
            <input
              id="ri-fecha"
              type="date"
              value={form.fecha}
              onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          <div>
            <Label htmlFor="ri-impuesto">Impuesto para el reporte</Label>
            <select
              id="ri-impuesto"
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              value={form.impuesto}
              onChange={(e) => setForm((f) => ({ ...f, impuesto: e.target.value }))}
            >
              <option value="">Seleccionar impuesto</option>
              {IMPUESTOS_DISPONIBLES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="ri-tramo">Tramo</Label>
            <select
              id="ri-tramo"
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              value={form.tramo}
              onChange={(e) => setForm((f) => ({ ...f, tramo: e.target.value }))}
            >
              <option value="">Seleccionar tramo</option>
              <option value="Tramo 1">Tramo 1</option>
              <option value="Tramo 2">Tramo 2</option>
              <option value="Tramo 3">Tramo 3</option>
            </select>
          </div>
        </FormDialog>
      )}
    </div>
  );
}

/* ---------- Conciliaciones BLP ---------- */

type BlpArchivo = {
  archivo: string;
  fecha: string;
  estado: "Presentada" | "Liquidada" | "Pendiente" | "En proceso";
};

const blpData: BlpArchivo[] = [
  { archivo: "Liquidada Payway 2026-07.csv", fecha: "2026-07-31", estado: "Liquidada" },
  { archivo: "Pagos Payway 2026-07.csv", fecha: "2026-07-30", estado: "Presentada" },
  { archivo: "Pagos Payway 2026-06.csv", fecha: "2026-06-30", estado: "Presentada" },
  { archivo: "Liquidada Payway 2026-06.csv", fecha: "2026-06-29", estado: "Liquidada" },
  { archivo: "Pagos Payway 2026-05.csv", fecha: "2026-05-30", estado: "En proceso" },
];

function BlpNoRequiereModal({ archivo, onClose }: { archivo: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-md shadow-xl">
        <div className="p-6">
          <h3 className="font-display font-semibold text-lg">Análisis de conciliación</h3>
          <p className="text-sm text-muted-foreground mt-3">
            El archivo <span className="font-mono">{archivo}</span> no requiere análisis.
          </p>
          <div className="mt-5 flex justify-end">
            <BtnOutline className="h-9 text-sm px-3" onClick={onClose}>
              Cerrar
            </BtnOutline>
          </div>
        </div>
      </div>
    </div>
  );
}

function BlpAnalisisModal({ archivo, onClose }: { archivo: BlpArchivo; onClose: () => void }) {
  const [ejecutado, setEjecutado] = useState(false);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-md shadow-xl">
        <div className="p-6 space-y-4">
          <h3 className="font-display font-semibold text-lg">Analizar conciliación</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>
              <span className="text-foreground font-medium">Archivo:</span>{" "}
              <span className="font-mono">{archivo.archivo}</span>
            </div>
            <div>
              <span className="text-foreground font-medium">Fecha:</span>{" "}
              <span className="font-mono">{archivo.fecha}</span>
            </div>
            <div>
              <span className="text-foreground font-medium">Estado:</span> {archivo.estado}
            </div>
          </div>
          <p className="text-sm">
            Se ejecutará el análisis de la conciliación BLP correspondiente.
          </p>
          {ejecutado && (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-sm px-3 py-2">
              Análisis ejecutado correctamente.
            </div>
          )}
          <div className="flex justify-end gap-2">
            <BtnOutline className="h-9 text-sm px-3" onClick={onClose}>
              Cerrar
            </BtnOutline>
            <BtnPrimary
              className="h-9 text-sm px-3"
              onClick={() => {
                setEjecutado(true);
                toast.success("Análisis de conciliación ejecutado");
              }}
            >
              Ejecutar análisis
            </BtnPrimary>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConciliacionesBLP() {
  const [data, setData] = useState<BlpArchivo[]>(blpData);
  const [cargando, setCargando] = useState(false);
  const [analisisTarget, setAnalisisTarget] = useState<BlpArchivo | null>(null);
  const [noRequiere, setNoRequiere] = useState<string | null>(null);
  const [cargarForm, setCargarForm] = useState({
    nombre: "",
    fecha: "",
    file: null as File | null,
  });

  const guardarArchivo = () => {
    if (!cargarForm.nombre.trim() || !cargarForm.fecha || !cargarForm.file) return;
    setData((prev) => [
      { archivo: cargarForm.file!.name, fecha: cargarForm.fecha, estado: "Pendiente" },
      ...prev,
    ]);
    setCargarForm({ nombre: "", fecha: "", file: null });
    setCargando(false);
    toast.success("Archivo cargado correctamente");
  };

  const abrirAnalisis = (r: BlpArchivo) => {
    if (r.estado === "Presentada" || r.estado === "Liquidada") {
      setAnalisisTarget(r);
    } else {
      setNoRequiere(r.archivo);
    }
  };

  const columns: Column<BlpArchivo>[] = [
    {
      key: "archivo",
      label: "Nombre del archivo",
      filterable: true,
      render: (r) => <span className="font-mono text-xs">{r.archivo}</span>,
    },
    {
      key: "fecha",
      label: "Fecha",
      filterable: "date",
      render: (r) => <span className="font-mono tabular-nums">{r.fecha}</span>,
    },
    {
      key: "accion",
      label: "Acción",
      render: (r) => (
        <div className="flex items-center gap-1">
          <BtnOutline
            className="h-7 text-xs px-3"
            onClick={() =>
              downloadFile(
                r.archivo,
                `Archivo de conciliación BLP: ${r.archivo}\nFecha: ${r.fecha}\nEstado: ${r.estado}`,
              )
            }
          >
            <Download size={14} /> Descargar
          </BtnOutline>
          <BtnOutline className="h-7 text-xs px-3" onClick={() => abrirAnalisis(r)}>
            Analizar
          </BtnOutline>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <p className="text-sm text-muted-foreground">
          Conciliación de archivos Payway (pagos y liquidaciones) por Link de Pago.
        </p>
        <BtnPrimary type="button" className="h-9 text-sm" onClick={() => setCargando(true)}>
          <Plus size={14} /> Cargar nuevo archivo
        </BtnPrimary>
      </div>

      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.archivo}
        pageSize={10}
        showDownloadButton={false}
      />

      {cargando && (
        <FormDialog
          open
          onClose={() => setCargando(false)}
          title="Cargar nuevo archivo"
          onSubmit={guardarArchivo}
          submitLabel="Guardar"
          size="md"
        >
          <div>
            <Label htmlFor="blp-nombre">Nombre del archivo</Label>
            <Input
              id="blp-nombre"
              value={cargarForm.nombre}
              onChange={(e) => setCargarForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Liquidada Payway 2026-08.csv"
            />
          </div>
          <div>
            <Label htmlFor="blp-fecha">Fecha</Label>
            <input
              id="blp-fecha"
              type="date"
              value={cargarForm.fecha}
              onChange={(e) => setCargarForm((f) => ({ ...f, fecha: e.target.value }))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          <div>
            <Label>Archivo de conciliación BLP</Label>
            <FileDropzone
              accept=".csv,.xlsx,.xls"
              onFile={(f) =>
                setCargarForm((fr) => ({ ...fr, file: f, nombre: f?.name ?? fr.nombre }))
              }
            />
          </div>
        </FormDialog>
      )}

      {noRequiere && (
        <BlpNoRequiereModal archivo={noRequiere} onClose={() => setNoRequiere(null)} />
      )}
      {analisisTarget && (
        <BlpAnalisisModal archivo={analisisTarget} onClose={() => setAnalisisTarget(null)} />
      )}
    </div>
  );
}

/* ---------- Enrutado de vistas ---------- */

const views: Record<string, () => ReactNode> = {
  conciliaciones: Conciliaciones,
  bcra: ReportesBCRA,
  afip: ReportesAFIP,
  comisiones: ReportesComisiones,
  movimientos: ReportesMovimientos,
  actividad: ActividadUsuarios,
  impuestos: ReportesImpuestos,
  "conciliaciones-blp": ConciliacionesBLP,
};

function Page() {
  const [selected, setSelected] = useState<string | null>(null);
  const current = reports.find((r) => r.key === selected);
  const View = current ? views[current.key] : undefined;

  if (current && View) {
    return (
      <>
        <button
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 mb-4"
        >
          <ChevronLeft size={16} /> Volver a Reportes
        </button>
        <PageHeader title={current.name} description={current.description} />
        <View />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Conciliaciones, reportes regulatorios y de impuestos"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.key}
              onClick={() => setSelected(r.key)}
              className="bg-card border border-border rounded-xl p-5 text-left hover:border-primary/50 hover:shadow-lg shadow-sm transition-all"
            >
              <Icon size={28} className={`${r.color} mb-3`} strokeWidth={1.75} />
              <div className="font-semibold text-foreground text-sm">{r.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{r.description}</div>
            </button>
          );
        })}
      </div>
    </>
  );
}
