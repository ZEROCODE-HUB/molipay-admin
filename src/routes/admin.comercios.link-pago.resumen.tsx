import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { PageHeader, Card, Badge } from "@/components/portal-shell";
import { DataTable, type Column } from "@/components/data-table";
import { getImpuestosPorComercio, formatImpuestoMonto, type ImpuestoPorComercio } from "@/data/impuestos-por-cobrar";
import { PermissionGuard } from "@/components/permission-guard";
import { Wallet, Landmark, Percent, ArrowUpRight, Calendar } from "lucide-react";

export const Route = createFileRoute("/admin/comercios/link-pago/resumen")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Resumen general — Link de Pago — Admin — Moli" },
      { name: "description", content: "Visión global de la operación de Link de Pago." },
    ],
  }),
});

function fmt(n: number) {
  return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const DATA_BY_PERIOD: Record<string, { pendiente: number; recaudadora: number; netoMoliPay: number; netoPayWay: number; impuestos: number; bruto: number }> = {
  hoy: { pendiente: 2_450_000, recaudadora: 12_800_000, netoMoliPay: 85_000, netoPayWay: 110_000, impuestos: 45_000, bruto: 2_690_000 },
  ayer: { pendiente: 3_100_000, recaudadora: 11_200_000, netoMoliPay: 102_000, netoPayWay: 134_000, impuestos: 52_000, bruto: 3_388_000 },
  "7d": { pendiente: 18_500_000, recaudadora: 74_300_000, netoMoliPay: 620_000, netoPayWay: 810_000, impuestos: 310_000, bruto: 20_240_000 },
  "30d": { pendiente: 42_000_000, recaudadora: 210_000_000, netoMoliPay: 1_850_000, netoPayWay: 2_400_000, impuestos: 890_000, bruto: 47_140_000 },
};

function Page() {
  const [period, setPeriod] = useState<"hoy" | "ayer" | "7d" | "30d">("hoy");
  const kpi = useMemo(() => DATA_BY_PERIOD[period], [period]);

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader title="Resumen general" description="Visión global de la operación de Link de Pago. Totales por período para MoliPay." />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-sm text-muted-foreground flex items-center gap-1"><Calendar size={14}/> Período:</span>
        <select value={period} onChange={(e)=> setPeriod(e.target.value as never)} className="h-9 px-3 rounded-md border bg-card text-sm">
          <option value="hoy">Hoy</option>
          <option value="ayer">Ayer</option>
          <option value="7d">Últimos 7 días</option>
          <option value="30d">Últimos 30 días</option>
        </select>
        <Badge tone="neutral">{period}</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><Wallet size={12}/> Total pendiente de acreditar</div><div className="font-mono text-xl font-semibold mt-1">{fmt(kpi.pendiente)}</div><div className="text-xs text-muted-foreground mt-1">Máximo adelantable</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><Landmark size={12}/> Total disponible en cuenta recaudadora</div><div className="font-mono text-xl font-semibold mt-1">{fmt(kpi.recaudadora)}</div><div className="text-xs text-muted-foreground mt-1">Fondos en cuenta</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total bruto</div><div className="font-mono text-xl font-semibold mt-1">{fmt(kpi.bruto)}</div><div className="text-xs text-muted-foreground mt-1">Suma operaciones</div></Card>
        <Card className="p-4 border-primary/20"><div className="text-xs text-muted-foreground flex items-center gap-1"><Percent size={12}/> Neto MoliPay</div><div className="font-mono text-xl font-semibold mt-1 text-emerald-700">{fmt(kpi.netoMoliPay)}</div><div className="text-[11px] text-muted-foreground mt-1">Tasa MoliPay (neto) — cuánto genera en el período</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><ArrowUpRight size={12}/> Neto PayWay</div><div className="font-mono text-xl font-semibold mt-1">{fmt(kpi.netoPayWay)}</div><div className="text-[11px] text-muted-foreground mt-1">A pagar a pasarela</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Impuestos</div><div className="font-mono text-xl font-semibold mt-1">{fmt(kpi.impuestos)}</div><div className="text-xs text-muted-foreground mt-1">Total impuestos período</div></Card>
      </div>

      <Card className="p-4 mb-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Resultado económico del período</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Bruto</span><span className="font-mono">{fmt(kpi.bruto)}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Impuestos</span><span className="font-mono text-red-600">- {fmt(kpi.impuestos)}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Neto PayWay</span><span className="font-mono text-red-600">- {fmt(kpi.netoPayWay)}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Neto MoliPay</span><span className="font-mono text-emerald-700">{fmt(kpi.netoMoliPay)}</span></div>
          <div className="border-t my-2"/>
          <div className="flex justify-between font-semibold"><span>Disponible + pendiente</span><span className="font-mono">{fmt(kpi.recaudadora + kpi.pendiente)}</span></div>
        </div>
      </Card>

      <Card className="p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Impuestos y pagos asociados por comercio</h4>
        {(() => {
          const base = getImpuestosPorComercio();
          // Mocks para enriquecer la fila con adelantos, comisiones y contracargos
          const MOCK_COMISIONES: Record<string, {moli:number, payway:number}> = {
            "LPF-20111111111": {moli: 18500, payway: 14200},
            "LPJ-30778899001": {moli: 25000, payway: 37500},
            "LPF-27234567890": {moli: 9800, payway: 11200},
            "LPJ-30889900112": {moli: 37500, payway: 45000},
            "LPF-20334455667": {moli: 12300, payway: 15600},
          };
          const MOCK_ADELANTOS: Record<string, {monto:number, estado:string} | null> = {
            "LPF-20111111111": null,
            "LPJ-30778899001": {monto: 500000, estado: "Pendiente"},
            "LPF-27234567890": null,
            "LPJ-30889900112": null,
            "LPF-20334455667": {monto: 300000, estado: "Aprobado"},
          };
          const MOCK_CONTRACARGOS: Record<string, number> = {
            "LPF-20111111111": 0,
            "LPJ-30778899001": 89000,
            "LPF-27234567890": 0,
            "LPJ-30889900112": 0,
            "LPF-20334455667": 0,
          };
          const MOCK_ACREDITACION: Record<string, number> = {
            "LPF-20111111111": 1850000,
            "LPJ-30778899001": 1161250,
            "LPF-27234567890": 724620,
            "LPJ-30889900112": 1386000,
            "LPF-20334455667": 826810,
          };
          type RowExt = ImpuestoPorComercio & { comisionMoli:number, comisionPayway:number, adelanto:{monto:number, estado:string}|null, contracargo:number, acreditacion:number, pendienteNeto:number };
          const data: RowExt[] = base.map(r=> {
            const com = MOCK_COMISIONES[r.legajo] ?? {moli: 12000, payway: 18000};
            return {
              ...r,
              comisionMoli: com.moli,
              comisionPayway: com.payway,
              adelanto: MOCK_ADELANTOS[r.legajo] ?? null,
              contracargo: MOCK_CONTRACARGOS[r.legajo] ?? 0,
              acreditacion: MOCK_ACREDITACION[r.legajo] ?? r.pendiente * 6,
              pendienteNeto: (MOCK_ACREDITACION[r.legajo] ?? r.pendiente * 6) - r.pendiente - com.moli - com.payway,
            };
          });
          const cols: Column<RowExt>[] = [
            { key: "comercio", label: "Comercio / Legajo", filterable:true, render: (r)=> <div><div className="font-semibold text-sm">{r.comercio}</div><div className="font-mono text-xs text-muted-foreground">{r.legajo}</div></div> },
            { key: "pendiente", label: "Impuestos", render: (r)=> <span className="font-mono text-amber-700">{formatImpuestoMonto(r.pendiente)}</span> },
            { key: "comisionMoli", label: "Comisión Moli", render: (r)=> <span className="font-mono text-emerald-700">{formatImpuestoMonto(r.comisionMoli)}</span> },
            { key: "comisionPayway", label: "Comisión PayWay", render: (r)=> <span className="font-mono">{formatImpuestoMonto(r.comisionPayway)}</span> },
            { key: "pendienteNeto", label: "Pendiente neto", render: (r)=> <span className="font-mono font-semibold">{formatImpuestoMonto(r.pendienteNeto)}</span> },
            { key: "adelanto", label: "Adelanto", render: (r)=> r.adelanto ? <div><div className="font-mono text-xs">{formatImpuestoMonto(r.adelanto.monto)}</div><Badge tone={r.adelanto.estado==="Pendiente"?"warn": r.adelanto.estado==="Aprobado"?"success":"neutral"}>{r.adelanto.estado}</Badge></div> : <span className="text-muted-foreground">—</span> },
            { key: "acreditacion", label: "Acreditación", render: (r)=> <span className="font-mono font-semibold text-emerald-700">{formatImpuestoMonto(r.acreditacion)}</span> },
            { key: "contracargo", label: "Contracargo retenido", render: (r)=> r.contracargo ? <span className="font-mono text-red-600">{formatImpuestoMonto(r.contracargo)}</span> : <span className="text-muted-foreground">—</span> },
          ];
          return <DataTable columns={cols} data={data} keyExtractor={(r)=> r.legajo} />;
        })()}
        <p className="text-[11px] text-muted-foreground mt-2">Una línea por comercio con impuestos, comisiones Moli/PayWay, pendiente neto, adelanto y estado, acreditación y contracargo retenido.</p>
      </Card>
    </PermissionGuard>
  );
}
