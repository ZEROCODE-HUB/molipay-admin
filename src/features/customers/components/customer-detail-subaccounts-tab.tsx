import { useQuery,useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
createSubaccount,
deleteSubaccount,
listSubaccounts,
type Subaccount,
type SubaccountKind,
type SubaccountStatus,
type SubaccountUpdate,
updateSubaccount,
} from "@/features/customers/subaccounts.supabase";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { Ban,FileUp,Plus } from "lucide-react";
import { SubaccountDetailModal } from "@/features/customers/components/subaccounts-tab";
import { TableSubaccounts } from "@/features/customers/components/table-subaccounts";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { CustomerSection } from "./customer-section";
import { KpiCard } from "./customer-detail-parts";
import { BulkSubaccountsUpload } from "./bulk-subaccounts-upload";

export function SubaccountsTab({
  legajo,
  onEximirCuit,
}: {
  legajo: string;
  onEximirCuit: () => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [masivaOpen, setMasivaOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    cbu: "",
    tipo: "Operativa" as SubaccountKind,
    estado: "Activa" as SubaccountStatus,
  });

  const query = useQuery({
    queryKey: ["subcuentas", legajo],
    queryFn: () => listSubaccounts(legajo),
    enabled: !!legajo,
  });

  const subaccounts = query.data ?? [];
  const totalSubaccounts = subaccounts.length;

  const [subDetail, setSubDetail] = useState<Subaccount | null>(null);
  const [subARemove, setSubARemove] = useState<Subaccount | null>(null);

  const applyChange = async (sub: Subaccount, patch: SubaccountUpdate) => {
    try {
      await updateSubaccount(legajo, sub.id, patch);
      await queryClient.invalidateQueries({ queryKey: ["subcuentas", legajo] });
    } catch (e) {
      toast.error(userMessage(e));
    }
  };

  const onVerDetails = (sub: Subaccount) => setSubDetail(sub);
  const onValidate = async (sub: Subaccount) => {
    await applyChange(sub, { validada: true });
    toast.success(`Subcuenta "${sub.nombre}" validada`);
  };
  const onSuspend = async (sub: Subaccount) => {
    await applyChange(sub, { estado: "Pausada" });
    toast.success(`Subcuenta "${sub.nombre}" suspendida`);
  };
  const onReactivate = async (sub: Subaccount) => {
    await applyChange(sub, { estado: "Activa" });
    toast.success(`Subcuenta "${sub.nombre}" reactivada`);
  };
  const onRemove = (sub: Subaccount) => setSubARemove(sub);
  const confirmRemove = async () => {
    if (!subARemove) return;
    try {
      await deleteSubaccount(legajo, subARemove.id);
      await queryClient.invalidateQueries({ queryKey: ["subcuentas", legajo] });
      toast.success("Subcuenta eliminada");
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setSubARemove(null);
    }
  };

  const save = async () => {
    if (!form.nombre.trim() || !form.email.trim()) {
      setErr("Nombre y email son obligatorios.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await createSubaccount(legajo, {
        nombre: form.nombre,
        apellido: form.apellido,
        email: form.email,
        cbu: form.cbu,
        tipo: form.tipo,
        estado: form.estado,
      });
      await queryClient.invalidateQueries({ queryKey: ["subcuentas", legajo] });
      setOpen(false);
      setForm({
        nombre: "",
        apellido: "",
        email: "",
        cbu: "",
        tipo: "Operativa",
        estado: "Activa",
      });
    } catch (e) {
      setErr(userMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <CustomerSection
      titulo="Subcuentas y CVUs"
      loading={query.isLoading}
      error={query.isError ? query.error : null}
      onRetry={() => query.refetch()}
      vacio={!query.isLoading && (query.data?.length ?? 0) === 0}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard label="CVUs informadas" value={String(totalSubaccounts)} />
        <KpiCard label="Máximo de subcuentas" value="—" />
        <KpiCard label="Redirección automática" value="Inactiva" tone="muted" />
        <KpiCard label="Presión operativa" value="Sin tope" tone="muted" />
      </div>

      <div className="flex flex-wrap justify-end gap-2 mb-3">
        <button
          type="button"
          onClick={onEximirCuit}
          className="inline-flex items-center gap-1.5 h-9 rounded-md border border-input px-3 text-sm font-medium text-foreground hover:bg-accent"
        >
          <Ban size={16} /> Eximir CUIT principal
        </button>
        <button
          type="button"
          onClick={() => setMasivaOpen(true)}
          className="inline-flex items-center gap-1.5 h-9 rounded-md border border-input px-3 text-sm font-medium text-foreground hover:bg-accent"
        >
          <FileUp size={16} /> Carga masiva de subcuentas
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
        >
          <Plus size={16} /> Cargar subcuenta
        </button>
      </div>

      <BulkSubaccountsUpload
        open={masivaOpen}
        legajo={legajo}
        onClose={() => setMasivaOpen(false)}
        onDone={() => {
          setMasivaOpen(false);
          queryClient.invalidateQueries({ queryKey: ["subcuentas", legajo] });
        }}
      />
      {open && (
        <div className="mb-4 rounded-xl border border-border bg-muted/30 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="rounded-md border border-input px-3 py-2 text-sm"
            placeholder="Nombre *"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
          <input
            className="rounded-md border border-input px-3 py-2 text-sm"
            placeholder="Apellido"
            value={form.apellido}
            onChange={(e) => setForm({ ...form, apellido: e.target.value })}
          />
          <input
            className="rounded-md border border-input px-3 py-2 text-sm"
            placeholder="Email *"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="rounded-md border border-input px-3 py-2 text-sm"
            placeholder="CVU"
            value={form.cbu}
            onChange={(e) => setForm({ ...form, cbu: e.target.value })}
          />
          <select
            className="rounded-md border border-input px-3 py-2 text-sm"
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value as SubaccountKind })}
          >
            <option value="Operativa">Operativa</option>
            <option value="Recaudacion">Recaudación</option>
            <option value="Garantias">Garantías</option>
            <option value="Sueldos">Sueldos</option>
          </select>
          <select
            className="rounded-md border border-input px-3 py-2 text-sm"
            value={form.estado}
            onChange={(e) => setForm({ ...form, estado: e.target.value as SubaccountStatus })}
          >
            <option value="Activa">Activa</option>
            <option value="Pausada">Pausada</option>
          </select>
          {err && <p className="text-sm text-red-600 md:col-span-2">{err}</p>}
          <div className="md:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-9 rounded-md border border-input px-3 text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      )}
      <TableSubaccounts
        rows={query.data ?? []}
        onVerDetalles={onVerDetails}
        onValidar={onValidate}
        onSuspender={onSuspend}
        onReactivar={onReactivate}
        onEliminar={onRemove}
      />

      {subDetail && (
        <SubaccountDetailModal
          subcuenta={subDetail}
          legajo={legajo}
          onClose={() => setSubDetail(null)}
          onValidar={onValidate}
          onSuspender={onSuspend}
          onReactivar={onReactivate}
          onEliminar={onRemove}
        />
      )}

      <ConfirmDialog
        open={!!subARemove}
        title="Eliminar subcuenta"
        message={`¿Estás seguro de eliminar la subcuenta "${subARemove?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={confirmRemove}
        onClose={() => setSubARemove(null)}
      />
    </CustomerSection>
  );
}
