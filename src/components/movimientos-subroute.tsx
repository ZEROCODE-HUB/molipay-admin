import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, FilterX, AlertTriangle, Inbox, ShieldAlert, Info } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { MovimientoDetail, estadoBadge, type Movimiento } from "@/components/movimiento-detail";
import { FormDialog } from "@/components/form-dialog";
import { Input, Label } from "@/components/portal-shell";
import { LegajoCell, LEGAJO_TOOLTIP } from "@/components/legajo-label";
import { PermissionGuard } from "@/components/permission-guard";
import { PageHeader } from "@/components/page-header";
import { useMovimientos } from "@/hooks/useMovimientos";
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

const PAGE_SIZE = 25;

const TIPO_LABEL: Record<string, string> = {
  deposito: "Depósito",
  retiro: "Retiro",
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
    nombreDestino: "MoliPay",
    cuit: m.cliente?.cuit ?? "—",
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
};

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
  soloConImpuesto = false,
  soloConComision = false,
}: {
  titulo: string;
  descripcion: string;
  tipoCode?: string;
  soloConImpuesto?: boolean;
  soloConComision?: boolean;
}) {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);
  const [estadoCodigo, setEstadoCodigo] = useState("");

  const filtros = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      estadoCodigo: estadoCodigo || undefined,
      tipo: tipoCode,
      conImpuesto: soloConImpuesto || undefined,
      conComision: soloConComision || undefined,
      countMode: "estimated" as const,
    }),
    [page, search, estadoCodigo, tipoCode, soloConImpuesto, soloConComision],
  );

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } =
    useMovimientos(filtros);

  const { data: catalogoEstados = [] } = useEstadosMovimiento();
  const { data: estadosDelTipoIds = [] } = useEstadosPorTipo(tipoCode);

  // Estados válidos para el tipo fijo (join client-side estados_por_tipo × catálogo).
  const estadosValidos: EstadoMovimiento[] = useMemo(() => {
    if (!tipoCode) return [];
    const ids = new Set(estadosDelTipoIds.map((p) => p.estadoId));
    return catalogoEstados.filter((e) => ids.has(e.id));
  }, [tipoCode, catalogoEstados, estadosDelTipoIds]);

  const opcionesEstado: { code: string; label: string }[] = tipoCode
    ? estadosValidos.map((e) => ({ code: e.codigo, label: `${e.codigo} — ${e.nombre}` }))
    : ESTADOS_MOVIMIENTO.map((s) => ({ code: s, label: s }));

  const [detail, setDetail] = useState<Movimiento | null>(null);
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
  const data: FilaSubRuta[] = rows.map((m) => ({
    ...toViewMovimiento(m, catalogoEstados),
    _comision: m.comision,
    _iva: m.impuesto,
    _cobrado: m.montoCobrado,
  }));

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

  const visibles = columns.filter(
    (c) =>
      (tipoCode || c.key !== "tipo") &&
      (soloConImpuesto || c.key !== "retencion") &&
      (soloConComision || !["comision", "iva", "cobrado"].includes(c.key)),
  );

  return (
    <PermissionGuard recurso="movimientos">
      <PageHeader title={titulo} description={descripcion} />

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex-1 min-w-[220px]">
          <Label htmlFor="buscar-sub">Buscar</Label>
          <Input
            id="buscar-sub"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(0);
            }}
            placeholder="ID, legajo, correo o nombre…"
          />
        </div>
        <div>
          <Label htmlFor="f-estado-sub">Estado</Label>
          <select
            id="f-estado-sub"
            className="w-full h-10 px-3 rounded-md border border-input bg-card text-sm"
            value={estadoCodigo}
            onChange={(e) => {
              setEstadoCodigo(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            {opcionesEstado.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

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
            showGlobalFilter={false}
          />
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>
              {total === 0 || total ? `${total} movimiento(s) · ` : ""}página {page + 1} de{" "}
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
    </PermissionGuard>
  );
}

const columns: Column<FilaSubRuta>[] = [
  {
    key: "legajo",
    label: "Legajo",
    hint: LEGAJO_TOOLTIP,
    filterable: true,
    render: (r) => <LegajoCell legajo={r.legajo} />,
  },
  {
    key: "id",
    label: "ID",
    filterable: true,
    render: (r) => <span className="font-mono tabular-nums">{r.id}</span>,
  },
  {
    key: "tipo",
    label: "Tipo de movimiento",
    filterable: false,
    render: (r) => TIPO_LABEL[r.tipo] ?? r.tipo,
  },
  { key: "usuario", label: "Usuario", filterable: true, render: (r) => r.usuario },
  {
    key: "nombreOrigen",
    label: "Nombre empresa/persona",
    filterable: true,
    render: (r) => r.nombreOrigen,
  },
  {
    key: "cuit",
    label: "CUIT",
    filterable: true,
    render: (r) => <span className="font-mono tabular-nums">{r.cuit}</span>,
  },
  {
    key: "monto",
    label: "Monto operación",
    render: (r) => <span className="font-mono tabular-nums">{r.monto}</span>,
  },
  {
    key: "retencion",
    label: "Retención impuesto",
    render: (r) => <span className="font-mono tabular-nums">{fmtARS(r._iva)}</span>,
  },
  {
    key: "comision",
    label: "Comisión cobrada",
    render: (r) => <span className="font-mono tabular-nums">{fmtARS(r._comision)}</span>,
  },
  {
    key: "iva",
    label: "IVA sobre comisión",
    render: (r) => <span className="font-mono tabular-nums">{fmtARS(r._iva)}</span>,
  },
  {
    key: "cobrado",
    label: "Monto cobrado",
    render: (r) => (
      <span className="font-mono font-semibold tabular-nums">{fmtARS(r._cobrado)}</span>
    ),
  },
  {
    key: "fecha",
    label: "Fecha",
    filterable: "date",
    render: (r) => <span className="font-mono tabular-nums">{r.fecha}</span>,
  },
  {
    key: "estado",
    label: "Estado",
    filterable: "enum",
    filterOptions: [...ESTADOS_MOVIMIENTO],
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
