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
  FileStack,
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
    description: "Conciliación por tramos 1/2/3 para Link de Pago.",
  },
  {
    key: "impuestos-nuevo",
    name: "Reportes de Impuestos (Nuevo)",
    icon: FileStack,
    color: "text-rose-500",
    description: "Nuevo esquema de reportes de impuestos.",
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

type Archivo = { archivo: string; fecha: string; estado: "Analizado" | "Pendiente" };

const ARCHIVOS_INICIALES: Archivo[] = [
  { archivo: "conciliacion_20260716.csv", fecha: "2026-07-16", estado: "Pendiente" },
  { archivo: "conciliacion_20260715.csv", fecha: "2026-07-15", estado: "Analizado" },
  { archivo: "conciliacion_20260714.csv", fecha: "2026-07-14", estado: "Analizado" },
  { archivo: "conciliacion_20260713.csv", fecha: "2026-07-13", estado: "Analizado" },
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

  const Kpi = ({ label, value }: { label: string; value: string | number }) => (
    <div className="bg-muted/40 rounded-lg p-4 text-center">
      <div className="font-display text-2xl font-semibold text-foreground tabular-nums">
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-4xl max-h-[85vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex justify-between items-start z-10">
          <div>
            <h3 className="font-display text-lg font-semibold">Análisis de conciliación</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {archivo.archivo} · Fecha: {archivo.fecha}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Resumen general
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Kpi label="Total" value={resumen.total} />
              <Kpi label="Encontrados" value={resumen.encontrados} />
              <Kpi label="No encontrados" value={resumen.noEncontrados} />
              <Kpi label="No completados" value={resumen.noCompletados} />
            </div>
          </Card>

          <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Estadísticas generales
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Kpi label="Total encontrados" value={resumen.encontrados} />
              <Kpi label="Total no encontrados" value={resumen.noEncontrados} />
              <Kpi label="Porcentaje de éxito" value={`${porcentaje}%`} />
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {resumen.encontrados} encontrados de {resumen.total} → {porcentaje}% de éxito.
            </p>
          </Card>

          <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Depósitos
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Kpi label="Total de depósitos en el archivo" value={resumen.depositos.total} />
              <Kpi label="Depósitos encontrados" value={resumen.depositos.encontrados} />
            </div>
          </Card>

          <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Retiros
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Kpi label="Total de retiros en el archivo" value={resumen.retiros.total} />
              <Kpi label="Retiros encontrados" value={resumen.retiros.encontrados} />
            </div>
          </Card>

          <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Fecha del análisis
            </h4>
            <p className="text-sm font-medium">{fechaAnalisis}</p>
          </Card>

          <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              IDs no encontrados
            </h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  IDs de depósitos no encontrados
                </div>
                {resumen.idsDepositosNoEncontrados.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin IDs.</p>
                ) : (
                  <ul className="list-disc list-inside text-sm text-foreground space-y-0.5">
                    {resumen.idsDepositosNoEncontrados.map((id) => (
                      <li key={id} className="font-mono">
                        {id}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  IDs de retiros no encontrados
                </div>
                {resumen.idsRetirosNoEncontrados.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin IDs.</p>
                ) : (
                  <ul className="list-disc list-inside text-sm text-foreground space-y-0.5">
                    {resumen.idsRetirosNoEncontrados.map((id) => (
                      <li key={id} className="font-mono">
                        {id}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Card>

          <div>
            <BtnOutline
              className="h-8 text-xs px-3"
              onClick={() =>
                downloadFile(
                  archivo.archivo,
                  "id_transaccion,tipo,monto,fecha\nTXN-001,DEPOSITO,50000,2026-07-15\n",
                )
              }
            >
              <Download size={14} /> Descargar archivo original
            </BtnOutline>
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex justify-end">
          <BtnOutline onClick={onClose}>Cerrar</BtnOutline>
        </div>
      </div>
    </div>
  );
}

function Conciliaciones() {
  const [archivos, setArchivos] = useState<Archivo[]>(ARCHIVOS_INICIALES);
  const [cargando, setCargando] = useState(false);
  const [analisisTarget, setAnalisisTarget] = useState<Archivo | null>(null);
  const [cargarForm, setCargarForm] = useState({
    nombre: "",
    fecha: "",
    file: null as File | null,
  });

  const guardarArchivo = () => {
    if (!cargarForm.nombre.trim() || !cargarForm.fecha || !cargarForm.file) return;
    setArchivos((prev) => [
      { archivo: cargarForm.file!.name, fecha: cargarForm.fecha, estado: "Pendiente" },
      ...prev,
    ]);
    setCargarForm({ nombre: "", fecha: "", file: null });
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
        <BtnOutline className="h-7 text-xs px-3" onClick={() => setAnalisisTarget(r)}>
          Analizar
        </BtnOutline>
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
          <Plus size={14} /> Cargar nuevo archivo
        </BtnPrimary>
      </div>
      <DataTable columns={columns} data={archivos} keyExtractor={(r) => r.archivo} />

      {cargando && (
        <FormDialog
          open
          onClose={() => setCargando(false)}
          title="Cargar nuevo archivo"
          description="Seleccioná el archivo CSV/Excel de conciliación."
          onSubmit={guardarArchivo}
          submitLabel="Guardar"
          size="md"
        >
          <div>
            <Label htmlFor="ca-nombre">Nombre del archivo</Label>
            <Input
              id="ca-nombre"
              value={cargarForm.nombre}
              onChange={(e) => setCargarForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="conciliacion_YYYYMMDD.csv"
            />
          </div>
          <div>
            <Label htmlFor="ca-fecha">Fecha</Label>
            <input
              id="ca-fecha"
              type="date"
              value={cargarForm.fecha}
              onChange={(e) => setCargarForm((f) => ({ ...f, fecha: e.target.value }))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          <div>
            <Label>Carga del archivo</Label>
            <FileDropzone
              accept=".csv,.xlsx,.xls"
              onFile={(f) =>
                setCargarForm((fr) => ({ ...fr, file: f, nombre: f?.name ?? fr.nombre }))
              }
            />
          </div>
        </FormDialog>
      )}

      {analisisTarget && (
        <AnalisisConciliacionModal
          archivo={analisisTarget}
          onClose={() => setAnalisisTarget(null)}
        />
      )}
    </div>
  );
}

/* ---------- Reportes BCRA (BSRA) ---------- */

function ReportesBCRA() {
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-5">
          <h4 className="font-display font-semibold text-sm">
            SISCEN — Régimen informativo mensual
          </h4>
          <p className="text-xs text-muted-foreground mt-1">Presentado el 15/07/2026</p>
          <div className="mt-2">
            <Badge tone="success">Presentado</Badge>
          </div>
        </Card>
        <Card className="p-5">
          <h4 className="font-display font-semibold text-sm">Régimen de transparencia</h4>
          <p className="text-xs text-muted-foreground mt-1">Tasas activas y pasivas — Julio 2026</p>
          <div className="mt-2">
            <Badge tone="warn">Pendiente</Badge>
          </div>
        </Card>
        <Card className="p-5">
          <h4 className="font-display font-semibold text-sm">Información de clientes</h4>
          <p className="text-xs text-muted-foreground mt-1">Base consolidada al 30/06/2026</p>
          <div className="mt-2">
            <BtnOutline className="h-7 text-xs px-3">Exportar TXT</BtnOutline>
          </div>
        </Card>
      </div>

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
          onClick={() => downloadCSV(r.apartadoA, [{ concepto: "Apertura A", valor: 0 }])}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <Download size={14} /> CSV
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

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="afip-fecha">Fecha</Label>
          <input
            id="afip-fecha"
            type="month"
            defaultValue="2026-07"
            className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>
        <BtnOutline className="h-9 text-xs px-3">
          <Search size={14} /> Buscar
        </BtnOutline>
      </div>

      <AfipTabla params={params} />
    </div>
  );
}

type AfipRow = { fecha: string; b8_25: string; b8_26: string };

const afipData: AfipRow[] = [
  { fecha: "01/08/2026", b8_25: "B-8-1-25_202608.xlsx", b8_26: "B-8-1-26_202608.xlsx" },
  { fecha: "01/07/2026", b8_25: "B-8-1-25_202607.xlsx", b8_26: "B-8-1-26_202607.xlsx" },
  { fecha: "01/06/2026", b8_25: "B-8-1-25_202606.xlsx", b8_26: "B-8-1-26_202606.xlsx" },
  { fecha: "01/05/2026", b8_25: "B-8-1-25_202605.xlsx", b8_26: "B-8-1-26_202605.xlsx" },
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
      key: "b8_25",
      label: "B-8-1-25",
      sortable: true,
      filterable: true,
      render: (r) => (
        <button
          type="button"
          onClick={() => downloadExcel(r.b8_25, [filaReporte(r)])}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <Download size={14} /> Excel
        </button>
      ),
    },
    {
      key: "b8_26",
      label: "B-8-1-26",
      sortable: true,
      filterable: true,
      render: (r) => (
        <button
          type="button"
          onClick={() => downloadExcel(r.b8_26, [filaReporte(r)])}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <Download size={14} /> Excel
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
    <DataTable columns={columns} data={afipData} keyExtractor={(r) => r.fecha} pageSize={10} />
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
      />
    </div>
  );
}

/* ---------- Reportes de Movimientos (CUIT) ---------- */

type Movimiento = {
  id: number;
  tipo: "Depósito" | "Retiro";
  fecha: string;
  detalle: string;
  monto: string;
  estado: "Accreditado" | "Pendiente" | "Rechazado";
};

const MOVIMIENTOS: Record<string, Movimiento[]> = {
  "30123456789": [
    {
      id: 1,
      tipo: "Depósito",
      fecha: "2026-07-28",
      detalle: "Depósito vía PSE",
      monto: "$ 50.000",
      estado: "Accreditado",
    },
    {
      id: 2,
      tipo: "Retiro",
      fecha: "2026-07-26",
      detalle: "Retiro QR",
      monto: "$ 5.000",
      estado: "Accreditado",
    },
    {
      id: 3,
      tipo: "Depósito",
      fecha: "2026-07-20",
      detalle: "Depósito transferencia",
      monto: "$ 120.000",
      estado: "Accreditado",
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
      key: "tipo",
      label: "Tipo",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Depósito", "Retiro"],
      render: (r) => r.tipo,
    },
    {
      key: "fecha",
      label: "Fecha",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono tabular-nums">{r.fecha}</span>,
    },
    { key: "detalle", label: "Detalle", filterable: true, render: (r) => r.detalle },
    {
      key: "monto",
      label: "Monto",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.monto}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Accreditado", "Pendiente", "Rechazado"],
      render: (r) => (
        <Badge
          tone={
            r.estado === "Accreditado" ? "success" : r.estado === "Pendiente" ? "warn" : "danger"
          }
        >
          {r.estado}
        </Badge>
      ),
    },
  ];

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
            <BtnOutline onClick={() => downloadExcel(`movimientos_${consulta}.xlsx`, rows)}>
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
          <DataTable columns={columns} data={rows} keyExtractor={(r) => r.id} pageSize={10} />
        ))}
    </div>
  );
}

/* ---------- Actividad deUsuarios ---------- */

type Actividad = {
  legajo: string;
  email: string;
  fecha: string;
  hora: string;
  tipoTransaccion: string;
  monto: string;
  estado: string;
  nombre: string;
  destino: string;
  cuit: string;
  destinatario: string;
  cvu: string;
  cvuBalance: string;
};

const ACTIVIDAD: Actividad[] = [
  {
    legajo: "ADM-001",
    email: "m.rodriguez@admin.com",
    fecha: "15/07/2026",
    hora: "14:32",
    tipoTransaccion: "Aprobó bloqueo",
    monto: "$ 0",
    estado: "OK",
    nombre: "M. Rodríguez",
    destino: "Alerta BL-001",
    cuit: "30123456789",
    destinatario: "M. Rodríguez",
    cvu: "1234567890123456789012",
    cvuBalance: "1234567890123456789011",
  },
  {
    legajo: "ADM-001",
    email: "m.rodriguez@admin.com",
    fecha: "15/07/2026",
    hora: "11:15",
    tipoTransaccion: "Editó parámetros de alertas",
    monto: "$ 0",
    estado: "OK",
    nombre: "M. Rodríguez",
    destino: "Parámetros de alertas",
    cuit: "",
    destinatario: "",
    cvu: "",
    cvuBalance: "",
  },
  {
    legajo: "ADM-001",
    email: "m.rodriguez@admin.com",
    fecha: "14/07/2026",
    hora: "16:48",
    tipoTransaccion: "Descargó reporte BCRA",
    monto: "$ 0",
    estado: "OK",
    nombre: "M. Rodríguez",
    destino: "Reportes",
    cuit: "",
    destinatario: "",
    cvu: "",
    cvuBalance: "",
  },
  {
    legajo: "ADM-001",
    email: "m.rodriguez@admin.com",
    fecha: "14/07/2026",
    hora: "09:00",
    tipoTransaccion: "Creó usuario backoffice",
    monto: "$ 0",
    estado: "OK",
    nombre: "M. Rodríguez",
    destino: "Usuarios backoffice",
    cuit: "30777777777",
    destinatario: "Nuevo usuario",
    cvu: "",
    cvuBalance: "",
  },
  {
    legajo: "ADM-002",
    email: "l.fernandez@admin.com",
    fecha: "15/07/2026",
    hora: "10:00",
    tipoTransaccion: "Editó parámetros de bloqueo",
    monto: "$ 0",
    estado: "OK",
    nombre: "L. Fernández",
    destino: "Parámetros de bloqueo",
    cuit: "",
    destinatario: "",
    cvu: "",
    cvuBalance: "",
  },
];

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
    ? ACTIVIDAD.filter(
        (a) =>
          (!legajo || a.legajo === legajo) &&
          (!desde || (parseFechaDMY(a.fecha) ?? 0) >= (parseFechaDMY(desde) ?? 0)) &&
          (!hasta || (parseFechaDMY(a.fecha) ?? 0) <= (parseFechaDMY(hasta) ?? 0)),
      )
    : [];

  const columns: Column<Actividad>[] = [
    {
      key: "legajo",
      label: "Legajo",
      filterable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.legajo}</span>,
    },
    { key: "email", label: "Email", filterable: true, render: (r) => r.email },
    {
      key: "fecha",
      label: "Fecha",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono tabular-nums">{r.fecha}</span>,
    },
    {
      key: "hora",
      label: "Hora",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.hora}</span>,
    },
    {
      key: "tipoTransaccion",
      label: "Tipo de transacción",
      filterable: true,
      render: (r) => r.tipoTransaccion,
    },
    {
      key: "monto",
      label: "Monto",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.monto}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      filterable: "enum",
      filterOptions: ["OK", "Error", "Pendiente"],
      render: (r) => (
        <Badge tone={r.estado === "OK" ? "success" : r.estado === "Pendiente" ? "warn" : "danger"}>
          {r.estado}
        </Badge>
      ),
    },
    { key: "nombre", label: "Nombre", filterable: true, render: (r) => r.nombre },
    { key: "destino", label: "Destino", filterable: true, render: (r) => r.destino },
    {
      key: "cuit",
      label: "CUIT",
      filterable: true,
      render: (r) => <span className="font-mono tabular-nums text-xs">{r.cuit || "—"}</span>,
    },
    {
      key: "destinatario",
      label: "Destinatario",
      filterable: true,
      render: (r) => r.destinatario || "—",
    },
    {
      key: "cvu",
      label: "CVU",
      filterable: true,
      render: (r) => <span className="font-mono text-xs tabular-nums">{r.cvu || "—"}</span>,
    },
    {
      key: "cvuBalance",
      label: "CVU de balance",
      filterable: true,
      render: (r) => <span className="font-mono text-xs tabular-nums">{r.cvuBalance || "—"}</span>,
    },
  ];

  const excelRows = filtrados.map((a) => ({
    Legajo: a.legajo,
    Email: a.email,
    Fecha: a.fecha,
    Hora: a.hora,
    "Tipo de transacción": a.tipoTransaccion,
    Monto: a.monto,
    Estado: a.estado,
    Nombre: a.nombre,
    Destino: a.destino,
    CUIT: a.cuit,
    Destinatario: a.destinatario,
    CVU: a.cvu,
    "CVU de balance": a.cvuBalance,
  }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Ingresá un Legajo y un rango de fechas para consultar la actividad del usuario.
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
          disabled={!legajo && !desde && !hasta}
          onClick={() => setConsultado(true)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Search size={14} /> Buscar
        </button>
      </div>
      {consultado && filtrados.length > 0 && (
        <div className="flex items-center gap-2">
          <BtnOutline
            onClick={() => downloadExcel(`actividad_${legajo || "todos"}.xlsx`, excelRows)}
          >
            <Download size={14} /> Descargar Excel
          </BtnOutline>
          <span className="text-sm text-muted-foreground">
            {filtrados.length} registros encontrados
          </span>
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
          keyExtractor={(r) => r.legajo + r.fecha + r.hora}
          pageSize={10}
        />
      ) : null}
    </div>
  );
}

/* ---------- Reportes de Impuestos (actual) ---------- */

type Impuesto = {
  periodo: string;
  tramo: string;
  creado: string;
  presentado: "Sí" | "No";
  pagado: "Sí" | "No";
};

function impuestosColumns(): Column<Impuesto>[] {
  return [
    {
      key: "periodo",
      label: "Periodo",
      filterable: true,
      sortable: true,
      render: (r) => r.periodo,
    },
    { key: "tramo", label: "Tramo", filterable: true, render: (r) => r.tramo },
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
        <Badge tone={r.presentado === "Sí" ? "success" : "warn"}>{r.presentado}</Badge>
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
}

const impuestosData: Impuesto[] = [
  { periodo: "2026-06", tramo: "1", creado: "2026-07-05", presentado: "Sí", pagado: "Sí" },
  { periodo: "2026-05", tramo: "2", creado: "2026-06-10", presentado: "Sí", pagado: "Sí" },
  { periodo: "2026-04", tramo: "1", creado: "2026-05-05", presentado: "Sí", pagado: "No" },
];

function ReportesImpuestos() {
  return (
    <DataTable
      columns={impuestosColumns()}
      data={impuestosData}
      keyExtractor={(r) => r.periodo + r.tramo}
      actions={() => (
        <div className="flex gap-1">
          <BtnOutline className="h-7 px-2" title="Ver detalle">
            <FileText size={14} />
          </BtnOutline>
          <BtnOutline className="h-7 px-2" title="Descargar TXT">
            <Download size={14} />
          </BtnOutline>
        </div>
      )}
    />
  );
}

/* ---------- Conciliaciones BLP (tramos) ---------- */

type TramoBLP = { tramo: string; archivos: number; monto: string };
function ConciliacionesBLP() {
  const data: TramoBLP[] = [
    { tramo: "Tramo 1", archivos: 12, monto: "$ 4.200.000" },
    { tramo: "Tramo 2", archivos: 8, monto: "$ 3.100.000" },
    { tramo: "Tramo 3", archivos: 5, monto: "$ 1.800.000" },
  ];
  const columns: Column<TramoBLP>[] = [
    { key: "tramo", label: "Tramo", filterable: true, render: (r) => r.tramo },
    { key: "archivos", label: "Archivos", filterable: true, render: (r) => r.archivos },
    {
      key: "monto",
      label: "Monto conciliado",
      render: (r) => <span className="font-mono tabular-nums">{r.monto}</span>,
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={data}
      keyExtractor={(r) => r.tramo}
      actions={() => (
        <button className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          <Download size={14} /> Descargar
        </button>
      )}
    />
  );
}

/* ---------- Reportes de Impuestos (Nuevo) ---------- */

function ReportesImpuestosNuevo() {
  const data: Impuesto[] = [
    { periodo: "2026-06", tramo: "1", creado: "2026-07-08", presentado: "Sí", pagado: "No" },
    { periodo: "2026-05", tramo: "3", creado: "2026-06-12", presentado: "Sí", pagado: "Sí" },
    { periodo: "2026-04", tramo: "2", creado: "2026-05-06", presentado: "No", pagado: "No" },
  ];
  return (
    <DataTable columns={impuestosColumns()} data={data} keyExtractor={(r) => r.periodo + r.tramo} />
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
  "impuestos-nuevo": ReportesImpuestosNuevo,
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
