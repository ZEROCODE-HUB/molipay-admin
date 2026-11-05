import { fieldsIdentificacion } from "@/features/customers/customer-detail.rules";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/features/rbac/rbac.hooks";
import { useCustomerByLegajo } from "@/features/customers/customers.hooks";
import { findJuridicaMock } from "@/features/customers/companies.data";
import {
  type Customer,
  type FeeCustomer,
  type TaxAssignment,
} from "@/infrastructure/supabase/legacy/types";
import { listSubaccounts } from "@/features/customers/subaccounts.supabase";
import { useTaxesAssignments } from "@/features/taxes/taxes.hooks";
import {
  forzarValidation,
  listAlerts,
  listBlocks,
  listCustomerApiUsers,
  listCustomerModules,
  listFeesCustomer,
  listHistoryChanges,
  listLinksPayment,
  listMerchantsPst,
  listValidations,
} from "@/features/customers/customer-detail.supabase";
import { listFees } from "@/features/customers/fees.supabase";
import { listDocuments } from "@/features/customers/documents.supabase";
import { useState } from "react";
import {
  activarCustomer,
  aprobarDocumentacionCustomer,
  disableCustomer,
  listEvaluacionesRisk,
  reactivateCustomer,
  registrarEvaluacionRisk,
  removeCustomer,
  suspendCustomer,
  updateProfileTransaccional,
} from "@/features/customers/customers.supabase";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { route } from "@/features/customers/customer-detail.rules";
import { type TabKey } from "@/features/customers/customer-detail.types";

/** Estado y acciones de CustomerDetailPage: el componente solo dibuja. */
export function useCustomerDetailPage() {
  const { legajo } = route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = useCan();
  const canUpdate = can("modificar", "usuarios");

  const {
    cliente: customerReal,
    isLoading,
    isError,
    error,
    refetch,
  } = useCustomerByLegajo(legajo ?? null);

  // Las personas jurídicas de la lista son mock; si el backend no tiene la fila
  // pero coincide con el catálogo mock, sintetizamos un cliente para poder
  // visualizar la ficha (evita el error "No se encontró ningún cliente").
  const customerMock = legajo ? findJuridicaMock(legajo) : undefined;
  const customer: Customer | null =
    customerReal ??
    (customerMock
      ? {
          id: customerMock.legajo,
          legajo: customerMock.legajo,
          tipoPersona: "juridica",
          correo: customerMock.correo,
          nombre: customerMock.razonSocial,
          cuit: customerMock.cuit,
          estado: (() => {
            const e = customerMock.estado;
            if (e === "Suspendido") return "suspendido" as const;
            if (e === "Rechazado" || e === "Deshabilitado") return "deshabilitado" as const;
            if (e === "Pre-activado" || e === "Preactivado") return "preactivado" as const;
            if (e === "Registrado") return "registrado" as const;
            if (e === "Pendiente de verificación de email")
              return "pendiente_verificacion" as const;
            if (e === "Activado") return "activado" as const;
            return "registrado" as const;
          })(),
          fechaAlta: customerMock.fechaRegistro,
          createdAt: "",
          updatedAt: "",
        }
      : null);

  const subaccountsQuery = useQuery({
    queryKey: ["subcuentas", legajo],
    queryFn: () => listSubaccounts(legajo),
    enabled: !!customer,
  });

  // Saldo real = suma de subcuentas (disponible + retenido por bloqueos).
  const balanceAvailable = (subaccountsQuery.data ?? []).reduce(
    (acc, s) => acc + Number(s.saldoDisponible ?? 0),
    0,
  );
  const balanceHeld = (subaccountsQuery.data ?? []).reduce(
    (acc, s) => acc + Number(s.saldoRetenido ?? 0),
    0,
  );
  const taxesQuery = useTaxesAssignments({
    page: 0,
    pageSize: 25,
    cliente_legajo: legajo ?? undefined,
  });
  const feesQuery = useQuery({
    queryKey: ["comisiones_cliente", legajo],
    queryFn: () => listFeesCustomer(legajo),
    enabled: !!customer,
  });
  const feesRealesQuery = useQuery({
    queryKey: ["comisiones", "by-cliente", customer?.id],
    queryFn: () => listFees({ page: 0, pageSize: 10, clienteId: customer!.id }),
    enabled: !!customer?.id,
  });
  const documentsSummaryQuery = useQuery({
    queryKey: ["documentos", legajo],
    queryFn: () => listDocuments(legajo),
    enabled: !!customer,
  });

  const historyChangesQuery = useQuery({
    queryKey: ["historial_cambios", legajo],
    queryFn: () => listHistoryChanges(legajo),
    enabled: !!customer,
  });
  const validationsQuery = useQuery({
    queryKey: ["validaciones", legajo],
    queryFn: () => listValidations(legajo),
    enabled: !!customer,
  });
  const alertsQuery = useQuery({
    queryKey: ["alertas", legajo],
    queryFn: () => listAlerts(legajo),
    enabled: !!customer,
  });
  const blocksQuery = useQuery({
    queryKey: ["bloqueos", legajo],
    queryFn: () => listBlocks(legajo),
    enabled: !!customer,
  });
  const modulesQuery = useQuery({
    queryKey: ["cliente_modulos", legajo],
    queryFn: () => listCustomerModules(legajo),
    enabled: !!customer,
  });
  const merchantsPstQuery = useQuery({
    queryKey: ["comercios_pst", legajo],
    queryFn: () => listMerchantsPst(legajo),
    enabled: !!customer,
  });
  const linksPaymentQuery = useQuery({
    queryKey: ["links_pago", legajo],
    queryFn: () => listLinksPayment(legajo),
    enabled: !!customer,
  });
  const customerApiUsersQuery = useQuery({
    queryKey: ["cliente_api_usuarios", legajo],
    queryFn: () => listCustomerApiUsers(legajo),
    enabled: !!customer,
  });

  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const { tab: initialTab } = route.useSearch();
  const [activeTab, setActiveTab] = useState<TabKey>(
    initialTab === "onboarding" ? "onboarding" : "identificacion",
  );
  const [riskSub, setRiskSub] = useState<"alertas" | "bloqueos">("alertas");
  const [modulesSub, setModulesSub] = useState<"pct" | "links" | "api">("pct");

  const [editRiskOpen, setEditRiskOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  // === PLAFT: evaluaciones de riesgo (append-only) + edición de perfil transaccional ===
  const evaluacionesQuery = useQuery({
    queryKey: ["cliente-evaluaciones-riesgo", legajo],
    queryFn: () => listEvaluacionesRisk(legajo),
    staleTime: 30_000,
  });
  const riskEffective = (evaluacionesQuery.data ?? []).find((e) => e.vigente_hasta == null);
  const evaluacionesAnteriores = (evaluacionesQuery.data ?? []).filter(
    (e) => e.vigente_hasta != null,
  );

  const registrarRiskMutation = useMutation({
    mutationFn: registrarEvaluacionRisk,
    onSuccess: () => {
      toast.success("Nivel de riesgo actualizado");
      void evaluacionesQuery.refetch();
      void queryClient.invalidateQueries({ queryKey: ["clientes-enrichment"] });
      void queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setEditRiskOpen(false);
    },
    onError: (e: unknown) => {
      toast.error(userMessage(e) ?? "No se pudo registrar la evaluación");
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateProfileTransaccional,
    onSuccess: () => {
      toast.success("Límites operativos actualizados");
      void queryClient.invalidateQueries({ queryKey: ["clientes"] });
      void queryClient.invalidateQueries({ queryKey: ["clientes-enrichment"] });
      setEditProfileOpen(false);
    },
    onError: (e: unknown) => {
      toast.error(userMessage(e) ?? "No se pudo actualizar el perfil");
    },
  });

  const [pstOpen, setPstOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [apiDetailId, setApiDetailId] = useState<string | null>(null);
  const apiDetailOpen = !!apiDetailId;
  const [exemptionOpen, setExemptionOpen] = useState(false);

  const [taxDetail, setTaxDetail] = useState<TaxAssignment | null>(null);
  const [feeDetail, setFeeDetail] = useState<FeeCustomer | null>(null);
  const [newBlock, setNewBlock] = useState(false);

  const [forzando, setForzando] = useState(false);

  const changeStatusHomologado = async (
    c: Customer,
    action: "aprobar" | "activar" | "suspender" | "reactivar" | "deshabilitar" | "eliminar",
  ) => {
    try {
      let res: { ok: boolean; motivo?: string } = { ok: false, motivo: "" };
      if (action === "aprobar") res = await aprobarDocumentacionCustomer(c);
      else if (action === "activar") res = await activarCustomer(c);
      else if (action === "suspender") res = await suspendCustomer(c);
      else if (action === "reactivar") res = await reactivateCustomer(c);
      else if (action === "deshabilitar") res = await disableCustomer(c);
      else if (action === "eliminar") res = await removeCustomer(c);
      if (!res.ok) {
        setConfirmAction({
          title: "No se pudo actualizar",
          message: res.motivo ?? "No se pudo completar",
          confirmLabel: "Cerrar",
          variant: "danger",
          onConfirm: () => setConfirmAction(null),
        });
        toast.error(res.motivo ?? "No se pudo completar");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      queryClient.invalidateQueries({ queryKey: ["clientes", "legajo", c.legajo] });
      toast.success("Estado actualizado");
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

  const forzarNewValidation = async () => {
    setForzando(true);
    try {
      await forzarValidation(legajo);
      await validationsQuery.refetch();
    } catch (e) {
      setConfirmAction({
        title: "No se pudo forzar la validación",
        message: userMessage(e),
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    } finally {
      setForzando(false);
    }
  };

  const backToList = () =>
    navigate({
      to:
        customer?.tipoPersona === "juridica"
          ? "/admin/general/usuarios/juridicas"
          : "/admin/general/usuarios",
    });

  const { personal: personalRaw, compliance } = customer
    ? fieldsIdentificacion(customer)
    : { personal: [], compliance: [] };
  const accountsCount = subaccountsQuery.isLoading
    ? "…"
    : String(subaccountsQuery.data?.length ?? 0);
  const personal = personalRaw.map((p) =>
    p.label === "Cant. cuentas bancarias" || p.label === "Cant. cuentas virtuales"
      ? { ...p, valor: accountsCount }
      : p,
  );

  const tabLabel = (t: { key: TabKey; label: string }) => {
    if (t.key === "identificacion") {
      return customer?.tipoPersona === "juridica"
        ? "Datos de persona jurídica"
        : "Datos personales";
    }
    return t.label;
  };

  const modulesData = modulesQuery.data ?? [];
  const apiModule = modulesData.find((m) => m.clave === "api");
  const merchantsPst = merchantsPstQuery.data ?? [];
  const linksPayment = linksPaymentQuery.data ?? [];
  const apiUsersVinculados = customerApiUsersQuery.data ?? [];
  // cantidad real prevalece sobre desnormalizado cliente_modulos.cantidad
  const apiQuantityReal = customerApiUsersQuery.isSuccess
    ? apiUsersVinculados.length
    : (apiModule?.cantidad ?? 0);

  return {
    legajo,
    queryClient,
    isLoading,
    isError,
    error,
    refetch,
    customer,
    subaccountsQuery,
    feesRealesQuery,
    historyChangesQuery,
    merchantsPstQuery,
    confirmAction,
    setConfirmAction,
    activeTab,
    setActiveTab,
    editRiskOpen,
    setEditRiskOpen,
    editProfileOpen,
    setEditProfileOpen,
    riskEffective,
    registrarRiskMutation,
    updateProfileMutation,
    pstOpen,
    setPstOpen,
    apiDetailId,
    setApiDetailId,
    apiDetailOpen,
    exemptionOpen,
    setExemptionOpen,
    taxDetail,
    setTaxDetail,
    newBlock,
    setNewBlock,
    backToList,
    tabLabel,
    merchantsPst,
    apiQuantityReal,
    alertsQuery,
    balanceAvailable,
    balanceHeld,
    blocksQuery,
    can,
    canUpdate,
    changeStatusHomologado,
    compliance,
    customerApiUsersQuery,
    documentsSummaryQuery,
    evaluacionesAnteriores,
    feeDetail,
    feesQuery,
    forzando,
    forzarNewValidation,
    linksOpen,
    linksPayment,
    linksPaymentQuery,
    modulesData,
    modulesQuery,
    modulesSub,
    personal,
    riskSub,
    setFeeDetail,
    setLinksOpen,
    setModulesSub,
    setRiskSub,
    taxesQuery,
    validationsQuery,
  };
}

type LoadedCustomer = NonNullable<ReturnType<typeof useCustomerDetailPage>["customer"]>;
export type CustomerDetailPageVm = Omit<ReturnType<typeof useCustomerDetailPage>, "customer"> & {
  customer: LoadedCustomer;
};
