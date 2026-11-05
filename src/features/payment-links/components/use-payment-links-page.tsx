import { isAppError,userMessage } from "@/shared/lib/errors";
import { useState } from "react";
import { Eye,Ban,XCircle,Trash2,AlertTriangle,Link2,CheckCircle } from "lucide-react";
import { type TableServerFilters } from "@/shared/ui/data-table";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { type ActionItem } from "@/shared/ui/actions-dropdown";
import { Badge } from "@/shared/ui/badge";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import {
listLinks,
updateLinkStatus,
deleteLink,
STATUSES_LINK,
} from "@/features/payment-links/payment-link-urls.supabase";
import type { LinkPayment } from "@/features/payment-links/payment-link-urls.supabase";
import { useRealtimeInvalidation } from "@/infrastructure/supabase/use-realtime-invalidation";
import { useCan } from "@/features/rbac/rbac.hooks";
import { tone } from "@/features/payment-links/payment-links.rules";

/** Estado y acciones de PaymentLinksPage: el componente solo dibuja. */
export function usePaymentLinksPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const { can } = useCan();
  const canUpdate = can("modificar", "comercios");
  const canDelete = can("borrar", "comercios");

  // Filtros de la card: server-side contra toda la base.
  const [filtersPanel, setFiltersPanel] = useState<TableServerFilters>({
    global: "",
    enums: {},
    dates: {},
  });
  const search = useDebouncedValue(filtersPanel.global.trim(), 350);
  const statusFilter = (filtersPanel.enums["estado"] as string | undefined) ?? "";
  const applyFilters = (f: TableServerFilters) => {
    setPage(0);
    setFiltersPanel(f);
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["enlaces-pago", page, pageSize, search, statusFilter],
    queryFn: () =>
      listLinks({ page, pageSize, search: search || undefined, estado: statusFilter || undefined }),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  useRealtimeInvalidation([{ table: "cliente_links_pago" }], [["enlaces-pago"]]);

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const [detail, setDetail] = useState<LinkPayment | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const change = async (row: LinkPayment, nuevo: string) => {
    try {
      await updateLinkStatus(row.id, nuevo);
      qc.invalidateQueries({ queryKey: ["enlaces-pago"] });
    } catch (e) {
      setConfirm({
        title: "No se pudo actualizar",
        message: userMessage(e),
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirm(null),
      });
    }
  };
  const remove = async (row: LinkPayment) => {
    try {
      await deleteLink(row.id);
      qc.invalidateQueries({ queryKey: ["enlaces-pago"] });
    } catch (e) {
      setConfirm({
        title: "No se pudo eliminar",
        message: userMessage(e),
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirm(null),
      });
    }
  };

  const getActions = (r: LinkPayment): ActionItem[] => {
    const items: ActionItem[] = [{ label: "Ver detalles", icon: Eye, onClick: () => setDetail(r) }];
    if (r.estado !== "Activado")
      items.push({
        label: "Activar",
        icon: CheckCircle,
        disabled: !canUpdate,
        onClick: () =>
          setConfirm({
            title: "Activar enlace",
            message: `¿Activar ${r.url ?? r.id}? El enlace quedará cobrable (aún no pagado).`,
            confirmLabel: "Activar",
            variant: "default" as const,
            onConfirm: () => {
              setConfirm(null);
              void change(r, "Activado");
            },
          }),
      });
    if (r.estado !== "Desactivado")
      items.push({
        label: "Desactivar",
        icon: Ban,
        disabled: !canUpdate,
        variant: "default" as const,
        onClick: () =>
          setConfirm({
            title: "Desactivar enlace",
            message: `¿Desactivar ${r.url ?? r.id}? El comercio desactiva el link.`,
            confirmLabel: "Desactivar",
            variant: "danger",
            onConfirm: () => {
              setConfirm(null);
              void change(r, "Desactivado");
            },
          }),
      });
    if (r.estado !== "Pagado")
      items.push({
        label: "Marcar pagado",
        icon: CheckCircle,
        disabled: !canUpdate,
        onClick: () =>
          setConfirm({
            title: "Marcar como pagado",
            message: `¿Marcar ${r.url ?? r.id} como Pagado? Se habilitará detalle de método/tarjeta/cuotas.`,
            confirmLabel: "Pagado",
            variant: "default" as const,
            onConfirm: () => {
              setConfirm(null);
              void change(r, "Pagado");
            },
          }),
      });
    if (r.estado !== "Expirado" && r.estado !== "Cancelado")
      items.push({
        label: "Marcar expirado (24h)",
        icon: XCircle,
        disabled: !canUpdate,
        variant: "danger" as const,
        onClick: () =>
          setConfirm({
            title: "Expirar enlace",
            message: `¿Marcar ${r.url ?? r.id} como Expirado? El comprador no lo abrió en 24h.`,
            confirmLabel: "Expirado",
            variant: "danger",
            onConfirm: () => {
              setConfirm(null);
              void change(r, "Expirado");
            },
          }),
      });
    if (r.estado !== "Contracargo")
      items.push({
        label: "Marcar contracargo",
        icon: AlertTriangle,
        disabled: !canUpdate,
        variant: "danger" as const,
        onClick: () =>
          setConfirm({
            title: "Contracargo",
            message: `¿Marcar ${r.url ?? r.id} como Contracargo? El comprador no acepta el gasto.`,
            confirmLabel: "Contracargo",
            variant: "danger",
            onConfirm: () => {
              setConfirm(null);
              void change(r, "Contracargo");
            },
          }),
      });
    if (r.estado !== "Eliminado" && r.estado !== "Expirado" && r.estado !== "Cancelado")
      items.push({
        label: "Eliminar",
        icon: Trash2,
        disabled: !canDelete,
        variant: "danger" as const,
        onClick: () =>
          setConfirm({
            title: "Eliminar enlace",
            message: `¿Eliminar ${r.url ?? r.id}?`,
            confirmLabel: "Eliminar",
            variant: "danger",
            onConfirm: () => {
              setConfirm(null);
              void remove(r);
            },
          }),
      });
    return items;
  };

  const columns: import("@/shared/ui/data-table").Column<LinkPayment>[] = [
    {
      key: "url",
      label: "Enlace de pago",
      filterable: true,
      render: (r) => (
        <span className="font-mono text-xs break-all flex items-center gap-1">
          <Link2 size={12} />
          {r.url ?? "—"}
        </span>
      ),
    },
    { key: "comercioNombre", label: "Comercio", filterable: true, render: (r) => r.comercioNombre },
    { key: "usuario", label: "Usuario", render: (r) => r.usuario ?? r.clienteLegajo },
    {
      key: "monto",
      label: "Monto",
      render: (r) => (
        <span className="font-mono tabular-nums text-xs">
          {r.monto != null ? `$ ${Number(r.monto).toLocaleString("es-AR")}` : "—"}
        </span>
      ),
    },
    {
      key: "estado",
      label: "Estado",
      filterable: "enum",
      filterOptions: [...STATUSES_LINK],
      render: (r) => <Badge tone={tone(r.estado)}>{r.estado}</Badge>,
    },
    {
      key: "createdAt",
      label: "Fecha",
      render: (r) => (
        <span className="font-mono text-xs">
          {new Date(r.createdAt).toLocaleDateString("es-AR")}
        </span>
      ),
    },
  ];

  const err = isAppError(error) ? error : null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    filtersPanel,
    applyFilters,
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    rows,
    total,
    detail,
    setDetail,
    confirm,
    setConfirm,
    getActions,
    columns,
    err,
    totalPages,
  };
}

export type PaymentLinksPageVm = ReturnType<typeof usePaymentLinksPage>;
