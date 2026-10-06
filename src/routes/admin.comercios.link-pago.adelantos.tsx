import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Inbox, Clock, Percent, Wallet, Building2, Calendar, AlertTriangle } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader, Badge, Card, Input, Label } from "@/components/portal-shell";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PermissionGuard } from "@/components/permission-guard";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { useCan } from "@/lib/permissions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listAdelantos, updateAdelanto } from "@/lib/api/adelantos";
import { listAdelantosByComercio } from "@/lib/api/adelantos";
import type { EstadoAdelanto } from "@/lib/api/types";

export const Route = createFileRoute("/admin/comercios/link-pago/adelantos")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Adelantos de Dinero — Links de Pago — Admin — Moli" },
      { name: "description", content: "Solicitudes de adelanto de fondos de comercios." },
    ],
  }),
});

type AdelantoUI = {
  id: string;
  comercio: string;
  legajo: string;
  fechaSolicitud: string;
  importeSolicitado: number;
  plazoSolicitado: string;
  plazoContractual: string;
  comision: string;
  tasaEfectiva?: string;
  estado: EstadoAdelanto;
  notas?: string | null;
  tasaInteresPct?: number | null;
  motivo?: string | null;
  fechaAcreditacion?: string | null;
  montoPorAcreditar?: number | null;
};

function tone(e: EstadoAdelanto): "warn" | "success" | "danger" | "neutral" {
  if (e === "Pendiente") return "warn";
  if (e === "Aprobado") return "neutral";
  if (e === "Acreditado") return "success";
  if (e === "Cancelado") return "neutral";
  return "danger";
}

function fmt(n: number) {
  return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Detalle({ a, onClose, onSave }: { a: AdelantoUI; onClose: () => void; onSave: (u: AdelantoUI) => void }) {
  const [estado, setEstado] = useState<EstadoAdelanto>(a.estado);
  const [tasaInteres, setTasaInteres] = useState<string>(
    a.tasaInteresPct != null ? String(a.tasaInteresPct) : ""
  );
  const isPendiente = a.estado === "Pendiente";
  const isAprobando = isPendiente && estado === "Aprobado";

  const guardar = async () => {
    if (isAprobando && tasaInteres.trim() === "") {
      toast.error("Definí la tasa de interés (%) para ofrecer al comercio al aprobar");
      return;
    }
    let pct: number | null = a.tasaInteresPct ?? null;
    if (tasaInteres.trim() !== "") {
      const v = parseFloat(tasaInteres.replace(",", "."));
      if (isNaN(v) || v < 0 || v > 100) {
        toast.error("Porcentaje inválido (0-100)");
        return;
      }
      pct = v;
    }
    try {
      await updateAdelanto(a.id, {
        estado,
        tasaInteresPct: pct,
      });
      onSave({ ...a, estado, tasaInteresPct: pct });
      toast.success(`Adelanto ${estado}${pct != null ? ` — tasa ${pct}%` : ""}`);
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2"><Wallet size={18}/> Adelanto {a.id}</h3>
            <p className="text-sm text-muted-foreground">{a.comercio} · {a.legajo}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Solicitud</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground flex items-center gap-1"><Building2 size={12}/> Comercio</span><div className="font-semibold">{a.comercio}</div><div className="font-mono text-xs text-muted-foreground">{a.legajo}</div></div>
              <div><span className="text-muted-foreground flex items-center gap-1"><Calendar size={12}/> Fecha solicitud</span><div className="font-mono">{a.fechaSolicitud}</div></div>
              <div><span className="text-muted-foreground">Importe solicitado</span><div className="font-mono font-semibold text-base">{fmt(a.importeSolicitado)}</div></div>
              <div><span className="text-muted-foreground">Estado</span><div><Badge tone={tone(a.estado)}>{a.estado}</Badge></div></div>
              <div><span className="text-muted-foreground flex items-center gap-1"><Clock size={12}/> Plazo solicitado</span><div className="font-semibold">{a.plazoSolicitado}</div><div className="text-xs text-muted-foreground">Contractual: {a.plazoContractual}</div></div>
              {a.motivo && <div className="col-span-2"><span className="text-muted-foreground">Motivo</span><div className="text-sm">{a.motivo}</div></div>}
              {a.fechaAcreditacion && <div><span className="text-muted-foreground">Fecha acreditación</span><div className="font-mono">{a.fechaAcreditacion}</div></div>}
              {a.montoPorAcreditar != null && <div><span className="text-muted-foreground">Monto por acreditar</span><div className="font-mono font-semibold">{fmt(a.montoPorAcreditar)}</div></div>}
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Gestión (Admin)</h4>
            <div className="space-y-3">
              <div>
                <Label>Estado</Label>
                <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoAdelanto)} className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm" disabled={a.estado === "Cancelado"}>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Aprobado">Aprobado</option>
                  <option value="Rechazado">Rechazado</option>
                  <option value="Acreditado">Acreditado</option>
                  {a.estado === "Cancelado" && <option value="Cancelado">Cancelado (solo lectura)</option>}
                </select>
                {a.estado === "Cancelado" && <p className="text-xs text-muted-foreground mt-1">Este adelanto fue cancelado por el comercio.</p>}
              </div>
              {isAprobando && (
                <div>
                  <Label htmlFor="tasa-interes">Tasa de interés ofrecida (%) — requerida al aprobar</Label>
                  <Input
                    id="tasa-interes"
                    value={tasaInteres}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v !== "" && !/^[0-9]*[.,]?[0-9]*$/.test(v)) return;
                      setTasaInteres(v);
                    }}
                    placeholder="Ej: 4.5"
                    className="h-9"
                    inputMode="decimal"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Este es el momento en que se "ofrece" la condición al comercio.</p>
                </div>
              )}
              {!isAprobando && a.tasaInteresPct != null && (
                <div>
                  <Label>Tasa de interés</Label>
                  <div className="font-mono text-sm">{a.tasaInteresPct}%</div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={onClose} className="h-9 px-3 rounded-md border bg-card text-sm">Cancelar</button>
                <button onClick={guardar} disabled={a.estado === "Cancelado"} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">Guardar</button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Page() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [estadoFilter, setEstadoFilter] = useState<EstadoAdelanto | "">("");
  const [detail, setDetail] = useState<AdelantoUI | null>(null);
  const [confirm, setConfirm] = useState<{title:string;message:string}|null>(null);
  const { can } = useCan();
  const puedeGestionar = can("modificar", "comercios");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["adelantos", page, pageSize, estadoFilter],
    queryFn: () => listAdelantos({
      page,
      pageSize,
      estado: (estadoFilter as EstadoAdelanto) || undefined,
    }),
  });

  const rows: AdelantoUI[] = (data ?? []).map((a) => ({
    id: a.id,
    comercio: a.comercioId,
    legajo: a.comercioId,
    fechaSolicitud: new Date(a.fechaSolicitud).toLocaleDateString("es-AR"),
    importeSolicitado: a.montoSolicitado,
    plazoSolicitado: `${a.plazoAdelantadoDias} días`,
    plazoContractual: `${a.plazoOriginalDias} días`,
    comision: a.tasaInteresPct != null ? `${a.tasaInteresPct}%` : "Pendiente",
    tasaEfectiva: a.tasaInteresPct != null ? `TNA ${(a.tasaInteresPct * 12).toFixed(0)}%` : undefined,
    estado: a.estado,
    notas: a.motivo,
    tasaInteresPct: a.tasaInteresPct,
    motivo: a.motivo,
    fechaAcreditacion: a.fechaAcreditacion,
    montoPorAcreditar: a.montoPorAcreditar,
  }));

  const guardar = (u: AdelantoUI) => {
    refetch();
  };

  const getActions = (r: AdelantoUI): ActionItem[] => [
    { label: "Ver / gestionar", icon: Eye, onClick: () => setDetail(r) },
  ];

  const columns: Column<AdelantoUI>[] = [
    { key: "id", label: "Solicitud", filterable: true, render: (r) => <span className="font-mono text-xs font-semibold">{r.id}</span> },
    { key: "comercio", label: "Comercio", filterable: true, render: (r) => <div><div className="font-semibold text-sm truncate max-w-[160px]">{r.comercio}</div><div className="font-mono text-xs text-muted-foreground">{r.legajo}</div></div> },
    { key: "importeSolicitado", label: "Importe", render: (r) => <span className="font-mono tabular-nums font-semibold">{fmt(r.importeSolicitado)}</span> },
    { key: "plazoSolicitado", label: "Plazo", render: (r) => <div><div className="font-semibold text-sm">{r.plazoSolicitado}</div><div className="text-xs text-muted-foreground">{r.plazoContractual}</div></div> },
    { key: "comision", label: "Tasa / comisión", render: (r) => <div><div className="font-semibold text-sm">{r.comision}</div><div className="text-xs text-muted-foreground">{r.tasaEfectiva ?? "—"}</div></div> },
    { key: "estado", label: "Estado", filterable: "enum", filterOptions: ["Pendiente", "Aprobado", "Rechazado", "Acreditado", "Cancelado"], render: (r) => <Badge tone={tone(r.estado)}>{r.estado}</Badge> },
    { key: "fechaSolicitud", label: "Fecha", render: (r) => <span className="font-mono text-xs">{r.fechaSolicitud}</span> },
  ];

  const err = error as Error | null;

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader title="Adelantos de Dinero" description="Solicitudes de comercios para recibir fondos antes del plazo contractual." />

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Estado</Label>
            <select value={estadoFilter} onChange={(e) => { setEstadoFilter(e.target.value as EstadoAdelanto | ""); setPage(0); }} className="w-full sm:min-w-[130px] h-8 px-2 rounded-md border bg-background text-xs">
              <option value="">Todos</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Aprobado">Aprobado</option>
              <option value="Rechazado">Rechazado</option>
              <option value="Acreditado">Acreditado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-5 gap-3 mb-4">
        {(["Pendiente", "Aprobado", "Rechazado", "Acreditado", "Cancelado"] as const).map((s) => (
          <Card key={s} className="p-3"><div className="text-xs text-muted-foreground">{s}</div><div className="font-mono text-xl font-semibold mt-1">{rows.filter((r) => r.estado === s).length}</div></Card>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando adelantos…
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
          <AlertTriangle size={28} />
          <p>{err?.message ?? "Error"}</p>
          <button onClick={() => refetch()} className="h-9 px-4 rounded-md bg-primary text-primary-foreground">Reintentar</button>
        </div>
      ) : (
        <DataTable columns={columns} data={rows} keyExtractor={(r) => r.id} actions={(r) => <ActionsDropdown actions={getActions(r)} />} />
      )}

      {detail && <Detalle a={detail} onClose={() => setDetail(null)} onSave={guardar} />}
      {confirm && <ConfirmDialog open onClose={() => setConfirm(null)} title={confirm.title} message={confirm.message} confirmLabel="Cerrar" variant="default" onConfirm={() => setConfirm(null)} />}
    </PermissionGuard>
  );
}
