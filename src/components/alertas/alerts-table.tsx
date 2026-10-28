import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, CheckCircle, XCircle, FileWarning, ShieldCheck, ArrowRightLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type Column, type TableServerFilters } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { Badge, BtnOutline } from "@/components/portal-shell";
import { Pagination } from "@/components/pagination";
import { LegajoCell } from "@/components/legajo-label";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { descargarCsv } from "@/lib/api/alert-rules";
import { AlertaGestionPanel, useAnalysts } from "./alerta-gestion-panel";
import {
  ALERT_RESOLUTION_LABEL,
  ALERT_STATUS_LABEL,
  acceptAlert,
  listAlerts,
  listAllAlerts,
  resolveAlert,
  type AlertFilters,
  type AlertItem,
  type AlertResolution,
  type AlertStatus,
} from "@/lib/api/compliance";

/** Clave de cache compartida: quien cree alertas (simulador, barrido) la invalida. */
export const ALERTS_QUERY_KEY = ["alerts"] as const;

const PAGE_SIZES = [10, 20, 50];
const STATUS_OPTIONS = Object.values(ALERT_STATUS_LABEL);
const STATUS_BY_LABEL = new Map(Object.entries(ALERT_STATUS_LABEL).map(([k, v]) => [v, k as AlertStatus]));
const STATUS_TONE: Record<AlertStatus, "warn" | "neutral" | "success" | "danger"> = {
  pending: "warn",
  in_review: "neutral",
  resolved: "success",
  dismissed: "neutral",
};

const fmtFecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtDia = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
const diasRestantes = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
const SIN_ASIGNAR = "Sin asignar";
const fmtMonto = (n: number | null) =>
  n == null ? "—" : `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Dictamen = { alert: AlertItem; resolution: AlertResolution };

/**
 * Listado y gestión de alertas (aceptar, asignar, comentar, cerrar).
 * Con `legajo` muestra solo las de ese cliente y oculta sus columnas (ficha).
 */
export function AlertsTable({ legajo }: { legajo?: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const enFicha = Boolean(legajo);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(enFicha ? 10 : 20);
  const [panel, setPanel] = useState<TableServerFilters>({ global: "", enums: {}, dates: {} });
  const search = useDebouncedValue(panel.global.trim(), 350);
  const analistas = useAnalysts();
  const analistaPorNombre = useMemo(() => new Map((analistas.data ?? []).map((a) => [a.nombre, a.id])), [analistas.data]);

  const filtros: AlertFilters = useMemo(() => {
    const activo = panel.enums.activo;
    const vencida = panel.enums.vencimiento;
    const analista = panel.enums.analista;
    return {
      legajo,
      search: search || undefined,
      status: panel.enums.estado ? STATUS_BY_LABEL.get(panel.enums.estado) : undefined,
      active: activo === "Sí" ? true : activo === "No" ? false : undefined,
      createdFrom: panel.dates.createdAt?.from || undefined,
      createdTo: panel.dates.createdAt?.to || undefined,
      acceptedFrom: panel.dates.acceptedAt?.from || undefined,
      acceptedTo: panel.dates.acceptedAt?.to || undefined,
      overdue: vencida === "Vencida" ? true : vencida === "En plazo" ? false : undefined,
      assignedTo: analista === SIN_ASIGNAR ? "none" : analista ? analistaPorNombre.get(analista) : undefined,
    };
  }, [legajo, search, panel.enums, panel.dates, analistaPorNombre]);

  const lista = useQuery({
    queryKey: [...ALERTS_QUERY_KEY, filtros, page, pageSize],
    queryFn: () => listAlerts({ ...filtros, page, pageSize }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
  const rows = lista.data?.rows ?? [];
  const total = lista.data?.total ?? 0;

  const [detalle, setDetalle] = useState<AlertItem | null>(null);
  const [dictamen, setDictamen] = useState<Dictamen | null>(null);
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY });
  // El detalle sigue a la fila refrescada (asignaciones, contadores).
  const detalleVivo = detalle ? rows.find((r) => r.id === detalle.id) ?? detalle : null;

  const aceptar = async (a: AlertItem) => {
    try {
      await acceptAlert(a.id);
      toast.success("Alerta aceptada: queda en revisión");
      await refrescar();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const confirmarDictamen = async () => {
    if (!dictamen) return;
    if (notas.trim().length < 5) {
      toast.error("Escribí el dictamen (al menos 5 caracteres)");
      return;
    }
    setEnviando(true);
    try {
      await resolveAlert(dictamen.alert.id, dictamen.resolution, notas.trim());
      toast.success(`Alerta cerrada: ${ALERT_RESOLUTION_LABEL[dictamen.resolution]}`);
      setDictamen(null);
      setNotas("");
      setDetalle(null);
      await refrescar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const exportar = async () => {
    try {
      const todas = await listAllAlerts(filtros);
      descargarCsv(
        `alertas-${legajo ? `${legajo}-` : ""}${new Date().toISOString().slice(0, 10)}.csv`,
        [
          "Legajo", "Correo", "Nombre", "Tipo", "Motivo", "Estado", "Activo", "Analista responsable", "Fecha de alerta",
          "Fecha de aceptación", "Vencimiento", "Vencida", "Fecha de cierre", "Cerrada por", "Resultado", "Dictamen",
          "Comentarios", "Adjuntos", "TXID",
        ],
        todas.map((a) => [
          a.legajo, a.correo, a.nombre, a.type, a.description, ALERT_STATUS_LABEL[a.status], a.isActive ? "Sí" : "No",
          a.assignedToName ?? "", a.createdAt, a.acceptedAt ?? "", a.dueAt, a.isOverdue ? "Sí" : "No", a.resolvedAt ?? "",
          a.resolvedByName ?? "", a.resolution ? ALERT_RESOLUTION_LABEL[a.resolution] : "", a.resolutionNotes ?? "",
          a.commentsCount, a.attachmentsCount, a.idTxn ?? "",
        ]),
      );
    } catch (e) {
      toast.error(`No se pudo exportar: ${(e as Error).message}`);
    }
  };

  const abrirDictamen = (alert: AlertItem, resolution: AlertResolution) => {
    setNotas("");
    setDictamen({ alert, resolution });
  };

  const verOperacion = (idTxn: string) => navigate({ to: "/admin/general/movimientos", search: { txid: idTxn } });

  const getActions = (a: AlertItem): ActionItem[] => {
    const abierta = a.status === "pending" || a.status === "in_review";
    return [
      { label: "Ver detalle y gestión", icon: Eye, onClick: () => setDetalle(a) },
      ...(a.status === "pending" ? [{ label: "Aceptar (iniciar revisión)", icon: CheckCircle, onClick: () => void aceptar(a) }] : []),
      ...(abierta
        ? [
            { label: "Resolver: operación justificada", icon: ShieldCheck, onClick: () => abrirDictamen(a, "justified") },
            { label: "Registrar ROS", icon: FileWarning, variant: "danger" as const, onClick: () => abrirDictamen(a, "ros") },
            { label: "Descartar: falso positivo", icon: XCircle, onClick: () => abrirDictamen(a, "false_positive") },
          ]
        : []),
      ...(a.idTxn ? [{ label: "Ver operación", icon: ArrowRightLeft, onClick: () => verOperacion(a.idTxn!) }] : []),
    ];
  };

  const columnasCliente: Column<AlertItem>[] = enFicha
    ? []
    : [
        { key: "legajo", label: "Legajo", minWidth: 130, render: (r) => <LegajoCell legajo={r.legajo} /> },
        { key: "correo", label: "Correo", minWidth: 180, maxWidth: 260, render: (r) => r.correo },
        { key: "nombre", label: "Nombre", minWidth: 160, maxWidth: 240, render: (r) => r.nombre },
      ];

  const columns: Column<AlertItem>[] = [
    ...columnasCliente,
    { key: "type", label: "Tipo de alerta", minWidth: 200, maxWidth: 280, tooltip: (r) => r.description, render: (r) => r.type },
    {
      key: "estado",
      label: "Estado",
      filterable: "enum",
      filterOptions: STATUS_OPTIONS,
      minWidth: 120,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <Badge tone={STATUS_TONE[r.status]}>{ALERT_STATUS_LABEL[r.status]}</Badge>
          {r.resolution && <span className="text-[11px] text-muted-foreground">{ALERT_RESOLUTION_LABEL[r.resolution]}</span>}
        </div>
      ),
    },
    {
      key: "activo",
      label: "Activo",
      filterable: "enum",
      filterOptions: ["Sí", "No"],
      minWidth: 80,
      render: (r) => <Badge tone={r.isActive ? "warn" : "neutral"}>{r.isActive ? "Sí" : "No"}</Badge>,
    },
    {
      key: "analista",
      label: "Analista",
      filterable: "enum",
      filterOptions: [SIN_ASIGNAR, ...(analistas.data ?? []).map((a) => a.nombre)],
      minWidth: 140,
      render: (r) => r.assignedToName ?? <span className="text-muted-foreground">{SIN_ASIGNAR}</span>,
    },
    { key: "createdAt", label: "Fecha de alerta", filterable: "date", minWidth: 150, render: (r) => <span className="font-mono tabular-nums text-xs">{fmtFecha(r.createdAt)}</span> },
    {
      key: "vencimiento",
      label: "Vencimiento",
      filterable: "enum",
      filterOptions: ["Vencida", "En plazo"],
      minWidth: 130,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono tabular-nums text-xs">{fmtDia(r.dueAt)}</span>
          {r.isOverdue ? (
            <Badge tone="danger">Vencida</Badge>
          ) : r.isActive && diasRestantes(r.dueAt) <= 15 ? (
            <span className="text-[11px] font-medium text-amber-700">Vence en {diasRestantes(r.dueAt)} día(s)</span>
          ) : null}
        </div>
      ),
    },
    { key: "acceptedAt", label: "Fecha de aceptación", filterable: "date", minWidth: 150, render: (r) => <span className="font-mono tabular-nums text-xs">{fmtFecha(r.acceptedAt)}</span> },
    { key: "resolvedAt", label: "Fecha de cierre", minWidth: 150, render: (r) => <span className="font-mono tabular-nums text-xs">{fmtFecha(r.resolvedAt)}</span> },
  ];

  return (
    <>
      {lista.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center text-sm text-red-700">
          <AlertTriangle size={24} />
          <p>No se pudieron cargar las alertas: {(lista.error as Error).message}</p>
          <button type="button" onClick={() => lista.refetch()} className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={rows}
            keyExtractor={(r) => r.id}
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
            loading={lista.isLoading}
            hidePagination
            serverFilterState={panel}
            onServerFilterChange={(f) => {
              setPage(0);
              setPanel(f);
            }}
            serverResultCount={total}
            onDownloadCSV={() => void exportar()}
            emptyMessage={enFicha ? "El cliente no tiene alertas que coincidan con los filtros." : "No hay alertas que coincidan con los filtros."}
          />
          <Pagination
            page={page + 1}
            totalPages={Math.max(1, Math.ceil(total / pageSize))}
            pageSize={pageSize}
            total={total}
            countLabel="alerta(s)"
            pageSizes={PAGE_SIZES}
            disabled={lista.isFetching}
            onPageChange={(p) => setPage(p - 1)}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(0);
            }}
          />
        </>
      )}

      {detalleVivo && (
        <FormDialog
          open
          onClose={() => setDetalle(null)}
          title="Detalle de alerta"
          description={detalleVivo.type}
          onSubmit={() => setDetalle(null)}
          submitLabel="Cerrar"
          size="lg"
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Campo label="Legajo" value={detalleVivo.legajo} mono />
            <Campo label="Cliente" value={`${detalleVivo.nombre} · ${detalleVivo.correo}`} />
            <Campo label="Estado" value={ALERT_STATUS_LABEL[detalleVivo.status]} />
            <Campo label="Regla" value={detalleVivo.ruleCode ?? "—"} mono />
            <Campo label="Fecha de alerta" value={fmtFecha(detalleVivo.createdAt)} />
            <Campo label="Vencimiento (90 días corridos)" value={`${fmtDia(detalleVivo.dueAt)}${detalleVivo.isOverdue ? " · VENCIDA" : ""}`} />
            <Campo label="Analista responsable" value={detalleVivo.assignedToName ?? SIN_ASIGNAR} />
            <Campo label="Ficha" value={`${detalleVivo.actividad ?? "Sin actividad"} · ${detalleVivo.provincia ?? "Sin provincia"}`} />
            <Campo label="Aceptada" value={detalleVivo.acceptedAt ? `${fmtFecha(detalleVivo.acceptedAt)} · ${detalleVivo.acceptedByName ?? "—"}` : "—"} />
            <Campo label="Cerrada" value={detalleVivo.resolvedAt ? `${fmtFecha(detalleVivo.resolvedAt)} · ${detalleVivo.resolvedByName ?? "—"}` : "—"} />
            {detalleVivo.resolution && <Campo label="Resultado final" value={ALERT_RESOLUTION_LABEL[detalleVivo.resolution]} />}
            {detalleVivo.resolutionNotes && <Campo label="Dictamen" value={detalleVivo.resolutionNotes} full />}
            <Campo label="Motivo" value={detalleVivo.description} full />
            {detalleVivo.idTxn && (
              <>
                <Campo label="Operación (TXID)" value={detalleVivo.idTxn} mono />
                <Campo label="Monto / tipo" value={`${fmtMonto(detalleVivo.montoOperacion)} · ${detalleVivo.tipoOperacion ?? "—"}`} />
              </>
            )}
            {detalleVivo.plaftMatchId != null && <Campo label="Coincidencia PLAFT" value={`#${detalleVivo.plaftMatchId}`} mono />}
            {Object.keys(detalleVivo.details).length > 0 && (
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground mb-1">Datos del evento</div>
                <pre className="rounded-md bg-muted/50 p-3 text-xs overflow-x-auto">{JSON.stringify(detalleVivo.details, null, 2)}</pre>
              </div>
            )}
          </div>
          {detalleVivo.isActive && (
            <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
              {detalleVivo.status === "pending" && (
                <BtnOutline onClick={() => void aceptar(detalleVivo)}><CheckCircle size={14} /> Aceptar</BtnOutline>
              )}
              <BtnOutline onClick={() => abrirDictamen(detalleVivo, "justified")}><ShieldCheck size={14} /> Justificada</BtnOutline>
              <BtnOutline onClick={() => abrirDictamen(detalleVivo, "ros")}><FileWarning size={14} /> ROS</BtnOutline>
              <BtnOutline onClick={() => abrirDictamen(detalleVivo, "false_positive")}><XCircle size={14} /> Falso positivo</BtnOutline>
            </div>
          )}
          <AlertaGestionPanel key={detalleVivo.id} alert={detalleVivo} onChanged={() => void refrescar()} />
        </FormDialog>
      )}

      {dictamen && (
        <FormDialog
          open
          onClose={() => setDictamen(null)}
          title={ALERT_RESOLUTION_LABEL[dictamen.resolution]}
          description={`${dictamen.alert.type} · ${dictamen.alert.legajo}`}
          onSubmit={() => void confirmarDictamen()}
          submitLabel={enviando ? "Guardando…" : "Confirmar resolución"}
        >
          {dictamen.resolution === "ros" && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              Registra que la operatoria no tiene justificación económica ni legal y corresponde un Reporte de Operación Sospechosa ante la UIF.
            </div>
          )}
          {dictamen.resolution === "false_positive" && dictamen.alert.plaftMatchId != null && (
            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Esta coincidencia REPET queda descartada y no vuelve a generar alertas. Otras coincidencias del cliente sí.
            </div>
          )}
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Dictamen del analista</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Fundamento de la resolución, documentación revisada…"
            className="w-full h-28 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
          />
          <p className="text-[11px] text-muted-foreground mt-1">Cerrar la alerta no desbloquea la cuenta: los bloqueos se liberan desde el listado de bloqueos.</p>
        </FormDialog>
      )}
    </>
  );
}

function Campo({ label, value, mono, full }: { label: string; value: string; mono?: boolean; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : undefined}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-medium break-words ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  );
}
