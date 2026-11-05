import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { type TableServerFilters } from "@/shared/ui/data-table";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useFees } from "@/features/customers/fees.hooks";
import {
type KindOperation,
type ModalidadFee,
type StatusFee,
} from "@/infrastructure/supabase/legacy/types";
import { useCan } from "@/features/rbac/rbac.hooks";
import { type ActionItem } from "@/shared/ui/actions-dropdown";
import { Edit3,Eye,XCircle } from "lucide-react";
import { getCustomerByEmail } from "@/features/customers/customers.supabase";
import { listFees,setFeeStatus,upsertFee } from "@/features/customers/fees.supabase";
import { isAppError,userMessage } from "@/shared/lib/errors";
import { desgloseFromConfig } from "@/shared/lib/fee-schedule";
import { AMOUNT_OPERATION_REF,KINDS_FEE_USERS } from "@/features/customers/customer-fees.rules";
import { type Fee,type FeeDraft } from "@/features/customers/customer-fees.types";

/** Estado y acciones de CustomerFeesPage: el componente solo dibuja. */
export function useCustomerFeesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Filtros de la card: server-side contra toda la base.
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
  const [scope, setScope] = useState<"" | "cvu" | "cuenta">("");
  const [legajoFilter, setLegajoFilter] = useState("");
  const [cvuFilter, setCvuFilter] = useState("");
  const legajoQ = useDebouncedValue(legajoFilter.trim(), 350);
  const cvuQ = useDebouncedValue(cvuFilter.trim(), 350);

  // Depósito y Retiro se filtran en la base: así el total y las páginas coinciden.
  const { rows, total, isLoading, isFetching, isError, error, refetch } = useFees({
    page,
    pageSize,
    search: search || undefined,
    tipo: (filtersPanel.enums.tipo as KindOperation) || undefined,
    tipos: KINDS_FEE_USERS,
    modalidad: (filtersPanel.enums.modalidad as ModalidadFee) || undefined,
    estado: (filtersPanel.enums.estado as StatusFee) || undefined,
    alcance: scope || undefined,
    legajo: legajoQ || undefined,
    cvu: cvuQ || undefined,
  });

  const [viewing, setViewing] = useState<Fee | null>(null);
  const [editTarget, setEditTarget] = useState<Fee | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const { can } = useCan();
  const canCreate = can("crear", "usuarios");
  const canUpdate = can("modificar", "usuarios");

  const data: Fee[] = rows.map((c) => ({
    id: c.id,
    legajo: c.cliente?.legajo ?? "—",
    correo: c.cliente?.correo ?? "—",
    cuit: c.cliente?.cuit ?? "—",
    tipoPersona: c.cliente?.tipoPersona ?? "fisica",
    operacion: c.operacion,
    tipo: c.tipo,
    modalidad: c.modalidad,
    estado: c.estado,
    porcentaje: c.porcentaje,
    montoFijo: c.montoFijo,
    porcentajeImpuesto: c.porcentajeImpuesto,
    descripcion: c.descripcion ?? "",
    subcuentaId: c.subcuentaId,
    cvu: c.subcuenta?.cbu ?? null,
  }));

  const [draft, setDraft] = useState<FeeDraft>({
    correo: "",
    legajo: "",
    cuit: "",
    tipoPersona: "fisica",
    subcuentaId: null,
    tipo: "Depósito",
    modalidad: "Porcentaje",
    porcentaje: 1,
    montoFijo: null,
    porcentajeImpuesto: 21,
    estado: "Habilitado",
    descripcion: "",
  });

  const getActions = (row: Fee): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setViewing(row) },
    { label: "Editar", icon: Edit3, onClick: () => openEdicion(row), disabled: !canUpdate },
    ...(row.estado === "Habilitado"
      ? [
          {
            label: "Deshabilitar",
            icon: XCircle,
            variant: "danger" as const,
            disabled: !canUpdate,
            onClick: () =>
              setConfirmAction({
                title: "Deshabilitar comisión",
                message: `¿Estás seguro de deshabilitar la comisión ${row.legajo}?`,
                confirmLabel: "Deshabilitar",
                variant: "danger",
                onConfirm: () => changeStatus(row, "Deshabilitado"),
              }),
          },
        ]
      : [
          {
            label: "Habilitar",
            icon: Eye,
            disabled: !canUpdate,
            onClick: () =>
              setConfirmAction({
                title: "Habilitar comisión",
                message: `¿Estás seguro de habilitar la comisión ${row.legajo}?`,
                confirmLabel: "Habilitar",
                variant: "default",
                onConfirm: () => changeStatus(row, "Habilitado"),
              }),
          },
        ]),
  ];

  const openNew = () => {
    setDraft({
      correo: "",
      legajo: "",
      cuit: "",
      tipoPersona: "fisica",
      subcuentaId: null,
      tipo: "Depósito",
      modalidad: "Porcentaje",
      porcentaje: 1,
      montoFijo: null,
      porcentajeImpuesto: 21,
      estado: "Habilitado",
      descripcion: "",
    });
    setFormError(null);
    setShowNew(true);
  };

  const openEdicion = (c: Fee) => {
    setDraft({
      id: c.id,
      correo: c.correo,
      legajo: c.legajo === "—" ? "" : c.legajo,
      cuit: c.cuit,
      tipoPersona: c.tipoPersona,
      subcuentaId: c.subcuentaId,
      tipo: c.tipo,
      modalidad: c.modalidad,
      porcentaje: c.porcentaje,
      montoFijo: c.montoFijo,
      porcentajeImpuesto: c.porcentajeImpuesto,
      estado: c.estado,
      descripcion: c.descripcion,
    });
    setFormError(null);
    setEditTarget(c);
  };

  const changeStatus = async (row: Fee, nuevo: StatusFee) => {
    try {
      // Solo puede haber UNA comision Habilitada por CVU (o por cliente) y tipo:
      // antes de activar esta, se verifica que no haya otra activa del mismo alcance.
      if (nuevo === "Habilitado") {
        const customer = await getCustomerByEmail(row.correo.toLowerCase());
        if (customer) {
          const activas = await listFees({
            clienteId: customer.id,
            tipo: row.tipo,
            estado: "Habilitado",
            page: 0,
            pageSize: 20,
          });
          const otra = activas.rows.find(
            (c) => c.id !== row.id && (c.subcuentaId ?? null) === (row.subcuentaId ?? null),
          );
          if (otra) {
            const scope = row.cvu ? `el CVU ${row.cvu}` : "toda la cuenta";
            setConfirmAction({
              title: "Ya hay una comisión activa de ese tipo",
              message: `Ya hay una comisión de "${row.tipo}" habilitada para ${scope}. Deshabilitá esa antes de activar otra.`,
              confirmLabel: "Cerrar",
              variant: "danger",
              onConfirm: () => setConfirmAction(null),
            });
            return;
          }
        }
      }

      await setFeeStatus(row.id, nuevo);
      queryClient.invalidateQueries({ queryKey: ["comisiones"] });
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

  const saveDraft = async () => {
    setFormError(null);
    if (!draft.correo) {
      setFormError("Seleccioná el email del cliente (búsqueda rápida).");
      return;
    }
    setSaving(true);
    try {
      const customer = await getCustomerByEmail(draft.correo.trim().toLowerCase());
      if (!customer) {
        setFormError("No existe un cliente con ese correo. Dalo de alta primero.");
        setSaving(false);
        return;
      }

      // Solo puede haber UNA comision HABILITADA por alcance (CVU, o cliente si no
      // hay CVU) y tipo: se pueden guardar deshabilitadas, pero no dos activas del
      // mismo alcance a la vez.
      if (draft.estado === "Habilitado") {
        const activas = await listFees({
          clienteId: customer.id,
          tipo: draft.tipo,
          estado: "Habilitado",
          page: 0,
          pageSize: 20,
        });
        const otra = activas.rows.find(
          (c) => c.id !== draft.id && (c.subcuentaId ?? null) === (draft.subcuentaId ?? null),
        );
        if (otra) {
          const scope = draft.subcuentaId
            ? `el CVU elegido`
            : `toda la cuenta de ${customer.correo}`;
          setFormError(
            `Ya hay una comisión de "${draft.tipo}" activa para ${scope}. Deshabilitá esa, o guardá esta como "Deshabilitado".`,
          );
          setSaving(false);
          return;
        }
      }
      await upsertFee({
        id: draft.id,
        clienteId: customer.id,
        subcuentaId: draft.subcuentaId,
        // Código único por cliente (constraint comision_unica_por_operacion).
        operacion: draft.id
          ? (editTarget?.operacion ?? "")
          : `${draft.tipo === "Retiro" ? "RET" : "DEP"}-${draft.subcuentaId ? "CVU" : "CTA"}-${Date.now()}`,
        tipo: draft.tipo,
        modalidad: draft.modalidad,
        porcentaje: draft.modalidad === "Porcentaje" ? draft.porcentaje : null,
        montoFijo: draft.modalidad === "Fijo" ? draft.montoFijo : null,
        porcentajeImpuesto: draft.porcentajeImpuesto,
        estado: draft.estado,
        descripcion: draft.descripcion,
      });
      queryClient.invalidateQueries({ queryKey: ["comisiones"] });
      queryClient.invalidateQueries({ queryKey: ["comisiones_cliente", customer.legajo] });
      queryClient.invalidateQueries({ queryKey: ["comisiones", "by-legajo", customer.legajo] });
      // fuerza refetch del detalle si está abierto
      queryClient.invalidateQueries({ queryKey: ["subcuentas", customer.legajo] });
      setShowNew(false);
      setEditTarget(null);
    } catch (e) {
      setFormError(userMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const draftDesglose = desgloseFromConfig(
    {
      operacion: draft.tipo,
      tipo: draft.tipo,
      modalidad: draft.modalidad,
      porcentaje: draft.porcentaje,
      montoFijo: draft.montoFijo,
      porcentajeImpuesto: draft.porcentajeImpuesto,
    },
    AMOUNT_OPERATION_REF,
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const err = isAppError(error) ? error : null;
  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    filtersPanel,
    applyFilters,
    scope,
    setScope,
    legajoFilter,
    setLegajoFilter,
    cvuFilter,
    setCvuFilter,
    total,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    viewing,
    setViewing,
    editTarget,
    setEditTarget,
    showNew,
    setShowNew,
    saving,
    formError,
    confirmAction,
    setConfirmAction,
    canCreate,
    data,
    draft,
    setDraft,
    getActions,
    openNew,
    saveDraft,
    draftDesglose,
    totalPages,
    err,
  };
}

export type CustomerFeesPageVm = ReturnType<typeof useCustomerFeesPage>;
