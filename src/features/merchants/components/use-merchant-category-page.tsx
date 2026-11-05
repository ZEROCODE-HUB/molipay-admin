import { isAppError,userMessage } from "@/shared/lib/errors";
import { pgErrorCode } from "@/infrastructure/supabase/errors";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle,XCircle,Edit3,Trash2 } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { type Column } from "@/shared/ui/data-table";
import { type ActionItem } from "@/shared/ui/actions-dropdown";
import { useCodesCategory } from "@/features/merchants/category-codes.hooks";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import {
createCodeCategory,
deleteCodeCategory,
setCodeCategoryStatus,
updateCodeCategory,
} from "@/features/merchants/category-codes.supabase";
import type { CodeCategory } from "@/infrastructure/supabase/legacy/types";
import { useCan } from "@/features/rbac/rbac.hooks";
import { PAGE_SIZE,statusBadgeTone } from "@/features/merchants/merchant-category.rules";
import { type CategoryForm } from "@/features/merchants/merchant-category.types";

/** Estado y acciones de MerchantCategoryPage: el componente solo dibuja. */
export function useMerchantCategoryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);
  const [statusFilter, setStatusFilter] = useState<"activo" | "inactivo" | "">("");

  const { can } = useCan();
  const canCreate = can("crear", "comercios");
  const canUpdate = can("modificar", "comercios");
  const canDelete = can("borrar", "comercios");

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } = useCodesCategory(
    {
      page,
      pageSize: PAGE_SIZE,
      search,
      estado: statusFilter || undefined,
    },
  );

  const [editTarget, setEditTarget] = useState<CodeCategory | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<CodeCategory | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["codigos_categoria"] });

  const changeStatus = async (row: CodeCategory, nuevo: "activo" | "inactivo") => {
    try {
      await setCodeCategoryStatus(row.id, nuevo);
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

  const save = async (form: CategoryForm) => {
    try {
      if (editTarget) {
        await updateCodeCategory(editTarget.id, {
          codigo: form.codigo,
          nombre: form.nombre,
          descripcion: form.descripcion,
        });
      } else {
        await createCodeCategory({
          codigo: form.codigo,
          nombre: form.nombre,
          descripcion: form.descripcion,
          estado: "activo",
        });
      }
      invalidate();
      setShowNew(false);
      setEditTarget(null);
    } catch (e) {
      const isDuplicado = pgErrorCode(e) === "23505";
      setConfirmAction({
        title: "No se pudo guardar",
        message: isDuplicado
          ? `Ya existe otra categoría con el código "${form.codigo.trim()}". El código debe ser único.`
          : userMessage(e),
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      await deleteCodeCategory(confirmDelete.id);
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

  const getActions = (row: CodeCategory): ActionItem[] => {
    const items: ActionItem[] = [];
    if (row.estado === "activo") {
      items.push({
        label: "Desactivar",
        icon: XCircle,
        variant: "danger",
        disabled: !canUpdate,
        onClick: () => changeStatus(row, "inactivo"),
      });
    } else {
      items.push({
        label: "Activar",
        icon: CheckCircle,
        disabled: !canUpdate,
        onClick: () => changeStatus(row, "activo"),
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
      icon: Trash2,
      variant: "danger",
      disabled: !canDelete,
      onClick: () => setConfirmDelete(row),
    });
    return items;
  };

  const columns: Column<CodeCategory>[] = [
    {
      key: "codigo",
      label: "Código",
      sortable: true,
      render: (r) => <span className="font-mono text-xs">{r.codigo}</span>,
    },
    {
      key: "nombre",
      label: "Nombre",
      sortable: true,
      render: (r) => <span className="font-semibold">{r.nombre}</span>,
    },
    {
      key: "descripcion",
      label: "Descripción",
      sortable: true,
      render: (r) => <span className="text-sm text-muted-foreground">{r.descripcion}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      render: (r) => <Badge tone={statusBadgeTone(r.estado)}>{r.estado}</Badge>,
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

export type MerchantCategoryPageVm = ReturnType<typeof useMerchantCategoryPage>;
