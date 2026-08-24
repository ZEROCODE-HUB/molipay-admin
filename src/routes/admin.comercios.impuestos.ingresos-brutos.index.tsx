import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, PlayCircle, X, Trash2, AlertTriangle, Inbox } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Badge, Input, Label, BtnPrimary, BtnOutline } from "@/components/portal-shell";
import { FormDialog } from "@/components/form-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { FileDropzone } from "@/components/file-dropzone";
import { KpiCard } from "@/components/kpi-card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import { useIbPadrones, useImpuestosForAsignacion } from "@/hooks/useImpuestos";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  createIbPadron,
  deleteIbPadron,
  createIbNormalizacionPreview,
  setNormalizacionAplicado,
} from "@/lib/api/impuestos";
import { DataAccessError } from "@/lib/api/errors";
import type { IbPadron, IbNormalizacionPreview } from "@/lib/api/types";
import { reportesIniciales, type ReporteImpuesto } from "@/data/impuestos";

export const Route = createFileRoute("/admin/comercios/impuestos/ingresos-brutos/")({
  head: () => ({ meta: [{ title: "Ingresos Brutos — Admin — Moli" }] }),
  component: Page,
});

const PAGE_SIZE = 10;

function estadoTone(estado: IbPadron["estado"]): "success" | "neutral" | "warn" | "danger" {
  if (estado === "Finalizado") return "success";
  if (estado === "Error") return "danger";
  if (estado === "Procesando") return "warn";
  return "neutral";
}

function MensajeEstado({
  tipo,
  mensaje,
  onRetry,
}: {
  tipo: "error" | "vacio" | "permiso";
  mensaje: string;
  onRetry?: () => void;
}) {
  if (tipo === "permiso") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-6 py-12 text-center text-sm text-amber-800">
        <AlertTriangle size={28} />
        <div>
          <p className="font-semibold">No tenés permiso para ver esto</p>
          <p className="mt-1">{mensaje}</p>
        </div>
      </div>
    );
  }
  if (tipo === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
        <AlertTriangle size={28} />
        <div>
          <p className="font-semibold">Ocurrió un error al cargar los padrónes</p>
          <p className="mt-1">{mensaje}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Reintentar
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
      <Inbox size={28} />
      <p>No hay padrónes cargados todavía.</p>
    </div>
  );
}

// --- Preview de normalización --------------------------------------------------

type PreviewKPIs = {
  usuariosAnalizados?: number;
  impuestosActualizados?: number;
  impuestosCreados?: number;
  impuestosDesactivados?: number;
  cargosAjustados?: number;
  registrosOmitidos?: number;
  errores?: number;
  diferencias?: string;
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

type PreviewTab = "creados" | "desactivados" | "omitidos";

const previewTabs: { key: PreviewTab; label: string }[] = [
  { key: "creados", label: "Impuestos creados" },
  { key: "desactivados", label: "Impuestos desactivados" },
  { key: "omitidos", label: "Impuestos omitidos" },
];

function PreviewModal({
  preview,
  allowApply,
  onClose,
  onApply,
}: {
  preview: IbNormalizacionPreview;
  allowApply: boolean;
  onClose: () => void;
  onApply: () => void;
}) {
  const [tab, setTab] = useState<PreviewTab>("creados");
  const kpis = (preview.kpisJson ?? {}) as PreviewKPIs;
  const creados = (preview.creadosJson ?? []) as ImpuestoCreado[];
  const desactivados = (preview.desactivadosJson ?? []) as ImpuestoDesactivado[];
  const omitidos = (preview.omitidosJson ?? []) as Omitido[];

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
              {preview.aplicado && (
                <span className="ml-2 inline-flex">
                  <Badge tone="success">Ya aplicado</Badge>
                </span>
              )}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Usuarios analizados" value={kpis.usuariosAnalizados ?? 0} />
            <KpiCard label="Impuestos actualizados" value={kpis.impuestosActualizados ?? 0} />
            <KpiCard label="Impuestos creados" value={kpis.impuestosCreados ?? 0} />
            <KpiCard label="Desactivados" value={kpis.impuestosDesactivados ?? 0} />
            <KpiCard label="Cargos ajustados" value={kpis.cargosAjustados ?? 0} />
            <KpiCard label="Omitidos" value={kpis.registrosOmitidos ?? 0} />
            <KpiCard label="Con error" value={kpis.errores ?? 0} />
            <KpiCard label="Diferencia total" value={kpis.diferencias ?? "$ 0"} />
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
                data={creados}
                keyExtractor={(r) => `${r.cuit}-${r.impuesto}-${r.tasa}`}
                pageSize={5}
                showDownloadButton={false}
              />
            )}
            {tab === "desactivados" && (
              <DataTable
                columns={columnsDesactivados}
                data={desactivados}
                keyExtractor={(r) => `${r.cuit}-${r.motivo}`}
                pageSize={5}
                showDownloadButton={false}
              />
            )}
            {tab === "omitidos" && (
              <DataTable
                columns={columnsOmitidos}
                data={omitidos}
                keyExtractor={(r) => `${r.cuit}-${r.motivo}`}
                pageSize={5}
                showDownloadButton={false}
              />
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t px-6 py-4 flex justify-end gap-2">
          <BtnOutline type="button" onClick={onClose}>
            {allowApply ? "Cancelar" : "Cerrar"}
          </BtnOutline>
          {allowApply && !preview.aplicado && (
            <BtnPrimary type="button" onClick={onApply}>
              Confirmar y aplicar
            </BtnPrimary>
          )}
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

// --- Reportes (queda en mock: fuera de alcance del módulo real) -----------------

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

function ReportesMock() {
  const [detail, setDetail] = useState<ReporteImpuesto | null>(null);

  const getActions = (r: ReporteImpuesto): ActionItem[] => [
    { label: "Ver detalle", icon: Eye, onClick: () => setDetail(r) },
    {
      label: "Descargar TXT",
      icon: Eye,
      onClick: () =>
        downloadFile(`reporte-${r.periodo}-${r.tramo.replace(/\s+/g, "-")}.txt`, reportText(r)),
    },
  ];

  const columns: Column<ReporteImpuesto>[] = [
    {
      key: "periodo",
      label: "Periodo",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.periodo}</span>,
    },
    { key: "tramo", label: "Tramo", sortable: true, render: (r) => r.tramo },
    {
      key: "fechaCreacion",
      label: "Fecha de creación",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.fechaCreacion}</span>,
    },
    {
      key: "presentado",
      label: "Presentado",
      sortable: true,
      render: (r) =>
        r.presentado ? <Badge tone="success">Sí</Badge> : <Badge tone="neutral">No</Badge>,
    },
    {
      key: "pagado",
      label: "Pagado",
      sortable: true,
      render: (r) =>
        r.pagado ? <Badge tone="success">Sí</Badge> : <Badge tone="neutral">No</Badge>,
    },
  ];

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-display font-semibold text-base">Reportes de Impuestos</h3>
        <Badge tone="neutral">Demo</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-4 -mt-2">
        Sección de demostración: los reportes se conectarán con el módulo Administración → Reportes.
      </p>
      <DataTable
        columns={columns}
        data={reportesIniciales}
        keyExtractor={(r) => String(r.id)}
        pageSize={5}
        showDownloadButton={false}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />

      {detail && (
        <FormDialog
          open
          onClose={() => setDetail(null)}
          title={`Reporte ${detail.periodo} — ${detail.tramo}`}
          description={`ID #${detail.id}`}
          onSubmit={() => setDetail(null)}
          submitLabel="Cerrar"
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Período</span>
              <div className="font-medium font-mono tabular-nums">{detail.periodo}</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Tramo</span>
              <div className="font-medium font-mono tabular-nums">{detail.tramo}</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Fecha de creación</span>
              <div className="font-medium font-mono tabular-nums">{detail.fechaCreacion}</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Total de movimientos</span>
              <div className="font-medium font-mono tabular-nums">{detail.totalMovimientos}</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Total de montos</span>
              <div className="font-medium font-mono tabular-nums">
                $ {detail.totalMontos.toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Total de retenciones</span>
              <div className="font-medium font-mono tabular-nums">
                $ {detail.totalRetenciones.toLocaleString()}
              </div>
            </div>
          </div>
        </FormDialog>
      )}
    </>
  );
}

// --- Página --------------------------------------------------------------------

function Page() {
  const queryClient = useQueryClient();
  const [page] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);
  const [estadoFilter, setEstadoFilter] = useState<IbPadron["estado"] | "">("");

  const { can } = useCan();
  const puedeCrear = can("crear", "impuestos");
  const puedeBorrar = can("borrar", "impuestos");

  // Alta de padrón
  const [impuestoId, setImpuestoId] = useState("");
  const [nombre, setNombre] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Normalización
  const [previewModal, setPreviewModal] = useState<{
    preview: IbNormalizacionPreview;
    allowApply: boolean;
  } | null>(null);
  const [confirmAplicar, setConfirmAplicar] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const { rows: impuestosDisponibles } = useImpuestosForAsignacion();

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } = useIbPadrones({
    page,
    pageSize: PAGE_SIZE,
    search,
    estado: estadoFilter || undefined,
  });

  const err = error instanceof DataAccessError ? error : null;

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["ib_padrones"] });

  const cargarPadron = async () => {
    if (!impuestoId || !nombre.trim() || !file) {
      setFormError("Completá impuesto, nombre del padrón y seleccioná un archivo.");
      return;
    }
    setFormError(null);
    try {
      await createIbPadron({
        impuesto_id: impuestoId,
        nombre: nombre.trim(),
        archivo: file.name,
      });
      invalidar();
      setImpuestoId("");
      setNombre("");
      setFile(null);
    } catch (e) {
      setFormError((e as Error).message);
    }
  };

  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<IbPadron | null>(null);

  const eliminarPadronConfirmado = async () => {
    if (!confirmDeleteTarget) return;
    try {
      await deleteIbPadron(confirmDeleteTarget.id);
      invalidar();
    } catch (e) {
      setConfirmAction({
        title: "No se pudo eliminar",
        message: (e as Error).message,
        onConfirm: () => setConfirmAction(null),
      });
    }
    setConfirmDeleteTarget(null);
  };

  // Garantiza que exista un preview sin aplicar para el último padrón finalizado.
  const abrirPreview = async (conAplicar: boolean) => {
    const ultimoFinalizado = rows.find((p) => p.estado === "Finalizado");
    if (!ultimoFinalizado) {
      setConfirmAction({
        title: "Sin padrón procesado",
        message: "Necesitás al menos un padrón en estado Finalizado para normalizar.",
        onConfirm: () => setConfirmAction(null),
      });
      return;
    }
    try {
      const preview = await createIbNormalizacionPreview({
        padron_id: ultimoFinalizado.id,
        kpis_json: {},
        creados_json: [],
        desactivados_json: [],
        omitidos_json: [],
      });
      setPreviewModal({ preview, allowApply: conAplicar });
    } catch (e) {
      setConfirmAction({
        title: "No se pudo generar el preview",
        message: (e as Error).message,
        onConfirm: () => setConfirmAction(null),
      });
    }
  };

  const aplicarNormalizacion = async () => {
    if (!previewModal) return;
    try {
      const actualizado = await setNormalizacionAplicado(previewModal.preview.id, true);
      setPreviewModal({ preview: actualizado, allowApply: false });
      queryClient.invalidateQueries({ queryKey: ["ib_normalizacion_preview"] });
    } catch (e) {
      setConfirmAction({
        title: "No se pudo aplicar",
        message: (e as Error).message,
        onConfirm: () => setConfirmAction(null),
      });
    }
    setConfirmAplicar(false);
  };

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const columns: Column<IbPadron>[] = [
    {
      key: "nombre",
      label: "Nombre",
      sortable: true,
      render: (r) => <span className="font-medium">{r.nombre}</span>,
    },
    {
      key: "archivo",
      label: "Archivo",
      render: (r) => <span className="font-mono text-xs">{r.archivo}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      render: (r) => <Badge tone={estadoTone(r.estado)}>{r.estado}</Badge>,
    },
    {
      key: "progreso",
      label: "Progreso",
      render: (r) => (
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${r.progreso}%` }} />
          </div>
          <span className="text-xs font-mono tabular-nums text-muted-foreground w-9 text-right">
            {r.progreso}%
          </span>
        </div>
      ),
    },
  ];

  return (
    <PermissionGuard recurso="impuestos">
      <PageHeader
        title="Ingresos Brutos"
        description="Gestión de padrones y normalización retroactiva de asignaciones de impuestos."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <section className="bg-card border rounded-lg overflow-hidden">
          <header className="px-5 py-4 border-b">
            <h3 className="font-display font-semibold text-base">Gestión de Padrones</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Cargá un padrón para un impuesto determinado y seguí el estado de procesamiento.
            </p>
          </header>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ib-impuesto">Impuesto</Label>
                <select
                  id="ib-impuesto"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  value={impuestoId}
                  onChange={(e) => setImpuestoId(e.target.value)}
                  disabled={!puedeCrear}
                >
                  <option value="">Seleccionar…</option>
                  {impuestosDisponibles.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.codigo} — {i.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="ib-nombre">Nombre del padrón</Label>
                <Input
                  id="ib-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Padrón CABA Q3"
                  disabled={!puedeCrear}
                />
              </div>
            </div>
            <div>
              <Label>Archivo</Label>
              <FileDropzone onFile={setFile} accept=".xlsx,.xls,.csv" />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="flex justify-end">
              <BtnPrimary onClick={cargarPadron} disabled={!puedeCrear}>
                Cargar padrón
              </BtnPrimary>
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

          <div className="flex flex-wrap gap-2">
            <BtnOutline onClick={() => abrirPreview(false)}>
              <Eye size={16} /> Ver preview
            </BtnOutline>
            <BtnPrimary onClick={() => abrirPreview(true)} disabled={!puedeCrear}>
              <PlayCircle size={16} /> Aplicar
            </BtnPrimary>
          </div>
          <p className="text-xs text-muted-foreground">
            "Ver preview" solo muestra el impacto estimado; ningún cambio se aplica hasta que
            confirmes desde la acción "Aplicar".
          </p>
        </section>
      </div>

      <section className="bg-card border rounded-lg p-5 space-y-4">
        <div>
          <h3 className="font-display font-semibold text-base">Padrones cargados</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Historial de padrónes procesados.</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="buscar-padron">Buscar</Label>
            <Input
              id="buscar-padron"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Nombre o archivo…"
            />
          </div>
          <div>
            <Label htmlFor="f-estado-padron">Estado</Label>
            <select
              id="f-estado-padron"
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value as IbPadron["estado"] | "")}
            >
              <option value="">Todos</option>
              <option value="Cargando">Cargando</option>
              <option value="Procesando">Procesando</option>
              <option value="Finalizado">Finalizado</option>
              <option value="Error">Error</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
            <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
            Cargando padrónes…
          </div>
        ) : isError ? (
          <MensajeEstado
            tipo={err?.permission ? "permiso" : "error"}
            mensaje={err?.message ?? "Error desconocido"}
            onRetry={() => refetch()}
          />
        ) : isEmpty ? (
          <MensajeEstado tipo="vacio" mensaje="" />
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            keyExtractor={(r) => r.id}
            pageSize={PAGE_SIZE}
            showDownloadButton={false}
            actions={(r) => (
              <ActionsDropdown
                actions={[
                  {
                    label: "Eliminar",
                    icon: Trash2,
                    variant: "danger" as const,
                    disabled: !puedeBorrar,
                    onClick: () => setConfirmDeleteTarget(r),
                  },
                ]}
              />
            )}
          />
        )}
        {!isLoading && !isError && totalPaginas > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {total} padrón(es) · página {page + 1} de {totalPaginas}
            </span>
          </div>
        )}
        {isFetching && !isLoading && <p className="text-xs text-muted-foreground">Actualizando…</p>}
      </section>

      <section className="bg-card border rounded-lg p-5">
        <ReportesMock />
      </section>

      {previewModal && (
        <PreviewModal
          preview={previewModal.preview}
          allowApply={previewModal.allowApply}
          onClose={() => setPreviewModal(null)}
          onApply={() => setConfirmAplicar(true)}
        />
      )}

      <ConfirmDialog
        open={confirmAplicar}
        onClose={() => setConfirmAplicar(false)}
        title="Aplicar normalización"
        message="¿Confirmás la aplicación de la normalización retroactiva? Los cambios serán definitivos."
        confirmLabel="Confirmar y aplicar"
        variant="default"
        onConfirm={aplicarNormalizacion}
      />

      <ConfirmDialog
        open={!!confirmDeleteTarget}
        onClose={() => setConfirmDeleteTarget(null)}
        title="Eliminar padrón"
        message={`¿Eliminar el padrón "${confirmDeleteTarget?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={eliminarPadronConfirmado}
      />

      {confirmAction && (
        <ConfirmDialog
          open={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel="Cerrar"
          variant="danger"
          onConfirm={confirmAction.onConfirm}
        />
      )}
    </PermissionGuard>
  );
}
