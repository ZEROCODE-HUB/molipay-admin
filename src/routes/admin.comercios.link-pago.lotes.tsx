import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Eye, Calendar, Store, Receipt, Percent, ArrowUpRight, CreditCard, Wallet } from "lucide-react";
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

type EstadoLote = "Acreditado" | "Rechazado" | "Contracargo";
type Lote = {
  id: string;
  fecha: string;
  comercio: string;
  legajo: string;
  bandera: string;
  cantidadOps: number;
  importeBruto: number;
  impuestos: number;
  tasaPayWayPct: number;
  tasaPayWayMonto: number;
  tasaMoliPayPct: number;
  tasaMoliPayMonto: number;
  importeFinal: number;
  estado: EstadoLote;
  linksIds: string[];
  cuotas?: number;
  costoPayWayPagoUnico?: number;
};

// Adelanto mock para cruce con resumen
const MOCK_ADELANTOS_BY_LEGAJO: Record<string, { estado: "Pendiente" | "Aprobado" | "Rechazado" | "Acreditado"; monto: number } | null> = {
  "LPJ-30778899001": { estado: "Pendiente", monto: 500_000 },
  "LPJ-30889900112": null,
  "LPJ-30667788990": { estado: "Aprobado", monto: 1_200_000 },
  "LPJ-30112233445": null,
};

const MOCK_LOTES: Lote[] = [
  {
    id: "LOTE-2026-09-07-001",
    fecha: "07/09/2026",
    comercio: "Distribuidora Delta SRL",
    legajo: "LPJ-30778899001",
    bandera: "Visa",
    cantidadOps: 10,
    importeBruto: 1_250_000,
    impuestos: 26_250,
    tasaPayWayPct: 3,
    tasaPayWayMonto: 37_500,
    tasaMoliPayPct: 2,
    tasaMoliPayMonto: 25_000,
    importeFinal: 1_161_250,
    estado: "Contracargo",
    linksIds: ["LP-8841", "LP-8842", "LP-8843", "LP-8844", "LP-8845", "LP-8846", "LP-8847", "LP-8848", "LP-8849", "LP-8850"],
    cuotas: 1,
  },
  {
    id: "LOTE-2026-09-07-002",
    fecha: "07/09/2026",
    comercio: "Distribuidora Delta SRL",
    legajo: "LPJ-30778899001",
    bandera: "Mastercard",
    cantidadOps: 6,
    importeBruto: 780_000,
    impuestos: 16_380,
    tasaPayWayPct: 3,
    tasaPayWayMonto: 23_400,
    tasaMoliPayPct: 2,
    tasaMoliPayMonto: 15_600,
    importeFinal: 724_620,
    estado: "Acreditado",
    linksIds: ["LP-8851", "LP-8852", "LP-8853", "LP-8854", "LP-8855", "LP-8856"],
    cuotas: 6,
    costoPayWayPagoUnico: 11_700,
  },
  {
    id: "LOTE-2026-09-07-003",
    fecha: "07/09/2026",
    comercio: "Distribuidor del Tercer Red",
    legajo: "LPJ-30889900112",
    bandera: "Visa",
    cantidadOps: 12,
    importeBruto: 1_500_000,
    impuestos: 31_500,
    tasaPayWayPct: 3,
    tasaPayWayMonto: 45_000,
    tasaMoliPayPct: 2.5,
    tasaMoliPayMonto: 37_500,
    importeFinal: 1_386_000,
    estado: "Acreditado",
    linksIds: ["LP-8860", "LP-8861", "LP-8862", "LP-8863", "LP-8864", "LP-8865", "LP-8866", "LP-8867", "LP-8868", "LP-8869", "LP-8870", "LP-8871"],
    cuotas: 1,
  },
  {
    id: "LOTE-2026-09-06-014",
    fecha: "06/09/2026",
    comercio: "Tech Zeta SRL",
    legajo: "LPJ-30667788990",
    bandera: "Amex",
    cantidadOps: 9,
    importeBruto: 890_000,
    impuestos: 18_690,
    tasaPayWayPct: 3,
    tasaPayWayMonto: 26_700,
    tasaMoliPayPct: 2,
    tasaMoliPayMonto: 17_800,
    importeFinal: 826_810,
    estado: "Acreditado",
    linksIds: ["LP-8801", "LP-8802", "LP-8803", "LP-8804", "LP-8805", "LP-8806", "LP-8807", "LP-8808", "LP-8809"],
    cuotas: 3,
    costoPayWayPagoUnico: 8_900,
  },
  {
    id: "LOTE-2026-09-06-015",
    fecha: "06/09/2026",
    comercio: "Alimentos Eta SA",
    legajo: "LPJ-30778899001",
    bandera: "Cabal",
    cantidadOps: 4,
    importeBruto: 320_000,
    impuestos: 6_720,
    tasaPayWayPct: 3,
    tasaPayWayMonto: 9_600,
    tasaMoliPayPct: 1.5,
    tasaMoliPayMonto: 4_800,
    importeFinal: 298_880,
    estado: "Acreditado",
    linksIds: ["LP-8810", "LP-8811", "LP-8812", "LP-8813"],
    cuotas: 1,
  },
  {
    id: "LOTE-2026-09-05-003",
    fecha: "05/09/2026",
    comercio: "Constructora Alpha SA",
    legajo: "LPJ-30112233445",
    bandera: "Visa",
    cantidadOps: 6,
    importeBruto: 540_000,
    impuestos: 11_340,
    tasaPayWayPct: 3,
    tasaPayWayMonto: 16_200,
    tasaMoliPayPct: 2,
    tasaMoliPayMonto: 10_800,
    importeFinal: 501_660,
    estado: "Rechazado",
    linksIds: ["LP-8701", "LP-8702", "LP-8703", "LP-8704", "LP-8705", "LP-8706"],
    cuotas: 1,
  },
];

function tone(e: EstadoLote): "success" | "warn" | "danger" | "neutral" {
  if (e === "Acreditado") return "success";
  if (e === "Contracargo") return "danger";
  return "warn";
}

function fmt(n: number) {
  return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function LoteDetalle({ lote, onClose }: { lote: Lote; onClose: () => void }) {
  const totalDescuentos = lote.impuestos + lote.tasaPayWayMonto + lote.tasaMoliPayMonto + (lote.costoPayWayPagoUnico ?? 0);
  const menosImpuestos = lote.importeBruto - lote.impuestos;
  const esCuotas = (lote.cuotas ?? 1) > 1;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2"><Receipt size={18}/> Detalle del lote</h3>
            <p className="text-sm font-mono text-muted-foreground">{lote.id} · {lote.fecha} · {lote.comercio} · {lote.bandera} {esCuotas ? `· ${lote.cuotas} cuotas` : ""}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3"><div className="text-xs text-muted-foreground flex items-center gap-1"><Calendar size={12}/> Fecha</div><div className="font-mono font-semibold mt-1">{lote.fecha}</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground flex items-center gap-1"><Store size={12}/> Comercio</div><div className="font-semibold mt-1 truncate">{lote.comercio}</div><div className="font-mono text-xs text-muted-foreground">{lote.legajo}</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground">Bandera</div><div className="font-semibold mt-1">{lote.bandera}</div><div className="text-xs text-muted-foreground">{esCuotas ? `${lote.cuotas} cuotas` : "Pago único"}</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground">Estado</div><div className="mt-1"><Badge tone={tone(lote.estado)}>{lote.estado}</Badge></div><div className="font-mono text-xs mt-1">{lote.cantidadOps} ops</div></Card>
          </div>

          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Detalle financiero del lote</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Importe bruto</span><span className="font-mono font-semibold">{fmt(lote.importeBruto)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground flex items-center gap-1"><Receipt size={12}/> Impuestos</span><span className="font-mono text-red-600">- {fmt(lote.impuestos)}</span></div>
              <div className="flex justify-between text-xs font-medium"><span className="text-muted-foreground">Menos impuestos</span><span className="font-mono">{fmt(menosImpuestos)}</span></div>
              <div className="border-t my-2"/>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground flex items-center gap-1"><Percent size={12}/> Tasa de interés PayWay ({lote.tasaPayWayPct}%)</span><span className="font-mono text-red-600">- {fmt(lote.tasaPayWayMonto)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground flex items-center gap-1"><Percent size={12}/> Tasa de interés MoliPay ({lote.tasaMoliPayPct}%)</span><span className="font-mono text-red-600">- {fmt(lote.tasaMoliPayMonto)}</span></div>
              {esCuotas && lote.costoPayWayPagoUnico != null && (
                <div className="flex justify-between text-xs"><span className="text-muted-foreground flex items-center gap-1"><CreditCard size={12}/> Costo PayWay por pago único ({lote.cuotas} cuotas)</span><span className="font-mono text-red-600">- {fmt(lote.costoPayWayPagoUnico)}</span></div>
              )}
              {esCuotas && <p className="text-[11px] text-muted-foreground">Si el comprador paga en cuotas, PayWay acredita a MoliPay en un solo pago y cobra fee por esa liquidación.</p>}
              <p className="text-[11px] text-muted-foreground">Tasa MoliPay = tasa cobrada al comercio − tasa PayWay a MoliPay (neto).</p>
              <div className="border-t my-2"/>
              <div className="flex justify-between text-xs text-muted-foreground"><span>Total descuentos</span><span className="font-mono">- {fmt(totalDescuentos)}</span></div>
              <div className="flex justify-between text-base font-semibold"><span>Importe final a acreditar</span><span className="font-mono text-emerald-700">{fmt(lote.importeFinal - (lote.costoPayWayPagoUnico ?? 0))}</span></div>
              {lote.estado === "Contracargo" && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5 mt-2">Incluye contracargo: el lote descuenta ese pago. Ver pestaña Contracargos para ticket PayWay.</p>}
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Links / pagos incluidos ({lote.cantidadOps})</h4>
            <div className="flex flex-wrap gap-1.5">
              {lote.linksIds.map((id) => (
                <span key={id} className="inline-flex items-center rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs font-mono">{id}</span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

type ResumenComercio = {
  comercio: string;
  legajo: string;
  cantidadLotes: number;
  cantidadOps: number;
  totalBruto: number;
  totalImpuestos: number;
  totalPayWay: number;
  totalMoliPay: number;
  totalFinal: number;
  pendienteAcreditar: number;
  pendienteImpuestos: number;
};

function ComercioDetalleModal({ data, onClose }: { data: ResumenComercio; onClose: () => void }) {
  const adelanto = MOCK_ADELANTOS_BY_LEGAJO[data.legajo] ?? null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div>
            <h3 className="font-display text-lg font-semibold flex items-center gap-2"><Store size={18}/> {data.comercio}</h3>
            <p className="text-sm font-mono text-muted-foreground">{data.legajo}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3"><div className="text-xs text-muted-foreground">Total pendiente de acreditar</div><div className="font-mono font-semibold mt-1">{fmt(data.pendienteAcreditar)}</div><div className="text-[11px] text-muted-foreground">Máximo adelantable</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground">Pendiente de impuestos</div><div className="font-mono font-semibold mt-1">{fmt(data.pendienteImpuestos)}</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground">Comisión total PayWay</div><div className="font-mono font-semibold mt-1">{fmt(data.totalPayWay)}</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground">Neto MoliPay</div><div className="font-mono font-semibold mt-1 text-emerald-700">{fmt(data.totalMoliPay)}</div></Card>
            <Card className="p-3 col-span-2"><div className="text-xs text-muted-foreground">Total a pagar al comercio</div><div className="font-mono font-semibold mt-1 text-emerald-700">{fmt(data.totalFinal)}</div></Card>
          </div>
          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1"><Wallet size={12}/> Adelantos</h4>
            {!adelanto ? (
              <p className="text-sm text-muted-foreground">Sin solicitudes de adelanto para este comercio.</p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Adelanto por aprobarse</span><Badge tone={adelanto.estado === "Pendiente" ? "warn" : adelanto.estado === "Aprobado" ? "success" : "neutral"}>{adelanto.estado}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Monto solicitado</span><span className="font-mono font-semibold">{fmt(adelanto.monto)}</span></div>
                {adelanto.estado === "Pendiente" && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">Pendiente de aprobación — definir comisión ofrecida en Adelantos.</p>}
                {adelanto.estado === "Aprobado" && <div className="flex justify-between font-semibold"><span>Total a adelantar</span><span className="font-mono text-emerald-700">{fmt(adelanto.monto)}</span></div>}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Page() {
  const [detail, setDetail] = useState<Lote | null>(null);
  const [comercioDetail, setComercioDetail] = useState<ResumenComercio | null>(null);
  const [confirm, setConfirm] = useState<{title:string;message:string} | null>(null);
  const [tab, setTab] = useState<"lotes" | "resumen">("lotes");
  const { can } = useCan();
  const puedeGestionar = can("modificar","comercios");

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
    { key:"comercio", label:"Comercio / Legajo", filterable:true, render:(r)=> <div><div className="font-semibold text-sm truncate max-w-[160px]">{r.comercio}</div><div className="font-mono text-xs text-muted-foreground">{r.legajo}</div></div> },
    { key:"bandera", label:"Bandera", filterable:"enum", filterOptions:["Visa","Mastercard","Amex","Cabal"], render:(r)=> <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-muted/50">{r.bandera}</span> },
    { key:"cantidadOps", label:"Ops", render:(r)=> <span className="font-mono tabular-nums">{r.cantidadOps}{r.cuotas && r.cuotas>1 ? ` · ${r.cuotas}c` : ""}</span> },
    { key:"importeFinal", label:"Importe a acreditar", render:(r)=> <span className={`font-mono tabular-nums font-semibold ${r.estado==="Contracargo" ? "text-red-600" : "text-emerald-700"}`}>{fmt(r.importeFinal - (r.costoPayWayPagoUnico ?? 0))}</span> },
    { key:"estado", label:"Estado", filterable:"enum", filterOptions:["Acreditado","Rechazado","Contracargo"], render:(r)=> <Badge tone={tone(r.estado)}>{r.estado}</Badge> },
  ];

  const resumenData: ResumenComercio[] = useMemo(() => {
    const map = new Map<string, ResumenComercio>();
    for (const l of MOCK_LOTES) {
      const key = `${l.comercio}__${l.legajo}`;
      const prev = map.get(key);
      const pay = l.tasaPayWayMonto + (l.costoPayWayPagoUnico ?? 0);
      const moli = l.tasaMoliPayMonto;
      if (!prev) {
        map.set(key, {
          comercio: l.comercio,
          legajo: l.legajo,
          cantidadLotes: 1,
          cantidadOps: l.cantidadOps,
          totalBruto: l.importeBruto,
          totalImpuestos: l.impuestos,
          totalPayWay: pay,
          totalMoliPay: moli,
          totalFinal: l.importeFinal - (l.costoPayWayPagoUnico ?? 0),
          pendienteAcreditar: l.importeFinal - (l.costoPayWayPagoUnico ?? 0),
          pendienteImpuestos: l.impuestos,
        });
      } else {
        prev.cantidadLotes += 1;
        prev.cantidadOps += l.cantidadOps;
        prev.totalBruto += l.importeBruto;
        prev.totalImpuestos += l.impuestos;
        prev.totalPayWay += pay;
        prev.totalMoliPay += moli;
        prev.totalFinal += l.importeFinal - (l.costoPayWayPagoUnico ?? 0);
        prev.pendienteAcreditar += l.importeFinal - (l.costoPayWayPagoUnico ?? 0);
        prev.pendienteImpuestos += l.impuestos;
      }
    }
    return Array.from(map.values());
  }, []);

  const resumenColumns: Column<ResumenComercio>[] = [
    { key:"comercio", label:"Comercio / Legajo", filterable:true, render:(r)=> <div><div className="font-semibold text-sm truncate max-w-[160px]">{r.comercio}</div><div className="font-mono text-xs text-muted-foreground">{r.legajo}</div></div> },
    { key:"pendienteAcreditar", label:"Pendiente de acreditar", render:(r)=> <span className="font-mono text-xs font-semibold">{fmt(r.pendienteAcreditar)}</span> },
    { key:"pendienteImpuestos", label:"Pendiente de impuestos", render:(r)=> <span className="font-mono text-xs">{fmt(r.pendienteImpuestos)}</span> },
    { key:"totalPayWay", label:"Comisión PayWay", render:(r)=> <span className="font-mono text-xs">{fmt(r.totalPayWay)}</span> },
    { key:"totalMoliPay", label:"Neto MoliPay", render:(r)=> <span className="font-mono text-xs text-emerald-700">{fmt(r.totalMoliPay)}</span> },
    { key:"totalFinal", label:"Total a pagar", render:(r)=> <span className="font-mono font-semibold text-emerald-700">{fmt(r.totalFinal)}</span> },
  ];

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader title="Lotes de Acreditación" description="Corte diario generado por MoliPay por bandera: qué pagos se acreditan al comercio y con qué descuentos." />

      <div className="flex gap-2 mb-4 border-b">
        <button
          onClick={() => setTab("lotes")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab==="lotes" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Lotes por bandera
        </button>
        <button
          onClick={() => setTab("resumen")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab==="resumen" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Resumen por comercio
        </button>
      </div>

      {tab === "lotes" ? (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Card className="p-3"><div className="text-xs text-muted-foreground">Acreditados</div><div className="font-mono text-xl font-semibold mt-1 text-emerald-700">{MOCK_LOTES.filter(l=>l.estado==="Acreditado").length}</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground">Contracargo</div><div className="font-mono text-xl font-semibold mt-1 text-red-600">{MOCK_LOTES.filter(l=>l.estado==="Contracargo").length}</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground">Rechazados</div><div className="font-mono text-xl font-semibold mt-1">{MOCK_LOTES.filter(l=>l.estado==="Rechazado").length}</div></Card>
          </div>
          <DataTable columns={columns} data={MOCK_LOTES} keyExtractor={(r)=> r.id} actions={(r)=> <ActionsDropdown actions={getActions(r)} />} />
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-3">Total consolidado que corresponde pagar a cada comercio (suma de todos sus lotes por bandera). Pendiente de acreditar = máximo adelantable.</p>
          <DataTable columns={resumenColumns} data={resumenData} keyExtractor={(r)=> r.legajo + r.comercio} actions={(r)=> <ActionsDropdown actions={[{ label:"Ver detalle", icon: Eye, onClick:()=> setComercioDetail(r) }]} />} />
        </>
      )}

      {detail && <LoteDetalle lote={detail} onClose={()=> setDetail(null)} />}
      {comercioDetail && <ComercioDetalleModal data={comercioDetail} onClose={()=> setComercioDetail(null)} />}
      {confirm && <ConfirmDialog open={!!confirm} onClose={()=> setConfirm(null)} title={confirm.title} message={confirm.message} confirmLabel="Cerrar" variant="default" onConfirm={()=> setConfirm(null)} />}
    </PermissionGuard>
  );
}
