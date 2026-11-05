import { userMessage } from "@/shared/lib/errors";
import { useNavigate } from "@tanstack/react-router";
import { useMemo,useState } from "react";
import { keepPreviousData,useQuery,useQueryClient } from "@tanstack/react-query";
import { Eye,CheckCircle,Unlock,ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { type Column,type TableServerFilters } from "@/shared/ui/data-table";
import { type ActionItem } from "@/shared/ui/actions-dropdown";
import { Badge } from "@/shared/ui/badge";
import { LegajoCell } from "@/shared/ui/legajo-label";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { downloadCsv } from "@/features/alerts/alert-rules.supabase";
import {
acceptBlock,
listAllBlocks,
listBlocks,
releaseBlock,
type AccountBlock,
type BlockFilters,
} from "@/features/regulatory-reports/compliance.supabase";
import { formatMoney,formatDateTime } from "@/shared/lib/format";
import {
STATUS_BY_LABEL,
COMPLIANCE_BY_LABEL,
SCOPE_BY_LABEL,
BLOCKS_QUERY_KEY,
SCOPE_LABEL,
STATUS_LABEL,
COMPLIANCE_LABEL,
} from "@/features/alerts/blocks-table.rules";

/** Estado y acciones de BlocksTable: el componente solo dibuja. */
export function useBlocksTable({ legajo }: { legajo?: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const enFicha = Boolean(legajo);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(enFicha ? 10 : 20);
  const [panel, setPanel] = useState<TableServerFilters>({ global: "", enums: {}, dates: {} });
  const search = useDebouncedValue(panel.global.trim(), 350);

  const filters: BlockFilters = useMemo(
    () => ({
      legajo,
      search: search || undefined,
      blockStatus: panel.enums.estado ? STATUS_BY_LABEL.get(panel.enums.estado) : undefined,
      complianceStatus: panel.enums.compliance
        ? COMPLIANCE_BY_LABEL.get(panel.enums.compliance)
        : undefined,
      scope: panel.enums.alcance ? SCOPE_BY_LABEL.get(panel.enums.alcance) : undefined,
      blockedFrom: panel.dates.blockedAt?.from || undefined,
      blockedTo: panel.dates.blockedAt?.to || undefined,
      acceptedFrom: panel.dates.acceptedAt?.from || undefined,
      acceptedTo: panel.dates.acceptedAt?.to || undefined,
    }),
    [legajo, search, panel.enums, panel.dates],
  );

  const list = useQuery({
    queryKey: [...BLOCKS_QUERY_KEY, filters, page, pageSize],
    queryFn: () => listBlocks({ ...filters, page, pageSize }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
  const rows = list.data?.rows ?? [];
  const total = list.data?.total ?? 0;

  const [detail, setDetail] = useState<AccountBlock | null>(null);
  const [aceptando, setAceptando] = useState<AccountBlock | null>(null);
  const [liberando, setLiberando] = useState<AccountBlock | null>(null);
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: BLOCKS_QUERY_KEY });

  const aceptar = async () => {
    if (!aceptando) return;
    try {
      await acceptBlock(aceptando.id);
      toast.success("Bloqueo aceptado por Compliance (sigue activo hasta liberarlo)");
      await refresh();
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setAceptando(null);
    }
  };

  const liberar = async () => {
    if (!liberando) return;
    if (notes.trim().length < 5) {
      toast.error("Indicá el motivo de la liberación (al menos 5 caracteres)");
      return;
    }
    setSending(true);
    try {
      const r = await releaseBlock(liberando.id, notes.trim());
      toast.success(
        r.depositos_liberados > 0
          ? `Bloqueo liberado. Se liberaron ${r.depositos_liberados} depósito(s) retenido(s) por ${formatMoney(Number(r.monto_liberado))}.`
          : "Bloqueo liberado.",
      );
      setLiberando(null);
      setDetail(null);
      await refresh();
      // Los saldos y movimientos del cliente cambiaron.
      await queryClient.invalidateQueries({ queryKey: ["subcuentas"] });
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setSending(false);
    }
  };

  const exportar = async () => {
    try {
      const all = await listAllBlocks(filters);
      downloadCsv(
        `bloqueos-${legajo ? `${legajo}-` : ""}${new Date().toISOString().slice(0, 10)}.csv`,
        [
          "Legajo",
          "Usuario",
          "Nombre",
          "Origen",
          "Alcance",
          "Subcuenta",
          "Motivo",
          "Estado",
          "Compliance",
          "Fecha de bloqueo",
          "Fecha de aceptación",
          "Fecha de liberación",
          "Retenido",
        ],
        all.map((b) => [
          b.legajo,
          b.correo,
          b.nombre,
          b.origin === "rule" ? `Regla: ${b.ruleName ?? ""}` : "Manual",
          SCOPE_LABEL[b.scope],
          b.subcuentaNombre ?? "",
          b.reason,
          STATUS_LABEL[b.blockStatus],
          COMPLIANCE_LABEL[b.complianceStatus],
          b.blockedAt,
          b.acceptedAt ?? "",
          b.releasedAt ?? "",
          b.heldAmount,
        ]),
      );
    } catch (e) {
      toast.error(`No se pudo exportar: ${userMessage(e)}`);
    }
  };

  const getActions = (b: AccountBlock): ActionItem[] => [
    { label: "Ver detalle", icon: Eye, onClick: () => setDetail(b) },
    ...(b.complianceStatus === "pending"
      ? [{ label: "Aceptar (Compliance)", icon: CheckCircle, onClick: () => setAceptando(b) }]
      : []),
    ...(b.blockStatus === "active"
      ? [
          {
            label: "Desbloquear",
            icon: Unlock,
            variant: "danger" as const,
            onClick: () => {
              setNotes("");
              setLiberando(b);
            },
          },
        ]
      : []),
    ...(b.idTxn
      ? [
          {
            label: "Ver operación",
            icon: ArrowRightLeft,
            onClick: () =>
              navigate({ to: "/admin/general/movimientos", search: { txid: b.idTxn! } }),
          },
        ]
      : []),
  ];

  const columnsCustomer: Column<AccountBlock>[] = enFicha
    ? []
    : [
        {
          key: "legajo",
          label: "Legajo",
          minWidth: 130,
          render: (r) => <LegajoCell legajo={r.legajo} />,
        },
        { key: "correo", label: "Usuario", minWidth: 180, maxWidth: 260, render: (r) => r.correo },
        { key: "nombre", label: "Nombre", minWidth: 160, maxWidth: 240, render: (r) => r.nombre },
      ];

  const columns: Column<AccountBlock>[] = [
    ...columnsCustomer,
    {
      key: "alcance",
      label: "Tipo / alcance",
      filterable: "enum",
      filterOptions: Object.values(SCOPE_LABEL),
      minWidth: 190,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">
            {r.origin === "rule" ? (r.ruleName ?? "Regla") : "Manual"}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {SCOPE_LABEL[r.scope]}
            {r.scope === "subaccount" && r.subcuentaNombre ? `: ${r.subcuentaNombre}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "reason",
      label: "Motivo",
      minWidth: 200,
      maxWidth: 300,
      tooltip: (r) => r.reason,
      render: (r) => r.reason,
    },
    {
      key: "estado",
      label: "Estado",
      filterable: "enum",
      filterOptions: Object.values(STATUS_LABEL),
      minWidth: 120,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <Badge tone={r.blockStatus === "active" ? "danger" : "success"}>
            {STATUS_LABEL[r.blockStatus]}
          </Badge>
          {r.heldAmount > 0 && (
            <span className="text-[11px] text-muted-foreground">
              Retenido {formatMoney(r.heldAmount)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "compliance",
      label: "Compliance",
      filterable: "enum",
      filterOptions: Object.values(COMPLIANCE_LABEL),
      minWidth: 110,
      render: (r) => (
        <Badge tone={r.complianceStatus === "accepted" ? "success" : "warn"}>
          {COMPLIANCE_LABEL[r.complianceStatus]}
        </Badge>
      ),
    },
    {
      key: "blockedAt",
      label: "Fecha de bloqueo",
      filterable: "date",
      minWidth: 150,
      render: (r) => (
        <span className="font-mono tabular-nums text-xs">{formatDateTime(r.blockedAt)}</span>
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
    aceptando,
    setAceptando,
    liberando,
    setLiberando,
    notes,
    setNotes,
    sending,
    aceptar,
    liberar,
    exportar,
    getActions,
    columns,
  };
}

export type BlocksTableVm = ReturnType<typeof useBlocksTable>;
