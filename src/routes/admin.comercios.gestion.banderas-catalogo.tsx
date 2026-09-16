import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Edit3, Trash2, Power, PowerOff, Inbox, AlertTriangle } from "lucide-react";
import { PageHeader, Badge, Card, Input, Label, BtnPrimary, BtnOutline } from "@/components/portal-shell";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import { PermissionGuard } from "@/components/permission-guard";
import { useCan } from "@/lib/permissions";
import { useQuery } from "@tanstack/react-query";
import {
  listBanderasCatalogo,
  createBanderaCatalogo,
  updateBanderaCatalogo,
  deleteBanderaCatalogo,
  listBanderasCuotas,
  createBanderaCuota,
  updateBanderaCuota,
  deleteBanderaCuota,
  type BanderaCatalogo,
  type BanderaCuota,
} from "@/lib/api/banderas-catalogo";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/comercios/gestion/banderas-catalogo")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Catálogo de Banderas — Admin — Moli" },
      { name: "description", content: "Administración del catálogo de banderas y cuotas ofrecidas por cada bandera." },
    ],
  }),
});

function Page() {
  const queryClient = useQueryClient();
  const { can } = useCan();
  const puedeCrear = can("crear", "comercios");
  const puedeModificar = can("modificar", "comercios");
  const puedeBorrar = can("borrar", "comercios");

  const { data: banderas, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["banderas-catalogo"],
    queryFn: listBanderasCatalogo,
    staleTime: 30_000,
  });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BanderaCatalogo | null>(null);
  const [formNombre, setFormNombre] = useState("");
  const [formDias, setFormDias] = useState("20");
  const [formEstado, setFormEstado] = useState<"Activo" | "Inactivo">("Activo");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<BanderaCatalogo | null>(null);
  const [selectedBandera, setSelectedBandera] = useState<BanderaCatalogo | null>(null);

  // Cuotas de la bandera seleccionada
  const { data: cuotas, isLoading: cuotasLoading, refetch: refetchCuotas } = useQuery({
    queryKey: ["banderas-cuotas", selectedBandera?.id],
    queryFn: () => listBanderasCuotas(selectedBandera!.id),
    enabled: !!selectedBandera,
    staleTime: 30_000,
  });

  const [showCuotaForm, setShowCuotaForm] = useState(false);
  const [cuotaFormValor, setCuotaFormValor] = useState("1");
  const [cuotaFormEstado, setCuotaFormEstado] = useState<"Activo" | "Inactivo">("Activo");
  const [savingCuota, setSavingCuota] = useState(false);
  const [confirmDeleteCuota, setConfirmDeleteCuota] = useState<BanderaCuota | null>(null);

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["banderas-catalogo"] });
    queryClient.invalidateQueries({ queryKey: ["banderas-cuotas"] });
  };

  // --- Bandera CRUD ---
  const openCreate = () => {
    setEditing(null);
    setFormNombre("");
    setFormDias("20");
    setFormEstado("Activo");
    setShowForm(true);
  };

  const openEdit = (b: BanderaCatalogo) => {
    setEditing(b);
    setFormNombre(b.nombre);
    setFormDias(String(b.diasHabilesAcreditacion));
    setFormEstado(b.estado);
    setShowForm(true);
  };

  const guardarBandera = async () => {
    if (!formNombre.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateBanderaCatalogo(editing.id, {
          nombre: formNombre.trim(),
          diasHabilesAcreditacion: parseInt(formDias) || 20,
          estado: formEstado,
        });
        toast.success("Bandera actualizada");
      } else {
        await createBanderaCatalogo({
          nombre: formNombre.trim(),
          diasHabilesAcreditacion: parseInt(formDias) || 20,
          estado: formEstado,
        });
        toast.success("Bandera creada");
      }
      setShowForm(false);
      setEditing(null);
      invalidar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const eliminarBandera = async () => {
    if (!confirmDelete) return;
    try {
      await deleteBanderaCatalogo(confirmDelete.id);
      toast.success("Bandera eliminada");
      setConfirmDelete(null);
      invalidar();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // --- Cuota CRUD ---
  const guardarCuota = async () => {
    if (!selectedBandera || !cuotaFormValor.trim()) return;
    setSavingCuota(true);
    try {
      await createBanderaCuota({
        banderaId: selectedBandera.id,
        cuotas: parseInt(cuotaFormValor) || 1,
        estado: cuotaFormEstado,
      });
      toast.success("Cuota agregada");
      setShowCuotaForm(false);
      setCuotaFormValor("1");
      setCuotaFormEstado("Activo");
      refetchCuotas();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingCuota(false);
    }
  };

  const eliminarCuota = async () => {
    if (!confirmDeleteCuota) return;
    try {
      await deleteBanderaCuota(confirmDeleteCuota.id);
      toast.success("Cuota eliminada");
      setConfirmDeleteCuota(null);
      refetchCuotas();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const banderaColumns: Column<BanderaCatalogo>[] = [
    { key: "nombre", label: "Bandera", render: (r) => <span className="font-semibold">{r.nombre}</span> },
    { key: "diasHabilesAcreditacion", label: "Días hábiles acreditación", render: (r) => <span className="font-mono">{r.diasHabilesAcreditacion}</span> },
    { key: "estado", label: "Estado", render: (r) => <Badge tone={r.estado === "Activo" ? "success" : "neutral"}>{r.estado}</Badge> },
  ];

  const getActions = (r: BanderaCatalogo): ActionItem[] => [
    { label: "Ver cuotas", icon: Edit3, onClick: () => setSelectedBandera(r) },
    { label: "Editar", icon: Edit3, disabled: !puedeModificar, onClick: () => openEdit(r) },
    { label: r.estado === "Activo" ? "Desactivar" : "Activar", icon: r.estado === "Activo" ? PowerOff : Power, disabled: !puedeModificar, onClick: async () => {
      await updateBanderaCatalogo(r.id, { estado: r.estado === "Activo" ? "Inactivo" : "Activo" });
      invalidar();
    }},
    { label: "Eliminar", icon: Trash2, variant: "danger" as const, disabled: !puedeBorrar, onClick: () => setConfirmDelete(r) },
  ];

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Catálogo de Banderas"
        description="Administración de banderas (Visa, Mastercard, etc.) y las cuotas que ofrece cada una."
        action={
          <BtnPrimary type="button" onClick={openCreate} disabled={!puedeCrear}>
            <Plus size={14} /> Nueva bandera
          </BtnPrimary>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando banderas…
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
          <AlertTriangle size={28} />
          <p>{(error as Error)?.message ?? "Error"}</p>
          <button onClick={() => refetch()} className="h-9 px-4 rounded-md bg-primary text-primary-foreground">Reintentar</button>
        </div>
      ) : (banderas ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          <Inbox size={28} />
          <p>No hay banderas en el catálogo. Creá la primera.</p>
        </div>
      ) : (
        <DataTable columns={banderaColumns} data={banderas ?? []} keyExtractor={(r) => r.id} actions={(r) => <ActionsDropdown actions={getActions(r)} />} hidePagination showGlobalFilter={false} />
      )}

      {/* Panel de cuotas de la bandera seleccionada */}
      {selectedBandera && (
        <Card className="p-5 mt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-display text-sm font-semibold">Cuotas de {selectedBandera.nombre}</h4>
              <p className="text-xs text-muted-foreground">Cuotas ofrecidas por esta bandera. Días hábiles de acreditación: {selectedBandera.diasHabilesAcreditacion}</p>
            </div>
            <div className="flex gap-2">
              <BtnPrimary type="button" onClick={() => { setCuotaFormValor("1"); setCuotaFormEstado("Activo"); setShowCuotaForm(true); }} className="h-8 text-xs">
                <Plus size={14} /> Agregar cuota
              </BtnPrimary>
              <BtnOutline type="button" onClick={() => setSelectedBandera(null)} className="h-8 text-xs">Cerrar</BtnOutline>
            </div>
          </div>
          {cuotasLoading ? (
            <p className="text-sm text-muted-foreground">Cargando cuotas…</p>
          ) : (cuotas ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground border border-dashed rounded-lg py-6 text-center">Sin cuotas configuradas para esta bandera.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-3 py-2 font-display font-semibold">Cuotas</th>
                  <th className="px-3 py-2 font-display font-semibold">Estado</th>
                  <th className="px-3 py-2 font-display font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(cuotas ?? []).map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono font-semibold">{c.cuotas}x</td>
                    <td className="px-3 py-2"><Badge tone={c.estado === "Activo" ? "success" : "neutral"}>{c.estado}</Badge></td>
                    <td className="px-3 py-2 text-right">
                      <span className="inline-flex gap-1">
                        <button type="button" onClick={async () => {
                          await updateBanderaCuota(c.id, { estado: c.estado === "Activo" ? "Inactivo" : "Activo" });
                          refetchCuotas();
                        }} className="h-7 px-2 rounded-md border bg-card text-xs hover:bg-accent inline-flex items-center gap-1">
                          {c.estado === "Activo" ? <PowerOff size={12} /> : <Power size={12} />}
                          {c.estado === "Activo" ? "Desactivar" : "Activar"}
                        </button>
                        <button type="button" onClick={() => setConfirmDeleteCuota(c)} className="h-7 px-2 rounded-md border border-red-200 text-red-600 bg-card text-xs hover:bg-red-50 inline-flex items-center gap-1">
                          <Trash2 size={12} /> Eliminar
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Form bandera */}
      {showForm && (
        <FormDialog open onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? "Editar bandera" : "Nueva bandera"} onSubmit={guardarBandera} submitLabel={saving ? "Guardando…" : "Guardar"} isSubmitting={saving}>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input value={formNombre} onChange={(e) => setFormNombre(e.target.value)} placeholder="Ej: Visa, Mastercard, Amex…" />
            </div>
            <div>
              <Label>Días hábiles de acreditación</Label>
              <Input type="number" value={formDias} onChange={(e) => setFormDias(e.target.value)} min={1} />
              <p className="text-[11px] text-muted-foreground mt-1">Cuántos días hábiles tarda en acreditar esta bandera.</p>
            </div>
            <div>
              <Label>Estado</Label>
              <select value={formEstado} onChange={(e) => setFormEstado(e.target.value as "Activo" | "Inactivo")} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>
        </FormDialog>
      )}

      {/* Form cuota */}
      {showCuotaForm && (
        <FormDialog open onClose={() => setShowCuotaForm(false)} title={`Agregar cuota a ${selectedBandera?.nombre}`} onSubmit={guardarCuota} submitLabel={savingCuota ? "Guardando…" : "Agregar"} isSubmitting={savingCuota}>
          <div className="space-y-4">
            <div>
              <Label>Número de cuotas</Label>
              <Input type="number" value={cuotaFormValor} onChange={(e) => setCuotaFormValor(e.target.value)} min={1} max={48} />
              <p className="text-[11px] text-muted-foreground mt-1">Ej: 1 = pago único, 3 = 3 cuotas, etc.</p>
            </div>
            <div>
              <Label>Estado</Label>
              <select value={cuotaFormEstado} onChange={(e) => setCuotaFormEstado(e.target.value as "Activo" | "Inactivo")} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>
        </FormDialog>
      )}

      {confirmDelete && (
        <ConfirmDialog open onClose={() => setConfirmDelete(null)} title="Eliminar bandera" message={`¿Eliminar la bandera "${confirmDelete.nombre}"? Esto también eliminará todas sus cuotas asociadas.`} confirmLabel="Eliminar" variant="danger" onConfirm={eliminarBandera} />
      )}
      {confirmDeleteCuota && (
        <ConfirmDialog open onClose={() => setConfirmDeleteCuota(null)} title="Eliminar cuota" message={`¿Eliminar la cuota ${confirmDeleteCuota.cuotas}x de ${selectedBandera?.nombre}?`} confirmLabel="Eliminar" variant="danger" onConfirm={eliminarCuota} />
      )}
    </PermissionGuard>
  );
}
