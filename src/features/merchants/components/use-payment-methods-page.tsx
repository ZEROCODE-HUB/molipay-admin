import { useState,useEffect } from "react";
import { Edit3,Eye } from "lucide-react";
import { type Column } from "@/shared/ui/data-table";
import { type ActionItem } from "@/shared/ui/actions-dropdown";
import { Badge } from "@/shared/ui/badge";
import {
listBrands,
createBrand,
updateBrand,
deleteBrand,
type Brand,
} from "@/features/merchants/card-brands.supabase";
import { toast } from "sonner";
import { type MethodPaymentForm } from "@/features/merchants/payment-methods.types";
import { KINDS_METHOD,STATUSES } from "@/features/merchants/payment-methods.rules";

/** Estado y acciones de PaymentMethodsPage: el componente solo dibuja. */
export function usePaymentMethodsPage() {
  const [data, setData] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ metodo: Brand | null } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Brand | null>(null);

  useEffect(() => {
    listBrands()
      .then(setData)
      .catch(() => toast.error("Error cargando métodos de pago"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (m: MethodPaymentForm) => {
    try {
      if (m.id) {
        const updated = await updateBrand(m.id, {
          nombre: m.nombre,
          tipo: m.tipo,
          diasHabilesAcreditacion: m.diasHabiles,
          estado: m.estado as "Activo" | "Inactivo",
        });
        setData((prev) => prev.map((d) => (d.id === m.id ? updated : d)));
        toast.success("Método de pago actualizado");
      } else {
        const created = await createBrand({
          nombre: m.nombre,
          tipo: m.tipo,
          diasHabilesAcreditacion: m.diasHabiles,
        });
        setData((prev) => [...prev, created]);
        toast.success("Método de pago creado");
      }
      setModal(null);
    } catch {
      toast.error("Error al guardar método de pago");
    }
  };

  const handleDelete = async (b: Brand) => {
    try {
      await deleteBrand(b.id);
      setData((prev) => prev.filter((d) => d.id !== b.id));
      setConfirmDelete(null);
      setModal(null);
      toast.success("Método de pago eliminado");
    } catch {
      toast.error("Error al eliminar método de pago");
    }
  };

  const getActions = (r: Brand): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setModal({ metodo: r }) },
    { label: "Editar", icon: Edit3, onClick: () => setModal({ metodo: r }) },
  ];

  const columns: Column<Brand>[] = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono text-xs tabular-nums">{r.id.slice(0, 8)}</span>,
    },
    {
      key: "nombre",
      label: "Nombre",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-semibold">{r.nombre}</span>,
    },
    {
      key: "tipo",
      label: "Tipo",
      sortable: true,
      filterable: "enum",
      filterOptions: KINDS_METHOD,
      render: (r) => r.tipo,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      filterable: "enum",
      filterOptions: STATUSES,
      render: (r) => <Badge tone={r.estado === "Activo" ? "success" : "neutral"}>{r.estado}</Badge>,
    },
    {
      key: "diasHabiles",
      label: "Días háb.",
      sortable: true,
      render: (r) => <span className="font-mono">{r.diasHabilesAcreditacion}</span>,
    },
  ];
  return {
    data,
    loading,
    modal,
    setModal,
    confirmDelete,
    setConfirmDelete,
    handleSave,
    handleDelete,
    getActions,
    columns,
  };
}

export type PaymentMethodsPageVm = ReturnType<typeof usePaymentMethodsPage>;
