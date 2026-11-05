import { userMessage } from "@/shared/lib/errors";
import { useNavigate } from "@tanstack/react-router";
import { useMemo,useState } from "react";
import { keepPreviousData,useQuery,useQueryClient } from "@tanstack/react-query";
import { Eye,CheckCircle,XCircle,FileWarning,ShieldCheck,ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { type Column,type TableServerFilters } from "@/shared/ui/data-table";
import { type ActionItem } from "@/shared/ui/actions-dropdown";
import { Badge } from "@/shared/ui/badge";
import { LegajoCell } from "@/shared/ui/legajo-label";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { downloadCsv } from "@/features/alerts/alert-rules.supabase";
import { useAnalysts } from "@/features/alerts/components/alert-management-panel";
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
} from "@/features/regulatory-reports/compliance.supabase";
import { formatDateTime } from "@/shared/lib/format";
import {
STATUS_BY_LABEL,
WITHOUT_ASSIGN,
ALERTS_QUERY_KEY,
STATUS_OPTIONS,
STATUS_TONE,
fmtDay,
daysRestantes,
} from "@/features/alerts/alerts-table.rules";
import { type Ruling } from "@/features/alerts/alerts-table.types";

/** Estado y acciones de AlertsTable: el componente solo dibuja. */
export function useAlertsTable({ legajo }: { legajo?: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const enFicha = Boolean(legajo);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(enFicha ? 10 : 20);
  const [panel, setPanel] = useState<TableServerFilters>({ global: "", enums: {}, dates: {} });
  const search = useDebouncedValue(panel.global.trim(), 350);
  const analistas = useAnalysts();
  const analistaByName = useMemo(
    () => new Map((analistas.data ?? []).map((a) => [a.nombre, a.id])),
    [analistas.data],
  );

  const filters: AlertFilters = useMemo(() => {
    const active = panel.enums.activo;
    const overdue = panel.enums.vencimiento;
    const analista = panel.enums.analista;
    return {
      legajo,
      search: search || undefined,
      status: panel.enums.estado ? STATUS_BY_LABEL.get(panel.enums.estado) : undefined,
      active: active === "Sí" ? true : active === "No" ? false : undefined,
      createdFrom: panel.dates.createdAt?.from || undefined,
      createdTo: panel.dates.createdAt?.to || undefined,
      acceptedFrom: panel.dates.acceptedAt?.from || undefined,
      acceptedTo: panel.dates.acceptedAt?.to || undefined,
      overdue: overdue === "Vencida" ? true : overdue === "En plazo" ? false : undefined,
      assignedTo:
        analista === WITHOUT_ASSIGN ? "none" : analista ? analistaByName.get(analista) : undefined,
    };
  }, [legajo, search, panel.enums, panel.dates, analistaByName]);

  const list = useQuery({
    queryKey: [...ALERTS_QUERY_KEY, filters, page, pageSize],
    queryFn: () => listAlerts({ ...filters, page, pageSize }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
  const rows = list.data?.rows ?? [];
  const total = list.data?.total ?? 0;

  const [detail, setDetail] = useState<AlertItem | null>(null);
  const [ruling, setRuling] = useState<Ruling | null>(null);
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY });
  // El detalle sigue a la fila refrescada (asignaciones, contadores).
  const detailVivo = detail ? (rows.find((r) => r.id === detail.id) ?? detail) : null;

  const aceptar = async (a: AlertItem) => {
    try {
      await acceptAlert(a.id);
      toast.success("Alerta aceptada: queda en revisión");
      await refresh();
    } catch (e) {
      toast.error(userMessage(e));
    }
  };

  const confirmRuling = async () => {
    if (!ruling) return;
    if (notes.trim().length < 5) {
      toast.error("Escribí el dictamen (al menos 5 caracteres)");
      return;
    }
    setSending(true);
    try {
      await resolveAlert(ruling.alert.id, ruling.resolution, notes.trim());
      toast.success(`Alerta cerrada: ${ALERT_RESOLUTION_LABEL[ruling.resolution]}`);
      setRuling(null);
      setNotes("");
      setDetail(null);
      await refresh();
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setSending(false);
    }
  };

  const exportar = async () => {
    try {
      const all = await listAllAlerts(filters);
      downloadCsv(
        `alertas-${legajo ? `${legajo}-` : ""}${new Date().toISOString().slice(0, 10)}.csv`,
        [
          "Legajo",
          "Correo",
          "Nombre",
          "Tipo",
          "Motivo",
          "Estado",
          "Activo",
          "Analista responsable",
          "Fecha de alerta",
          "Fecha de aceptación",
          "Vencimiento",
          "Vencida",
          "Fecha de cierre",
          "Cerrada por",
          "Resultado",
          "Dictamen",
          "Comentarios",
          "Adjuntos",
          "TXID",
        ],
        all.map((a) => [
          a.legajo,
          a.correo,
          a.nombre,
          a.type,
          a.description,
          ALERT_STATUS_LABEL[a.status],
          a.isActive ? "Sí" : "No",
          a.assignedToName ?? "",
          a.createdAt,
          a.acceptedAt ?? "",
          a.dueAt,
          a.isOverdue ? "Sí" : "No",
          a.resolvedAt ?? "",
          a.resolvedByName ?? "",
          a.resolution ? ALERT_RESOLUTION_LABEL[a.resolution] : "",
          a.resolutionNotes ?? "",
          a.commentsCount,
          a.attachmentsCount,
          a.idTxn ?? "",
        ]),
      );
    } catch (e) {
      toast.error(`No se pudo exportar: ${userMessage(e)}`);
    }
  };

  const openRuling = (alert: AlertItem, resolution: AlertResolution) => {
    setNotes("");
    setRuling({ alert, resolution });
  };

  const verOperation = (idTxn: string) =>
    navigate({ to: "/admin/general/movimientos", search: { txid: idTxn } });

  const getActions = (a: AlertItem): ActionItem[] => {
    const abierta = a.status === "pending" || a.status === "in_review";
    return [
      { label: "Ver detalle y gestión", icon: Eye, onClick: () => setDetail(a) },
      ...(a.status === "pending"
        ? [
            {
              label: "Aceptar (iniciar revisión)",
              icon: CheckCircle,
              onClick: () => void aceptar(a),
            },
          ]
        : []),
      ...(abierta
        ? [
            {
              label: "Resolver: operación justificada",
              icon: ShieldCheck,
              onClick: () => openRuling(a, "justified"),
            },
            {
              label: "Registrar ROS",
              icon: FileWarning,
              variant: "danger" as const,
              onClick: () => openRuling(a, "ros"),
            },
            {
              label: "Descartar: falso positivo",
              icon: XCircle,
              onClick: () => openRuling(a, "false_positive"),
            },
          ]
        : []),
      ...(a.idTxn
        ? [{ label: "Ver operación", icon: ArrowRightLeft, onClick: () => verOperation(a.idTxn!) }]
        : []),
    ];
  };

  const columnsCustomer: Column<AlertItem>[] = enFicha
    ? []
    : [
        {
          key: "legajo",
          label: "Legajo",
          minWidth: 130,
          render: (r) => <LegajoCell legajo={r.legajo} />,
        },
        { key: "correo", label: "Correo", minWidth: 180, maxWidth: 260, render: (r) => r.correo },
        { key: "nombre", label: "Nombre", minWidth: 160, maxWidth: 240, render: (r) => r.nombre },
      ];

  const columns: Column<AlertItem>[] = [
    ...columnsCustomer,
    {
      key: "type",
      label: "Tipo de alerta",
      minWidth: 200,
      maxWidth: 280,
      tooltip: (r) => r.description,
      render: (r) => r.type,
    },
    {
      key: "estado",
      label: "Estado",
      filterable: "enum",
      filterOptions: STATUS_OPTIONS,
      minWidth: 120,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <Badge tone={STATUS_TONE[r.status]}>{ALERT_STATUS_LABEL[r.status]}</Badge>
          {r.resolution && (
            <span className="text-[11px] text-muted-foreground">
              {ALERT_RESOLUTION_LABEL[r.resolution]}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "activo",
      label: "Activo",
      filterable: "enum",
      filterOptions: ["Sí", "No"],
      minWidth: 80,
      render: (r) => (
        <Badge tone={r.isActive ? "warn" : "neutral"}>{r.isActive ? "Sí" : "No"}</Badge>
      ),
    },
    {
      key: "analista",
      label: "Analista",
      filterable: "enum",
      filterOptions: [WITHOUT_ASSIGN, ...(analistas.data ?? []).map((a) => a.nombre)],
      minWidth: 140,
      render: (r) =>
        r.assignedToName ?? <span className="text-muted-foreground">{WITHOUT_ASSIGN}</span>,
    },
    {
      key: "createdAt",
      label: "Fecha de alerta",
      filterable: "date",
      minWidth: 150,
      render: (r) => (
        <span className="font-mono tabular-nums text-xs">{formatDateTime(r.createdAt)}</span>
      ),
    },
    {
      key: "vencimiento",
      label: "Vencimiento",
      filterable: "enum",
      filterOptions: ["Vencida", "En plazo"],
      minWidth: 130,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono tabular-nums text-xs">{fmtDay(r.dueAt)}</span>
          {r.isOverdue ? (
            <Badge tone="danger">Vencida</Badge>
          ) : r.isActive && daysRestantes(r.dueAt) <= 15 ? (
            <span className="text-[11px] font-medium text-amber-700">
              Vence en {daysRestantes(r.dueAt)} día(s)
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "acceptedAt",
      label: "Fecha de aceptación",
      filterable: "date",
      minWidth: 150,
      render: (r) => (
        <span className="font-mono tabular-nums text-xs">{formatDateTime(r.acceptedAt)}</span>
      ),
    },
    {
      key: "resolvedAt",
      label: "Fecha de cierre",
      minWidth: 150,
      render: (r) => (
        <span className="font-mono tabular-nums text-xs">{formatDateTime(r.resolvedAt)}</span>
      ),
    },
  ];
  return {
    legajo,
    enFicha,
    page,
    setPage,
    pageSize,
    setPageSize,
    panel,
    setPanel,
    list,
    rows,
    total,
    detail,
    setDetail,
    ruling,
    setRuling,
    notes,
    setNotes,
    sending,
    refresh,
    detailVivo,
    aceptar,
    confirmRuling,
    exportar,
    openRuling,
    getActions,
    columns,
  };
}

export type AlertsTableVm = ReturnType<typeof useAlertsTable>;
