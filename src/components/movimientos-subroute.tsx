import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useCallback } from "react";
import { Eye, FilterX, AlertTriangle, Inbox, ShieldAlert, Info, ArrowDownToLine } from "lucide-react";
import { DataTable, type Column, type TableServerFilters } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { MovimientoDetail, estadoBadge, type Movimiento } from "@/components/movimiento-detail";
import { FormDialog } from "@/components/form-dialog";
import { Label, Input, BtnPrimary } from "@/components/portal-shell";
import { LegajoCell, LEGAJO_TOOLTIP } from "@/components/legajo-label";
import { PermissionGuard } from "@/components/permission-guard";
import { PageHeader } from "@/components/page-header";
import { useMovimientos } from "@/hooks/useMovimientos";
import { listMovimientos } from "@/lib/api/movimientos";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCambiarEstadoMovimiento } from "@/hooks/useMovimientoActions";
import { useEstadosMovimiento, useEstadosPorTipo } from "@/hooks/useEstados";
import { calcularDesglose, fmtARS } from "@/lib/aranceles";
import { DataAccessError } from "@/lib/api/errors";
import {
  ESTADOS_MOVIMIENTO,
  type EstadoMovimiento,
  type Movimiento as MovimientoDB,
} from "@/lib/api/types";
import { resolverEstadoMovimiento } from "@/lib/estados";
import { useCan } from "@/lib/permissions";
import { useQuery } from "@tanstack/react-query";
import { listBanderasByComercioIds } from "@/lib/api/comercio-banderas";
import { getLotePaywaySnapshotForMovimientos } from "@/lib/api/lotes";
import { listAllCvus } from "@/lib/api/subcuentas";
import { simularDeposito } from "@/lib/api/payin";
import { toast } from "sonner";

const PAGE_SIZE = 25;

const TIPO_LABEL: Record<string, string> = {
  deposito: "Depósito",
  retiro: "Retiro",
  transferencia: "Transferencia",
  tarjeta: "Pago con tarjeta",
  pago_pct: "Pago PCT",
  cobro_pct: "Cobro PCT",
};

function fmtFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toViewMovimiento(m: MovimientoDB, catalogo: EstadoMovimiento[]): Movimiento {
  const pctImpuesto = m.comision > 0 ? (m.impuesto / m.comision) * 100 : 0;
  const estado = resolverEstadoMovimiento(m, catalogo).codigo;
  return {
    clienteId: m.clienteId,
    legajo: m.legajo,
    id: m.idTxn,
    tipo: m.tipo,
    cvu: m.cvu ?? "",
    usuario: m.cliente?.correo ?? "—",
    nombreOrigen: m.cliente?.nombre ?? "—",
    nombreDestino: m.destinatarioNombre ?? (m.tipo === "transferencia" ? "—" : "MoliPay"),
    cuit: m.destinatarioCuit ?? m.cliente?.cuit ?? "—",
    bancoDestino: m.destinatarioBanco ?? undefined,
    monto: fmtARS(m.montoOperacion),
    fecha: fmtFecha(m.fecha),
    estado,
    desglose: calcularDesglose(m.comision, pctImpuesto),
  };
}

/** Fila de vista = movimiento + montos reales almacenados, para las columnas de cada vista. */
export type FilaSubRuta = Movimiento & {
  _comision: number;
  _iva: number;
  _cobrado: number;
  _montoOperacion: number;
  _impuesto: number;
  _comercioId: string | null;
  _bandera: string | null;
  _dbId: string;
  importes: string;
};

/** Fila de la grilla a partir del movimiento de la base (con los montos reales). */
export function toFilaSubRuta(m: MovimientoDB, catalogo: EstadoMovimiento[]): FilaSubRuta {
  return {
    ...toViewMovimiento(m, catalogo),
    _comision: m.comision,
    _iva: m.impuesto,
    _cobrado: m.montoCobrado,
    _montoOperacion: m.montoOperacion,
    _impuesto: m.impuesto,
    _comercioId: m.comercioId ?? null,
    _bandera: m.bandera ?? null,
    _dbId: m.id,
    importes: "",
  };
}

/**
 * Grilla de movimientos compartida por las sub-rutas de Movimientos.
 * - Con `tipoCode` fija el tipo server-side (no editable en UI) y acota los
 *   estados del filtro y del cambio de estado a los válidos para ese tipo
 *   (estados_por_tipo × catálogo).
 * - `soloConImpuesto`: vista transversal de retenciones al cliente
 *   (columna impuesto > 0), todos los tipos.
 * - `soloConComision`: vista transversal de comisiones cobradas
 *   (columna comision > 0), todos los tipos.
 */
export function MovimientosSubRoute({
  titulo,
  descripcion,
  tipoCode,
  tipos,
  soloConImpuesto = false,
  soloConComision = false,
  demoDeposito = false,
}: {
  titulo: string;
  descripcion: string;
  tipoCode?: string;
  /**
   * Tipos a listar cuando son varios (ej. Retiros incluye `transferencia`, porque
   * una transferencia saliente es un egreso aunque en la base figure asi).
   */
  tipos?: string[];
  soloConImpuesto?: boolean;
  soloConComision?: boolean;
  /** [DEMO] Muestra el botón para simular un deposito entrante (pay-in). */
  demoDeposito?: boolean;
}) {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);

  // Filtros de la card del DataTable: van server-side contra toda la base.
  const [filtrosPanel, setFiltrosPanel] = useState<TableServerFilters>({
    global: "",
    enums: {},
    dates: {},
  });
  const search = useDebouncedValue(filtrosPanel.global.trim(), 350);

  const aplicarFiltros = (f: TableServerFilters) => {
    setPage(0);
    setFiltrosPanel(f);
  };

  const filtros = useMemo(() => {
    const rango = filtrosPanel.dates.fecha;
    return {
      page,
      pageSize: PAGE_SIZE,
      tipo: tipoCode,
      tipos: tipos?.length ? tipos : undefined,
      conImpuesto: soloConImpuesto || undefined,
      conComision: soloConComision || undefined,
      countMode: "estimated" as const,
      search: search || undefined,
      estadoCodigo: filtrosPanel.enums.estado || undefined,
      fechaDesde: rango?.from ? `${rango.from}T00:00:00.000` : undefined,
      fechaHasta: rango?.to ? `${rango.to}T23:59:59.999` : undefined,
    };
  }, [page, tipoCode, tipos, soloConImpuesto, soloConComision, search, filtrosPanel.enums, filtrosPanel.dates]);

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch, isEstimated } =
    useMovimientos(filtros);

  const { data: catalogoEstados = [] } = useEstadosMovimiento();
  const { data: estadosDelTipoIds = [] } = useEstadosPorTipo(tipoCode);

  // Estados válidos para el tipo fijo (join client-side estados_por_tipo × catálogo).
  const estadosValidos: EstadoMovimiento[] = useMemo(() => {
    if (!tipoCode) return [];
    const ids = new Set(estadosDelTipoIds.map((p) => p.estadoId));
    return catalogoEstados.filter((e) => ids.has(e.id));
  }, [tipoCode, catalogoEstados, estadosDelTipoIds]);

  const [detail, setDetail] = useState<Movimiento | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [estadoTarget, setEstadoTarget] = useState<{
    dbId: string;
    estadoActual: string;
    nuevoId: number;
  } | null>(null);
  const cambiarEstado = useCambiarEstadoMovimiento();

  const { can } = useCan();
  const puedeModificar = can("modificar", "movimientos");

  // Destinos del modal de cambio de estado: con tipo fijo solo estados válidos
  // del tipo; vista transversal (todos los tipos): catálogo completo (la RPC
  // valida igual contra estados_por_tipo server-side).
  const destinosEstado = tipoCode ? estadosValidos : catalogoEstados;

  const byTxn = new Map(rows.map((r) => [r.idTxn, r]));
  const data: FilaSubRuta[] = rows.map((m) => toFilaSubRuta(m, catalogoEstados));

  /**
   * Trae TODAS las filas del filtro actual (no solo la página) para las
   * exportaciones. Tope de 5.000 filas para no colgar el navegador.
   */
  const fetchAllRows = useCallback(async (): Promise<FilaSubRuta[]> => {
    const TAMANO = 500;
    const TOPE = 5000;
    const acumulado: MovimientoDB[] = [];
    for (let p = 0; acumulado.length < TOPE; p++) {
      const res = await listMovimientos({ ...filtros, page: p, pageSize: TAMANO });
      acumulado.push(...res.rows);
      if (res.rows.length < TAMANO || acumulado.length >= res.total) break;
    }
    return acumulado.slice(0, TOPE).map((m) => toFilaSubRuta(m, catalogoEstados));
  }, [filtros, catalogoEstados]);

  // PASO 2: Comisión Payway solo para tarjeta — cruce comercio_banderas + snapshot lote
  const isTarjeta = tipoCode === 'tarjeta';
  const comercioIds = useMemo(() => [...new Set(data.map((d) => d._comercioId).filter(Boolean) as string[])], [data]);
  const movimientoIds = useMemo(() => data.map((d) => d._dbId), [data]);
  const { data: banderasPayway } = useQuery({
    queryKey: ["banderas-payway", comercioIds],
    queryFn: () => listBanderasByComercioIds(comercioIds),
    enabled: isTarjeta && comercioIds.length > 0,
  });
  const banderasLookup = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of banderasPayway ?? []) m.set(`${b.comercioId}::${b.bandera}`, b.comisionPayway);
    return m;
  }, [banderasPayway]);
  const { data: loteSnapshotMap } = useQuery({
    queryKey: ["lote-snapshot-payway", movimientoIds],
    queryFn: () => getLotePaywaySnapshotForMovimientos(movimientoIds),
    enabled: isTarjeta && movimientoIds.length > 0,
  });

  const getActions = (row: Movimiento): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setDetail(row) },
    {
      label: "Cambiar estado",
      icon: ShieldAlert,
      disabled: !puedeModificar,
      onClick: () => {
        const db = byTxn.get(row.id);
        if (db)
          setEstadoTarget({
            dbId: db.id,
            estadoActual: row.estado,
            nuevoId: db.estadoId,
          });
      },
    },
    {
      label: "Ver movimientos del cliente",
      icon: FilterX,
      onClick: () => navigate({ to: "/admin/general/movimientos", search: { legajo: row.legajo } }),
    },
  ];

  const err = error instanceof DataAccessError ? error : null;
  const totalPaginas = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE));

  const allColumns = useMemo(() => {
    if (!isTarjeta) return columns;
    const paywayCol: Column<FilaSubRuta> = {
      key: "payway",
      label: "Comisión Payway",
      render: (r) => {
        const snapshot = loteSnapshotMap?.get(r._dbId);
        let pct: number;
        let monto: number;
        if (snapshot) {
          pct = snapshot.pct;
          monto = r._montoOperacion * pct / 100;
        } else {
          const key = `${r._comercioId}::${r._bandera}`;
          pct = banderasLookup.get(key) ?? 0;
          monto = r._montoOperacion * pct / 100;
        }
        if (!r._bandera || !r._comercioId) return <span className="font-mono tabular-nums text-muted-foreground">—</span>;
        return <span className="font-mono tabular-nums">{fmtARS(monto)} <span className="text-muted-foreground">({pct.toFixed(2)}%)</span></span>;
      },
    };
    const idx = columns.findIndex((c) => c.key === "importes");
    if (idx === -1) return [...columns, paywayCol];
    const next = [...columns];
    next.splice(idx + 1, 0, paywayCol);
    return next;
  }, [isTarjeta, banderasLookup, loteSnapshotMap]);

  const visibles = allColumns.filter(
    (c) =>
      (tipoCode || c.key !== "tipo") &&
      (isTarjeta || c.key !== "payway"),
  );

  return (
    <PermissionGuard recurso="movimientos">
      <PageHeader
        title={titulo}
        description={descripcion}
        action={
          demoDeposito ? (
            <BtnPrimary type="button" onClick={() => setDemoOpen(true)}>
              <ArrowDownToLine size={16} />
              Simular depósito entrante
            </BtnPrimary>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando…
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
          <AlertTriangle size={28} />
          <div>
            <p className="font-semibold">
              {err?.permission
                ? "No tenés permiso para ver esto"
                : "Ocurrió un error al cargar los movimientos"}
            </p>
            <p className="mt-1">{err?.message ?? "Error desconocido"}</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Reintentar
          </button>
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          <Inbox size={28} />
          <p>No hay movimientos que coincidan con los filtros aplicados.</p>
        </div>
      ) : (
        <>
          <DataTable
            columns={visibles}
            data={data}
            keyExtractor={(r) => r.id}
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
            hidePagination
            serverFilterState={filtrosPanel}
            onServerFilterChange={aplicarFiltros}
            serverResultCount={total}
            fetchAllRows={fetchAllRows}
            exportFileName={`movimientos-${titulo
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")}`}
          />
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span title={isEstimated ? "Conteo estimado" : undefined}>
              {total === 0 || total ? `${isEstimated ? `~${total}` : total} movimiento(s) · ` : ""}página {page + 1} de{" "}
              {totalPaginas}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 0 || isFetching}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="inline-flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page + 1 >= totalPaginas || isFetching}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}

      {detail && <MovimientoDetail m={detail} onClose={() => setDetail(null)} />}

      {estadoTarget && (
        <FormDialog
          open
          onClose={() => setEstadoTarget(null)}
          title="Cambiar estado del movimiento"
          description={`Transición atómica registrada en el historial (origen = manual). Estado actual: ${estadoTarget.estadoActual}.`}
          onSubmit={async () => {
            await cambiarEstado.mutateAsync({
              movimientoId: estadoTarget.dbId,
              nuevoEstadoId: estadoTarget.nuevoId,
              observaciones: "Cambio manual desde backoffice",
            });
            setEstadoTarget(null);
          }}
          submitLabel={cambiarEstado.isPending ? "Guardando…" : "Confirmar cambio"}
          size="md"
        >
          {cambiarEstado.isError && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{(cambiarEstado.error as Error).message}</span>
            </div>
          )}
          <div>
            <Label htmlFor="nuevo-estado-sub">Nuevo estado</Label>
            <select
              id="nuevo-estado-sub"
              className="w-full h-10 px-3 rounded-md border border-input bg-card text-sm"
              value={estadoTarget.nuevoId}
              onChange={(e) =>
                setEstadoTarget((s) => (s ? { ...s, nuevoId: Number(e.target.value) } : s))
              }
            >
              {destinosEstado.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.codigo} — {s.nombre}
                </option>
              ))}
            </select>
          </div>
        </FormDialog>
      )}

      {demoDeposito && demoOpen && (
        <SimularDepositoDialog
          onClose={() => setDemoOpen(false)}
          onAcreditado={() => refetch()}
        />
      )}
    </PermissionGuard>
  );
}

/**
 * [DEMO] Simula la notificacion que manda Banco de Comercio cuando entra plata a
 * un CVU: se elige la cuenta, el importe y quien transfiere, y el backend procesa
 * el deposito por el MISMO camino que el webhook real.
 */
function SimularDepositoDialog({
  onClose,
  onAcreditado,
}: {
  onClose: () => void;
  onAcreditado: () => void;
}) {
  const [cbu, setCbu] = useState("");
  const [importe, setImporte] = useState("");
  const [titular, setTitular] = useState("");
  const [saving, setSaving] = useState(false);

  // Cuentas disponibles para recibir (se deduplican: en sandbox el banco repite el CVU).
  const { data: cvus, isLoading: loadingCvus } = useQuery({
    queryKey: ["cvus-para-simular"],
    queryFn: () => listAllCvus({ page: 0, pageSize: 200 }),
  });

  const cuentas = useMemo(() => {
    const vistas = new Map<string, { cbu: string; label: string }>();
    for (const c of cvus?.rows ?? []) {
      if (!c.cbu || vistas.has(c.cbu)) continue;
      const nombre = `${c.nombre ?? ""} ${c.apellido ?? ""}`.trim() || c.email;
      vistas.set(c.cbu, { cbu: c.cbu, label: `${nombre} · ${c.legajo}` });
    }
    return [...vistas.values()];
  }, [cvus]);

  const monto = Number(importe.replace(",", "."));
  const valido = Boolean(cbu) && Number.isFinite(monto) && monto > 0;

  const simular = async () => {
    if (!valido) return;
    setSaving(true);
    try {
      const r = await simularDeposito({ cbu, importe: monto, titular: titular.trim() || undefined });
      if (r.acreditado && !r.ya_registrado) {
        toast.success(
          `Depósito acreditado: $ ${(r.saldo_nuevo ?? monto).toLocaleString("es-AR", { minimumFractionDigits: 2 })} de saldo`,
        );
      } else {
        toast.info(r.motivo ?? "El depósito ya estaba registrado (no se acreditó de nuevo).");
      }
      onAcreditado();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo simular el depósito");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title="Simular depósito entrante (demo)"
      description="Hace de cuenta que el banco avisó que entró plata a un CVU. Se procesa igual que el webhook real."
      onSubmit={simular}
      submitLabel={saving ? "Acreditando…" : "Simular depósito"}
      isSubmitting={saving}
    >
      <div>
        <Label>CVU / cuenta que recibe</Label>
        <select
          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
          value={cbu}
          onChange={(e) => setCbu(e.target.value)}
        >
          <option value="">{loadingCvus ? "Cargando cuentas…" : "Elegí una cuenta…"}</option>
          {cuentas.map((c) => (
            <option key={c.cbu} value={c.cbu}>
              {c.label} — {c.cbu}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label>Importe que transfirieron</Label>
        <Input
          value={importe}
          onChange={(e) => setImporte(e.target.value)}
          inputMode="decimal"
          placeholder="5000"
        />
      </div>

      <div>
        <Label>Quién transfiere (opcional)</Label>
        <Input
          value={titular}
          onChange={(e) => setTitular(e.target.value)}
          placeholder="MARIA GOMEZ"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        El depósito aparece al instante en esta lista y en el historial del cliente, con el saldo
        actualizado.
      </p>
    </FormDialog>
  );
}

const columns: Column<FilaSubRuta>[] = [
  {
    key: "legajo",
    label: "Legajo",
    hint: LEGAJO_TOOLTIP,
    filterable: true,
    minWidth: 100,
    render: (r) => <LegajoCell legajo={r.legajo} />,
  },
  {
    key: "id",
    label: "ID",
    filterable: true,
    minWidth: 120,
    maxWidth: 200,
    render: (r) => <span className="font-mono tabular-nums">{r.id}</span>,
  },
  {
    key: "tipo",
    label: "Tipo de movimiento",
    filterable: false,
    minWidth: 140,
    exportValue: (r) => TIPO_LABEL[r.tipo] ?? r.tipo,
    render: (r) => TIPO_LABEL[r.tipo] ?? r.tipo,
  },
  { key: "usuario", label: "Usuario", filterable: true, minWidth: 180, maxWidth: 280, render: (r) => r.usuario },
  {
    key: "nombreOrigen",
    label: "Nombre empresa/persona",
    filterable: true,
    minWidth: 200,
    maxWidth: 320,
    render: (r) => r.nombreOrigen,
  },
  {
    key: "cuit",
    label: "CUIT",
    filterable: true,
    minWidth: 120,
    render: (r) => <span className="font-mono tabular-nums">{r.cuit}</span>,
  },
  {
    key: "importes",
    label: "Importes",
    minWidth: 200,
    exportValue: (r) =>
      "Operación: " + fmtARS(r._montoOperacion) +
      " | Comisión: " + fmtARS(r._comision) +
      " | IVA: " + fmtARS(r._impuesto),
    render: (r) => {
      const pctComision = r._montoOperacion > 0 ? (r._comision / r._montoOperacion) * 100 : 0;
      const pctIva = r._comision > 0 ? (r._impuesto / r._comision) * 100 : 0;
      return (
        <div className="space-y-0.5 font-mono text-xs tabular-nums">
          <div><span className="font-sans text-muted-foreground">Operación: </span>{fmtARS(r._montoOperacion)}</div>
          <div><span className="font-sans text-muted-foreground">Comisión: </span>{fmtARS(r._comision)} <span className="text-muted-foreground">({pctComision.toFixed(2)}%)</span></div>
          <div><span className="font-sans text-muted-foreground">IVA: </span>{fmtARS(r._impuesto)} <span className="text-muted-foreground">({pctIva.toFixed(2)}%)</span></div>
        </div>
      );
    },
  },
  {
    key: "fecha",
    label: "Fecha",
    filterable: "date",
    minWidth: 160,
    render: (r) => <span className="font-mono tabular-nums">{r.fecha}</span>,
  },
  {
    key: "estado",
    label: "Estado",
    filterable: "enum",
    filterOptions: [...ESTADOS_MOVIMIENTO],
    minWidth: 120,
    render: (row) => estadoBadge(row.estado),
  },
];

export function ImpuestosBanner() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-muted bg-muted/30 px-4 py-3 text-sm text-muted-foreground mb-4">
      <Info size={16} className="shrink-0 mt-0.5" />
      <p>
        Vista transversal: muestra la columna <strong>impuesto</strong> (retención impositiva al
        cliente) de movimientos de <strong>todos los tipos</strong>. La tabla no tiene desglose por
        tipo/nombre de impuesto; el IVA sobre la comisión se ve en el detalle de cada movimiento.
      </p>
    </div>
  );
}
