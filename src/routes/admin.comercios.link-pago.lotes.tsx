import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, AlertTriangle, Inbox, Calendar, Store, Wallet, Receipt, Percent, ArrowUpRight } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader, Badge, Card } from "@/components/portal-shell";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PermissionGuard } from "@/components/permission-guard";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { useCan } from "@/lib/permissions";

export const Route = createFileRoute("/admin/comercios/link-pago/lotes")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Lotes de Acreditación — Links de Pago — Admin — Moli" },
      { name: "description", content: "Lotes generados por MoliPay para acreditar pagos a comercios." },
    ],
  }),
});

// Tipos — Lote generado por MoliPay (corte diario), no por el comercio
type EstadoLote = "Acreditado" | "Rechazado" | "Contracargo";
type Lote = {
  id: string;
  fecha: string; // DD/MM/YYYY
  comercio: string;
  legajo: string;
  cantidadOps: number;
  importeBruto: number;
  impuestos: number;
  tasasIntereses: number;
  comisiones: number;
  importeFinal: number;
  estado: EstadoLote;
  linksIds: string[]; // ids de links incluidos
};

const MOCK_LOTES: Lote[] = [
  {
    id: "LOTE-2026-09-07-001",
    fecha: "07/09/2026",
    comercio: "Distribuidora Delta SRL",
    legajo: "LPJ-30778899001",
    cantidadOps: 10,
    importeBruto: 1_250_000,
    impuestos: 26_250,
    tasasIntereses: 12_500,
    comisiones: 37_500,
    importeFinal: 1_173_750,
    estado: "Contracargo",
    linksIds: ["LP-8841", "LP-8842", "LP-8843", "LP-8844", "LP-8845", "LP-8846", "LP-8847", "LP-8848", "LP-8849", "LP-8850"],
  },
  {
    id: "LOTE-2026-09-06-014",
    fecha: "06/09/2026",
    comercio: "Tech Zeta SRL",
    legajo: "LPJ-30667788990",
    cantidadOps: 9,
    importeBruto: 890_000,
    impuestos: 18_690,
    tasasIntereses: 8_900,
    comisiones: 26_700,
    importeFinal: 835_710,
    estado: "Acreditado",
    linksIds: ["LP-8801", "LP-8802", "LP-8803", "LP-8804", "LP-8805", "LP-8806", "LP-8807", "LP-8808", "LP-8809"],
  },
  {
    id: "LOTE-2026-09-06-015",
    fecha: "06/09/2026",
    comercio: "Alimentos Eta SA",
    legajo: "LPJ-30778899001",
    cantidadOps: 4,
    importeBruto: 320_000,
    impuestos: 6_720,
    tasasIntereses: 3_200,
    comisiones: 9_600,
    importeFinal: 300_480,
    estado: "Acreditado",
    linksIds: ["LP-8810", "LP-8811", "LP-8812", "LP-8813"],
  },
  {
    id: "LOTE-2026-09-05-003",
    fecha: "05/09/2026",
    comercio: "Constructora Alpha SA",
    legajo: "LPJ-30112233445",
    cantidadOps: 6,
    importeBruto: 540_000,
    impuestos: 11_340,
    tasasIntereses: 5_400,
    comisiones: 16_200,
    importeFinal: 507_060,
    estado: "Rechazado",
    linksIds: ["LP-8701", "LP-8702", "LP-8703", "LP-8704", "LP-8705", "LP-8706"],
  },
];

function tone(e: EstadoLote): "success" | "warn" | "danger" | "neutral" {
  if (e === "Acreditado") return "success";
  if (e === "Contracargo") return "danger";
  return "warn"; // Rechazado
}

function fmt(n: number) {
  return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function LoteDetalle({ lote, onClose }: { lote: Lote; onClose: () => void }) {
  const totalDescuentos = lote.impuestos + lote.tasasIntereses + lote.comisiones;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2"><Receipt size={18}/> Detalle del lote</h3>
            <p className="text-sm font-mono text-muted-foreground">{lote.id} · {lote.fecha} · {lote.comercio}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {/* Concepto diferenciado */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
            <strong>Lote de Acreditación</strong> generado por <strong>MoliPay</strong> (corte diario). No es el lote creado por el comercio. Determina qué importe acreditar al comercio descontando impuestos/tasas/comisiones. Ejemplo del 07/09: 10 links, 9 acreditables, 1 contracargo → se acredita 9.
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3"><div className="text-xs text-muted-foreground flex items-center gap-1"><Calendar size={12}/> Fecha</div><div className="font-mono font-semibold mt-1">{lote.fecha}</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground flex items-center gap-1"><Store size={12}/> Comercio</div><div className="font-semibold mt-1 truncate">{lote.comercio}</div><div className="font-mono text-xs text-muted-foreground">{lote.legajo}</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground">Operaciones</div><div className="font-mono text-xl font-semibold mt-1">{lote.cantidadOps}</div><div className="text-xs text-muted-foreground truncate">{lote.linksIds.slice(0, 3).join(", ")}…</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground">Estado</div><div className="mt-1"><Badge tone={tone(lote.estado)}>{lote.estado}</Badge></div><div className="text-xs text-muted-foreground mt-1">{lote.estado === "Contracargo" ? "Al menos 1 link con contracargo" : lote.estado === "Rechazado" ? "Pendiente definición funcional" : "Dinero en cuenta recaudadora"}</div></Card>
          </div>

          {/* Breakdown cómo se llegó al importe final */}
          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Cómo se llegó al importe a acreditar</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Importe bruto (suma links acreditables)</span><span className="font-mono font-semibold">{fmt(lote.importeBruto)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground flex items-center gap-1"><Receipt size={12}/> Impuestos</span><span className="font-mono text-red-600">- {fmt(lote.impuestos)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground flex items-center gap-1"><Percent size={12}/> Tasas / intereses</span><span className="font-mono text-red-600">- {fmt(lote.tasasIntereses)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground flex items-center gap-1"><Wallet size={12}/> Comisiones MoliPay</span><span className="font-mono text-red-600">- {fmt(lote.comisiones)}</span></div>
              <div className="border-t my-2"/>
              <div className="flex justify-between text-xs text-muted-foreground"><span>Total descuentos</span><span className="font-mono">- {fmt(totalDescuentos)}</span></div>
              <div className="flex justify-between text-base font-semibold"><span>Importe final a acreditar</span><span className="font-mono text-emerald-700">{fmt(lote.importeFinal)}</span></div>
              {lote.estado === "Contracargo" && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5 mt-2">Incluye contracargo: el lote descuenta ese pago. Ver pestaña Contracargos para ticket PayWay.</p>}
            </div>
          </Card>

          {/* Links incluidos */}
          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Links / pagos incluidos ({lote.cantidadOps})</h4>
            <div className="flex flex-wrap gap-1.5">
              {lote.linksIds.map((id) => (
                <span key={id} className="inline-flex items-center rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs font-mono">{id}</span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Lote de Links (creado por comercio) ≠ Lote de Acreditación (creado por MoliPay). Este lote acredita 9 de 10 links del 07/09 — el restante fue contracargo.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Page() {
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<string>("");
  const [detail, setDetail] = useState<Lote | null>(null);
  const [confirm, setConfirm] = useState<{title:string;message:string} | null>(null);
  const { can } = useCan();
  const puedeGestionar = can("modificar","comercios");

  const filtered = MOCK_LOTES.filter((l) => {
    if (estado && l.estado !== estado) return false;
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      if (!`${l.id} ${l.comercio} ${l.legajo} ${l.fecha}`.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const getActions = (r: Lote): ActionItem[] => [
    { label:"Ver detalle", icon: Eye, onClick:()=> setDetail(r) },
    { label:"Reprocesar", icon: ArrowUpRight, disabled:!puedeGestionar || r.estado==="Acreditado", onClick:()=> {
      toast.info("Reprocesando lote (mock)");
      setConfirm({title:"Lote reprocesado",message:`${r.id} en reproceso mock.`});
    }},
  ];

  const columns: Column<Lote>[] = [
    { key:"fecha", label:"Fecha", render:(r)=> <span className="font-mono text-xs tabular-nums">{r.fecha}</span> },
    { key:"id", label:"Lote", render:(r)=> <span className="font-mono text-xs font-semibold">{r.id}</span> },
    { key:"comercio", label:"Comercio", filterable:true, render:(r)=> <div><div className="font-semibold text-sm truncate max-w-[160px]">{r.comercio}</div><div className="font-mono text-xs text-muted-foreground">{r.legajo}</div></div> },
    { key:"cantidadOps", label:"Ops", render:(r)=> <span className="font-mono tabular-nums">{r.cantidadOps}</span> },
    { key:"importeFinal", label:"Importe a acreditar", render:(r)=> <span className={`font-mono tabular-nums font-semibold ${r.estado==="Contracargo" ? "text-red-600" : "text-emerald-700"}`}>{fmt(r.importeFinal)}</span> },
    { key:"estado", label:"Estado", filterable:"enum", filterOptions:["Acreditado","Rechazado","Contracargo"], render:(r)=> <Badge tone={tone(r.estado)}>{r.estado}</Badge> },
  ];

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader title="Lotes de Acreditación" description="Corte diario generado por MoliPay: qué pagos se acreditan al comercio y con qué descuentos (no es el lote creado por el comercio)." />

      {/* Diferenciación conceptual */}
      <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground mb-4">
        <strong>Lote de Acreditación</strong> = generado por MoliPay para acreditar. <strong>Lote de Links</strong> = creado por el comercio. No confundir. Ver ejemplo 07/09 en detalle.
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input className="h-10 px-3 rounded-md border bg-card text-sm flex-1 min-w-[200px]" placeholder="Buscar lote, comercio, legajo, fecha..." value={q} onChange={(e)=> setQ(e.target.value)} />
        <select className="h-10 px-3 rounded-md border bg-card text-sm" value={estado} onChange={(e)=> setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="Acreditado">Acreditado</option>
          <option value="Rechazado">Rechazado</option>
          <option value="Contracargo">Contracargo</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Acreditados</div><div className="font-mono text-xl font-semibold mt-1 text-emerald-700">{MOCK_LOTES.filter(l=>l.estado==="Acreditado").length}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Contracargo</div><div className="font-mono text-xl font-semibold mt-1 text-red-600">{MOCK_LOTES.filter(l=>l.estado==="Contracargo").length}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Rechazados</div><div className="font-mono text-xl font-semibold mt-1">{MOCK_LOTES.filter(l=>l.estado==="Rechazado").length}</div></Card>
      </div>

      {filtered.length===0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-sm text-muted-foreground"><Inbox size={28}/><p>No hay lotes para el filtro.</p></div>
      ) : (
        <DataTable columns={columns} data={filtered} keyExtractor={(r)=> r.id} actions={(r)=> <ActionsDropdown actions={getActions(r)} />} />
      )}

      {detail && <LoteDetalle lote={detail} onClose={()=> setDetail(null)} />}
      {confirm && <ConfirmDialog open={!!confirm} onClose={()=> setConfirm(null)} title={confirm.title} message={confirm.message} confirmLabel="Cerrar" variant="default" onConfirm={()=> setConfirm(null)} />}
    </PermissionGuard>
  );
}
