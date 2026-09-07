import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Inbox, Clock, Percent, Wallet, ArrowRight, Building2, Calendar } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader, Badge, Card } from "@/components/portal-shell";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PermissionGuard } from "@/components/permission-guard";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { useCan } from "@/lib/permissions";

export const Route = createFileRoute("/admin/comercios/link-pago/adelantos")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Adelantos de Dinero — Links de Pago — Admin — Moli" },
      { name: "description", content: "Solicitudes de adelanto de fondos de comercios." },
    ],
  }),
});

type EstadoAdelanto = "Pendiente" | "Aprobado" | "Rechazado" | "Acreditado";
type Adelanto = {
  id: string;
  comercio: string;
  legajo: string;
  fechaSolicitud: string;
  importeSolicitado: number;
  plazoSolicitado: string; // ej: 15 días, 1 día, 7 días
  plazoContractual: string;
  comision: string; // ej: 4% a 15 días
  tasaEfectiva?: string;
  estado: EstadoAdelanto;
  notas?: string | null;
};

const MOCK: Adelanto[] = [
  {
    id: "AD-2026-09-06-001",
    comercio: "Distribuidora Delta SRL",
    legajo: "LPJ-30778899001",
    fechaSolicitud: "06/09/2026",
    importeSolicitado: 500_000,
    plazoSolicitado: "15 días",
    plazoContractual: "30 días (3%)",
    comision: "4% a 15 días",
    tasaEfectiva: "TNA 48%",
    estado: "Pendiente",
    notas: "Necesita flujo para reposición",
  },
  {
    id: "AD-2026-09-05-002",
    comercio: "Tech Zeta SRL",
    legajo: "LPJ-30667788990",
    fechaSolicitud: "05/09/2026",
    importeSolicitado: 1_200_000,
    plazoSolicitado: "1 día",
    plazoContractual: "30 días (3%)",
    comision: "6% a 1 día",
    tasaEfectiva: "TNA 72%",
    estado: "Aprobado",
    notas: "Aprobado por riesgo",
  },
  {
    id: "AD-2026-09-04-003",
    comercio: "Alimentos Eta SA",
    legajo: "LPJ-30778899001",
    fechaSolicitud: "04/09/2026",
    importeSolicitado: 300_000,
    plazoSolicitado: "7 días",
    plazoContractual: "30 días (3%)",
    comision: "5% a 7 días",
    estado: "Acreditado",
    notas: "Acreditado en cuenta recaudadora",
  },
  {
    id: "AD-2026-09-03-004",
    comercio: "Constructora Alpha SA",
    legajo: "LPJ-30112233445",
    fechaSolicitud: "03/09/2026",
    importeSolicitado: 800_000,
    plazoSolicitado: "15 días",
    plazoContractual: "30 días (3%)",
    comision: "4% a 15 días",
    estado: "Rechazado",
    notas: "Rechazado por historial de contracargos",
  },
];

function tone(e: EstadoAdelanto): "warn" | "success" | "danger" | "neutral" {
  if (e === "Pendiente") return "warn";
  if (e === "Aprobado") return "neutral";
  if (e === "Acreditado") return "success";
  return "danger";
}

function fmt(n: number) {
  return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Detalle({ a, onClose, onSave }: { a: Adelanto; onClose: () => void; onSave: (u: Adelanto) => void }) {
  const [estado, setEstado] = useState<EstadoAdelanto>(a.estado);
  const guardar = () => {
    onSave({ ...a, estado });
    toast.success(`Adelanto ${estado}`);
    onClose();
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
              <div><span className="text-muted-foreground flex items-center gap-1"><Percent size={12}/> Comisión / tasa</span><div className="font-semibold">{a.comision}</div><div className="text-xs text-muted-foreground">{a.tasaEfectiva ?? "—"}</div></div>
              <div className="col-span-2"><span className="text-muted-foreground">Notas</span><div className="text-sm">{a.notas ?? "—"}</div></div>
            </div>
          </Card>

          <Card className="p-4 bg-muted/20">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Concepto</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              El comercio pide recibir antes fondos que normalmente cobraría en <strong>{a.plazoContractual}</strong>. Ejemplo: 30 días 3% → 15 días 4% → 1 día 6%. La comisión sube si el plazo se acorta. Esta sección gestiona la solicitud; los estados/acciones finales quedan abiertos a definición funcional.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono mt-2">
              <span>30 días 3%</span> <ArrowRight size={12}/> <span className="font-semibold">15 días 4%</span> <ArrowRight size={12}/> <span>1 día 6%</span>
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Gestión (Admin)</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold">Estado</label>
                <select value={estado} onChange={(e)=> setEstado(e.target.value as EstadoAdelanto)} className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm">
                  <option value="Pendiente">Pendiente</option>
                  <option value="Aprobado">Aprobado</option>
                  <option value="Rechazado">Rechazado</option>
                  <option value="Acreditado">Acreditado</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={onClose} className="h-9 px-3 rounded-md border bg-card text-sm">Cancelar</button>
                <button onClick={guardar} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold">Guardar</button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Page() {
  const [rows, setRows] = useState<Adelanto[]>(MOCK);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<string>("");
  const [detail, setDetail] = useState<Adelanto | null>(null);
  const [confirm, setConfirm] = useState<{title:string;message:string}|null>(null);
  const { can } = useCan();
  const puedeGestionar = can("modificar","comercios");

  const filtered = rows.filter((r) => {
    if (estado && r.estado !== estado) return false;
    if (q.trim() && !`${r.id} ${r.comercio} ${r.legajo} ${r.comision}`.toLowerCase().includes(q.trim().toLowerCase())) return false;
    return true;
  });

  const guardar = (u: Adelanto) => setRows((prev)=> prev.map((p)=> p.id===u.id ? u : p));

  const getActions = (r: Adelanto): ActionItem[] => [
    { label:"Ver / gestionar", icon: Eye, onClick:()=> setDetail(r) },
    ...(r.estado==="Pendiente" ? [
      { label:"Aprobar", icon: Wallet, disabled:!puedeGestionar, onClick:()=> { setRows((prev)=> prev.map((p)=> p.id===r.id ? {...p, estado:"Aprobado" as const} : p)); toast.success("Adelanto aprobado (mock)"); } } as ActionItem,
      { label:"Rechazar", icon: Inbox, variant:"danger" as const, disabled:!puedeGestionar, onClick:()=> { setRows((prev)=> prev.map((p)=> p.id===r.id ? {...p, estado:"Rechazado" as const} : p)); toast.success("Adelanto rechazado"); } } as ActionItem,
    ] : []),
  ];

  const columns: Column<Adelanto>[] = [
    { key:"id", label:"Solicitud", render:(r)=> <span className="font-mono text-xs font-semibold">{r.id}</span> },
    { key:"comercio", label:"Comercio", render:(r)=> <div><div className="font-semibold text-sm truncate max-w-[160px]">{r.comercio}</div><div className="font-mono text-xs text-muted-foreground">{r.legajo}</div></div> },
    { key:"importeSolicitado", label:"Importe", render:(r)=> <span className="font-mono tabular-nums font-semibold">{fmt(r.importeSolicitado)}</span> },
    { key:"plazoSolicitado", label:"Plazo solicitado", render:(r)=> <div><div className="font-semibold text-sm">{r.plazoSolicitado}</div><div className="text-xs text-muted-foreground">{r.plazoContractual}</div></div> },
    { key:"comision", label:"Comisión / tasa", render:(r)=> <div><div className="font-semibold text-sm">{r.comision}</div><div className="text-xs text-muted-foreground">{r.tasaEfectiva ?? "—"}</div></div> },
    { key:"estado", label:"Estado", filterable:"enum", filterOptions:["Pendiente","Aprobado","Rechazado","Acreditado"], render:(r)=> <Badge tone={tone(r.estado)}>{r.estado}</Badge> },
    { key:"fechaSolicitud", label:"Fecha", render:(r)=> <span className="font-mono text-xs">{r.fechaSolicitud}</span> },
  ];

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader title="Adelantos de Dinero" description="Solicitudes de comercios para recibir fondos antes del plazo contractual. Comisión a mayor plazo corto (30d 3% → 15d 4% → 1d 6% ejemplo). Estructura preparada para gestión." />
      <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground mb-4">
        <strong>Adelanto ≠ Lote.</strong> El lote acredita el corte diario neto; el adelanto es una solicitud puntual para cobrar antes con mayor comisión.
      </div>
      <div className="flex flex-wrap gap-3 mb-4">
        <input className="h-10 px-3 rounded-md border bg-card text-sm flex-1 min-w-[200px]" placeholder="Buscar solicitud, comercio, legajo..." value={q} onChange={(e)=> setQ(e.target.value)} />
        <select className="h-10 px-3 rounded-md border bg-card text-sm" value={estado} onChange={(e)=> setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Aprobado">Aprobado</option>
          <option value="Rechazado">Rechazado</option>
          <option value="Acreditado">Acreditado</option>
        </select>
      </div>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {(["Pendiente","Aprobado","Rechazado","Acreditado"] as const).map((s)=> (
          <Card key={s} className="p-3"><div className="text-xs text-muted-foreground">{s}</div><div className="font-mono text-xl font-semibold mt-1">{rows.filter((r)=> r.estado===s).length}</div></Card>
        ))}
      </div>
      {filtered.length===0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-sm text-muted-foreground"><Inbox size={28}/><p>No hay adelantos para el filtro.</p></div>
      ) : (
        <DataTable columns={columns} data={filtered} keyExtractor={(r)=> r.id} actions={(r)=> <ActionsDropdown actions={getActions(r)} />} />
      )}
      {detail && <Detalle a={detail} onClose={()=> setDetail(null)} onSave={guardar} />}
      {confirm && <ConfirmDialog open={!!confirm} onClose={()=> setConfirm(null)} title={confirm.title} message={confirm.message} confirmLabel="Cerrar" variant="default" onConfirm={()=> setConfirm(null)} />}
    </PermissionGuard>
  );
}
