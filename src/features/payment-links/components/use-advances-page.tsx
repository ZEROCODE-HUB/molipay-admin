import { listAdvanceMerchants } from "@/features/payment-links/advances.supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { type Advance, type StatusAdvance } from "@/infrastructure/supabase/legacy/types";
import {
  listAdvances,
  obtenerPoolRecaudacion,
  type PoolRecaudacion,
} from "@/features/payment-links/advances.supabase";
import { formatMoney } from "@/shared/lib/format";
import { type ActionItem } from "@/shared/ui/actions-dropdown";
import { Eye } from "lucide-react";
import { type Column } from "@/shared/ui/data-table";
import { Badge } from "@/shared/ui/badge";
import { type AdvanceUI, type MerchantSummary } from "@/features/payment-links/advances.types";
import { label, shortId, tone } from "@/features/payment-links/advances.rules";

/** Estado y acciones de AdvancesPage: el componente solo dibuja. */
export function useAdvancesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<StatusAdvance | "">("");
  const [detail, setDetail] = useState<AdvanceUI | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string } | null>(null);

  // Deep link desde el calendario: ?comercio=<uuid>&adelanto=<uuid>
  // Si viene `comercio`, lo usamos como filtro hasta que el operador
  // lo limpie con "Limpiar". Si viene `adelanto`, abrimos el modal
  // apenas la fila esté disponible en la página actual.
  const search = useSearch({ from: "/admin/comercios/link-pago/adelantos" });
  const merchantFromUrl = search?.comercio;
  const advanceFromUrl = search?.adelanto;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["adelantos", page, pageSize, statusFilter],
    queryFn: () =>
      listAdvances({
        page,
        pageSize,
        estado: (statusFilter as StatusAdvance) || undefined,
      }),
  });

  // Si la URL trae `adelanto=<uuid>`, marcamos la intención de abrir
  // el modal. El render del detalle se hace en base a la grilla: si
  // la fila está en la página actual, el modal se abre apenas se
  // arme el `AdelantoUI` con su join a comercios. Si la fila no está
  // (paginado distinto), igual el operador tiene el deep link
  // copiable y puede navegar manualmente.
  useEffect(() => {
    if (!advanceFromUrl || detail) return;
    setPendingDeepLinkAdvanceId(advanceFromUrl);
  }, [advanceFromUrl, detail]);

  // Marker interno: id de adelanto a abrir cuando aparezca en la
  // grilla. Se limpia cuando el modal se cierra.
  const [pendingDeepLinkAdvanceId, setPendingDeepLinkAdvanceId] = useState<string | null>(null);

  // Pool de Recaudación: KPIs globales que se muestran SIEMPRE en la
  // cabecera de la pantalla. Refresca cada 30s para mantener el saldo
  // "vivo" mientras el operador evalúa acreditar.
  const { data: poolCabecera } = useQuery<PoolRecaudacion>({
    queryKey: ["pool-recaudacion", "cabecera"],
    queryFn: () => obtenerPoolRecaudacion(),
    refetchInterval: 30_000,
  });

  // La grilla trae los adelantos pero la columna "Comercio" necesita
  // nombre y legajo, no el UUID. Armamos un cache comercio_id →
  // { nombre, legajo } haciendo un solo query que une los comercios
  // que aparecieron en la página actual.
  const advancesCrudos: Advance[] = data ?? [];
  const merchantsIds = useMemo(
    () => Array.from(new Set(advancesCrudos.map((a) => a.comercioId))),
    [advancesCrudos],
  );
  const { data: merchantsMap } = useQuery<Record<string, MerchantSummary>>({
    queryKey: ["adelantos-comercios", merchantsIds],
    queryFn: () => listAdvanceMerchants(merchantsIds),
    enabled: merchantsIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const rows: AdvanceUI[] = advancesCrudos.map((a) => {
    const c = merchantsMap?.[a.comercioId];
    return {
      id: shortId(a.id),
      fullId: a.id,
      comercio: c?.nombre ?? a.comercioId,
      legajo: c?.legajo ?? "—",
      fechaSolicitud: new Date(a.fechaSolicitud).toLocaleDateString("es-AR"),
      importeSolicitado: a.montoSolicitado,
      operacion: a.operacion
        ? `${a.operacion.bandera ?? "Tarjeta"} · ${a.operacion.referencia} · ${formatMoney(a.operacion.monto)}`
        : "Anterior (sin operación)",
      plazoSolicitado: `${a.plazoAdelantadoDias} días`,
      plazoContractual: `${a.plazoOriginalDias} días`,
      comision: a.tasaInteresPct != null ? `${a.tasaInteresPct}%` : "Pendiente",
      tasaEfectiva: a.netoARecibir != null ? `Neto ${formatMoney(a.netoARecibir)}` : undefined,
      estado: a.estado,
      notas: a.motivo,
      tasaInteresPct: a.tasaInteresPct,
      motivo: a.motivo,
      fechaAcreditacion: a.fechaAcreditacion,
      montoPorAcreditar: a.montoPorAcreditar,
      fechaResolucion: a.fechaResolucion,
      montoOfertado: a.montoOfertado,
      descuento: a.descuento,
      netoARecibir: a.netoARecibir,
      compensado: a.compensado,
      rechazoMotivo: a.rechazoMotivo,
    };
  });

  // Deep link: si la fila del adelanto está en la página actual,
  // abrimos el modal automáticamente y limpiamos el marker.
  useEffect(() => {
    if (!pendingDeepLinkAdvanceId || detail) return;
    const target = rows.find((r) => r.fullId === pendingDeepLinkAdvanceId);
    if (target) {
      setDetail(target);
      setPendingDeepLinkAdvanceId(null);
    }
  }, [pendingDeepLinkAdvanceId, rows, detail]);

  // Si la URL trae `comercio`, filtramos la grilla en cliente. La
  // query al backend sigue trayendo la página completa (necesitamos
  // encontrar el `adelantoFromUrl` que viene en otra página) y el
  // filtro visual se aplica acá.
  const rowsVisibles = useMemo(() => {
    if (!merchantFromUrl) return rows;
    return rows.filter((r) => {
      const cruda = advancesCrudos.find((a) => a.id === r.fullId);
      return cruda?.comercioId === merchantFromUrl;
    });
  }, [rows, advancesCrudos, merchantFromUrl]);

  // Banner contextual: si la URL trae `comercio`, mostramos un chip
  // arriba explicando que el listado está filtrado.
  const filtradoByMerchant = !!merchantFromUrl;

  const limpiarFilterMerchant = () => {
    void navigate({
      to: "/admin/comercios/link-pago/adelantos",
      search: {},
    } as never);
  };

  const save = (_u: AdvanceUI) => {
    refetch();
  };

  const invalidateTodo = () => {
    queryClient.invalidateQueries({ queryKey: ["adelantos"] });
    queryClient.invalidateQueries({ queryKey: ["lotes"] });
    queryClient.invalidateQueries({ queryKey: ["lotes-resumen"] });
    // Para que el portal de Enterprises vea el cambio al refrescar
    queryClient.invalidateQueries({ queryKey: ["subcuentas"] });
    // Pool de Recaudación: cambia cuando se Acredita un adelanto o se
    // actualiza el saldo de cualquier subcuenta tipo=Recaudacion.
    queryClient.invalidateQueries({ queryKey: ["pool-recaudacion"] });
  };

  const getActions = (r: AdvanceUI): ActionItem[] => [
    {
      label: "Ver / gestionar",
      icon: Eye,
      onClick: () => setDetail(r),
    },
  ];

  // Totales para las cards KPI
  const totalesByStatus = useMemo(() => {
    const m: Record<StatusAdvance, { cantidad: number; monto: number }> = {
      Pendiente: { cantidad: 0, monto: 0 },
      Aprobado: { cantidad: 0, monto: 0 },
      Aceptado: { cantidad: 0, monto: 0 },
      Rechazado: { cantidad: 0, monto: 0 },
      Acreditado: { cantidad: 0, monto: 0 },
      Compensado: { cantidad: 0, monto: 0 },
      Cancelado: { cantidad: 0, monto: 0 },
    };
    for (const a of advancesCrudos) {
      const status = a.estado as StatusAdvance;
      m[status].cantidad += 1;
      m[status].monto += Number(a.montoSolicitado ?? 0);
    }
    return m;
  }, [advancesCrudos]);

  const columns: Column<AdvanceUI>[] = [
    {
      key: "id",
      label: "Solicitud",
      filterable: true,
      render: (r) => <span className="font-mono text-xs font-semibold">{r.id}</span>,
    },
    {
      key: "comercio",
      label: "Comercio",
      filterable: true,
      render: (r) => (
        <div>
          <div className="font-semibold text-sm truncate max-w-[200px]">{r.comercio}</div>
          <div className="font-mono text-xs text-muted-foreground">{r.legajo}</div>
        </div>
      ),
    },
    {
      key: "importeSolicitado",
      label: "Importe",
      render: (r) => (
        <span className="font-mono tabular-nums font-semibold">
          {formatMoney(r.importeSolicitado)}
        </span>
      ),
    },
    {
      key: "operacion",
      label: "Operación",
      minWidth: 180,
      render: (r) => <span className="text-xs">{r.operacion}</span>,
    },
    {
      key: "plazoSolicitado",
      label: "Plazo",
      render: (r) => (
        <div>
          <div className="font-semibold text-sm">{r.plazoSolicitado}</div>
          <div className="text-xs text-muted-foreground">{r.plazoContractual}</div>
        </div>
      ),
    },
    {
      key: "comision",
      label: "Tasa / neto",
      render: (r) => (
        <div>
          <div className="font-semibold text-sm">{r.comision}</div>
          <div className="text-xs text-muted-foreground">{r.tasaEfectiva ?? "—"}</div>
        </div>
      ),
    },
    {
      key: "estado",
      label: "Estado",
      filterable: "enum",
      filterOptions: [
        "Pendiente",
        "Aprobado",
        "Aceptado",
        "Rechazado",
        "Acreditado",
        "Compensado",
        "Cancelado",
      ],
      render: (r) => <Badge tone={tone(r.estado)}>{label(r.estado)}</Badge>,
    },
    {
      key: "compensado",
      label: "Pendiente de compensar",
      render: (r) =>
        r.estado === "Acreditado" || r.estado === "Compensado" ? (
          <span className="font-mono tabular-nums text-xs">
            {formatMoney(
              Math.max(0, (r.montoOfertado ?? r.importeSolicitado) - (r.compensado ?? 0)),
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "fechaSolicitud",
      label: "Fecha",
      render: (r) => <span className="font-mono text-xs">{r.fechaSolicitud}</span>,
    },
  ];

  const err = error as Error | null;
  return {
    page,
    setPage,
    statusFilter,
    setStatusFilter,
    detail,
    setDetail,
    confirm,
    setConfirm,
    merchantFromUrl,
    data,
    isLoading,
    isError,
    error,
    refetch,
    poolCabecera,
    rowsVisibles,
    filtradoByMerchant,
    limpiarFilterMerchant,
    save,
    invalidateTodo,
    getActions,
    totalesByStatus,
    columns,
    err,
  };
}

export type AdvancesPageVm = ReturnType<typeof useAdvancesPage>;
