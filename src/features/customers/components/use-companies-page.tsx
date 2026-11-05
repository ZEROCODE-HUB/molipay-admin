import { isAppError,AppError,userMessage } from "@/shared/lib/errors";
import { useNavigate } from "@tanstack/react-router";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye,XCircle,RotateCcw,Trash2,ShieldCheck,Ban,CheckCircle } from "lucide-react";
import { type TableServerFilters } from "@/shared/ui/data-table";
import { type ActionItem } from "@/shared/ui/actions-dropdown";
import { useCustomers } from "@/features/customers/customers.hooks";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import {
aprobarDocumentacionCustomer,
activarCustomer,
suspendCustomer,
reactivateCustomer,
disableCustomer,
removeCustomer,
getCustomerByLegajo,
getCustomersEnrichment,
formatCuit,
type CustomerEnrichment,
} from "@/features/customers/customers.supabase";
import type { Customer,StatusCustomer } from "@/infrastructure/supabase/legacy/types";
import {
STATUS_LABEL,
STATUS_TONE,
normalizeStatus,
LABEL_A_STATUS,
} from "@/features/customers/customer-status.rules";
import { toast } from "sonner";
import { useCan } from "@/features/rbac/rbac.hooks";
import { type JuridicaRow } from "@/features/customers/companies.types";
import { kindCompanyToLabel } from "@/features/customers/companies.rules";

/** Estado y acciones de CompaniesPage: el componente solo dibuja. */
export function useCompaniesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filterStatus, setFilterStatus] = useState("");
  const statusFilterDb = filterStatus
    ? (LABEL_A_STATUS[filterStatus] as StatusCustomer | undefined)
    : undefined;

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

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } = useCustomers({
    page,
    pageSize,
    estado: statusFilterDb,
    tipoPersona: "juridica",
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

  // Enrichment paralelo: comercios y CVUs por legajo (mismo patrón que Personas Físicas).
  const enrichmentQuery = useQuery<Record<string, CustomerEnrichment>>({
    queryKey: ["clientes-enrichment-juridicas", rows.map((r) => r.legajo).join("|")],
    queryFn: async () => getCustomersEnrichment(rows.map((r) => r.legajo)),
    enabled: rows.length > 0,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
  const enrichmentMap = enrichmentQuery.data ?? {};

  const data: JuridicaRow[] = rows.map((c: Customer) => {
    const norm = normalizeStatus(c.estado);
    const e = enrichmentMap[c.legajo] ?? {};
    return {
      id: c.id,
      legajo: c.legajo,
      correo: c.correo,
      cuit: c.cuit,
      cuitFormatted: formatCuit(c.cuit),
      razonSocial: c.nombre,
      nombreFantasia: c.nombreFantasia ?? null,
      tipoSociedadRaw: c.tipoSociedad ?? null,
      tipoLabel: kindCompanyToLabel(c.tipoSociedad),
      estadoRaw: c.estado,
      estadoLabel: STATUS_LABEL[norm],
      estadoTone: STATUS_TONE[norm] as JuridicaRow["estadoTone"],
      fechaRegistro: c.fechaAlta,
      esPep: Boolean(c.esPep),
      comerciosCount: e.comerciosCount ?? 0,
      cvuCount: e.cvuCount ?? 0,
    };
  });

  const run = async (
    legajo: string,
    action: "aprobar" | "activar" | "suspender" | "reactivar" | "deshabilitar" | "eliminar",
  ) => {
    try {
      const customer = await getCustomerByLegajo(legajo);
      if (!customer) throw new AppError("validation", "Cliente no encontrado");
      let res: { ok: boolean; motivo?: string } = { ok: false, motivo: "" };
      if (action === "aprobar") res = await aprobarDocumentacionCustomer(customer);
      else if (action === "activar") res = await activarCustomer(customer);
      else if (action === "suspender") res = await suspendCustomer(customer);
      else if (action === "reactivar") res = await reactivateCustomer(customer);
      else if (action === "deshabilitar") res = await disableCustomer(customer);
      else if (action === "eliminar") res = await removeCustomer(customer);
      if (!res.ok) {
        toast.error(res.motivo ?? "No se pudo completar");
        setConfirmAction({
          title: "No se pudo completar",
          message: res.motivo ?? "Error",
          confirmLabel: "Cerrar",
          variant: "danger",
          onConfirm: () => setConfirmAction(null),
        });
        return;
      }
      toast.success("Estado actualizado");
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setConfirmAction(null);
    } catch (e) {
      toast.error(userMessage(e));
      setConfirmAction({
        title: "Error",
        message: userMessage(e),
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    }
  };

  const verDetail = (row: JuridicaRow) =>
    navigate({ to: "/admin/general/usuarios/$legajo", params: { legajo: row.legajo } });

  const getActions = (row: JuridicaRow): ActionItem[] => {
    const norm = normalizeStatus(row.estadoRaw);
    const items: ActionItem[] = [
      { label: "Ver detalle", icon: Eye, onClick: () => verDetail(row) },
    ];
    if (norm === "registrado")
      items.push({
        label: "Preactivar (aprobar documentación)",
        icon: ShieldCheck,
        disabled: !canUpdate,
        onClick: () =>
          setConfirmAction({
            title: "Aprobar documentación",
            message: `¿Aprobar la documentación de ${row.razonSocial}?`,
            confirmLabel: "Aprobar",
            variant: "default",
            onConfirm: () => run(row.legajo, "aprobar"),
          }),
      });
    if (norm === "preactivado")
      items.push({
        label: "Activar",
        icon: CheckCircle,
        disabled: !canUpdate,
        onClick: () =>
          setConfirmAction({
            title: "Activar persona jurídica",
            message: `¿Activar a ${row.razonSocial}? Requiere CVU y comisión.`,
            confirmLabel: "Activar",
            variant: "default",
            onConfirm: () => run(row.legajo, "activar"),
          }),
      });
    if (norm === "activado")
      items.push({
        label: "Suspender",
        icon: XCircle,
        disabled: !canUpdate,
        variant: "danger" as const,
        onClick: () =>
          setConfirmAction({
            title: "Suspender persona jurídica",
            message: `¿Suspender a ${row.razonSocial}?`,
            confirmLabel: "Suspender",
            variant: "danger",
            onConfirm: () => run(row.legajo, "suspender"),
          }),
      });
    if (norm === "suspendido")
      items.push({
        label: "Reactivar",
        icon: RotateCcw,
        disabled: !canUpdate,
        onClick: () =>
          setConfirmAction({
            title: "Reactivar persona jurídica",
            message: `¿Reactivar a ${row.razonSocial}?`,
            confirmLabel: "Reactivar",
            variant: "default",
            onConfirm: () => run(row.legajo, "reactivar"),
          }),
      });
    if (norm !== "deshabilitado" && norm !== "eliminado") {
      items.push({
        label: "Deshabilitar",
        icon: Ban,
        disabled: !canUpdate,
        variant: "danger" as const,
        onClick: () =>
          setConfirmAction({
            title: "Deshabilitar",
            message: `¿Deshabilitar a ${row.razonSocial}? Se cancelará CVU y se conservará historial.`,
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
            title: "Eliminar",
            message: `¿Eliminar a ${row.razonSocial}? Solo si nunca tuvo movimientos.`,
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

export type CompaniesPageVm = ReturnType<typeof useCompaniesPage>;
