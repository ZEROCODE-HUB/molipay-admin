import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, FilterX, AlertTriangle, ShieldAlert, ChevronRight, ChevronDown, Layers, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column, type TableServerFilters } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { MovimientoDetail, estadoBadge, type Movimiento } from "@/components/movimiento-detail";
import { LegajoCell, LEGAJO_TOOLTIP } from "@/components/legajo-label";
import { FormDialog } from "@/components/form-dialog";
import { Label } from "@/components/portal-shell";
import { useLineasMovimiento } from "@/hooks/useLineasMovimiento";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCambiarEstadoMovimiento } from "@/hooks/useMovimientoActions";
import { useEstadosMovimiento } from "@/hooks/useEstados";
import { calcularDesglose, fmtARS } from "@/lib/aranceles";
import { DataAccessError } from "@/lib/api/errors";
import { getMovimiento } from "@/lib/api/movimientos";
import { TIPOS_LINEA, type LineaMovimiento, type TipoLinea } from "@/lib/api/lineas-movimiento";
import { ESTADOS_MOVIMIENTO, type EstadoMovimiento, type Movimiento as MovimientoDB } from "@/lib/api/types";
import { resolverEstadoMovimiento } from "@/lib/estados";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import { Pagination } from "@/components/pagination";
import { z } from "zod";

export const Route = createFileRoute("/admin/general/movimientos/")({
  validateSearch: z.object({ legajo: z.string().optional(), txid: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Todos los movimientos — Movimientos — Admin Molly" },
      { name: "description", content: "Movimientos por concepto (ingreso, comisión, impuesto) desde el ledger." },
    ],
  }),
  component: TodosPage,
});

const PAGE_SIZES = [10, 20, 50];

// Operación de negocio que originó las líneas (transactions.tipo).
const OPERACIONES: { label: string; code: string }[] = [
  { label: "Depósito", code: "deposito" },
  { label: "Retiro", code: "retiro" },
  { label: "Transferencia", code: "transferencia" },
  { label: "Pago con tarjeta", code: "tarjeta" },
  { label: "Pago PCT", code: "pago_pct" },
  { label: "Cobro PCT", code: "cobro_pct" },
  { label: "Liquidación de lote", code: "liquidacion_lote" },
  { label: "Acreditación de lote", code: "acreditacion_lote" },
  { label: "Adelanto", code: "adelanto" },
  { label: "Ajuste de saldo", code: "ajuste_manual" },
];
const OPERACION_LABEL = new Map(OPERACIONES.map((o) => [o.code, o.label]));
const TIPO_LINEA_LABEL = new Map(TIPOS_LINEA.map((t) => [t.code, t.label]));
const TIPO_LINEA_CODE = new Map(TIPOS_LINEA.map((t) => [t.label, t.code]));

const TIPO_LINEA_STYLE: Record<TipoLinea, string> = {
  ingreso: "bg-emerald-50 text-emerald-700 border-emerald-200",
  egreso: "bg-red-50 text-red-700 border-red-200",
  comision: "bg-amber-50 text-amber-700 border-amber-200",
  impuesto: "bg-violet-50 text-violet-700 border-violet-200",
  interes: "bg-sky-50 text-sky-700 border-sky-200",
  reverso: "bg-slate-100 text-slate-700 border-slate-300",
};

function fmtFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const fmtMonto = (n: number) => `${n >= 0 ? "+" : "-"} ${fmtARS(Math.abs(n))}`;

function toViewMovimiento(m: MovimientoDB, catalogo: EstadoMovimiento[]): Movimiento {
  const pctImpuesto = m.comision > 0 ? (m.impuesto / m.comision) * 100 : 0;
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
    estado: resolverEstadoMovimiento(m, catalogo).codigo,
    desglose: calcularDesglose(m.comision, pctImpuesto),
  };
}

/** Fila de la tabla: la línea + si encabeza un grupo de su TXID y cuántas líneas oculta. */
type Fila = LineaMovimiento & { _esCabeza: boolean; _hijas: number };

function TodosPage() {
  const { legajo, txid: txidUrl } = Route.useSearch();
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [filtrosPanel, setFiltrosPanel] = useState<TableServerFilters>({ global: "", enums: {}, dates: {} });
  const [txid, setTxid] = useState(txidUrl ?? "");
  const [cuit, setCuit] = useState("");
  const [cvu, setCvu] = useState("");
  const [operacion, setOperacion] = useState("");
  const [agrupar, setAgrupar] = useState(true);
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());

  const search = useDebouncedValue(filtrosPanel.global.trim(), 350);
  const txidQ = useDebouncedValue(txid.trim(), 350);
  const cuitQ = useDebouncedValue(cuit.trim(), 350);
  const cvuQ = useDebouncedValue(cvu.trim(), 350);

  const aplicarFiltros = (f: TableServerFilters) => {
    setPage(0);
    setFiltrosPanel(f);
  };

  const apiFilters = useMemo(() => {
    const rango = filtrosPanel.dates.fecha;
    return {
      page,
      pageSize,
      legajo,
      search: search || undefined,
      txid: txidQ || undefined,
      cuit: cuitQ || undefined,
      cvu: cvuQ || undefined,
      tipoOperacion: operacion || undefined,
      tipoLinea: filtrosPanel.enums.tipoLinea ? TIPO_LINEA_CODE.get(filtrosPanel.enums.tipoLinea) : undefined,
      estadoCodigo: filtrosPanel.enums.estado || undefined,
      fechaDesde: rango?.from ? `${rango.from}T00:00:00.000` : undefined,
      fechaHasta: rango?.to ? `${rango.to}T23:59:59.999` : undefined,
    };
  }, [page, pageSize, legajo, search, txidQ, cuitQ, cvuQ, operacion, filtrosPanel.enums, filtrosPanel.dates]);

  const { rows, total, isLoading, isFetching, isError, error, refetch } = useLineasMovimiento(apiFilters);

  const { data: estados = [] } = useEstadosMovimiento();
  const [detail, setDetail] = useState<Movimiento | null>(null);
  const [estadoTarget, setEstadoTarget] = useState<{ dbId: string; estadoActual: string; nuevoId: number } | null>(null);
  const cambiarEstado = useCambiarEstadoMovimiento();
  const { can } = useCan();
  const puedeModificar = can("modificar", "movimientos");

  // Agrupación por TXID dentro de la página: la primera línea de cada operación
  // encabeza el grupo y las demás (comisión, impuesto, ...) se despliegan.
  const data: Fila[] = useMemo(() => {
    const porTxn = new Map<string, LineaMovimiento[]>();
    for (const r of rows) {
      const g = porTxn.get(r.idTxn);
      if (g) g.push(r);
      else porTxn.set(r.idTxn, [r]);
    }
    const out: Fila[] = [];
    const vistos = new Set<string>();
    for (const r of rows) {
      const grupo = porTxn.get(r.idTxn)!;
      const esCabeza = !vistos.has(r.idTxn);
      vistos.add(r.idTxn);
      if (!agrupar) {
        out.push({ ...r, _esCabeza: false, _hijas: 0 });
      } else if (esCabeza) {
        out.push({ ...r, _esCabeza: true, _hijas: grupo.length - 1 });
      } else if (abiertos.has(r.idTxn)) {
        out.push({ ...r, _esCabeza: false, _hijas: 0 });
      }
    }
    return out;
  }, [rows, agrupar, abiertos]);

  const toggle = (idTxn: string) =>
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(idTxn)) next.delete(idTxn);
      else next.add(idTxn);
      return next;
    });

  const filtrarTxid = (v: string) => {
    setTxid(v);
    setPage(0);
  };

  const verDetalle = async (row: LineaMovimiento) => {
    const m = await getMovimiento(row.transactionId);
    if (m) setDetail(toViewMovimiento(m, estados));
  };

  const getActions = (row: Fila): ActionItem[] => [
    { label: "Ver detalle de la operación", icon: Eye, onClick: () => void verDetalle(row) },
    { label: "Ver todas las líneas del TXID", icon: Layers, onClick: () => filtrarTxid(row.idTxn) },
    {
      label: "Cambiar estado",
      icon: ShieldAlert,
      disabled: !puedeModificar || row.ledgerStatus === "legacy",
      onClick: () => setEstadoTarget({ dbId: row.transactionId, estadoActual: row.estadoCodigo, nuevoId: row.estadoId }),
    },
    {
      label: "Ver movimientos del cliente",
      icon: FilterX,
      onClick: () => navigate({ to: "/admin/general/movimientos", search: { legajo: row.legajo } }),
    },
  ];

  const columns: Column<Fila>[] = [
    { key: "legajo", label: "Legajo", hint: LEGAJO_TOOLTIP, minWidth: 130, render: (r) => <LegajoCell legajo={r.legajo} /> },
    {
      key: "idTxn",
      label: "ID transacción",
      minWidth: 180,
      maxWidth: 240,
      tooltip: (r) => r.idTxn,
      render: (r) => (
        <button
          type="button"
          onClick={() => filtrarTxid(r.idTxn)}
          className="font-mono tabular-nums text-left hover:text-primary hover:underline underline-offset-2"
          title="Filtrar por este TXID"
        >
          {r.idTxn}
        </button>
      ),
    },
    {
      key: "tipoLinea",
      label: "Tipo",
      filterable: "enum",
      filterOptions: TIPOS_LINEA.map((t) => t.label),
      minWidth: 170,
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {r._esCabeza && r._hijas > 0 ? (
            <button
              type="button"
              onClick={() => toggle(r.idTxn)}
              className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
              title={abiertos.has(r.idTxn) ? "Ocultar desglose" : `Ver desglose (${r._hijas})`}
            >
              {abiertos.has(r.idTxn) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className={agrupar && !r._esCabeza ? "w-5 border-l-2 border-muted h-5 ml-2" : "w-5"} />
          )}
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TIPO_LINEA_STYLE[r.tipoLinea]}`}>
            {TIPO_LINEA_LABEL.get(r.tipoLinea) ?? r.tipoLinea}
          </span>
          <span className="text-[11px] text-muted-foreground truncate">{OPERACION_LABEL.get(r.tipoOperacion) ?? r.tipoOperacion}</span>
        </div>
      ),
    },
    { key: "cvu", label: "CVU", minWidth: 190, maxWidth: 230, render: (r) => <span className="font-mono tabular-nums">{r.cvu || "-"}</span> },
    { key: "email", label: "Email", minWidth: 180, maxWidth: 260, render: (r) => r.email ?? "-" },
    { key: "nombre", label: "Nombre", minWidth: 160, maxWidth: 260, render: (r) => r.nombre ?? "-" },
    { key: "nombreDestino", label: "Nombre destino", minWidth: 180, maxWidth: 280, render: (r) => r.nombreDestino ?? "-" },
    { key: "cuit", label: "CUIT", minWidth: 120, render: (r) => <span className="font-mono tabular-nums">{r.cuit || "-"}</span> },
    {
      key: "monto",
      label: "Monto",
      minWidth: 150,
      render: (r) => (
        <span className={`font-mono tabular-nums font-semibold ${r.monto >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fmtMonto(r.monto)}</span>
      ),
    },
    { key: "fecha", label: "Fecha", filterable: "date", minWidth: 170, render: (r) => <span className="font-mono tabular-nums">{fmtFecha(r.fecha)}</span> },
    {
      key: "estado",
      label: "Estado",
      filterable: "enum",
      filterOptions: [...ESTADOS_MOVIMIENTO],
      minWidth: 120,
      render: (r) => estadoBadge(r.estadoCodigo),
    },
  ];

  const err = error instanceof DataAccessError ? error : null;
  const totalPaginas = Math.max(1, Math.ceil((total || 0) / pageSize));
  const inputCls = "h-9 w-full rounded-md border border-input bg-card px-3 text-sm";

  const filtrosExtra = (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1 min-w-[200px]">
        <label className="text-xs font-medium text-muted-foreground">TXID</label>
        <input value={txid} onChange={(e) => filtrarTxid(e.target.value)} placeholder="ORD6LEN8..." className={`${inputCls} font-mono`} />
      </div>
      <div className="space-y-1 min-w-[150px]">
        <label className="text-xs font-medium text-muted-foreground">CUIT</label>
        <input value={cuit} onChange={(e) => { setCuit(e.target.value); setPage(0); }} placeholder="30719143659" className={`${inputCls} font-mono`} />
      </div>
      <div className="space-y-1 min-w-[220px]">
        <label className="text-xs font-medium text-muted-foreground">CVU / CBU</label>
        <input value={cvu} onChange={(e) => { setCvu(e.target.value); setPage(0); }} placeholder="0000003100..." className={`${inputCls} font-mono`} />
      </div>
      <div className="space-y-1 min-w-[180px]">
        <label className="text-xs font-medium text-muted-foreground">Operación</label>
        <select value={operacion} onChange={(e) => { setOperacion(e.target.value); setPage(0); }} className={inputCls}>
          <option value="">Todas</option>
          {OPERACIONES.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
        </select>
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground h-9">
        <input type="checkbox" checked={agrupar} onChange={(e) => setAgrupar(e.target.checked)} />
        Agrupar desglose por TXID
      </label>
    </div>
  );

  return (
    <PermissionGuard recurso="movimientos">
      <PageHeader
        title="Todos los movimientos"
        description="Una fila por concepto (ingreso, comisión, impuesto), contabilizada en el ledger. Las líneas de una misma operación comparten el TXID."
      />

      {(legajo || txid) && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm mb-4 flex flex-wrap items-center gap-x-4 gap-y-1">
          {legajo && (
            <span>
              Cliente <span className="font-mono font-semibold tabular-nums">{legajo}</span>
            </span>
          )}
          {txid && (
            <span className="inline-flex items-center gap-1">
              <Search size={13} /> TXID <span className="font-mono font-semibold">{txid}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setTxid("");
              navigate({ to: "/admin/general/movimientos", search: {} });
            }}
            className="text-xs font-semibold text-primary underline underline-offset-2"
          >
            Limpiar filtro
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando movimientos…
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
          <AlertTriangle size={28} />
          <div>
            <p className="font-semibold">{err?.permission ? "No tenés permiso para ver esto" : "Ocurrió un error al cargar los movimientos"}</p>
            <p className="mt-1">{err?.message ?? "Error desconocido"}</p>
          </div>
          <button type="button" onClick={() => refetch()} className="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data}
            keyExtractor={(r) => r.lineId + ":" + r.lineNo}
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
            hidePagination
            extraFilters={filtrosExtra}
            serverFilterState={filtrosPanel}
            onServerFilterChange={aplicarFiltros}
            serverResultCount={total}
            emptyMessage="No hay movimientos que coincidan con los filtros aplicados."
          />
          <Pagination
            page={page + 1}
            totalPages={totalPaginas}
            pageSize={pageSize}
            total={total}
            countLabel="línea(s)"
            pageSizes={PAGE_SIZES}
            disabled={isFetching}
            onPageChange={(p) => setPage(p - 1)}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(0);
            }}
          />
        </>
      )}

      {detail && <MovimientoDetail m={detail} onClose={() => setDetail(null)} />}

      {estadoTarget && (
        <FormDialog
          open
          onClose={() => setEstadoTarget(null)}
          title="Cambiar estado de la operación"
          description={`Cambia el estado de toda la operación (todas sus líneas). Rechazar o reembolsar una operación contabilizada genera su reverso en el ledger. Estado actual: ${estadoTarget.estadoActual}.`}
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
            <Label htmlFor="nuevo-estado">Nuevo estado</Label>
            <select
              id="nuevo-estado"
              className="w-full h-10 px-3 rounded-md border border-input bg-card text-sm"
              value={estadoTarget.nuevoId}
              onChange={(e) => setEstadoTarget((s) => (s ? { ...s, nuevoId: Number(e.target.value) } : s))}
            >
              {estados.map((s) => (
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
