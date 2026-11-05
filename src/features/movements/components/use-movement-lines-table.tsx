import { isAppError } from "@/shared/lib/errors";
import { useNavigate } from "@tanstack/react-router";
import { useMemo,useState } from "react";
import { Eye,FilterX,ShieldAlert,Layers } from "lucide-react";
import { type Column,type TableServerFilters } from "@/shared/ui/data-table";
import { type ActionItem } from "@/shared/ui/actions-dropdown";
import { statusBadge,type Movimiento } from "@/features/movements/components/movement-detail";
import { LegajoCell,LEGAJO_TOOLTIP } from "@/shared/ui/legajo-label";
import { useLinesMovement } from "@/features/movements/movement-lines.hooks";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useChangeStatusMovement } from "@/features/movements/movement-actions.hooks";
import { useStatusesMovement } from "@/features/movements/statuses.hooks";
import { getMovement } from "@/features/movements/movements.supabase";
import {
KINDS_LINE,
labelLine,
type LineMovement,
type KindLine,
} from "@/features/movements/movement-lines.supabase";
import { STATUSES_MOVEMENT } from "@/infrastructure/supabase/legacy/types";
import { useCan } from "@/features/rbac/rbac.hooks";
import {
KIND_LINE_CODE,
toViewMovement,
KIND_LINE_STYLE,
KIND_LINE_LABEL,
OPERATION_LABEL,
fmtAmount,
fmtDate,
OPERATIONS,
} from "@/features/movements/movement-lines-table.rules";

/** Estado y acciones de MovementLinesTable: el componente solo dibuja. */
export function useMovementLinesTable({
  legajo,
  initialTxid,
  embedded = false,
  onClearContext,
  tiposOperacion: kindsOperation,
  tipoLinea: lineKind,
  excluirInternas = false,
}: {
  legajo?: string;
  initialTxid?: string;
  /** Dentro de la ficha: oculta legajo/email/nombre y el acceso a "movimientos del cliente". */
  embedded?: boolean;
  /** Se llama al limpiar el filtro de contexto (legajo / TXID que vino por URL). */
  onClearContext?: () => void;
  /** Fija las operaciones mostradas (oculta el selector de operación si es una sola). */
  tiposOperacion?: string[];
  /** Fija el tipo de línea mostrado (p. ej. solo comisiones); oculta ese filtro. */
  tipoLinea?: KindLine;
  /** Excluye transferencias internas entre subcuentas propias. */
  excluirInternas?: boolean;
}) {
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(embedded ? 10 : 20);
  const [filtersPanel, setFiltersPanel] = useState<TableServerFilters>({
    global: "",
    enums: {},
    dates: {},
  });
  const [txid, setTxid] = useState(initialTxid ?? "");
  const [cuit, setCuit] = useState("");
  const [cvu, setCvu] = useState("");
  const [operation, setOperation] = useState("");

  const search = useDebouncedValue(filtersPanel.global.trim(), 350);
  const txidQ = useDebouncedValue(txid.trim(), 350);
  const cuitQ = useDebouncedValue(cuit.trim(), 350);
  const cvuQ = useDebouncedValue(cvu.trim(), 350);

  const applyFilters = (f: TableServerFilters) => {
    setPage(0);
    setFiltersPanel(f);
  };

  const apiFilters = useMemo(() => {
    const range = filtersPanel.dates.fecha;
    return {
      page,
      pageSize,
      legajo,
      search: search || undefined,
      txid: txidQ || undefined,
      cuit: cuitQ || undefined,
      cvu: cvuQ || undefined,
      tipoOperacion: operation || kindsOperation,
      excluirInternas,
      tipoLinea:
        lineKind ??
        (filtersPanel.enums.tipoLinea
          ? KIND_LINE_CODE.get(filtersPanel.enums.tipoLinea)
          : undefined),
      estadoCodigo: filtersPanel.enums.estado || undefined,
      fechaDesde: range?.from ? `${range.from}T00:00:00.000` : undefined,
      fechaHasta: range?.to ? `${range.to}T23:59:59.999` : undefined,
    };
  }, [
    page,
    pageSize,
    legajo,
    search,
    txidQ,
    cuitQ,
    cvuQ,
    operation,
    kindsOperation,
    excluirInternas,
    lineKind,
    filtersPanel.enums,
    filtersPanel.dates,
  ]);

  const { rows, total, isLoading, isFetching, isError, error, refetch } =
    useLinesMovement(apiFilters);

  const { data: statuses = [] } = useStatusesMovement();
  const [detail, setDetail] = useState<Movimiento | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    dbId: string;
    estadoActual: string;
    nuevoId: number;
  } | null>(null);
  const changeStatus = useChangeStatusMovement();
  const { can } = useCan();
  const canUpdate = can("modificar", "movimientos");

  const filtrarTxid = (v: string) => {
    setTxid(v);
    setPage(0);
  };

  const verDetail = async (row: LineMovement) => {
    const m = await getMovement(row.transactionId);
    if (m) setDetail(toViewMovement(m, statuses));
  };

  const getActions = (row: LineMovement): ActionItem[] => [
    { label: "Ver detalle de la operación", icon: Eye, onClick: () => void verDetail(row) },
    { label: "Ver todas las líneas del TXID", icon: Layers, onClick: () => filtrarTxid(row.idTxn) },
    {
      label: "Cambiar estado",
      icon: ShieldAlert,
      disabled: !canUpdate || row.ledgerStatus === "legacy",
      onClick: () =>
        setStatusTarget({
          dbId: row.transactionId,
          estadoActual: row.estadoCodigo,
          nuevoId: row.estadoId,
        }),
    },
    ...(embedded
      ? []
      : [
          {
            label: "Ver movimientos del cliente",
            icon: FilterX,
            onClick: () =>
              navigate({ to: "/admin/general/movimientos", search: { legajo: row.legajo } }),
          },
        ]),
  ];

  const columnsCustomer: Column<LineMovement>[] = embedded
    ? []
    : [
        {
          key: "legajo",
          label: "Legajo",
          hint: LEGAJO_TOOLTIP,
          minWidth: 130,
          render: (r) => <LegajoCell legajo={r.legajo} />,
        },
      ];

  const columns: Column<LineMovement>[] = [
    ...columnsCustomer,
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
      ...(lineKind
        ? {}
        : { filterable: "enum" as const, filterOptions: KINDS_LINE.map((t) => t.label) }),
      minWidth: 170,
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${KIND_LINE_STYLE[r.tipoLinea]}`}
            title={r.detalle ?? undefined}
          >
            {labelLine(r, KIND_LINE_LABEL.get(r.tipoLinea) ?? r.tipoLinea)}
          </span>
          <span className="text-[11px] text-muted-foreground truncate">
            {OPERATION_LABEL.get(r.tipoOperacion) ?? r.tipoOperacion}
          </span>
        </div>
      ),
    },
    {
      key: "cvu",
      label: "CVU",
      minWidth: 190,
      maxWidth: 230,
      render: (r) => <span className="font-mono tabular-nums">{r.cvu || "-"}</span>,
    },
    ...(embedded
      ? []
      : ([
          {
            key: "email",
            label: "Email",
            minWidth: 180,
            maxWidth: 260,
            render: (r) => r.email ?? "-",
          },
          {
            key: "nombre",
            label: "Nombre",
            minWidth: 160,
            maxWidth: 260,
            render: (r) => r.nombre ?? "-",
          },
        ] as Column<LineMovement>[])),
    {
      key: "nombreDestino",
      label: "Nombre destino",
      minWidth: 180,
      maxWidth: 280,
      render: (r) => r.nombreDestino ?? "-",
    },
    {
      key: "cuit",
      label: "CUIT",
      minWidth: 120,
      render: (r) => <span className="font-mono tabular-nums">{r.cuit || "-"}</span>,
    },
    {
      key: "monto",
      label: "Monto",
      minWidth: 150,
      render: (r) => (
        <span
          className={`font-mono tabular-nums font-semibold ${r.monto >= 0 ? "text-emerald-700" : "text-red-700"}`}
        >
          {fmtAmount(r.monto)}
        </span>
      ),
    },
    {
      key: "fecha",
      label: "Fecha",
      filterable: "date",
      minWidth: 170,
      render: (r) => <span className="font-mono tabular-nums">{fmtDate(r.fecha)}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      filterable: "enum",
      filterOptions: [...STATUSES_MOVEMENT],
      minWidth: 120,
      render: (r) => statusBadge(r.estadoCodigo),
    },
  ];

  const err = isAppError(error) ? error : null;
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
  const inputCls = "h-9 w-full rounded-md border border-input bg-card px-3 text-sm";
  const operationsSelect = kindsOperation
    ? OPERATIONS.filter((o) => kindsOperation.includes(o.code))
    : OPERATIONS;

  const filtersExtra = (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1 min-w-[200px]">
        <label className="text-xs font-medium text-muted-foreground">TXID</label>
        <input
          value={txid}
          onChange={(e) => filtrarTxid(e.target.value)}
          placeholder="ORD6LEN8..."
          className={`${inputCls} font-mono`}
        />
      </div>
      <div className="space-y-1 min-w-[150px]">
        <label className="text-xs font-medium text-muted-foreground">CUIT</label>
        <input
          value={cuit}
          onChange={(e) => {
            setCuit(e.target.value);
            setPage(0);
          }}
          placeholder="30719143659"
          className={`${inputCls} font-mono`}
        />
      </div>
      <div className="space-y-1 min-w-[220px]">
        <label className="text-xs font-medium text-muted-foreground">CVU / CBU</label>
        <input
          value={cvu}
          onChange={(e) => {
            setCvu(e.target.value);
            setPage(0);
          }}
          placeholder="0000003100..."
          className={`${inputCls} font-mono`}
        />
      </div>
      {(!kindsOperation || kindsOperation.length > 1) && (
        <div className="space-y-1 min-w-[180px]">
          <label className="text-xs font-medium text-muted-foreground">Operación</label>
          <select
            value={operation}
            onChange={(e) => {
              setOperation(e.target.value);
              setPage(0);
            }}
            className={inputCls}
          >
            <option value="">Todas</option>
            {operationsSelect.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  const contextoLegajo = !embedded && legajo;
  return {
    legajo,
    initialTxid,
    embedded,
    onClearContext,
    excluirInternas,
    page,
    setPage,
    pageSize,
    setPageSize,
    filtersPanel,
    txid,
    applyFilters,
    rows,
    total,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    statuses,
    detail,
    setDetail,
    statusTarget,
    setStatusTarget,
    changeStatus,
    filtrarTxid,
    getActions,
    columns,
    err,
    totalPages,
    filtersExtra,
    contextoLegajo,
  };
}

export type MovementLinesTableVm = ReturnType<typeof useMovementLinesTable>;
