import { isAppError,userMessage } from "@/shared/lib/errors";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle,XCircle,Edit3 } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { type Column } from "@/shared/ui/data-table";
import { type ActionItem } from "@/shared/ui/actions-dropdown";
import { useResolvers } from "@/features/external-apis/resolvers.hooks";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import {
createResolver,
deleteResolver,
setResolverStatus,
updateResolver,
} from "@/features/external-apis/resolvers.supabase";
import type { Resolver,ResolverStatus } from "@/infrastructure/supabase/legacy/types";
import { useCan } from "@/features/rbac/rbac.hooks";
import { PAGE_SIZE } from "@/features/external-apis/resolvers.rules";
import { type ResolverForm } from "@/features/external-apis/resolvers.types";

/** Estado y acciones de ResolversPage: el componente solo dibuja. */
export function useResolversPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);
  const [statusFilter, setStatusFilter] = useState<ResolverStatus | "">("");

  const { can } = useCan();
  const canCreate = can("crear", "resolvers");
  const canUpdate = can("modificar", "resolvers");
  const canDelete = can("borrar", "resolvers");

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } = useResolvers({
    page,
    pageSize: PAGE_SIZE,
    search,
    estado: statusFilter || undefined,
  });

  const [editTarget, setEditTarget] = useState<Resolver | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Resolver | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["resolvers"] });

  const changeStatus = async (row: Resolver, nuevo: ResolverStatus) => {
    try {
      await setResolverStatus(row.id, nuevo);
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

  const save = async (form: ResolverForm) => {
    try {
      if (editTarget) {
        await updateResolver(editTarget.id, {
          nombre: form.nombre,
          cuit: form.cuit,
          nombreReverso: form.nombreReverso,
          formatoWeb: form.formatoWeb,
          pcpId: form.pcpId,
          idPcp: form.idPcp,
          url: form.url,
          token: form.token,
          asHeader: form.asHeader,
          soa: form.soa,
        });
      } else {
        await createResolver({
          nombre: form.nombre,
          cuit: form.cuit,
          nombreReverso: form.nombreReverso,
          formatoWeb: form.formatoWeb,
          pcpId: form.pcpId,
          idPcp: form.idPcp,
          url: form.url,
          token: form.token,
          asHeader: form.asHeader,
          soa: form.soa,
          estado: "Activo",
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
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      await deleteResolver(confirmDelete.id);
      invalidate();
    } catch (e) {
      setConfirmAction({
        title: "No se pudo eliminar",
        message: userMessage(e),
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    }
    setConfirmDelete(null);
  };

  const getActions = (row: Resolver): ActionItem[] => {
    const items: ActionItem[] = [];
    if (row.estado === "Activo") {
      items.push({
        label: "Desactivar",
        icon: XCircle,
        variant: "danger",
        disabled: !canUpdate,
        onClick: () => changeStatus(row, "Inactivo"),
      });
    } else {
      items.push({
        label: "Activar",
        icon: CheckCircle,
        disabled: !canUpdate,
        onClick: () => changeStatus(row, "Activo"),
      });
    }
    items.push({
      label: "Editar",
      icon: Edit3,
      disabled: !canUpdate,
      onClick: () => setEditTarget(row),
    });
    items.push({
      label: "Eliminar",
      icon: XCircle,
      variant: "danger",
      disabled: !canDelete,
      onClick: () => setConfirmDelete(row),
    });
    return items;
  };

  const columns: Column<Resolver>[] = [
    {
      key: "nombre",
      label: "Nombre del resolver",
      sortable: true,
      render: (r) => <span className="font-semibold">{r.nombre}</span>,
    },
    {
      key: "cuit",
      label: "CUIT del resolver",
      sortable: true,
      render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.cuit}</span>,
    },
    {
      key: "url",
      label: "URL del resolver",
      sortable: true,
      render: (r) => <span className="text-xs font-mono text-foreground/80">{r.url || "—"}</span>,
    },
    {
      key: "pcpId",
      label: "PCP ID",
      sortable: true,
      render: (r) => <span className="font-mono text-xs">{r.pcpId || "—"}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      render: (r) => <Badge tone={r.estado === "Activo" ? "success" : "neutral"}>{r.estado}</Badge>,
    },
  ];

  const err = isAppError(error) ? error : null;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return {
    page,
    setPage,
    searchInput,
    setSearchInput,
    statusFilter,
    setStatusFilter,
    canCreate,
    rows,
    total,
    isLoading,
    isFetching,
    isError,
    error,
    isEmpty,
    refetch,
    editTarget,
    setEditTarget,
    showNew,
    setShowNew,
    confirmDelete,
    setConfirmDelete,
    confirmAction,
    setConfirmAction,
    save,
    remove,
    getActions,
    columns,
    err,
    totalPages,
  };
}

export type ResolversPageVm = ReturnType<typeof useResolversPage>;
