import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, AlertTriangle, Inbox, Ticket, FileText, ArrowRight, Clock, ShieldCheck } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader, Badge, Card } from "@/components/portal-shell";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PermissionGuard } from "@/components/permission-guard";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { useCan } from "@/lib/permissions";

export const Route = createFileRoute("/admin/comercios/link-pago/contracargos")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Contracargos — Links de Pago — Admin — Moli" },
      { name: "description", content: "Gestión de contracargos de links de pago." },
    ],
  }),
});

type EstadoContra = "Abierto" | "En mediación" | "Cerrado acreditado" | "Cerrado retenido";
type Contra = {
  id: string;
  linkId: string;
  linkUrl: string;
  comercio: string;
  legajo: string;
  estado: EstadoContra;
  fecha: string;
  importe: number;
  ticketPayway: string | null;
  motivo: string;
  docPresentada: string | null;
};

const MOCK: Contra[] = [
  {
    id: "CB-2026-09-07-001",
    linkId: "LP-8850",
    linkUrl: "https://pay.moli.com/p/8850",
    comercio: "Distribuidora Delta SRL",
    legajo: "LPJ-30778899001",
    estado: "Abierto",
    fecha: "07/09/2026 14:22",
    importe: 89_000,
    ticketPayway: null,
    motivo: "Desconocimiento de pago — comprador",
    docPresentada: null,
  },
  {
    id: "CB-2026-09-05-003",
    linkId: "LP-8720",
    linkUrl: "https://pay.moli.com/p/8720",
    comercio: "Tech Zeta SRL",
    legajo: "LPJ-30667788990",
    estado: "En mediación",
    fecha: "05/09/2026 09:12",
    importe: 45_500,
    ticketPayway: "PW-TKT-88421",
    motivo: "Tarjeta no reconocida",
    docPresentada: "Comprobante de entrega + KYC comprador",
  },
  {
    id: "CB-2026-08-28-007",
    linkId: "LP-8601",
    linkUrl: "https://pay.moli.com/p/8601",
    comercio: "Alimentos Eta SA",
    legajo: "LPJ-30778899001",
    estado: "Cerrado acreditado",
    fecha: "28/08/2026 11:05",
    importe: 120_000,
    ticketPayway: "PW-TKT-87102",
    motivo: "Reclamo infundado — compra verificada",
    docPresentada: "Ticket PayWay + factura + entrega",
  },
  {
    id: "CB-2026-08-20-002",
    linkId: "LP-8455",
    linkUrl: "https://pay.moli.com/p/8455",
    comercio: "Constructora Alpha SA",
    legajo: "LPJ-30112233445",
    estado: "Cerrado retenido",
    fecha: "20/08/2026 16:40",
    importe: 67_000,
    ticketPayway: "PW-TKT-86011",
    motivo: "Pago no autorizado confirmado",
    docPresentada: "Resolución Visa → PayWay → MoliPay → comprador (devolución)",
  },
];

function tone(e: EstadoContra): "warn" | "neutral" | "success" | "danger" {
  if (e === "Abierto") return "warn";
  if (e === "En mediación") return "neutral";
  if (e === "Cerrado acreditado") return "success";
  return "danger";
}

function fmt(n: number) {
  return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Detalle({ c, onClose, onSave }: { c: Contra; onClose: () => void; onSave: (u: Contra) => void }) {
  const [estado, setEstado] = useState<EstadoContra>(c.estado);
  const [ticket, setTicket] = useState(c.ticketPayway ?? "");
  const [doc, setDoc] = useState(c.docPresentada ?? "");

  const guardar = () => {
    onSave({ ...c, estado, ticketPayway: ticket || null, docPresentada: doc || null });
    toast.success("Contracargo actualizado");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2"><AlertTriangle size={18} className="text-red-600"/> Contracargo {c.id}</h3>
            <p className="text-sm text-muted-foreground">{c.comercio} · {c.legajo} · Link {c.linkId}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {/* Flujo Visa→PayWay→MoliPay→comprador */}
          <div className="rounded-lg bg-muted/40 border px-3 py-2 text-xs flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold">Flujo devolución retenido:</span>
            <span>Visa</span> <ArrowRight size={12}/> <span>PayWay</span> <ArrowRight size={12}/> <span>MoliPay</span> <ArrowRight size={12}/> <span>comprador</span>
          </div>

          {/* Qué ocurrió → pendiente → documentación → acción */}
          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Qué ocurrió → pendiente → documentación → acción</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Link</span><div className="font-mono text-xs break-all">{c.linkUrl} ({c.linkId})</div></div>
              <div><span className="text-muted-foreground">Comercio</span><div className="font-semibold">{c.comercio}</div><div className="font-mono text-xs text-muted-foreground">{c.legajo}</div></div>
              <div><span className="text-muted-foreground">Fecha / Importe</span><div className="font-mono text-xs">{c.fecha} · <span className="font-semibold">{fmt(c.importe)}</span></div><div className="text-xs text-muted-foreground">{c.motivo}</div></div>
              <div><span className="text-muted-foreground">Estado actual</span><div><Badge tone={tone(c.estado)}>{c.estado}</Badge></div></div>
            </div>
          </Card>

          {/* Timeline ciclo de vida */}
          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Ciclo de vida</h4>
            <ol className="space-y-2 text-xs">
              <li className={`flex gap-2 ${c.estado==="Abierto" ? "font-semibold" : "text-muted-foreground"}`}><Clock size={14} className="mt-0.5"/> <span><strong>Abierto</strong> — comprador crea contracargo via PayWay, dinero retenido para comercio.</span></li>
              <li className={`flex gap-2 ${c.estado==="En mediación" ? "font-semibold" : "text-muted-foreground"}`}><FileText size={14} className="mt-0.5"/> <span><strong>En mediación</strong> — MoliPay gestiona, presenta documentación, registra ticket PayWay.</span></li>
              <li className={`flex gap-2 ${c.estado==="Cerrado acreditado" ? "font-semibold text-emerald-700" : "text-muted-foreground"}`}><ShieldCheck size={14} className="mt-0.5"/> <span><strong>Cerrado acreditado</strong> — compra real verificada, contracargo incorrecto, importe acreditado.</span></li>
              <li className={`flex gap-2 ${c.estado==="Cerrado retenido" ? "font-semibold text-red-700" : "text-muted-foreground"}`}><AlertTriangle size={14} className="mt-0.5"/> <span><strong>Cerrado retenido</strong> — pago no autorizado, se retiene importe, MoliPay gestiona devolución Visa→PayWay→MoliPay→comprador.</span></li>
            </ol>
          </Card>

          {/* Gestión */}
          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Gestión</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold">Estado</label>
                <select value={estado} onChange={(e)=> setEstado(e.target.value as EstadoContra)} className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm">
                  <option value="Abierto">Abierto</option>
                  <option value="En mediación">En mediación</option>
                  <option value="Cerrado acreditado">Cerrado acreditado</option>
                  <option value="Cerrado retenido">Cerrado retenido</option>
                </select>
                {estado==="En mediación" && <p className="text-xs text-muted-foreground mt-1">Requiere ticket PayWay.</p>}
              </div>
              <div>
                <label className="text-xs font-semibold flex items-center gap-1"><Ticket size={12}/> Ticket PayWay</label>
                <input value={ticket} onChange={(e)=> setTicket(e.target.value)} placeholder="Ej: PW-TKT-88421" className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm font-mono" />
              </div>
              <div>
                <label className="text-xs font-semibold flex items-center gap-1"><FileText size={12}/> Documentación presentada</label>
                <textarea value={doc} onChange={(e)=> setDoc(e.target.value)} rows={3} placeholder="Comprobante, factura, KYC, entrega..." className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
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
  const [rows, setRows] = useState<Contra[]>(MOCK);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<string>("");
  const [detail, setDetail] = useState<Contra | null>(null);
  const [confirm, setConfirm] = useState<{title:string;message:string}|null>(null);
  const { can } = useCan();
  const puedeGestionar = can("modificar","comercios");

  const filtered = rows.filter((r) => {
    if (estado && r.estado !== estado) return false;
    if (q.trim() && !`${r.id} ${r.linkId} ${r.comercio} ${r.ticketPayway ?? ""} ${r.motivo}`.toLowerCase().includes(q.trim().toLowerCase())) return false;
    return true;
  });

  const guardar = (u: Contra) => setRows((prev)=> prev.map((p)=> p.id===u.id ? u : p));

  const getActions = (r: Contra): ActionItem[] => [
    { label:"Ver / gestionar", icon: Eye, onClick:()=> setDetail(r) },
    ...(r.estado==="Abierto" ? [{ label:"Pasar a mediación", icon: Ticket, disabled:!puedeGestionar, onClick:()=> {
      setRows((prev)=> prev.map((p)=> p.id===r.id ? {...p, estado:"En mediación" as const, ticketPayway: p.ticketPayway ?? "PW-TKT-pendiente"} : p));
      toast.success("En mediación — cargar ticket PayWay");
    }} as ActionItem] : []),
  ];

  const columns: Column<Contra>[] = [
    { key:"id", label:"Contracargo", render:(r)=> <span className="font-mono text-xs font-semibold">{r.id}</span> },
    { key:"linkId", label:"Link", render:(r)=> <div><div className="font-mono text-xs">{r.linkId}</div><div className="font-mono text-[11px] text-muted-foreground truncate max-w-[160px]">{r.linkUrl}</div></div> },
    { key:"comercio", label:"Comercio", render:(r)=> <div><div className="font-semibold text-sm truncate max-w-[140px]">{r.comercio}</div><div className="font-mono text-xs text-muted-foreground">{r.legajo}</div></div> },
    { key:"importe", label:"Importe", render:(r)=> <span className="font-mono tabular-nums font-semibold">{fmt(r.importe)}</span> },
    { key:"ticketPayway", label:"Ticket PayWay", render:(r)=> <span className="font-mono text-xs">{r.ticketPayway ?? "—"}</span> },
    { key:"estado", label:"Estado", filterable:"enum", filterOptions:["Abierto","En mediación","Cerrado acreditado","Cerrado retenido"], render:(r)=> <Badge tone={tone(r.estado)}>{r.estado}</Badge> },
    { key:"fecha", label:"Fecha", render:(r)=> <span className="font-mono text-xs">{r.fecha}</span> },
  ];

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader title="Contracargos" description="Links/pagos en proceso de desconocimiento. Ciclo: Abierto → En mediación (ticket PayWay) → Cerrado acreditado / retenido. Flujo devolución: Visa → PayWay → MoliPay → comprador." />
      <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground mb-4">
        <strong>Contracargo ≠ Lote.</strong> Cada registro es un pago individual en disputa. El lote de acreditación descuenta los contracargos del importe a acreditar.
      </div>
      <div className="flex flex-wrap gap-3 mb-4">
        <input className="h-10 px-3 rounded-md border bg-card text-sm flex-1 min-w-[200px]" placeholder="Buscar contracargo, link, comercio, ticket..." value={q} onChange={(e)=> setQ(e.target.value)} />
        <select className="h-10 px-3 rounded-md border bg-card text-sm" value={estado} onChange={(e)=> setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="Abierto">Abierto</option>
          <option value="En mediación">En mediación</option>
          <option value="Cerrado acreditado">Cerrado acreditado</option>
          <option value="Cerrado retenido">Cerrado retenido</option>
        </select>
      </div>
      <div className="grid grid-cols-4 gap-3 mb-4">
        { (["Abierto","En mediación","Cerrado acreditado","Cerrado retenido"] as const).map((s)=> (
          <Card key={s} className="p-3"><div className="text-xs text-muted-foreground">{s}</div><div className="font-mono text-xl font-semibold mt-1">{rows.filter((r)=> r.estado===s).length}</div></Card>
        ))}
      </div>
      {filtered.length===0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-sm text-muted-foreground"><Inbox size={28}/><p>No hay contracargos para el filtro.</p></div>
      ) : (
        <DataTable columns={columns} data={filtered} keyExtractor={(r)=> r.id} actions={(r)=> <ActionsDropdown actions={getActions(r)} />} />
      )}
      {detail && <Detalle c={detail} onClose={()=> setDetail(null)} onSave={guardar} />}
      {confirm && <ConfirmDialog open={!!confirm} onClose={()=> setConfirm(null)} title={confirm.title} message={confirm.message} confirmLabel="Cerrar" variant="default" onConfirm={()=> setConfirm(null)} />}
    </PermissionGuard>
  );
}
