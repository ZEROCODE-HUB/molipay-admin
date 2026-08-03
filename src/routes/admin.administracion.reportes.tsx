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
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, Badge, BtnOutline, Input, Label } from "@/components/portal-shell";
import { DataTable, type Column } from "@/components/data-table";

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

/* ---------- Conciliaciones Bancarias ---------- */

type Archivo = { archivo: string; fecha: string; estado: "Analizado" | "Pendiente" };

function Conciliaciones() {
  const archivos: Archivo[] = [
    { archivo: "conciliacion_20260716.csv", fecha: "2026-07-16", estado: "Pendiente" },
    { archivo: "conciliacion_20260715.csv", fecha: "2026-07-15", estado: "Analizado" },
    { archivo: "conciliacion_20260714.csv", fecha: "2026-07-14", estado: "Analizado" },
    { archivo: "conciliacion_20260713.csv", fecha: "2026-07-13", estado: "Analizado" },
  ];
  const columns: Column<Archivo>[] = [
    {
      key: "archivo",
      label: "Archivo",
      filterable: true,
      render: (r) => <span className="font-mono text-xs">{r.archivo}</span>,
    },
    { key: "fecha", label: "Fecha", filterable: "date", render: (r) => r.fecha },
    {
      key: "analizar",
      label: "Analizar",
      render: (r) =>
        r.estado === "Analizado" ? (
          <Badge tone="success">Analizado</Badge>
        ) : (
          <BtnOutline className="h-7 text-xs px-3">Analizar</BtnOutline>
        ),
    },
  ];
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        El banco sube diariamente (día anterior) todas las transacciones.
      </p>
      <DataTable columns={columns} data={archivos} keyExtractor={(r) => r.archivo} />
    </div>
  );
}

/* ---------- Reportes BCRA ---------- */

function ReportesBCRA() {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Card className="p-5">
        <h4 className="font-semibold text-sm">SISCEN — Régimen informativo mensual</h4>
        <p className="text-xs text-muted-foreground mt-1">Presentado el 15/07/2026</p>
        <div className="mt-2">
          <Badge tone="success">Presentado</Badge>
        </div>
      </Card>
      <Card className="p-5">
        <h4 className="font-semibold text-sm">Régimen de transparencia</h4>
        <p className="text-xs text-muted-foreground mt-1">Tasas activas y pasivas — Julio 2026</p>
        <div className="mt-2">
          <Badge tone="warn">Pendiente</Badge>
        </div>
      </Card>
      <Card className="p-5">
        <h4 className="font-semibold text-sm">Información de clientes</h4>
        <p className="text-xs text-muted-foreground mt-1">Base consolidada al 30/06/2026</p>
        <div className="mt-2">
          <BtnOutline className="h-7 text-xs px-3">Exportar TXT</BtnOutline>
        </div>
      </Card>
    </div>
  );
}

/* ---------- Reportes AFIP ---------- */

function ReportesAFIP() {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Card className="p-5">
        <h4 className="font-semibold text-sm">RG 3685 — Régimen de información de operaciones</h4>
        <p className="text-xs text-muted-foreground mt-1">
          Período Junio 2026 — Generado el 10/07/2026
        </p>
        <div className="mt-2">
          <BtnOutline className="h-7 text-xs px-3">Descargar TXT</BtnOutline>
        </div>
      </Card>
      <Card className="p-5">
        <h4 className="font-semibold text-sm">RG 5450 — Información de beneficiarios finales</h4>
        <p className="text-xs text-muted-foreground mt-1">Vencimiento: 31/08/2026</p>
        <div className="mt-2">
          <Badge tone="warn">En preparación</Badge>
        </div>
      </Card>
      <Card className="p-5">
        <h4 className="font-semibold text-sm">RG 4613 — Impuesto al cheque</h4>
        <p className="text-xs text-muted-foreground mt-1">Base imponible mensual — Julio 2026</p>
        <div className="mt-2">
          <BtnOutline className="h-7 text-xs px-3">Calcular</BtnOutline>
        </div>
      </Card>
    </div>
  );
}

/* ---------- Reportes de Comisiones ---------- */

type Comision = {
  periodo: string;
  tipo: string;
  cantidad: number;
  monto: string;
  comision: string;
};
function ReportesComisiones() {
  const data: Comision[] = [
    {
      periodo: "2026-06",
      tipo: "Depósitos",
      cantidad: 1245,
      monto: "$ 12.450.000",
      comision: "$ 186.750",
    },
    {
      periodo: "2026-06",
      tipo: "Retiros",
      cantidad: 892,
      monto: "$ 8.920.000",
      comision: "$ 133.800",
    },
    {
      periodo: "2026-06",
      tipo: "Transferencias",
      cantidad: 3456,
      monto: "$ 34.560.000",
      comision: "$ 518.400",
    },
    {
      periodo: "2026-05",
      tipo: "Depósitos",
      cantidad: 1187,
      monto: "$ 11.870.000",
      comision: "$ 178.050",
    },
  ];
  const columns: Column<Comision>[] = [
    {
      key: "periodo",
      label: "Período",
      filterable: true,
      sortable: true,
      render: (r) => r.periodo,
    },
    { key: "tipo", label: "Tipo", filterable: true, render: (r) => r.tipo },
    {
      key: "cantidad",
      label: "Cantidad",
      filterable: true,
      render: (r) => r.cantidad.toLocaleString(),
    },
    { key: "monto", label: "Monto cobrado", render: (r) => r.monto },
    { key: "comision", label: "Comisión", render: (r) => r.comision },
  ];
  return <DataTable columns={columns} data={data} keyExtractor={(r) => r.periodo + r.tipo} />;
}

/* ---------- Reportes de Movimientos (CUIT) ---------- */

function ReportesMovimientos() {
  const [cuit, setCuit] = useState("");
  const [cargado, setCargado] = useState(false);
  const valido = /^\d{11}$/.test(cuit);
  return (
    <div className="space-y-4 max-w-xl">
      <p className="text-sm text-muted-foreground">
        Ingresá un CUIT (11 dígitos) para exportar los movimientos de personas físicas y jurídicas
        fuera de la plataforma.
      </p>
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <Label htmlFor="cuit">CUIT</Label>
          <Input
            id="cuit"
            value={cuit}
            onChange={(e) => {
              setCuit(e.target.value.replace(/\D/g, "").slice(0, 11));
              setCargado(false);
            }}
            placeholder="Ej: 20123456789"
          />
        </div>
        <button
          disabled={!valido}
          onClick={() => setCargado(true)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Search size={14} /> Buscar y descargar
        </button>
      </div>
      {cuit.length > 0 && !valido && (
        <p className="text-xs text-amber-600">El CUIT debe tener 11 dígitos numéricos.</p>
      )}
      {cargado && (
        <div className="flex items-center gap-2 text-sm text-emerald-600">
          <Download size={14} /> Reporte generado: movimientos_{cuit}.csv
        </div>
      )}
    </div>
  );
}

/* ---------- Actividad de Usuarios ---------- */

type Actividad = { legajo: string; usuario: string; accion: string; ip: string; fecha: string };
function ActividadUsuarios() {
  const data: Actividad[] = [
    {
      legajo: "ADM-001",
      usuario: "M. Rodríguez",
      accion: "Aprobó bloqueo BL-001",
      ip: "192.168.1.45",
      fecha: "15/07/2026 14:32",
    },
    {
      legajo: "ADM-002",
      usuario: "L. Fernández",
      accion: "Editó parámetros de alertas",
      ip: "192.168.1.23",
      fecha: "15/07/2026 11:15",
    },
    {
      legajo: "ADM-003",
      usuario: "P. Sánchez",
      accion: "Descargó reporte BCRA",
      ip: "190.210.33.12",
      fecha: "14/07/2026 16:48",
    },
    {
      legajo: "ADM-001",
      usuario: "M. Rodríguez",
      accion: "Creó usuario backoffice",
      ip: "192.168.1.45",
      fecha: "14/07/2026 09:00",
    },
  ];
  const columns: Column<Actividad>[] = [
    { key: "legajo", label: "Legajo", filterable: true, render: (r) => r.legajo },
    { key: "usuario", label: "Usuario", filterable: true, render: (r) => r.usuario },
    { key: "accion", label: "Acción", filterable: true, render: (r) => r.accion },
    { key: "ip", label: "IP", render: (r) => r.ip },
    { key: "fecha", label: "Fecha", filterable: "date", render: (r) => r.fecha },
  ];
  return <DataTable columns={columns} data={data} keyExtractor={(r) => r.legajo + r.fecha} />;
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
    { key: "creado", label: "Fecha de creación", filterable: "date", render: (r) => r.creado },
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
      render: (r) => <span className="font-mono">{r.monto}</span>,
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
