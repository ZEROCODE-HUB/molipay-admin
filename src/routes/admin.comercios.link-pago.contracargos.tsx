import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, AlertTriangle, Inbox, Ticket, FileText, ArrowRight, Clock, ShieldCheck, Plus, X } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader, Badge, Card, Input, Label, BtnOutline } from "@/components/portal-shell";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PermissionGuard } from "@/components/permission-guard";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { useCan } from "@/lib/permissions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listContracargos, updateContracargo, createContracargo, deleteContracargo, type Contra, type EstadoContra } from "@/lib/api/contracargos";
import { useComercios } from "@/hooks/useComercios";

export const Route = createFileRoute("/admin/comercios/link-pago/contracargos")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Contracargos — Links de Pago — Admin — Moli" },
      { name: "description", content: "Gestión de contracargos de links de pago." },
    ],
  }),
});

const ESTADO_LABEL: Record<EstadoContra, string> = {
  Simulado: "Simulado",
  Abierto: "Abierto",
  En_mediación: "En mediación",
  Cerrado_acreditado: "Cerrado acreditado",
  Cerrado_retenido: "Cerrado retenido",
};

const ESTADO_OPTIONS: EstadoContra[] = [
  "Simulado", "Abierto", "En_mediación", "Cerrado_acreditado", "Cerrado_retenido",
];

function tone(e: EstadoContra): "warn" | "neutral" | "success" | "danger" {
  if (e === "Simulado") return "neutral";
  if (e === "Abierto") return "warn";
  if (e === "En_mediación") return "neutral";
  if (e === "Cerrado_acreditado") return "success";
  return "danger"; // Cerrado_retenido
}

function fmt(n: number) {
  return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Detalle({ c, onClose, onDelete }: { c: Contra; onClose: () => void; onDelete?: (id: string) => void }) {
  const qc = useQueryClient();
  const [estado, setEstado] = useState<EstadoContra>(c.estado);
  const [ticket, setTicket] = useState(c.ticketPayway ?? "");
  const [doc, setDoc] = useState(c.documentacion ?? "");
  const [resolucion, setResolucion] = useState(c.resolucion ?? "");
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    setSaving(true);
    try {
      await updateContracargo(c.id, {
        estado,
        ticketPayway: ticket || null,
        documentacion: doc || null,
        resolucion: resolucion || null,
        esSimulacion: estado === "Simulado",
      });
      toast.success("Contracargo actualizado");
      qc.invalidateQueries({ queryKey: ["contracargos"] });
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <AlertTriangle size={18} className={c.esSimulacion ? "text-blue-600" : "text-red-600"} />
              Contracargo {c.id.slice(0, 8)}…
            </h3>
            <p className="text-sm text-muted-foreground">
              {c.comercioNombre} · {c.comercioLegajo}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Simulación: mostrar impacto antes de confirmar */}
          {c.esSimulacion && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm">
              <div className="font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                <Clock size={14} /> Simulación — estos valores aún no están aplicados
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {c.impactoNeto != null && <div><span className="text-blue-600">Descuento neto:</span> <span className="font-mono font-semibold">{fmt(c.impactoNeto)}</span></div>}
                {c.impactoSaldo != null && <div><span className="text-blue-600">Saldo commerce:</span> <span className="font-mono font-semibold">{fmt(c.impactoSaldo)}</span></div>}
                {c.impactoTasa != null && <div><span className="text-blue-600">Tasa MoliPay:</span> <span className="font-mono">{c.impactoTasa}%</span></div>}
                {c.impactoCierre != null && <div><span className="text-blue-600">Cierre lote:</span> <span className="font-mono">{fmt(c.impactoCierre)}</span></div>}
              </div>
            </div>
          )}

          {/* Flujo */}
          <div className="rounded-lg bg-muted/40 border px-3 py-2 text-xs flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold">Flujo:</span>
            <span>Visa</span> <ArrowRight size={12}/> <span>PayWay</span> <ArrowRight size={12}/> <span>MoliPay</span> <ArrowRight size={12}/> <span>comprador</span>
          </div>

          {/* Info */}
          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Datos del contracargo</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Importe</span><div className="font-mono font-semibold text-lg">{fmt(c.importe)}</div></div>
              <div><span className="text-muted-foreground">Fecha creación</span><div className="font-mono text-xs">{new Date(c.createdAt).toLocaleString("es-AR")}</div></div>
              {c.motivoPayway && <div className="col-span-2"><span className="text-muted-foreground">Motivo PayWay</span><div className="text-sm">{c.motivoPayway}</div></div>}
              {c.linkId && <div><span className="text-muted-foreground">Link ID</span><div className="font-mono text-xs">{c.linkId}</div></div>}
              {c.pagoId && <div><span className="text-muted-foreground">Pago ID</span><div className="font-mono text-xs">{c.pagoId}</div></div>}
            </div>
          </Card>

          {/* Ciclo de vida */}
          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Ciclo de vida</h4>
            <ol className="space-y-2 text-xs">
              <li className={`flex gap-2 ${c.estado === "Simulado" ? "font-semibold text-blue-700" : "text-muted-foreground"}`}>
                <Clock size={14} className="mt-0.5"/> <span><strong>Simulado</strong> — carga manual, calcula impacto sin aplicar. Solo para simular antes de confirmar.</span>
              </li>
              <li className={`flex gap-2 ${c.estado === "Abierto" ? "font-semibold" : "text-muted-foreground"}`}><Clock size={14} className="mt-0.5"/> <span><strong>Abierto</strong> — aplicado, dinero retenido del lote.</span></li>
              <li className={`flex gap-2 ${c.estado === "En_mediación" ? "font-semibold" : "text-muted-foreground"}`}><FileText size={14} className="mt-0.5"/> <span><strong>En mediación</strong> — MoliPay gestiona, presenta documentación.</span></li>
              <li className={`flex gap-2 ${c.estado === "Cerrado_acreditado" ? "font-semibold text-emerald-700" : "text-muted-foreground"}`}><ShieldCheck size={14} className="mt-0.5"/> <span><strong>Cerrado acreditado</strong> — contracargo incorrecto, importe acreditado al comercio.</span></li>
              <li className={`flex gap-2 ${c.estado === "Cerrado_retenido" ? "font-semibold text-red-700" : "text-muted-foreground"}`}><AlertTriangle size={14} className="mt-0.5"/> <span><strong>Cerrado retenido</strong> — pago no autorizado, se retiene importe, Visa→PayWay→comprador.</span></li>
            </ol>
          </Card>

          {/* Gestión */}
          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Gestión</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold">Estado</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as EstadoContra)}
                  className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm"
                >
                  {ESTADO_OPTIONS.map((s) => (
                    <option key={s} value={s}>{ESTADO_LABEL[s]}</option>
                  ))}
                </select>
                {estado === "En_mediación" && <p className="text-xs text-muted-foreground mt-1">Requerir ticket PayWay y documentación.</p>}
                {estado === "Simulado" && <p className="text-xs text-blue-600 mt-1">Simulación — sin impacto en caja ni lotes.</p>}
              </div>
              <div>
                <label className="text-xs font-semibold flex items-center gap-1"><Ticket size={12}/> Ticket PayWay</label>
                <input value={ticket} onChange={(e) => setTicket(e.target.value)} placeholder="Ej: PW-TKT-88421" className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm font-mono" />
              </div>
              <div>
                <label className="text-xs font-semibold flex items-center gap-1"><FileText size={12}/> Documentación presentada</label>
                <textarea value={doc} onChange={(e) => setDoc(e.target.value)} rows={3} placeholder="Comprobante, factura, KYC, entrega..." className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold">Resolución</label>
                <textarea value={resolucion} onChange={(e) => setResolucion(e.target.value)} rows={2} placeholder="Cómo se resolvió..." className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                {c.esSimulacion && (
                  <button
                    onClick={async () => {
                      if (!confirm("¿Eliminar esta simulación?")) return;
                      try {
                        await deleteContracargo(c.id);
                        qc.invalidateQueries({ queryKey: ["contracargos"] });
                        onClose();
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                    className="h-9 px-3 rounded-md border border-red-200 text-red-600 text-sm"
                  >
                    Eliminar simulación
                  </button>
                )}
                <button onClick={onClose} className="h-9 px-3 rounded-md border bg-card text-sm">Cancelar</button>
                <button onClick={guardar} disabled={saving} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CrearModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [comercioId, setComercioId] = useState("");
  const [importe, setImporte] = useState("");
  const [ticket, setTicket] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const { data: comercios } = useComercios();

  const crear = async () => {
    if (!comercioId || !importe) {
      toast.error("Completá comercio e importe");
      return;
    }
    setSaving(true);
    try {
      await createContracargo({
        comercioId,
        importe: parseFloat(importe.replace(",", ".")),
        ticketPayway: ticket || null,
        motivoPayway: motivo || null,
        estado: "Simulado",
        esSimulacion: true,
      });
      toast.success("Simulación de contracargo creada");
      qc.invalidateQueries({ queryKey: ["contracargos"] });
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-md shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-center">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <Plus size={18} /> Simular contracargo
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs text-muted-foreground">
            Cargá los datos del contracargo para simular el impacto sin afectar la caja ni los lotes.
          </p>
          <div>
            <Label>Comercio</Label>
            <select value={comercioId} onChange={(e) => setComercioId(e.target.value)} className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">Seleccionar comercio…</option>
              {comercios?.map((c) => (
                <option key={c.id} value={c.id}>{c.nombreComercio ?? c.usuario} ({c.legajo})</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Importe del contracargo</Label>
            <Input value={importe} onChange={(e) => setImporte(e.target.value)} placeholder="Ej: 15000,00" className="font-mono" />
          </div>
          <div>
            <Label>Ticket PayWay <span className="text-muted-foreground">(opcional)</span></Label>
            <Input value={ticket} onChange={(e) => setTicket(e.target.value)} placeholder="PW-TKT-xxxxx" className="font-mono" />
          </div>
          <div>
            <Label>Motivo <span className="text-muted-foreground">(opcional)</span></Label>
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo del contracargo" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="h-9 px-3 rounded-md border bg-card text-sm">Cancelar</button>
            <button onClick={crear} disabled={saving} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
              {saving ? "Creando…" : "Simular impacto"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Page() {
  const [detail, setDetail] = useState<Contra | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [showCrear, setShowCrear] = useState(false);
  const [estadoFilter, setEstadoFilter] = useState<EstadoContra | "">("");
  const { can } = useCan();
  const puedeGestionar = can("modificar", "comercios");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["contracargos", estadoFilter || undefined],
    queryFn: () => listContracargos(estadoFilter ? { estado: estadoFilter } : undefined),
  });

  const getActions = (r: Contra): ActionItem[] => {
    const base: ActionItem[] = [{ label: "Ver / gestionar", icon: Eye, onClick: () => setDetail(r) }];
    if (r.estado === "Simulado" && puedeGestionar) {
      base.push({
        label: "Confirmar (Aplicar)",
        icon: AlertTriangle,
        onClick: () => {
          setDetail(r);
        },
      } as ActionItem);
    }
    return base;
  };

  const columns: Column<Contra>[] = [
    {
      key: "id", label: "ID", filterable: true, render: (r) => (
        <div className="flex items-center gap-1.5">
          {r.esSimulacion && <span className="text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 font-medium">sim</span>}
          <span className="font-mono text-xs">{r.id.slice(0, 8)}…</span>
        </div>
      ),
    },
    { key: "comercio", label: "Comercio", filterable: true, render: (r) => (
      <div>
        <div className="font-semibold text-sm truncate max-w-[140px]">{r.comercioNombre}</div>
        <div className="font-mono text-xs text-muted-foreground">{r.comercioLegajo}</div>
      </div>
    )},
    { key: "importe", label: "Importe", render: (r) => <span className="font-mono tabular-nums font-semibold text-red-600">-{fmt(r.importe)}</span> },
    { key: "ticketPayway", label: "Ticket PayWay", filterable: true, render: (r) => <span className="font-mono text-xs">{r.ticketPayway ?? "—"}</span> },
    { key: "estado", label: "Estado", filterable: "enum", filterOptions: ESTADO_OPTIONS.map(s => ESTADO_LABEL[s]), render: (r) => (
      <Badge tone={tone(r.estado)}>{ESTADO_LABEL[r.estado]}</Badge>
    )},
    { key: "createdAt", label: "Fecha", render: (r) => <span className="font-mono text-xs">{new Date(r.createdAt).toLocaleDateString("es-AR")}</span> },
  ];

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Contracargos"
        description="Gestión de contracargos de links de pago. Simular impacto → confirmar para aplicar."
      />
      <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground mb-4">
        <strong>Flujo:</strong> Simular (carga manual) → Confirmar (aplica descuento al lote) → En mediación (doc) → Cerrado acreditado / retenido.
        Los contracargos de simulación no afectan la caja ni los lotes.
      </div>

      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex gap-2 flex-wrap">
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value as EstadoContra | "")}
            className="h-8 px-2 rounded-md border bg-background text-xs"
          >
            <option value="">Todos los estados</option>
            {ESTADO_OPTIONS.map((s) => (
              <option key={s} value={s}>{ESTADO_LABEL[s]}</option>
            ))}
          </select>
        </div>
        {puedeGestionar && (
          <button
            onClick={() => setShowCrear(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold"
          >
            <Plus size={14} /> Simular contracargo
          </button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        {ESTADO_OPTIONS.map((s) => (
          <Card key={s} className="p-3">
            <div className="text-xs text-muted-foreground">{ESTADO_LABEL[s]}</div>
            <div className="font-mono text-xl font-semibold mt-1">
              {rows.filter((r) => r.estado === s).length}
            </div>
          </Card>
        ))}
      </div>

      <DataTable columns={columns} data={rows} isLoading={isLoading} keyExtractor={(r) => r.id} actions={(r) => <ActionsDropdown actions={getActions(r)} />} />

      {detail && <Detalle c={detail} onClose={() => setDetail(null)} />}
      {showCrear && <CrearModal onClose={() => setShowCrear(false)} />}
      {confirm && (
        <ConfirmDialog
          open={!!confirm}
          onClose={() => setConfirm(null)}
          title={confirm.title}
          message={confirm.message}
          confirmLabel="Cerrar"
          variant="default"
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
        />
      )}
    </PermissionGuard>
  );
}
