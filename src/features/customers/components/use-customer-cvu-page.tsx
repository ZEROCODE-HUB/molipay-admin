import { isAppError,userMessage } from "@/shared/lib/errors";
import { useState } from "react";
import { Eye,Edit3,XCircle,Zap } from "lucide-react";
import { type TableServerFilters } from "@/shared/ui/data-table";
import { type ActionItem } from "@/shared/ui/actions-dropdown";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { listAllCvus,updateSubaccount } from "@/features/customers/subaccounts.supabase";
import { assignCvuForNew,assignCvuForExistente } from "@/features/customers/cvu.supabase";
import { getCustomerByEmail } from "@/features/customers/customers.supabase";
import { useCustomersForSelect } from "@/features/merchants/merchants.hooks";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { toast } from "sonner";
import type { CvuRow,SubaccountKind } from "@/features/customers/subaccounts.supabase";
import { useCan } from "@/features/rbac/rbac.hooks";

/** Estado y acciones de CustomerCvuPage: el componente solo dibuja. */
export function useCustomerCvuPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Buscar y fecha de la card: server-side contra toda la base.
  const [filtersPanel, setFiltersPanel] = useState<TableServerFilters>({
    global: "",
    enums: {},
    dates: {},
  });
  const search = useDebouncedValue(filtersPanel.global.trim(), 350);
  const rangeDate = Object.values(filtersPanel.dates)[0];
  const applyFilters = (f: TableServerFilters) => {
    setPage(0);
    setFiltersPanel(f);
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["cvus", page, pageSize, statusFilter, search, rangeDate?.from, rangeDate?.to],
    queryFn: () =>
      listAllCvus({
        page,
        pageSize,
        estado: (statusFilter as never) || undefined,
        search: search || undefined,
        fechaDesde: rangeDate?.from || undefined,
        fechaHasta: rangeDate?.to || undefined,
      }),
  });

  const rows = (data?.rows ?? []) as CvuRow[];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [showNew, setShowNew] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const [formAlias, setFormAlias] = useState("");
  const [formKind, setFormKind] = useState<SubaccountKind>("Operativa");
  const [formSearch, setFormSearch] = useState("");
  const debouncedFormSearch = useDebouncedValue(formSearch, 350);
  const { data: customersOpt } = useCustomersForSelect(debouncedFormSearch || undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [viewing, setViewing] = useState<CvuRow | null>(null);
  const [editTarget, setEditTarget] = useState<CvuRow | null>(null);
  const [editAlias, setEditAlias] = useState("");

  const { can } = useCan();
  const canCreate = can("crear", "usuarios");
  const canUpdate = can("modificar", "usuarios");

  const create = async () => {
    const email = formEmail.trim() || formSearch.trim();
    if (!email) {
      toast.error("Seleccioná un usuario por email");
      return;
    }
    setSaving(true);
    try {
      const customer = await getCustomerByEmail(email.toLowerCase());
      if (!customer) {
        toast.error("No existe un cliente con ese email");
        setSaving(false);
        return;
      }
      // Llamada centralizada: mismo flujo BDC + audit + fallback que el
      // boton "Generar CVU" del menu. Asi NO se inventan CVUs locales
      // para el CVU inicial del titular (que es el camino mas importante
      // regulatoriamente).
      const result = await assignCvuForNew({
        cliente: {
          id: customer.id,
          legajo: customer.legajo,
          correo: customer.correo,
          cuit: customer.cuit,
          nombre: customer.nombre,
          tipoPersona: customer.tipoPersona,
        },
        alias: formAlias.trim() || undefined,
        tipo: formKind,
        origin: "admin",
      });

      // Si BDC rechazo explicitamente (alias_taken o cuit_invalid), el helper
      // ya mostro el toast y NO creo la subcuenta. Salimos sin cerrar el modal
      // para que el operador pueda corregir el alias.
      if (result.kind === "rechazado") {
        setSaving(false);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["cvus"] });
      queryClient.invalidateQueries({ queryKey: ["subcuentas", customer.legajo] });
      setShowNew(false);
      setFormEmail("");
      setFormAlias("");
      setFormSearch("");
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const saveEdicion = async () => {
    if (!editTarget) return;
    try {
      await updateSubaccount(editTarget.clienteLegajo, editTarget.id, {
        cbu: editTarget.cbu ?? undefined,
      });
      // alias not stored in subcuenta, but we keep edit for demo (no column)
      toast.success("Actualizado");
      queryClient.invalidateQueries({ queryKey: ["cvus"] });
      queryClient.invalidateQueries({ queryKey: ["subcuentas", editTarget.clienteLegajo] });
      setEditTarget(null);
    } catch (e) {
      toast.error(userMessage(e));
    }
  };

  const getActions = (row: CvuRow): ActionItem[] => {
    const items: ActionItem[] = [
      { label: "Ver detalles", icon: Eye, onClick: () => setViewing(row) },
    ];

    // Acción contextual: si la subcuenta no tiene CVU todavia, el operador
    // puede pedir la asignacion contra BDC/COELSA. Toda la logica vive en
    // `asignarCvuParaExistente` (centralizada en `lib/api/cvu.ts`) para que
    // modal y menu compartan exactamente el mismo flow.
    if (!row.cbu) {
      items.push({
        label: "Generar CVU (BDC/COELSA)",
        icon: Zap,
        disabled: !canUpdate,
        onClick: async () => {
          const cuit = (row.cliente?.cuit ?? "").replace(/\D/g, "");
          if (!row.legajo || !cuit) {
            toast.error("No se pudo identificar el titular (legajo o CUIT faltante).");
            return;
          }
          const result = await assignCvuForExistente({
            cliente: {
              id: row.id,
              legajo: row.legajo,
              correo: row.cliente?.correo ?? row.email ?? "",
              cuit,
              nombre: `${row.nombre} ${row.apellido}`.trim() || row.nombre,
              tipoPersona: row.cliente?.tipoPersona === "juridica" ? "juridica" : "fisica",
            },
            subcuentaId: row.id,
            tipo: row.tipo,
            origin: "admin",
          });
          if (result.kind === "rechazado") {
            return;
          }
          queryClient.invalidateQueries({ queryKey: ["cvus"] });
          queryClient.invalidateQueries({ queryKey: ["subcuentas", row.clienteLegajo] });
        },
      });
    }

    items.push({
      label: "Editar",
      icon: Edit3,
      disabled: !canUpdate,
      onClick: () => {
        setEditTarget(row);
        setEditAlias(row.cbu?.slice(-6) ?? "");
      },
    });

    items.push({
      label: row.estado === "Activa" ? "Deshabilitar" : "Habilitar",
      icon: XCircle,
      variant: row.estado === "Activa" ? ("danger" as const) : undefined,
      disabled: !canUpdate,
      onClick: async () => {
        try {
          await updateSubaccount(row.clienteLegajo, row.id, {
            estado: row.estado === "Activa" ? "Pausada" : "Activa",
          });
          queryClient.invalidateQueries({ queryKey: ["cvus"] });
          queryClient.invalidateQueries({ queryKey: ["subcuentas", row.clienteLegajo] });
        } catch (e) {
          toast.error(userMessage(e));
        }
      },
    });

    return items;
  };

  const err = isAppError(error) ? error : null;
  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    statusFilter,
    setStatusFilter,
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
    totalPages,
    showNew,
    setShowNew,
    setFormEmail,
    formAlias,
    setFormAlias,
    formKind,
    setFormKind,
    formSearch,
    setFormSearch,
    customersOpt,
    formOpen,
    setFormOpen,
    saving,
    viewing,
    setViewing,
    editTarget,
    setEditTarget,
    editAlias,
    setEditAlias,
    canCreate,
    create,
    saveEdicion,
    getActions,
    err,
  };
}

export type CustomerCvuPageVm = ReturnType<typeof useCustomerCvuPage>;
