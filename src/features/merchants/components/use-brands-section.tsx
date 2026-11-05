import { useEffect,useState } from "react";
import { userMessage } from "@/shared/lib/errors";

/** Estado y acciones de BrandsSection: el componente solo dibuja. */
export function useBrandsSection({ comercioId: merchantId }: { comercioId: string }) {
  const [brands, setBrands] = useState<
    import("@/infrastructure/supabase/legacy/types").MerchantBrand[]
  >([]);
  const [brandsCatalog, setBrandsCatalog] = useState<
    import("@/features/merchants/card-brands.supabase").Brand[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<
    import("@/infrastructure/supabase/legacy/types").MerchantBrand | null
  >(null);
  const [formBrandId, setFormBrandId] = useState("");
  const [formBrandCustom, setFormBrandCustom] = useState("");
  const [formMolipay, setFormMolipay] = useState("");
  const [formPayway, setFormPayway] = useState("");
  const [formStatus, setFormStatus] =
    useState<import("@/infrastructure/supabase/legacy/types").MerchantBrandStatus>("Activo");
  const [formMethodKey, setFormMethodKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<
    import("@/infrastructure/supabase/legacy/types").MerchantBrand | null
  >(null);
  const [installmentsBrand, setInstallmentsBrand] = useState<
    import("@/infrastructure/supabase/legacy/types").MerchantBrand | null
  >(null);
  const [installments, setInstallments] = useState<
    import("@/infrastructure/supabase/legacy/types").MerchantBrandInstallment[]
  >([]);
  const [installmentsLoading, setInstallmentsLoading] = useState(false);
  const [showInstallmentForm, setShowInstallmentForm] = useState(false);
  const [installmentValue, setInstallmentValue] = useState("1");
  const [installmentRate, setInstallmentRate] = useState("");
  const [installmentStatus, setInstallmentStatus] = useState<"Activo" | "Inactivo">("Activo");
  const [savingInstallment, setSavingInstallment] = useState(false);
  const [confirmDeleteInstallment, setConfirmDeleteInstallment] = useState<
    import("@/infrastructure/supabase/legacy/types").MerchantBrandInstallment | null
  >(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [merchantBrandsMod, brandsMod] = await Promise.all([
        import("@/features/merchants/merchant-brands.supabase"),
        import("@/features/merchants/card-brands.supabase"),
      ]);
      const [data, catalog] = await Promise.all([
        merchantBrandsMod.listByMerchant(merchantId),
        brandsMod.listBrands(),
      ]);
      setBrands(data);
      setBrandsCatalog(
        catalog.filter(
          (b: import("@/features/merchants/card-brands.supabase").Brand) => b.estado === "Activo",
        ),
      );
    } catch (e) {
      setError(userMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId]);

  const openCreate = () => {
    setEditing(null);
    setFormBrandId(brandsCatalog[0]?.id || "");
    setFormBrandCustom("");
    setFormMolipay("");
    setFormPayway("");
    setFormStatus("Activo");
    setFormMethodKey(brandsCatalog[0]?.metodoKey || "");
    setShowForm(true);
  };

  const openEdit = (b: import("@/infrastructure/supabase/legacy/types").MerchantBrand) => {
    setEditing(b);
    setFormBrandId(b.banderaId || "");
    setFormBrandCustom("");
    setFormMolipay(String(b.comisionMolipay));
    setFormPayway(String(b.comisionPayway));
    setFormStatus(b.estado);
    setFormMethodKey(b.metodoKey || "");
    setShowForm(true);
  };

  const save = async () => {
    const selectedBrand = brandsCatalog.find((b) => b.id === formBrandId);
    const brandFinal = selectedBrand?.nombre || formBrandCustom.trim();
    if (!brandFinal) return;
    const molipay = parseFloat(formMolipay.replace(",", ".")) || 0;
    const payway = parseFloat(formPayway.replace(",", ".")) || 0;
    setSaving(true);
    try {
      const mod = await import("@/features/merchants/merchant-brands.supabase");
      if (editing) {
        await mod.updateBrand(editing.id, {
          bandera: brandFinal,
          comisionMolipay: molipay,
          comisionPayway: payway,
          estado: formStatus,
          banderaId: formBrandId || undefined,
          metodoKey: formMethodKey || undefined,
        });
      } else {
        await mod.createBrand(merchantId, {
          bandera: brandFinal,
          comisionMolipay: molipay,
          comisionPayway: payway,
          estado: formStatus,
          banderaId: formBrandId || undefined,
          metodoKey: formMethodKey || undefined,
        });
      }
      setShowForm(false);
      await load();
    } catch (e) {
      setError(userMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      const mod = await import("@/features/merchants/merchant-brands.supabase");
      await mod.deleteBrand(confirmDelete.id);
      setConfirmDelete(null);
      await load();
    } catch (e) {
      setError(userMessage(e));
    }
  };

  const net = (() => {
    const m = parseFloat(formMolipay.replace(",", ".") || "0") || 0;
    const p = parseFloat(formPayway.replace(",", ".") || "0") || 0;
    return m - p;
  })();

  // --- Cuotas por bandera ---
  const loadInstallments = async (
    brand: import("@/infrastructure/supabase/legacy/types").MerchantBrand,
  ) => {
    setInstallmentsBrand(brand);
    setInstallmentsLoading(true);
    try {
      const { listInstallmentsByMerchantBrand: listInstallmentsByMerchantBrand } =
        await import("@/features/merchants/merchant-brand-installments.supabase");
      const data = await listInstallmentsByMerchantBrand(brand.id);
      setInstallments(data);
    } catch (e) {
      setError(userMessage(e));
    } finally {
      setInstallmentsLoading(false);
    }
  };

  const saveInstallment = async () => {
    if (!installmentsBrand || !installmentValue.trim()) return;
    setSavingInstallment(true);
    try {
      const { createMerchantBrandInstallment: createMerchantBrandInstallment } =
        await import("@/features/merchants/merchant-brand-installments.supabase");
      await createMerchantBrandInstallment({
        comercioBanderaId: installmentsBrand.id,
        cuotas: parseInt(installmentValue) || 1,
        tasaMensual: parseFloat(installmentRate.replace(",", ".")) || 0,
        estado: installmentStatus,
      });
      setShowInstallmentForm(false);
      setInstallmentValue("1");
      setInstallmentRate("");
      setInstallmentStatus("Activo");
      await loadInstallments(installmentsBrand);
    } catch (e) {
      setError(userMessage(e));
    } finally {
      setSavingInstallment(false);
    }
  };

  const removeInstallment = async () => {
    if (!confirmDeleteInstallment) return;
    try {
      const { deleteMerchantBrandInstallment: deleteMerchantBrandInstallment } =
        await import("@/features/merchants/merchant-brand-installments.supabase");
      await deleteMerchantBrandInstallment(confirmDeleteInstallment.id);
      setConfirmDeleteInstallment(null);
      if (installmentsBrand) await loadInstallments(installmentsBrand);
    } catch (e) {
      setError(userMessage(e));
    }
  };
  return {
    brands,
    brandsCatalog,
    loading,
    error,
    showForm,
    setShowForm,
    editing,
    setEditing,
    formBrandId,
    setFormBrandId,
    formBrandCustom,
    setFormBrandCustom,
    formMolipay,
    setFormMolipay,
    formPayway,
    setFormPayway,
    formStatus,
    setFormStatus,
    formMethodKey,
    setFormMethodKey,
    saving,
    confirmDelete,
    setConfirmDelete,
    installmentsBrand,
    setInstallmentsBrand,
    installments,
    installmentsLoading,
    showInstallmentForm,
    setShowInstallmentForm,
    installmentValue,
    setInstallmentValue,
    installmentRate,
    setInstallmentRate,
    installmentStatus,
    setInstallmentStatus,
    savingInstallment,
    confirmDeleteInstallment,
    setConfirmDeleteInstallment,
    load,
    openCreate,
    openEdit,
    save,
    remove,
    net,
    loadInstallments,
    saveInstallment,
    removeInstallment,
  };
}

export type BrandsSectionVm = ReturnType<typeof useBrandsSection>;
