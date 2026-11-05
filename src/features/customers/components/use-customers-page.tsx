import { useQuery,useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { type TableServerFilters } from "@/shared/ui/data-table";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import {
LABEL_A_STATUS,
STATUS_LABEL,
STATUS_TONE,
normalizeStatus,
} from "@/features/customers/customer-status.rules";
import { type Customer,type StatusCustomer } from "@/infrastructure/supabase/legacy/types";
import { useCustomers } from "@/features/customers/customers.hooks";
import { useCan } from "@/features/rbac/rbac.hooks";
import {
activarCustomer,
aprobarDocumentacionCustomer,
disableCustomer,
formatCuit,
getCustomerByLegajo,
getCustomersEnrichment,
reactivateCustomer,
removeCustomer,
suspendCustomer,
type CustomerEnrichment,
} from "@/features/customers/customers.supabase";
import { AppError,isAppError,userMessage } from "@/shared/lib/errors";
import { toast } from "sonner";
import { type ActionItem } from "@/shared/ui/actions-dropdown";
import {
Ban,
CheckCircle,
Eye,
Inbox,
RotateCcw,
ShieldCheck,
Trash2,
XCircle,
} from "lucide-react";
import { type User } from "@/features/customers/customers.types";

/** Estado y acciones de CustomersPage: el componente solo dibuja. */
export function useCustomersPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Buscar de la card: server-side contra toda la base (no solo la página).
  const [filtersPanel, setFiltersPanel] = useState<TableServerFilters>({
    global: "",
    enums: {},
    dates: {},
  });
  const search = useDebouncedValue(filtersPanel.global.trim(), 350);
  const applyFilters = (f: TableServerFilters) => {
    setPage(0);
    setFiltersPanel(f);
  };

  const statusFilterDb = filterStatus
    ? (LABEL_A_STATUS[filterStatus] as StatusCustomer | undefined)
    : undefined;

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } = useCustomers({
    page,
    pageSize,
    estado: statusFilterDb,
    tipoPersona: "fisica",
    search: search || undefined,
  });

  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const { can } = useCan();
  const canUpdate = can("modificar", "usuarios");
  const canDelete = can("borrar", "usuarios");

  // Enrichment paralelo: riesgo PLAFT + CVUs + KYC + consumo del mes.
  // Se cachea por legajos (no por filtros), así no se dispara en cada cambio
  // de paginación. Se invalida junto con la lista de clientes via queryClient.
  const enrichmentQuery = useQuery<Record<string, CustomerEnrichment>>({
    queryKey: ["clientes-enrichment", rows.map((r) => r.legajo).join("|")],
    queryFn: async () => getCustomersEnrichment(rows.map((r) => r.legajo)),
    enabled: rows.length > 0,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
  const enrichmentMap = enrichmentQuery.data ?? {};

  const data: User[] = rows.map((c: Customer) => {
    const norm = normalizeStatus(c.estado);
    const e = enrichmentMap[c.legajo] ?? {};
    return {
      id: c.id,
      legajo: c.legajo,
      correo: c.correo,
      nombres: c.nombre,
      cuit: c.cuit,
      cuitFormatted: formatCuit(c.cuit),
      estadoRaw: c.estado,
      estadoLabel: STATUS_LABEL[norm],
      estadoTone: STATUS_TONE[norm] as User["estadoTone"],
      fechaRegistro: c.fechaAlta,
      esPep: Boolean(c.esPep),
      riesgo: e.riesgo ?? null,
      riesgoMotivo: e.riesgoMotivo ?? null,
      kycCompleto: Boolean(e.kycCompleto),
      cvuCount: e.cvuCount ?? 0,
      consumoMensualPct: e.consumoMensualPct ?? null,
      limiteTransferencia: c.limiteTransferencia ?? null,
    };
  });

  const run = async (
    legajo: string,
    action: "aprobar" | "activar" | "suspender" | "reactivar" | "deshabilitar" | "eliminar",
  ) => {
    try {
      const customer = await getCustomerByLegajo(legajo);
      if (!customer) throw new AppError("validation", "Cliente no encontrado");
      let res: { ok: boolean; motivo?: string } | { ok: true } = {
        ok: false,
        motivo: "No implementado",
      };
      if (action === "aprobar") res = await aprobarDocumentacionCustomer(customer);
      else if (action === "activar") res = await activarCustomer(customer);
      else if (action === "suspender") res = await suspendCustomer(customer);
      else if (action === "reactivar") res = await reactivateCustomer(customer);
      else if (action === "deshabilitar") res = await disableCustomer(customer);
      else if (action === "eliminar") res = await removeCustomer(customer);

      if (!res.ok) {
        const reason = (res as { motivo?: string }).motivo ?? "No se pudo completar la acción";
        toast.error(reason);
        setConfirmAction({
          title: "No se pudo completar",
          message: reason,
          confirmLabel: "Cerrar",
          variant: "danger",
          onConfirm: () => setConfirmAction(null),
        });
        return;
      }
      toast.success("Estado actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setConfirmAction(null);
    } catch (e) {
      const msg = userMessage(e);
      toast.error(msg);
      setConfirmAction({
        title: "Error",
        message: msg,
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    }
  };

  const getActions = (row: User): ActionItem[] => {
    const norm = normalizeStatus(row.estadoRaw);
    const items: ActionItem[] = [
      {
        label: "Ver / editar ficha",
        icon: Eye,
        onClick: () =>
          navigate({ to: "/admin/general/usuarios/$legajo", params: { legajo: row.legajo } }),
      },
      {
        label: "Asignar / gestionar CVU",
        icon: ShieldCheck,
        disabled: !canUpdate,
        onClick: () =>
          navigate({
            to: "/admin/general/usuarios/$legajo",
            params: { legajo: row.legajo },
            search: { tab: "cvu" },
          }),
      },
      {
        label: "Ver historial de movimientos",
        icon: Inbox,
        onClick: () =>
          navigate({ to: "/admin/general/movimientos", search: { legajo: row.legajo } }),
      },
    ];

    if (norm === "registrado") {
      items.push({
        label: "Preactivar (aprobar documentación)",
        icon: ShieldCheck,
        disabled: !canUpdate,
        onClick: () =>
          setConfirmAction({
            title: "Aprobar documentación",
            message: `¿Aprobar la documentación de ${row.nombres}? Pasará a Preactivado.`,
            confirmLabel: "Aprobar",
            variant: "default",
            onConfirm: () => run(row.legajo, "aprobar"),
          }),
      });
    }
    if (norm === "preactivado") {
      items.push({
        label: "Activar",
        icon: CheckCircle,
        disabled: !canUpdate,
        onClick: () =>
          setConfirmAction({
            title: "Activar usuario",
            message: `¿Activar a ${row.nombres}? Requiere CVU y comisión cargados.`,
            confirmLabel: "Activar",
            variant: "default",
            onConfirm: () => run(row.legajo, "activar"),
          }),
      });
    }
    if (norm === "activado") {
      items.push({
        label: "Suspender",
        icon: XCircle,
        disabled: !canUpdate,
        variant: "danger" as const,
        onClick: () =>
          setConfirmAction({
            title: "Suspender usuario",
            message: `¿Suspender a ${row.nombres}? Se conservará su historial.`,
            confirmLabel: "Suspender",
            variant: "danger",
            onConfirm: () => run(row.legajo, "suspender"),
          }),
      });
    }
    if (norm === "suspendido") {
      items.push({
        label: "Reactivar",
        icon: RotateCcw,
        disabled: !canUpdate,
        onClick: () =>
          setConfirmAction({
            title: "Reactivar usuario",
            message: `¿Reactivar a ${row.nombres}?`,
            confirmLabel: "Reactivar",
            variant: "default",
            onConfirm: () => run(row.legajo, "reactivar"),
          }),
      });
    }
    if (norm !== "deshabilitado" && norm !== "eliminado") {
      items.push({
        label: "Deshabilitar",
        icon: Ban,
        disabled: !canUpdate,
        variant: "danger" as const,
        onClick: () =>
          setConfirmAction({
            title: "Deshabilitar usuario",
            message: `¿Deshabilitar a ${row.nombres}? Se cancelará su CVU y se conservará el historial (auditoría BCRA).`,
            confirmLabel: "Deshabilitar",
            variant: "danger",
            onConfirm: () => run(row.legajo, "deshabilitar"),
          }),
      });
      items.push({
        label: "Eliminar",
        icon: Trash2,
        disabled: !canDelete,
        variant: "danger" as const,
        onClick: () =>
          setConfirmAction({
            title: "Eliminar usuario",
            message: `¿Eliminar a ${row.nombres}? Solo se permite si nunca tuvo movimientos.`,
            confirmLabel: "Eliminar",
            variant: "danger",
            onConfirm: () => run(row.legajo, "eliminar"),
          }),
      });
    }

    return items;
  };

  const err = isAppError(error) ? error : null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    filterStatus,
    setFilterStatus,
    filtersPanel,
    applyFilters,
    total,
    isLoading,
    isFetching,
    isError,
    error,
    isEmpty,
    refetch,
    confirmAction,
    setConfirmAction,
    data,
    getActions,
    err,
    totalPages,
  };
}

export type CustomersPageVm = ReturnType<typeof useCustomersPage>;
