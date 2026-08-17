import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Eye, PlayCircle, X, FileText, FileArchive, CheckCircle2, Circle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Badge, Input, Label, BtnPrimary, BtnOutline } from "@/components/portal-shell";
import { FormDialog } from "@/components/form-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { FileDropzone } from "@/components/file-dropzone";
import { KpiCard } from "@/components/kpi-card";
import {
  padronesIniciales,
  reportesIniciales,
  type Padron,
  type ReporteImpuesto,
} from "@/data/impuestos";

type PreviewKPIs = {
  usuariosAnalizados: number;
  impuestosActualizados: number;
  impuestosCreados: number;
  impuestosDesactivados: number;
  cargosAjustados: number;
  registrosOmitidos: number;
  errores: number;
  diferencias: string;
};

type ImpuestoCreado = { cuit: string; impuesto: string; tasa: string; usuario: string };
type ImpuestoDesactivado = {
  cuit: string;
  impuesto: string;
  tasa: string;
  usuario: string;
  motivo: string;
};
type Omitido = { cuit: string; motivo: string; usuario: string };

const kpisMock: PreviewKPIs = {
  usuariosAnalizados: 1240,
  impuestosActualizados: 58,
  impuestosCreados: 12,
  impuestosDesactivados: 3,
  cargosAjustados: 940,
  registrosOmitidos: 7,
  errores: 1,
  diferencias: "$ 12.450",
};

const creadosMock: ImpuestoCreado[] = [
  { cuit: "20-12345678-9", impuesto: "Ingresos Brutos", tasa: "4%", usuario: "jperez" },
  { cuit: "27-87654321-0", impuesto: "Ganancias", tasa: "35%", usuario: "cgomez" },
  { cuit: "23-11223344-5", impuesto: "Ingresos Brutos", tasa: "3.6%", usuario: "lcastro" },
];

const desactivadosMock: ImpuestoDesactivado[] = [
  {
    cuit: "30-99888777-6",
    impuesto: "Débito/Crédito (Sellos)",
    tasa: "0,6%",
    usuario: "comercio_x",
    motivo: "Cierre de actividad",
  },
  {
    cuit: "33-44556677-8",
    impuesto: "Ingresos Brutos",
    tasa: "4%",
    usuario: "comercio_y",
    motivo: "Exento definitivo",
  },
];

const omitidosMock: Omitido[] = [
  { cuit: "20-22223333-4", motivo: "CUIT inexistente", usuario: "usuario_a" },
  { cuit: "27-55556666-7", motivo: "Sin coincidencia de padrón", usuario: "usuario_b" },
  { cuit: "23-88889999-0", motivo: "Ya posee impuesto activo", usuario: "usuario_c" },
];

export const Route = createFileRoute("/admin/comercios/impuestos/ingresos-brutos/")({
  head: () => ({ meta: [{ title: "Ingresos Brutos — Admin — Moli" }] }),
  component: Page,
});

type PreviewTab = "creados" | "desactivados" | "omitidos";

const previewTabs: { key: PreviewTab; label: string }[] = [
  { key: "creados", label: "Impuestos creados" },
  { key: "desactivados", label: "Impuestos desactivados" },
  { key: "omitidos", label: "Impuestos omitidos" },
];

function PreviewModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const [tab, setTab] = useState<PreviewTab>("creados");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start z-10">
          <div>
            <h3 className="font-display font-semibold text-lg">
              Preview de normalización retroactiva
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Revisá el impacto esperado antes de aplicar los cambios definitivos.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Usuarios analizados" value={kpisMock.usuariosAnalizados} />
            <KpiCard label="Impuestos actualizados" value={kpisMock.impuestosActualizados} />
            <KpiCard label="Impuestos creados" value={kpisMock.impuestosCreados} />
            <KpiCard label="Desactivados" value={kpisMock.impuestosDesactivados} />
            <KpiCard label="Cargos ajustados" value={kpisMock.cargosAjustados} />
            <KpiCard label="Omitidos" value={kpisMock.registrosOmitidos} />
            <KpiCard label="Con error" value={kpisMock.errores} />
            <KpiCard label="Diferencia total" value={kpisMock.diferencias} />
          </div>

          <div>
            <div className="flex gap-1 border-b border-border mb-3">
              {previewTabs.map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {tab === "creados" && (
              <DataTable
                columns={columnsCreados}
                data={creadosMock}
                keyExtractor={(r) => r.cuit}
                pageSize={5}
              />
            )}
            {tab === "desactivados" && (
              <DataTable
                columns={columnsDesactivados}
                data={desactivadosMock}
                keyExtractor={(r) => r.cuit}
                pageSize={5}
              />
            )}
            {tab === "omitidos" && (
              <DataTable
                columns={columnsOmitidos}
                data={omitidosMock}
                keyExtractor={(r) => r.cuit}
                pageSize={5}
              />
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t px-6 py-4 flex justify-end gap-2">
          <BtnOutline type="button" onClick={onClose}>
            Cancelar
          </BtnOutline>
          <BtnPrimary type="button" onClick={onConfirm}>
            Confirmar y aplicar
          </BtnPrimary>
        </div>
      </div>
    </div>
  );
}

const columnsCreados: Column<ImpuestoCreado>[] = [
  {
    key: "cuit",
    label: "CUIT",
    render: (r) => <span className="font-mono tabular-nums text-xs">{r.cuit}</span>,
  },
  { key: "impuesto", label: "Impuesto", render: (r) => r.impuesto },
  {
    key: "tasa",
    label: "Tasa",
    render: (r) => <span className="font-mono tabular-nums">{r.tasa}</span>,
  },
  { key: "usuario", label: "Usuario", render: (r) => r.usuario },
];

const columnsDesactivados: Column<ImpuestoDesactivado>[] = [
  {
    key: "cuit",
    label: "CUIT",
    render: (r) => <span className="font-mono tabular-nums text-xs">{r.cuit}</span>,
  },
  { key: "impuesto", label: "Impuesto", render: (r) => r.impuesto },
  {
    key: "tasa",
    label: "Tasa",
    render: (r) => <span className="font-mono tabular-nums">{r.tasa}</span>,
  },
  { key: "usuario", label: "Usuario", render: (r) => r.usuario },
  { key: "motivo", label: "Motivo", render: (r) => r.motivo },
];

const columnsOmitidos: Column<Omitido>[] = [
  {
    key: "cuit",
    label: "CUIT",
    render: (r) => <span className="font-mono tabular-nums text-xs">{r.cuit}</span>,
  },
  { key: "motivo", label: "Motivo", render: (r) => r.motivo },
  { key: "usuario", label: "Usuario", render: (r) => r.usuario },
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

function reportText(r: ReporteImpuesto) {
  return [
    `Período: ${r.periodo}`,
    `Tramo: ${r.tramo}`,
    `Fecha de creación: ${r.fechaCreacion}`,
    `Presentado: ${r.presentado ? "Sí" : "No"}`,
    `Pagado: ${r.pagado ? "Sí" : "No"}`,
    `Total de movimientos: ${r.totalMovimientos}`,
    `Total de montos: $ ${r.totalMontos.toLocaleString()}`,
    `Total de retenciones: $ ${r.totalRetenciones.toLocaleString()}`,
  ].join("\n");
}

function ReportesTable() {
  const [data, setData] = useState<ReporteImpuesto[]>(reportesIniciales);
  const [detailId, setDetailId] = useState<number | null>(null);
  const detail = data.find((r) => r.id === detailId) ?? null;

  const marcar = (id: number, campo: "presentado" | "pagado") => {
    setData((prev) => prev.map((r) => (r.id === id ? { ...r, [campo]: true } : r)));
  };

  const getActions = (r: ReporteImpuesto): ActionItem[] => [
    { label: "Ver detalle", icon: Eye, onClick: () => setDetailId(r.id) },
    {
      label: "Descargar TXT",
      icon: FileText,
      onClick: () =>
        downloadFile(`reporte-${r.periodo}-${r.tramo.replace(/\s+/g, "-")}.txt`, reportText(r)),
    },
    {
      label: "Descargar ZIP",
      icon: FileArchive,
      onClick: () =>
        downloadFile(`reporte-${r.periodo}-${r.tramo.replace(/\s+/g, "-")}.zip`, reportText(r)),
    },
  ];

  const columns: Column<ReporteImpuesto>[] = [
    {
      key: "periodo",
      label: "Periodo",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.periodo}</span>,
    },
    { key: "tramo", label: "Tramo", sortable: true, filterable: true, render: (r) => r.tramo },
    {
      key: "fechaCreacion",
      label: "Fecha de creación",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono tabular-nums">{r.fechaCreacion}</span>,
    },
    {
      key: "presentado",
      label: "Presentado",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Sí", "No"],
      render: (r) =>
        r.presentado ? <Badge tone="success">Sí</Badge> : <Badge tone="neutral">No</Badge>,
    },
    {
      key: "pagado",
      label: "Pagado",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Sí", "No"],
      render: (r) =>
        r.pagado ? <Badge tone="success">Sí</Badge> : <Badge tone="neutral">No</Badge>,
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display font-semibold text-base">Reportes de Impuestos</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reportes de presentación de impuestos por período y tramo.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        pageSize={10}
        showDownloadButton={false}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />

      {detail && (
        <FormDialog
          open
          onClose={() => setDetailId(null)}
          title={`Reporte ${detail.periodo} — ${detail.tramo}`}
          description={`ID #${detail.id}`}
          onSubmit={() => setDetailId(null)}
          submitLabel="Cerrar"
        >
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <Field label="Período" value={detail.periodo} />
            <Field label="Tramo" value={detail.tramo} />
            <Field label="Fecha de creación" value={detail.fechaCreacion} />
            <Field label="Total de movimientos" value={String(detail.totalMovimientos)} />
            <Field label="Total de montos" value={`$ ${detail.totalMontos.toLocaleString()}`} />
            <Field
              label="Total de retenciones"
              value={`$ ${detail.totalRetenciones.toLocaleString()}`}
            />
            <div>
              <span className="text-xs text-muted-foreground">Presentado</span>
              <div className="font-medium">
                {detail.presentado ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 size={14} /> Sí
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Circle size={14} /> No
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Pagado</span>
              <div className="font-medium">
                {detail.pagado ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 size={14} /> Sí
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Circle size={14} /> No
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <BtnPrimary
              type="button"
              disabled={detail.presentado}
              onClick={() => marcar(detail.id, "presentado")}
            >
              Marcar como presentado
            </BtnPrimary>
            <BtnPrimary
              type="button"
              disabled={detail.pagado}
              onClick={() => marcar(detail.id, "pagado")}
            >
              Marcar como pagado
            </BtnPrimary>
          </div>
        </FormDialog>
      )}
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="font-medium font-mono tabular-nums">{value}</div>
    </div>
  );
}

function Page() {
  const [data, setData] = useState<Padron[]>(padronesIniciales);
  const [impuesto, setImpuesto] = useState("");
  const [nombre, setNombre] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [impuestos] = useState(["Ganancias", "Ingresos Brutos", "Débito/Crédito (Sellos)"]);
  const timers = useRef<Record<number, ReturnType<typeof setInterval>>>({});

  const [showPreview, setShowPreview] = useState(false);
  const [aplicado, setAplicado] = useState(false);

  useEffect(() => {
    const t = timers.current;
    return () => {
      Object.values(t).forEach((id) => clearInterval(id));
    };
  }, []);

  const cargar = () => {
    if (!impuesto || !nombre.trim() || !file) {
      setError("Completá impuesto, nombre del padrón y seleccioná un archivo.");
      return;
    }
    setError(null);
    const id = Math.max(0, ...data.map((d) => d.id)) + 1;
    setData((prev) => [
      ...prev,
      {
        id,
        impuesto,
        nombre: nombre.trim(),
        archivo: file.name,
        estado: "Procesando",
        progreso: 0,
      },
    ]);
    timers.current[id] = setInterval(() => {
      setData((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const prog = p.progreso + 20;
          if (prog >= 100) {
            clearInterval(timers.current[id]);
            delete timers.current[id];
            return { ...p, progreso: 100, estado: "Finalizado" };
          }
          return { ...p, progreso: prog };
        }),
      );
    }, 350);
    setImpuesto("");
    setNombre("");
    setFile(null);
  };

  return (
    <>
      <PageHeader
        title="Ingresos Brutos"
        description="Gestión de padrones y normalización retroactiva de asignaciones de impuestos."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <section className="bg-card border rounded-lg overflow-hidden">
          <header className="px-5 py-4 border-b">
            <h3 className="font-display font-semibold text-base">Gestión de Padrones</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Cargá un padrón para un impuesto determinado y seguí el estado de procesamiento en
              tiempo real.
            </p>
          </header>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Impuesto</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  value={impuesto}
                  onChange={(e) => setImpuesto(e.target.value)}
                >
                  <option value="">Seleccionar…</option>
                  {impuestos.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Nombre del padrón</Label>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Padrón CABA Q3"
                />
              </div>
            </div>
            <div>
              <Label>Archivo</Label>
              <FileDropzone onFile={setFile} accept=".xlsx,.xls,.csv" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end">
              <BtnPrimary onClick={cargar}>Cargar padrón</BtnPrimary>
            </div>
          </div>
        </section>

        <section className="bg-card border rounded-lg p-5 space-y-4">
          <div>
            <h3 className="font-display font-semibold text-base">Normalización retroactiva</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Revisión histórica de las asignaciones de impuestos. Generá un preview y revisá el
              impacto antes de aplicar los cambios definitivos.
            </p>
          </div>

          {aplicado && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-sm text-emerald-800 dark:text-emerald-300">
              La normalización fue aplicada correctamente.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <BtnOutline onClick={() => setShowPreview(true)}>
              <Eye size={16} /> Ver preview
            </BtnOutline>
            <BtnPrimary onClick={() => setShowPreview(true)}>
              <PlayCircle size={16} /> Aplicar
            </BtnPrimary>
          </div>
        </section>
      </div>

      <section className="bg-card border rounded-lg p-5">
        <ReportesTable />
      </section>

      {showPreview && (
        <PreviewModal
          onClose={() => setShowPreview(false)}
          onConfirm={() => {
            setAplicado(true);
            setShowPreview(false);
          }}
        />
      )}
    </>
  );
}
