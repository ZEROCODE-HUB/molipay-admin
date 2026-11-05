import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import {
type LevelMerchant,
type Merchant,
type StatusMerchant,
} from "@/infrastructure/supabase/legacy/types";
import { useCan } from "@/features/rbac/rbac.hooks";
import { useCustomersForSelect,useMerchants } from "@/features/merchants/merchants.hooks";
import { useCodesCategory } from "@/features/merchants/category-codes.hooks";
import { useActiveBackofficeUsers } from "@/features/backoffice-users/backoffice-users.hooks";
import {
createMerchant,
disableMerchant,
setMerchantStatus,
updateMerchant,
} from "@/features/merchants/merchants.supabase";
import { isAppError,userMessage } from "@/shared/lib/errors";
import { type ActionItem } from "@/shared/ui/actions-dropdown";
import { CheckCircle,Edit3,Eye,Trash2,XCircle } from "lucide-react";
import { type Column } from "@/shared/ui/data-table";
import { LegajoCell } from "@/shared/ui/legajo-label";
import { Badge } from "@/shared/ui/badge";
import { statusBadgeTone } from "@/features/merchants/merchants.rules";

/** Estado y acciones de MerchantsPage: el componente solo dibuja. */
export function useMerchantsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);
  const [statusFilter, setStatusFilter] = useState<StatusMerchant | "">("");
  const [levelFilter, setLevelFilter] = useState<LevelMerchant | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { can } = useCan();
  const canCreate = can("crear", "comercios");
  const canUpdate = can("modificar", "comercios");
  const canDelete = can("borrar", "comercios");

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } = useMerchants({
    page,
    pageSize,
    search,
    estado: statusFilter || undefined,
    nivel: levelFilter || undefined,
    fechaDesde: dateFrom || undefined,
    fechaHasta: dateTo || undefined,
  });

  const { rows: categories } = useCodesCategory({ page: 0, pageSize: 1000 });
  const { data: customers } = useCustomersForSelect();
  const { data: adminUsers } = useActiveBackofficeUsers();

  const [detail, setDetail] = useState<Merchant | null>(null);
  const [editTarget, setEditTarget] = useState<Merchant | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Merchant | null>(null);
  const [disableReason, setDisableReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["comercios"] });

  const changeStatus = async (row: Merchant, nuevo: StatusMerchant) => {
    try {
      await setMerchantStatus(row.id, nuevo);
      invalidate();
    } catch (e) {
      setConfirmAction({
        title: "No se pudo actualizar",
        message: userMessage(e),
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    }
  };

  const save = async (input: {
    clienteLegajo: string;
    usuario: string;
    nombreComercio: string | null;
    categoriaId: number | null;
    nivel: LevelMerchant;
    estado: StatusMerchant;
    ejecutivoResponsableId: string | null;
    siteId: string | null;
  }) => {
    setIsSaving(true);
    try {
      if (editTarget) {
        await updateMerchant(editTarget.id, {
          usuario: input.usuario,
          nombreComercio: input.nombreComercio,
          categoriaId: input.categoriaId,
          nivel: input.nivel,
          estado: input.estado,
          ejecutivoResponsableId: input.ejecutivoResponsableId,
          siteId: input.siteId,
        });
      } else {
        await createMerchant({
          legajo: input.clienteLegajo,
          usuario: input.usuario,
          nombreComercio: input.nombreComercio,
          categoriaId: input.categoriaId,
          nivel: input.nivel,
          estado: input.estado,
          ejecutivoResponsableId: input.ejecutivoResponsableId,
          siteId: input.siteId,
        });
      }
      invalidate();
      setShowNew(false);
      setEditTarget(null);
    } catch (e) {
      setConfirmAction({
        title: "No se pudo guardar",
        message: userMessage(e),
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const disable = async () => {
    if (!confirmDelete || !disableReason.trim()) return;
    try {
      await disableMerchant(confirmDelete.id, disableReason.trim());
      invalidate();
    } catch (e) {
      setConfirmAction({
        title: "No se pudo deshabilitar",
        message: userMessage(e),
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    }
    setConfirmDelete(null);
    setDisableReason("");
  };

  const getActions = (row: Merchant): ActionItem[] => {
    const items: ActionItem[] = [
      { label: "Ver detalle", icon: Eye, onClick: () => setDetail(row) },
      {
        label: "Editar",
        icon: Edit3,
        disabled: !canUpdate,
        onClick: () => setEditTarget(row),
      },
    ];
    // Solo habilitar/deshabilitar (estados de comercio). Sin gestion de medios de pago.
    if (row.estado === "Activado") {
      items.push({
        label: "Deshabilitar",
        icon: XCircle,
        variant: "danger",
        disabled: !canUpdate,
        onClick: () => changeStatus(row, "Desactivado"),
      });
    } else {
      items.push({
        label: "Habilitar",
        icon: CheckCircle,
        disabled: !canUpdate,
        onClick: () => changeStatus(row, "Activado"),
      });
    }
    items.push({
      label: "Deshabilitar",
      icon: Trash2,
      variant: "danger",
      disabled: !canUpdate,
      onClick: () => setConfirmDelete(row),
    });
    return items;
  };

  const columns: Column<Merchant>[] = [
    {
      key: "usuario",
      label: "Usuario",
      sortable: true,
      minWidth: 160,
      maxWidth: 280,
      render: (r) => (
        <div>
          <div className="font-semibold">{r.usuario}</div>
          {r.cliente?.nombre && (
            <div className="text-xs text-muted-foreground">{r.cliente.nombre}</div>
          )}
          <LegajoCell legajo={r.legajo} className="text-xs" />
        </div>
      ),
    },
    {
      key: "cliente",
      label: "Nombre comercial",
      sortable: true,
      minWidth: 200,
      maxWidth: 320,
      render: (r) => r.nombreComercio ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "categoria",
      label: "Categoría",
      sortable: true,
      minWidth: 140,
      render: (r) =>
        r.categoria ? (
          <span className="font-mono tabular-nums">
            {r.categoria.codigo} · {r.categoria.nombre}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "nivel",
      label: "Nivel",
      sortable: true,
      minWidth: 100,
      render: (r) => r.nivel,
    },
    {
      key: "ejecutivo",
      label: "Ejecutivo",
      sortable: true,
      minWidth: 160,
      render: (r) =>
        r.ejecutivo ? (
          <div className="text-sm">
            <div className="font-medium truncate max-w-[140px]">{r.ejecutivo.nombre}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[140px]">
              {r.ejecutivo.email}
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Sin asignar</span>
        ),
    },
    {
      key: "puntosVenta",
      label: "Puntos de venta",
      sortable: false,
      minWidth: 120,
      render: (r) => <span className="font-mono tabular-nums text-xs">{r.puntosVenta.length}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      minWidth: 120,
      render: (r) => <Badge tone={statusBadgeTone(r.estado)}>{r.estado}</Badge>,
    },
    {
      key: "createdAt",
      label: "Registro",
      sortable: true,
      minWidth: 120,
      render: (r) => (
        <span className="font-mono text-xs tabular-nums">
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
    searchInput,
    setSearchInput,
    statusFilter,
    setStatusFilter,
    levelFilter,
    setLevelFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    canCreate,
    rows,
    total,
    isLoading,
    isFetching,
    isError,
    error,
    isEmpty,
    refetch,
    categories,
    customers,
    adminUsers,
    detail,
    setDetail,
    editTarget,
    setEditTarget,
    showNew,
    setShowNew,
    confirmDelete,
    setConfirmDelete,
    disableReason,
    setDisableReason,
    isSaving,
    confirmAction,
    setConfirmAction,
    save,
    disable,
    getActions,
    columns,
    err,
    totalPages,
  };
}

export type MerchantsPageVm = ReturnType<typeof useMerchantsPage>;
