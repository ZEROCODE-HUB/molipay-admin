import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useCan } from "@/features/rbac/rbac.hooks";
import { useTaxesAssignments } from "@/features/taxes/taxes.hooks";
import { isAppError,userMessage } from "@/shared/lib/errors";
import {
ADDRESS_DE_OPERATION,
type TaxAssignment,
type TaxAssignmentInput,
} from "@/infrastructure/supabase/legacy/types";
import {
createTaxAssignment,
deleteTaxAssignment,
setTaxAssignmentStatus,
updateTaxAssignment,
} from "@/features/taxes/taxes.supabase";
import { pgErrorCode } from "@/infrastructure/supabase/errors";
import { type ActionItem } from "@/shared/ui/actions-dropdown";
import { Edit3,Power,PowerOff,Trash2 } from "lucide-react";
import { type Column } from "@/shared/ui/data-table";
import { Badge } from "@/shared/ui/badge";
import { SummaryRate } from "@/features/taxes/components/rate-summary";
import { LABEL_SOURCE,PAGE_SIZE,ratePropiaLabel } from "@/features/taxes/tax-users.rules";

/** Estado y acciones de TaxUsersPage: el componente solo dibuja. */
export function useTaxUsersPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"asignaciones" | "por_cobrar">("asignaciones");
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);
  const [statusFilter, setStatusFilter] = useState<"Activo" | "Inactivo" | "">("");
  const [searchFrom, setSearchFrom] = useState("");
  const [searchTo, setSearchTo] = useState("");

  const { can } = useCan();
  const canCreate = can("crear", "impuestos");
  const canUpdate = can("modificar", "impuestos");
  const canDelete = can("borrar", "impuestos");

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } =
    useTaxesAssignments({
      page,
      pageSize: PAGE_SIZE,
      search,
      estado: statusFilter || undefined,
    });

  const err = isAppError(error) ? error : null;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [editTarget, setEditTarget] = useState<TaxAssignment | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<TaxAssignment | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tax_assignments"] });

  const toggleStatus = async (row: TaxAssignment) => {
    try {
      await setTaxAssignmentStatus(row.id, row.estado === "Activo" ? "Inactivo" : "Activo");
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

  const save = async (input: TaxAssignmentInput) => {
    try {
      if (editTarget) {
        const { cliente_legajo: _legajo, impuesto_id: _Tax, ...changes } = input;
        await updateTaxAssignment(editTarget.id, changes);
      } else {
        await createTaxAssignment(input);
      }
      invalidate();
      setShowNew(false);
      setEditTarget(null);
    } catch (e) {
      const esFk = pgErrorCode(e) === "23503";
      setConfirmAction({
        title: "No se pudo guardar",
        message: esFk
          ? `El legajo "${input.cliente_legajo}" no existe en la tabla de clientes. Verificá el formato (LPF/LPJ-CUIT).`
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
      await deleteTaxAssignment(confirmDelete.id);
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

  const getActions = (row: TaxAssignment): ActionItem[] => [
    {
      label: row.estado === "Activo" ? "Desactivar" : "Activar",
      icon: row.estado === "Activo" ? PowerOff : Power,
      disabled: !canUpdate,
      onClick: () => toggleStatus(row),
    },
    { label: "Editar", icon: Edit3, disabled: !canUpdate, onClick: () => setEditTarget(row) },
    {
      label: "Eliminar",
      icon: Trash2,
      variant: "danger",
      disabled: !canDelete,
      onClick: () => setConfirmDelete(row),
    },
  ];

  const columns: Column<TaxAssignment>[] = [
    {
      key: "clienteLegajo",
      label: "Legajo",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums text-xs">{r.clienteLegajo}</span>,
    },
    {
      key: "clienteNombre",
      label: "Cliente",
      render: (r) =>
        r.cliente ? (
          <div className="leading-tight">
            <div className="font-medium">{r.cliente.nombre}</div>
            <div className="text-xs text-muted-foreground font-mono">{r.cliente.cuit}</div>
          </div>
        ) : (
          "—"
        ),
    },
    {
      key: "impuesto",
      label: "Impuesto",
      render: (r) =>
        r.impuesto ? (
          <div className="leading-tight">
            <div className="font-medium">{r.impuesto.nombre}</div>
            <div className="text-xs text-muted-foreground">
              <span className="font-mono">{r.impuesto.codigo}</span> ·{" "}
              {LABEL_SOURCE[r.impuesto.fuenteAlicuota]}
            </div>
          </div>
        ) : (
          "—"
        ),
    },
    {
      key: "operacion",
      label: "Operación",
      sortable: true,
      render: (r) =>
        r.operacion ? (
          <Badge tone="neutral">
            {r.operacion} ·{" "}
            {ADDRESS_DE_OPERATION[r.operacion] === "Saliente" ? "Pay-Out" : "Pay-In"}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Todas</span>
        ),
    },
    {
      key: "alicuota",
      label: "Alícuota que aplica",
      render: (r) => {
        if (!r.impuesto) return "—";
        if (r.impuesto.fuenteAlicuota === "Manual")
          return <span className="font-mono tabular-nums">{ratePropiaLabel(r)}</span>;
        return (
          <SummaryRate
            fuente={r.impuesto.fuenteAlicuota}
            alicuotas={r.impuesto.alicuotas}
            direccion={r.operacion ? ADDRESS_DE_OPERATION[r.operacion] : undefined}
          />
        );
      },
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      render: (r) => <Badge tone={r.estado === "Activo" ? "success" : "neutral"}>{r.estado}</Badge>,
    },
    {
      key: "fechaAsignacion",
      label: "Fecha de asignación",
      sortable: true,
      render: (r) =>
        r.fechaAsignacion ? (
          <span className="font-mono tabular-nums">
            {new Date(r.fechaAsignacion).toLocaleDateString("es-AR")}
          </span>
        ) : (
          "—"
        ),
    },
  ];
  return {
    tab,
    setTab,
    page,
    setPage,
    searchInput,
    setSearchInput,
    statusFilter,
    setStatusFilter,
    searchFrom,
    setSearchFrom,
    searchTo,
    setSearchTo,
    canCreate,
    rows,
    total,
    isLoading,
    isFetching,
    isError,
    error,
    isEmpty,
    refetch,
    err,
    totalPages,
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
  };
}

export type TaxUsersPageVm = ReturnType<typeof useTaxUsersPage>;
