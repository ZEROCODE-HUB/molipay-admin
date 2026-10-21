import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Eye, Edit3, CheckCircle, XCircle, Trash2, Plus, AlertTriangle, Inbox, HelpCircle } from "lucide-react";
import {
  PageHeader,
  Badge,
  Input,
  Label,
  BtnPrimary,
  BtnOutline,
  Card,
} from "@/components/portal-shell";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import { LegajoCell } from "@/components/legajo-label";
import { Pagination } from "@/components/pagination";
import { useComercios, useClientesForSelect } from "@/hooks/useComercios";
import { useCodigosCategoria } from "@/hooks/useCodigosCategoria";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Search } from "lucide-react";
import {
  createComercio,
  deshabilitarComercio,
  setComercioEstado,
  updateComercio,
} from "@/lib/api/comercios";
import { DataAccessError } from "@/lib/api/errors";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import type {
  ClienteSelect,
  CodigoCategoria,
  Comercio,
  EstadoComercio,
  NivelComercio,
} from "@/lib/api/types";
import { ESTADOS_COMERCIO, NIVELES_COMERCIO } from "@/lib/api/types";
import { MOCK_IMPUESTOS_POR_COBRAR, formatImpuestoMonto } from "@/data/impuestos-por-cobrar";

export const Route = createFileRoute("/admin/comercios/gestion/")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Gestión de comercios — Admin — Moli" },
      {
        name: "description",
        content:
          "Gestión centralizada de comercios y su asociación a los canales de la plataforma.",
      },
    ],
  }),
});

const PAGE_SIZES = [10, 20, 50];

function estadoBadgeTone(estado: EstadoComercio): "success" | "neutral" | "warn" | "danger" {
  if (estado === "Activado") return "success";
  if (estado === "Desactivado") return "neutral";
  if (estado === "Rechazado") return "danger";
  return "warn";
}

function MensajeEstado({
  tipo,
  mensaje,
  onRetry,
}: {
  tipo: "error" | "vacio" | "permiso";
  mensaje: string;
  onRetry?: () => void;
}) {
  if (tipo === "permiso") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-6 py-12 text-center text-sm text-amber-800">
        <AlertTriangle size={28} />
        <div>
          <p className="font-semibold">No tenés permiso para ver esto</p>
          <p className="mt-1">{mensaje}</p>
        </div>
      </div>
    );
  }
  if (tipo === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
        <AlertTriangle size={28} />
        <div>
          <p className="font-semibold">Ocurrió un error al cargar los comercios</p>
          <p className="mt-1">{mensaje}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Reintentar
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
      <Inbox size={28} />
      <p>No hay comercios que coincidan con la búsqueda.</p>
    </div>
  );
}

function formatPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function BanderasSection({ comercioId }: { comercioId: string }) {
  const [banderas, setBanderas] = useState<import("@/lib/api/types").ComercioBandera[]>([]);
  const [banderasCatalogo, setBanderasCatalogo] = useState<import("@/lib/api/banderas").Bandera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<import("@/lib/api/types").ComercioBandera | null>(null);
  const [formBanderaId, setFormBanderaId] = useState("");
  const [formBanderaCustom, setFormBanderaCustom] = useState("");
  const [formMolipay, setFormMolipay] = useState("");
  const [formPayway, setFormPayway] = useState("");
  const [formEstado, setFormEstado] = useState<import("@/lib/api/types").ComercioBanderaEstado>("Activo");
  const [formMetodoKey, setFormMetodoKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<import("@/lib/api/types").ComercioBandera | null>(null);
  const [cuotasBandera, setCuotasBandera] = useState<import("@/lib/api/types").ComercioBandera | null>(null);
  const [cuotas, setCuotas] = useState<import("@/lib/api/types").ComercioBanderaCuota[]>([]);
  const [cuotasLoading, setCuotasLoading] = useState(false);
  const [showCuotaForm, setShowCuotaForm] = useState(false);
  const [cuotaValor, setCuotaValor] = useState("1");
  const [cuotaTasa, setCuotaTasa] = useState("");
  const [cuotaEstado, setCuotaEstado] = useState<"Activo" | "Inactivo">("Activo");
  const [savingCuota, setSavingCuota] = useState(false);
  const [confirmDeleteCuota, setConfirmDeleteCuota] = useState<import("@/lib/api/types").ComercioBanderaCuota | null>(null);

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const [comercioBanderasMod, banderasMod] = await Promise.all([
        import("@/lib/api/comercio-banderas"),
        import("@/lib/api/banderas"),
      ]);
      const [data, catalog] = await Promise.all([
        comercioBanderasMod.listByComercio(comercioId),
        banderasMod.listBanderas(),
      ]);
      setBanderas(data);
      setBanderasCatalogo(catalog.filter((b: import("@/lib/api/banderas").Bandera) => b.estado === "Activo"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comercioId]);

  const openCreate = () => {
    setEditing(null);
    setFormBanderaId(banderasCatalogo[0]?.id || "");
    setFormBanderaCustom("");
    setFormMolipay("");
    setFormPayway("");
    setFormEstado("Activo");
    setFormMetodoKey(banderasCatalogo[0]?.metodoKey || "");
    setShowForm(true);
  };

  const openEdit = (b: import("@/lib/api/types").ComercioBandera) => {
    setEditing(b);
    setFormBanderaId(b.bandera_id || "");
    setFormBanderaCustom("");
    setFormMolipay(String(b.comisionMolipay));
    setFormPayway(String(b.comisionPayway));
    setFormEstado(b.estado);
    setFormMetodoKey(b.metodoKey || "");
    setShowForm(true);
  };

  const guardar = async () => {
    const selectedBandera = banderasCatalogo.find((b) => b.id === formBanderaId);
    const banderaFinal = selectedBandera?.nombre || formBanderaCustom.trim();
    if (!banderaFinal) return;
    const molipay = parseFloat(formMolipay.replace(",", ".")) || 0;
    const payway = parseFloat(formPayway.replace(",", ".")) || 0;
    setSaving(true);
    try {
      const mod = await import("@/lib/api/comercio-banderas");
      if (editing) {
        await mod.updateBandera(editing.id, {
          bandera: banderaFinal,
          comisionMolipay: molipay,
          comisionPayway: payway,
          estado: formEstado,
          banderaId: formBanderaId || undefined,
          metodoKey: formMetodoKey || undefined,
        });
      } else {
        await mod.createBandera(comercioId, {
          bandera: banderaFinal,
          comisionMolipay: molipay,
          comisionPayway: payway,
          estado: formEstado,
          banderaId: formBanderaId || undefined,
          metodoKey: formMetodoKey || undefined,
        });
      }
      setShowForm(false);
      await cargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async () => {
    if (!confirmDelete) return;
    try {
      const mod = await import("@/lib/api/comercio-banderas");
      await mod.deleteBandera(confirmDelete.id);
      setConfirmDelete(null);
      await cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const neto = (() => {
    const m = parseFloat(formMolipay.replace(",", ".") || "0") || 0;
    const p = parseFloat(formPayway.replace(",", ".") || "0") || 0;
    return m - p;
  })();

  // --- Cuotas por bandera ---
  const cargarCuotas = async (bandera: import("@/lib/api/types").ComercioBandera) => {
    setCuotasBandera(bandera);
    setCuotasLoading(true);
    try {
      const { listCuotasByComercioBandera } = await import("@/lib/api/comercio-banderas-cuotas");
      const data = await listCuotasByComercioBandera(bandera.id);
      setCuotas(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCuotasLoading(false);
    }
  };

  const guardarCuota = async () => {
    if (!cuotasBandera || !cuotaValor.trim()) return;
    setSavingCuota(true);
    try {
      const { createComercioBanderaCuota } = await import("@/lib/api/comercio-banderas-cuotas");
      await createComercioBanderaCuota({
        comercioBanderaId: cuotasBandera.id,
        cuotas: parseInt(cuotaValor) || 1,
        tasaMensual: parseFloat(cuotaTasa.replace(",", ".")) || 0,
        estado: cuotaEstado,
      });
      setShowCuotaForm(false);
      setCuotaValor("1");
      setCuotaTasa("");
      setCuotaEstado("Activo");
      await cargarCuotas(cuotasBandera);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingCuota(false);
    }
  };

  const eliminarCuota = async () => {
    if (!confirmDeleteCuota) return;
    try {
      const { deleteComercioBanderaCuota } = await import("@/lib/api/comercio-banderas-cuotas");
      await deleteComercioBanderaCuota(confirmDeleteCuota.id);
      setConfirmDeleteCuota(null);
      if (cuotasBandera) await cargarCuotas(cuotasBandera);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">Banderas</h4>
        <BtnPrimary type="button" onClick={openCreate} className="h-8 px-3 text-xs">
          <Plus size={14} /> Agregar bandera
        </BtnPrimary>
      </div>
      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Cargando banderas…</div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <BtnOutline type="button" onClick={cargar} className="h-7 text-xs">Reintentar</BtnOutline>
        </div>
      ) : banderas.length === 0 ? (
        <div className="border border-dashed rounded-lg py-8 text-center text-sm text-muted-foreground">Sin banderas habilitadas para este comercio.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-3 py-2.5 font-display font-semibold text-foreground">Bandera</th>
                <th className="px-3 py-2.5 font-display font-semibold text-foreground">Método</th>
                <th className="px-3 py-2.5 font-display font-semibold text-foreground text-right">% Comisión MoliPay</th>
                <th className="px-3 py-2.5 font-display font-semibold text-foreground text-right">% Comisión PayWay</th>
                <th className="px-3 py-2.5 font-display font-semibold text-foreground text-right">% Neto</th>
                <th className="px-3 py-2.5 font-display font-semibold text-foreground">Estado</th>
                <th className="px-3 py-2.5 font-display font-semibold text-foreground text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {banderas.map((b) => (
                <tr key={b.id} className="border-b last:border-0">
                  <td className="px-3 py-2.5 font-medium">{b.bandera}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{b.metodoKey || "-"}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{formatPct(b.comisionMolipay)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{formatPct(b.comisionPayway)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums font-semibold">{formatPct(b.comisionNeta)}</td>
                  <td className="px-3 py-2.5"><Badge tone={b.estado === "Activo" ? "success" : "neutral"}>{b.estado}</Badge></td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="inline-flex gap-1">
                      <button type="button" onClick={() => cargarCuotas(b)} className="h-7 px-2 rounded-md border bg-card text-xs hover:bg-accent inline-flex items-center gap-1">Cuotas</button>
                      <button type="button" onClick={() => openEdit(b)} className="h-7 px-2 rounded-md border bg-card text-xs hover:bg-accent inline-flex items-center gap-1"><Edit3 size={12} /> Editar</button>
                      <button type="button" onClick={() => setConfirmDelete(b)} className="h-7 px-2 rounded-md border border-red-200 text-red-600 bg-card text-xs hover:bg-red-50 inline-flex items-center gap-1"><Trash2 size={12} /> Eliminar</button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showForm && (
        <FormDialog
          open
          onClose={() => { setShowForm(false); setEditing(null); }}
          title={editing ? "Editar bandera" : "Agregar bandera"}
          description={editing ? `Editando ${editing.bandera}` : "Seleccioná una bandera o ingresá texto libre."}
          onSubmit={guardar}
          submitLabel={saving ? "Guardando…" : editing ? "Guardar" : "Agregar"}
          isSubmitting={saving}
        >
          <div className="space-y-4">
            <div>
              <Label>Bandera</Label>
              <select
                value={formBanderaId}
                onChange={(e) => {
                  const selected = banderasCatalogo.find((b: import("@/lib/api/banderas").Bandera) => b.id === e.target.value);
                  setFormBanderaId(e.target.value);
                  setFormMetodoKey(selected?.metodoKey || "");
                }}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Seleccionar…</option>
                {banderasCatalogo.map((b) => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
                <option value="__custom__">Otra (texto libre)…</option>
              </select>
              {formBanderaId === "__custom__" && (
                <Input
                  value={formBanderaCustom}
                  onChange={(e) => setFormBanderaCustom(e.target.value)}
                  placeholder="Ej: Naranja, Tarjeta Propia…"
                  className="mt-2"
                />
              )}
            </div>
            <div>
              <Label>Clave método pago</Label>
              <Input
                value={formMetodoKey}
                onChange={(e) => setFormMetodoKey(e.target.value)}
                placeholder="Ej: visa-cred, mc-deb, amex…"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Clave única del método de pago (visa-cred, mc-deb, amex, naranja, transferencia, qr)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>% Comisión MoliPay</Label>
                <Input value={formMolipay} onChange={(e) => { const v = e.target.value; if (v === "" || /^[0-9]*[.,]?[0-9]*$/.test(v)) setFormMolipay(v); }} placeholder="0.00" className="font-mono" inputMode="decimal" />
              </div>
              <div>
                <Label>% Comisión PayWay</Label>
                <Input value={formPayway} onChange={(e) => { const v = e.target.value; if (v === "" || /^[0-9]*[.,]?[0-9]*$/.test(v)) setFormPayway(v); }} placeholder="0.00" className="font-mono" inputMode="decimal" />
              </div>
            </div>
            <div className="rounded-md bg-muted px-3 py-2 flex justify-between text-sm">
              <span className="text-muted-foreground">% Neto (autocalculado)</span>
              <span className="font-mono font-semibold">{neto.toFixed(2)}%</span>
            </div>
            <div>
              <Label>Estado</Label>
              <select value={formEstado} onChange={(e) => setFormEstado(e.target.value as import("@/lib/api/types").ComercioBanderaEstado)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>
        </FormDialog>
      )}
      {confirmDelete && (
        <ConfirmDialog
          open
          onClose={() => setConfirmDelete(null)}
          title="Eliminar bandera"
          message={`¿Eliminar la bandera "${confirmDelete.bandera}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          variant="danger"
          onConfirm={eliminar}
        />
      )}

      {/* Panel de cuotas de la bandera seleccionada */}
      {cuotasBandera && (
        <Card className="p-5 mt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-display text-sm font-semibold">Cuotas de {cuotasBandera.bandera} (TEM por cuota)</h4>
              <p className="text-xs text-muted-foreground">Tasa efectiva mensual que se cobra al comercio por cada cantidad de cuotas.</p>
            </div>
            <div className="flex gap-2">
              <BtnPrimary type="button" onClick={() => { setCuotaValor("1"); setCuotaTasa(""); setCuotaEstado("Activo"); setShowCuotaForm(true); }} className="h-8 text-xs">
                <Plus size={14} /> Agregar cuota
              </BtnPrimary>
              <BtnOutline type="button" onClick={() => setCuotasBandera(null)} className="h-8 text-xs">Cerrar</BtnOutline>
            </div>
          </div>
          {cuotasLoading ? (
            <p className="text-sm text-muted-foreground">Cargando cuotas…</p>
          ) : cuotas.length === 0 ? (
            <p className="text-sm text-muted-foreground border border-dashed rounded-lg py-6 text-center">Sin cuotas configuradas. Agregá la primera.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-3 py-2 font-display font-semibold">Cuotas</th>
                  <th className="px-3 py-2 font-display font-semibold text-right">TEM (%)</th>
                  <th className="px-3 py-2 font-display font-semibold">Estado</th>
                  <th className="px-3 py-2 font-display font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cuotas.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono font-semibold">{c.cuotas}x</td>
                    <td className="px-3 py-2 text-right font-mono">{formatPct(c.tasaMensual)}</td>
                    <td className="px-3 py-2"><Badge tone={c.estado === "Activo" ? "success" : "neutral"}>{c.estado}</Badge></td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => setConfirmDeleteCuota(c)} className="h-7 px-2 rounded-md border border-red-200 text-red-600 bg-card text-xs hover:bg-red-50 inline-flex items-center gap-1"><Trash2 size={12} /> Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Form cuota */}
      {showCuotaForm && (
        <FormDialog open onClose={() => setShowCuotaForm(false)} title={`Agregar cuota a ${cuotasBandera?.bandera}`} onSubmit={guardarCuota} submitLabel={savingCuota ? "Guardando…" : "Agregar"} isSubmitting={savingCuota}>
          <div className="space-y-4">
            <div>
              <Label>Número de cuotas</Label>
              <Input type="number" value={cuotaValor} onChange={(e) => setCuotaValor(e.target.value)} min={1} max={48} />
              <p className="text-[11px] text-muted-foreground mt-1">Ej: 1 = pago único, 3 = 3 cuotas.</p>
            </div>
            <div>
              <Label>TEM — Tasa Efectiva Mensual (%)</Label>
              <Input value={cuotaTasa} onChange={(e) => { const v = e.target.value; if (v === "" || /^[0-9]*[.,]?[0-9]*$/.test(v)) setCuotaTasa(v); }} placeholder="0.00" className="font-mono" inputMode="decimal" />
              <p className="text-[11px] text-muted-foreground mt-1">Tasa mensual que se cobra al comercio. No editar TNA.</p>
            </div>
            <div>
              <Label>Estado</Label>
              <select value={cuotaEstado} onChange={(e) => setCuotaEstado(e.target.value as "Activo" | "Inactivo")} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>
        </FormDialog>
      )}

      {confirmDeleteCuota && (
        <ConfirmDialog open onClose={() => setConfirmDeleteCuota(null)} title="Eliminar cuota" message={`¿Eliminar la cuota ${confirmDeleteCuota.cuotas}x de ${cuotasBandera?.bandera}?`} confirmLabel="Eliminar" variant="danger" onConfirm={eliminarCuota} />
      )}
    </Card>
  );
}

function ComercioDetalle({ comercio, onClose }: { comercio: Comercio; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex justify-between items-start z-10">
          <div>
            <h3 className="font-display text-lg font-semibold">Detalle de comercio</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {comercio.usuario} · {comercio.legajo}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <XCircle size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {comercio.estado === "Pendiente de aprobación" && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">Comercio pendiente de aprobación</p>
              <p className="text-xs mt-1">Este comercio no puede operar hasta que se le asigne CVU y comisión. El estado actual no permite transacciones ni acreditaciones.</p>
            </div>
          )}

          <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Información general
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="Usuario" value={comercio.usuario} />
              <Field
                label="Legajo"
                value={
                  <span className="inline-flex items-center gap-1">
                    <LegajoCell legajo={comercio.legajo} />
                  </span>
                }
              />
              <Field label="Nombre del comercio" value={comercio.nombreComercio ?? "—"} />
              <Field label="Cliente" value={comercio.cliente?.nombre ?? "—"} />
              <Field
                label="CUIT del cliente"
                value={
                  <span className="font-mono tabular-nums text-xs">
                    {comercio.cliente?.cuit ?? "—"}
                  </span>
                }
              />
              <Field
                label="Categoría"
                value={
                  comercio.categoria ? (
                    <span className="font-mono tabular-nums">
                      {comercio.categoria.codigo} · {comercio.categoria.nombre}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <Field label="Nivel" value={comercio.nivel} />
              <Field label="site_id (Payway)" value={<span className="font-mono text-xs">{comercio.siteId ?? "—"}</span>} />
              <Field
                label="Estado"
                value={<Badge tone={estadoBadgeTone(comercio.estado)}>{comercio.estado}</Badge>}
              />
              <Field
                label="Fecha de registro"
                value={
                  <span className="font-mono text-xs tabular-nums">
                    {new Date(comercio.createdAt).toLocaleDateString("es-AR")}
                  </span>
                }
              />
            </div>
          </Card>

          <BanderasSection comercioId={comercio.id} />

                    <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Impuestos por pagar — lote de acreditación
            </h4>
            {(() => {
              const porCobrar = MOCK_IMPUESTOS_POR_COBRAR.filter((r) => r.legajo === comercio.legajo && r.estado === "pendiente");
              const porLote = new Map<string, {total: number; count: number}>();
              for (const r of porCobrar) {
                const cur = porLote.get(r.loteId) ?? {total:0, count:0};
                cur.total += r.monto;
                cur.count += 1;
                porLote.set(r.loteId, cur);
              }
              const total = porCobrar.reduce((a,b)=>a+b.monto,0);
              if (porCobrar.length === 0) {
                return (
                  <div className="text-sm text-muted-foreground">Sin impuestos pendientes para este comercio según lotes de acreditación.</div>
                );
              }
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-mono font-semibold tabular-nums">{formatImpuestoMonto(total)}</div>
                    <Badge tone="warn">Por pagar</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">Suma real de impuestos pendientes agrupada por lote de acreditación</div>
                  <div className="space-y-1.5">
                    {Array.from(porLote.entries()).map(([loteId, v])=> (
                      <div key={loteId} className="flex justify-between text-sm border rounded px-3 py-1.5 bg-muted/30">
                        <span className="font-mono text-xs">{loteId} · {v.count} impuesto(s)</span>
                        <span className="font-mono font-semibold">{formatImpuestoMonto(v.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </Card>

          <Card className="p-0">
            <div className="px-5 pt-5 pb-1">
              <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Resumen
              </h4>
            </div>
            <div className="px-5 pb-5 pt-3 text-sm text-muted-foreground">
              Los puntos de venta / QR se gestionan en <span className="font-semibold">Pagos con QR</span> y los enlaces en <span className="font-semibold">Enlaces de pago</span>.
            </div>
          </Card>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex justify-end">
          <BtnOutline type="button" onClick={onClose}>
            Cerrar
          </BtnOutline>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );
}

type ComercioForm = {
  clienteLegajo: string;
  usuario: string;
  categoriaId: string;
  nivel: NivelComercio;
  estado: EstadoComercio;
  ejecutivoResponsableId: string;
};

/**
 * Label con un icono "?" a la derecha. Al pasar el mouse muestra la ayuda
 * en lenguaje simple, pensada para usuarios no técnicos.
 */
function LabelAyuda({
  htmlFor,
  hint,
  children,
}: {
  htmlFor: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{children}</Label>
      <span title={hint} className="cursor-help inline-flex shrink-0">
        <HelpCircle size={13} className="text-muted-foreground/70" />
      </span>
    </div>
  );
}

function ComercioFormModal({
  comercio,
  clientes,
  categorias,
  adminUsers,
  onClose,
  onSave,
  isSaving,
}: {
  comercio: Comercio | null;
  clientes: ClienteSelect[];
  categorias: CodigoCategoria[];
  adminUsers: import("@/lib/api/types").AdminUser[];
  onClose: () => void;
  onSave: (input: {
    clienteLegajo: string;
    usuario: string;
    nombreComercio: string | null;
    categoriaId: number | null;
    nivel: NivelComercio;
    estado: EstadoComercio;
    ejecutivoResponsableId: string | null;
    siteId: string | null;
  }) => void;
  isSaving?: boolean;
}) {
  const [clienteLegajo, setClienteLegajo] = useState(comercio?.legajo ?? "");
  const [usuario, setUsuario] = useState(comercio?.usuario ?? "");
  const [nombreComercio, setNombreComercio] = useState(comercio?.nombreComercio ?? "");
  const [categoriaId, setCategoriaId] = useState(
    comercio?.categoriaId != null ? String(comercio.categoriaId) : "",
  );
  const [nivel, setNivel] = useState<NivelComercio>(comercio?.nivel ?? "Pequeño");
  const [estado, setEstado] = useState<EstadoComercio>(
    comercio?.estado ?? "Pendiente de aprobación",
  );
  const [ejecutivoId, setEjecutivoId] = useState(comercio?.ejecutivoResponsableId ?? "");
  const [siteId, setSiteId] = useState(comercio?.siteId ?? "");

  const clienteSeleccionado = clientes.find((c) => c.legajo === clienteLegajo) ?? null;

  // Combobox con búsqueda server-side (debounce 350ms, limit 20)
  const [clienteSearchInput, setClienteSearchInput] = useState("");
  const debouncedClienteSearch = useDebouncedValue(clienteSearchInput, 350);
  const { data: clientesFiltrados } = useClientesForSelect(
    comercio ? undefined : debouncedClienteSearch,
  );
  const clientesOptionsRaw = comercio ? clientes : (clientesFiltrados ?? clientes);
  const clientesOptions = [...(clientesOptionsRaw ?? [])].sort((a,b)=> (a.legajo ?? '').localeCompare(b.legajo ?? ''));
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const guardar = () => {
    if (!clienteLegajo) return;
    onSave({
      clienteLegajo,
      usuario: usuario.trim() || (clienteSeleccionado?.correo ?? ""),
      nombreComercio: nombreComercio.trim() || null,
      categoriaId: categoriaId ? Number(categoriaId) : null,
      nivel,
      estado,
      ejecutivoResponsableId: ejecutivoId || null,
      siteId: siteId.trim() || null,
    });
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title={comercio ? "Editar comercio" : "Nuevo comercio"}
      description={
        comercio
          ? `Modificá los datos del comercio ${comercio.usuario}.`
          : "Asociá un cliente existente a un nuevo comercio."
      }
      onSubmit={guardar}
      submitLabel={isSaving ? "Guardando…" : comercio ? "Guardar cambios" : "Crear comercio"}
      isSubmitting={isSaving}
      size="xl"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <LabelAyuda
            htmlFor="gc-cliente"
            hint="El cliente se elige de la lista de clientes ya cargada. No se puede escribir uno nuevo a mano."
          >
            Cliente (legajo)
          </LabelAyuda>
          {comercio ? (
            <Input id="gc-cliente" value={`${clienteSeleccionado?.nombre ?? comercio.legajo} · ${comercio.legajo}`} disabled />
          ) : (
            <div className="relative">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id="gc-cliente"
                  value={clienteSearchInput}
                  onChange={(e) => {
                    setClienteSearchInput(e.target.value);
                    setComboboxOpen(true);
                    if (!e.target.value.trim()) setClienteLegajo("");
                  }}
                  onFocus={() => setComboboxOpen(true)}
                  onBlur={() => setTimeout(() => setComboboxOpen(false), 150)}
                  placeholder="Buscar por nombre, legajo o correo…"
                  className="pl-9"
                  autoComplete="off"
                />
              </div>
              {comboboxOpen && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-input bg-card shadow-lg max-h-60 overflow-auto">
                  {(clientesOptions ?? []).length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      {debouncedClienteSearch ? "Sin resultados." : "Escribí para buscar (máx. 20 resultados)."}
                    </div>
                  ) : (
                    (clientesOptions ?? []).map((c) => (
                      <button
                        key={c.legajo}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setClienteLegajo(c.legajo);
                          setClienteSearchInput(`${c.nombre} · ${c.legajo}`);
                          setUsuario(c.correo);
                          setComboboxOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-accent flex flex-col ${
                          c.legajo === clienteLegajo ? "bg-accent" : ""
                        }`}
                      >
                        <span className="font-medium">{c.nombre}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {c.legajo} · {c.correo}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
              {clienteLegajo && clienteSeleccionado && (
                <p className="text-xs text-muted-foreground mt-1">
                  Seleccionado: <span className="font-mono">{clienteSeleccionado.legajo}</span> · {clienteSeleccionado.correo}
                </p>
              )}
            </div>
          )}
        </div>
        {clienteSeleccionado && (
          <div className="sm:col-span-2">
            <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Datos del cliente (solo lectura)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-muted-foreground">CUIT / CUIL</span>
                  <Input
                    value={clienteSeleccionado.cuit ?? "—"}
                    disabled
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Razón Social / Nombre</span>
                  <Input value={clienteSeleccionado.nombre} disabled className="text-sm" />
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="sm:col-span-2">
          <LabelAyuda
            htmlFor="gc-usuario"
            hint="Se completa solo con el correo del cliente elegido."
          >
            Usuario (email)
          </LabelAyuda>
          <Input
            id="gc-usuario"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="email@dominio.com"
            disabled={!comercio && !!clienteSeleccionado}
          />
        </div>
        <div className="sm:col-span-2">
          <LabelAyuda
            htmlFor="gc-nombre-comercio"
            hint="Es el nombre que ve el cliente cuando paga con Link de Pago o QR."
          >
            Nombre del comercio
          </LabelAyuda>
          <Input
            id="gc-nombre-comercio"
            value={nombreComercio}
            onChange={(e) => setNombreComercio(e.target.value)}
            placeholder="Ej: Kiosco Central, Distribuidora Delta"
          />
        </div>
        <div className="sm:col-span-2">
          <LabelAyuda
            htmlFor="gc-site-id"
            hint="Es el número que Payway le asignó a este comercio (también llamado “site id”) para reconocer sus cobros y liquidaciones. Lo entrega el equipo de Payway al dar de alta el comercio."
          >
            Nro. de Establecimiento (Payway)
          </LabelAyuda>
          <Input
            id="gc-site-id"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            placeholder="Ej: 12345"
            className="font-mono"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="gc-categoria">Código de categoría</Label>
          <select
            id="gc-categoria"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
          >
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.codigo} · {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="gc-nivel">Nivel</Label>
          <select
            id="gc-nivel"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={nivel}
            onChange={(e) => setNivel(e.target.value as NivelComercio)}
          >
            {NIVELES_COMERCIO.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="gc-estado">Estado</Label>
          <select
            id="gc-estado"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoComercio)}
          >
            {ESTADOS_COMERCIO.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="gc-ejecutivo">Ejecutivo responsable</Label>
          <select
            id="gc-ejecutivo"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={ejecutivoId}
            onChange={(e) => setEjecutivoId(e.target.value)}
          >
            <option value="">Sin asignar</option>
            {adminUsers.filter(u => u.activo).map((u) => (
              <option key={u.id} value={u.id}>{u.nombre} · {u.email}</option>
            ))}
          </select>
        </div>

      </div>

      {comercio && (
        <div className="mt-6 border-t border-border pt-5">
          <BanderasSection comercioId={comercio.id} />
        </div>
      )}
      {!comercio && (
        <p className="text-xs text-muted-foreground mt-4 border rounded-lg bg-muted/30 px-3 py-2">
          Las banderas se configuran luego de crear el comercio, desde el detalle o edición.
        </p>
      )}
    </FormDialog>
  );
}

function Page() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);
  const [estadoFilter, setEstadoFilter] = useState<EstadoComercio | "">("");
  const [nivelFilter, setNivelFilter] = useState<NivelComercio | "">("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const { can } = useCan();
  const puedeCrear = can("crear", "comercios");
  const puedeModificar = can("modificar", "comercios");
  const puedeBorrar = can("borrar", "comercios");

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } = useComercios({
    page,
    pageSize,
    search,
    estado: estadoFilter || undefined,
    nivel: nivelFilter || undefined,
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
  });

  const { rows: categorias } = useCodigosCategoria({ page: 0, pageSize: 1000 });
  const { data: clientes } = useClientesForSelect();
  const { rows: adminUsers } = useAdminUsers({ page: 0, pageSize: 100 });

  const [detail, setDetail] = useState<Comercio | null>(null);
  const [editTarget, setEditTarget] = useState<Comercio | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Comercio | null>(null);
  const [deshabilitarMotivo, setDeshabilitarMotivo] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["comercios"] });

  const cambiarEstado = async (row: Comercio, nuevo: EstadoComercio) => {
    try {
      await setComercioEstado(row.id, nuevo);
      invalidar();
    } catch (e) {
      setConfirmAction({
        title: "No se pudo actualizar",
        message: (e as Error).message,
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    }
  };

  const guardar = async (input: {
    clienteLegajo: string;
    usuario: string;
    nombreComercio: string | null;
    categoriaId: number | null;
    nivel: NivelComercio;
    estado: EstadoComercio;
    ejecutivoResponsableId: string | null;
    siteId: string | null;
  }) => {
    setIsSaving(true);
    try {
      if (editTarget) {
        await updateComercio(editTarget.id, {
          usuario: input.usuario,
          nombreComercio: input.nombreComercio,
          categoriaId: input.categoriaId,
          nivel: input.nivel,
          estado: input.estado,
          ejecutivoResponsableId: input.ejecutivoResponsableId,
          siteId: input.siteId,
        });
      } else {
        await createComercio({
          legajo: input.clienteLegajo,
          usuario: input.usuario,
          nombreComercio: input.nombreComercio,
          categoriaId: input.categoriaId,
          nivel: input.nivel,
          estado: input.estado,
          ejecutivoResponsableId: input.ejecutivoResponsableId,
          siteId: input.siteId,
        });
      }
      invalidar();
      setShowNew(false);
      setEditTarget(null);
    } catch (e) {
      setConfirmAction({
        title: "No se pudo guardar",
        message: (e as Error).message,
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deshabilitar = async () => {
    if (!confirmDelete || !deshabilitarMotivo.trim()) return;
    try {
      await deshabilitarComercio(confirmDelete.id, deshabilitarMotivo.trim());
      invalidar();
    } catch (e) {
      setConfirmAction({
        title: "No se pudo deshabilitar",
        message: (e as Error).message,
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    }
    setConfirmDelete(null);
    setDeshabilitarMotivo("");
  };

  const getActions = (row: Comercio): ActionItem[] => {
    const items: ActionItem[] = [
      { label: "Ver detalle", icon: Eye, onClick: () => setDetail(row) },
      {
        label: "Editar",
        icon: Edit3,
        disabled: !puedeModificar,
        onClick: () => setEditTarget(row),
      },
    ];
    // Solo habilitar/deshabilitar (estados de comercio). Sin gestion de medios de pago.
    if (row.estado === "Activado") {
      items.push({
        label: "Deshabilitar",
        icon: XCircle,
        variant: "danger",
        disabled: !puedeModificar,
        onClick: () => cambiarEstado(row, "Desactivado"),
      });
    } else {
      items.push({
        label: "Habilitar",
        icon: CheckCircle,
        disabled: !puedeModificar,
        onClick: () => cambiarEstado(row, "Activado"),
      });
    }
    items.push({
      label: "Deshabilitar",
      icon: Trash2,
      variant: "danger",
      disabled: !puedeModificar,
      onClick: () => setConfirmDelete(row),
    });
    return items;
  };

  const columns: Column<Comercio>[] = [
    {
      key: "usuario",
      label: "Usuario",
      sortable: true,
      minWidth: 160,
      maxWidth: 280,
      render: (r) => (
        <div>
          <div className="font-semibold">{r.usuario}</div>
          {r.cliente?.nombre && <div className="text-xs text-muted-foreground">{r.cliente.nombre}</div>}
          <LegajoCell legajo={r.legajo} className="text-xs" />
        </div>
      ),
    },
    {
      key: "cliente",
      label: "Nombre comercial",
      sortable: true,
      minWidth: 200,
      maxWidth: 320,
      render: (r) => r.nombreComercio ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "categoria",
      label: "Categoría",
      sortable: true,
      minWidth: 140,
      render: (r) =>
        r.categoria ? (
          <span className="font-mono tabular-nums">
            {r.categoria.codigo} · {r.categoria.nombre}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "nivel",
      label: "Nivel",
      sortable: true,
      minWidth: 100,
      render: (r) => r.nivel,
    },
    {
      key: "ejecutivo",
      label: "Ejecutivo",
      sortable: true,
      minWidth: 160,
      render: (r) =>
        r.ejecutivo ? (
          <div className="text-sm">
            <div className="font-medium truncate max-w-[140px]">{r.ejecutivo.nombre}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[140px]">{r.ejecutivo.email}</div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Sin asignar</span>
        ),
    },
    {
      key: "puntosVenta",
      label: "Puntos de venta",
      sortable: false,
      minWidth: 120,
      render: (r) => <span className="font-mono tabular-nums text-xs">{r.puntosVenta.length}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      minWidth: 120,
      render: (r) => <Badge tone={estadoBadgeTone(r.estado)}>{r.estado}</Badge>,
    },
    {
      key: "createdAt",
      label: "Registro",
      sortable: true,
      minWidth: 120,
      render: (r) => (
        <span className="font-mono text-xs tabular-nums">
          {new Date(r.createdAt).toLocaleDateString("es-AR")}
        </span>
      ),
    },
  ];

  const err = error instanceof DataAccessError ? error : null;
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Comercios"
        description="Listado centralizado de comercios de la plataforma, recuperados desde la base de datos."
        action={
          <BtnPrimary
            type="button"
            onClick={() => setShowNew(true)}
            disabled={!puedeCrear || !clientes}
          >
            <Plus size={14} /> Nuevo comercio
          </BtnPrimary>
        }
      />

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="buscar">Buscar</Label>
            <Input
              id="buscar"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(0);
              }}
              placeholder="Usuario (email) o legajo…"
            />
          </div>
          <div>
            <Label htmlFor="f-estado">Estado</Label>
            <select
              id="f-estado"
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              value={estadoFilter}
              onChange={(e) => {
                setEstadoFilter(e.target.value as EstadoComercio | "");
                setPage(0);
              }}
            >
              <option value="">Todos</option>
              {ESTADOS_COMERCIO.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="f-nivel">Nivel</Label>
            <select
              id="f-nivel"
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              value={nivelFilter}
              onChange={(e) => {
                setNivelFilter(e.target.value as NivelComercio | "");
                setPage(0);
              }}
            >
              <option value="">Todos</option>
              {NIVELES_COMERCIO.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="f-desde">Fecha desde</Label>
            <Input
              id="f-desde"
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                setFechaDesde(e.target.value);
                setPage(0);
              }}
              className="h-10"
            />
          </div>
          <div>
            <Label htmlFor="f-hasta">Fecha hasta</Label>
            <Input
              id="f-hasta"
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                setFechaHasta(e.target.value);
                setPage(0);
              }}
              className="h-10"
            />
          </div>
          {(fechaDesde || fechaHasta || estadoFilter || nivelFilter || searchInput) && (
            <BtnOutline
              type="button"
              onClick={() => {
                setSearchInput("");
                setEstadoFilter("");
                setNivelFilter("");
                setFechaDesde("");
                setFechaHasta("");
                setPage(0);
              }}
            >
              Limpiar filtros
            </BtnOutline>
          )}
        </div>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando comercios…
        </div>
      ) : isError ? (
        <MensajeEstado
          tipo={err?.permission ? "permiso" : "error"}
          mensaje={err?.message ?? "Error desconocido"}
          onRetry={() => refetch()}
        />
      ) : isEmpty ? (
        <MensajeEstado tipo="vacio" mensaje="" />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={rows}
            keyExtractor={(r) => r.id}
            pageSize={pageSize}
            showDownloadButton={false}
            showGlobalFilter={false}
            dateFilterColumns={[]}
            hidePagination
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
          />
          <Pagination
            page={page + 1}
            totalPages={totalPaginas}
            pageSize={pageSize}
            total={total}
            countLabel="comercio(s)"
            pageSizes={PAGE_SIZES}
            disabled={isFetching}
            onPageChange={(p) => setPage(p - 1)}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(0);
            }}
          />
        </>
      )}

      {detail && <ComercioDetalle comercio={detail} onClose={() => setDetail(null)} />}

      {(showNew || editTarget) && (
        <ComercioFormModal
          comercio={editTarget}
          clientes={clientes ?? []}
          categorias={categorias ?? []}
          adminUsers={adminUsers ?? []}
          isSaving={isSaving}
          onClose={() => {
            setShowNew(false);
            setEditTarget(null);
          }}
          onSave={guardar}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => { setConfirmDelete(null); setDeshabilitarMotivo(""); }}
        title="Deshabilitar comercio"
        message={`¿Deshabilitar el comercio "${confirmDelete?.usuario}"? El comercio pasará a estado "Desactivado" y no podrá operar. Esta acción queda registrada en el historial.`}
        confirmLabel="Deshabilitar"
        variant="danger"
        onConfirm={deshabilitar}
        extraContent={
          <div className="mt-3">
            <label className="text-xs font-semibold">Motivo de deshabilitación (requerido)</label>
            <textarea
              value={deshabilitarMotivo}
              onChange={(e) => setDeshabilitarMotivo(e.target.value)}
              rows={3}
              placeholder="Motivo de la deshabilitación..."
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
        }
      />

      {confirmAction && (
        <ConfirmDialog
          open={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel}
          variant={confirmAction.variant}
          onConfirm={confirmAction.onConfirm}
        />
      )}
    </PermissionGuard>
  );
}
