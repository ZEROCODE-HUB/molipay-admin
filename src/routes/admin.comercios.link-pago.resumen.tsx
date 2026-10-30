import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, Card, Badge } from "@/components/portal-shell";
import { DataTable, type Column } from "@/components/data-table";
import { PermissionGuard } from "@/components/permission-guard";
import { Wallet, Landmark, Percent, ArrowUpRight, Calendar } from "lucide-react";
import { QK_ACRED, listAdelantosV2, listLotesV2, resumenAcreditaciones, type AdelantoV2 } from "@/lib/api/acreditaciones";
import { requireSupabase } from "@/lib/supabase";

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

type Periodo = "hoy" | "ayer" | "7d" | "30d";

function iso(d: Date) {
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function rango(p: Periodo): { desde: string; hasta: string } {
  const hoy = new Date();
  const menos = (dias: number) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() - dias);
    return iso(d);
  };
  if (p === "hoy") return { desde: iso(hoy), hasta: iso(hoy) };
  if (p === "ayer") return { desde: menos(1), hasta: menos(1) };
  if (p === "7d") return { desde: menos(6), hasta: iso(hoy) };
  return { desde: menos(29), hasta: iso(hoy) };
}

type FilaComercio = {
  comercioId: string;
  comercio: string;
  legajo: string;
  pendiente: number;
  comisionMoli: number;
  comisionPayway: number;
  pendienteNeto: number;
  adelanto: { monto: number; estado: string } | null;
  acreditacion: number;
  contracargo: number;
};

function Page() {
  const [period, setPeriod] = useState<Periodo>("hoy");
  const { desde, hasta } = useMemo(() => rango(period), [period]);

  // KPIs del periodo: los calcula la base (resumen_acreditaciones).
  const resumenQ = useQuery({ queryKey: [...QK_ACRED, "resumen-general", desde, hasta], queryFn: () => resumenAcreditaciones(desde, hasta) });
  const r = resumenQ.data;
  const kpi = {
    // Lo que falta acreditar (maximo adelantable): proyectado + llegado sin acreditar.
    pendiente: r ? Number(r.por_acreditar.programado) + Number(r.por_acreditar.no_conciliado) + Number(r.por_acreditar.listo) : 0,
    recaudadora: r ? Number(r.recaudadora.saldo_conciliado) : 0,
    netoMoliPay: r ? Number(r.descuentos.tasa) + Number(r.descuentos.cierre) : 0,
    netoPayWay: r ? Number(r.liquidado.costo_servicio) : 0,
    impuestos: r ? Number(r.descuentos.iva_tasa) + Number(r.descuentos.impuestos ?? 0) + Number(r.liquidado.impuestos) : 0,
    bruto: r ? Number(r.ventas.bruto) : 0,
  };

  // Una linea por comercio: lotes del archivo de Payway del periodo, adelanto
  // vigente y deuda por contracargos.
  const lotesQ = useQuery({
    queryKey: [...QK_ACRED, "resumen-general-lotes", desde, hasta],
    queryFn: () => listLotesV2({ desde, hasta, origen: "archivo" }, 0, 2000),
  });
  const adelantosQ = useQuery({ queryKey: [...QK_ACRED, "resumen-general-adelantos"], queryFn: () => listAdelantosV2({}) });
  const deudasQ = useQuery({
    queryKey: [...QK_ACRED, "resumen-general-deudas"],
    queryFn: async () => {
      const { data, error } = await requireSupabase().from("deudas_comercio").select("comercio_id, monto, recuperado").eq("saldada", false);
      if (error) throw new Error(error.message);
      return (data ?? []) as { comercio_id: string | null; monto: number; recuperado: number }[];
    },
  });

  const data: FilaComercio[] = useMemo(() => {
    const m = new Map<string, FilaComercio>();
    for (const l of lotesQ.data?.rows ?? []) {
      const f =
        m.get(l.comercio_id) ??
        ({
          comercioId: l.comercio_id,
          comercio: l.comercio_nombre ?? l.comercio_usuario,
          legajo: l.comercio_legajo,
          pendiente: 0,
          comisionMoli: 0,
          comisionPayway: 0,
          pendienteNeto: 0,
          adelanto: null,
          acreditacion: 0,
          contracargo: 0,
        } as FilaComercio);
      const neto = Number(l.neto_a_acreditar ?? 0);
      f.pendiente += Number(l.iva_tasa_monto ?? 0) + Number(l.impuestos ?? 0);
      f.comisionMoli += Number(l.tasa_molipay_monto ?? 0) + Number(l.comision_cierre_lote_monto ?? 0);
      f.comisionPayway += Number(l.costo_servicio_payway ?? 0);
      if (l.estado === "Acreditado") f.acreditacion += neto;
      else f.pendienteNeto += neto;
      m.set(l.comercio_id, f);
    }
    const vigente = new Map<string, AdelantoV2>();
    for (const a of adelantosQ.data ?? []) {
      if (!["Pendiente", "Aprobado", "Aceptado", "Acreditado"].includes(a.estado)) continue;
      if (!vigente.has(a.comercio_id)) vigente.set(a.comercio_id, a);
    }
    for (const [id, a] of vigente) {
      const f = m.get(id);
      if (f) f.adelanto = { monto: Number(a.monto_ofertado ?? a.monto_solicitado), estado: a.estado_etiqueta };
    }
    for (const d of deudasQ.data ?? []) {
      const f = d.comercio_id ? m.get(d.comercio_id) : undefined;
      if (f) f.contracargo += Number(d.monto) - Number(d.recuperado);
    }
    return [...m.values()];
  }, [lotesQ.data, adelantosQ.data, deudasQ.data]);

  const cols: Column<FilaComercio>[] = [
    { key: "comercio", label: "Comercio / Legajo", filterable: true, render: (r) => <div><div className="font-semibold text-sm">{r.comercio}</div><div className="font-mono text-xs text-muted-foreground">{r.legajo}</div></div> },
    { key: "pendiente", label: "Impuestos", hint: "IVA de la tasa + impuestos asignados al comercio en el período.", render: (r) => <span className="font-mono text-amber-700">{fmt(r.pendiente)}</span> },
    { key: "comisionMoli", label: "Comisión Moli", hint: "Tasa MoliPay + cierre de lote 0,45%.", render: (r) => <span className="font-mono text-emerald-700">{fmt(r.comisionMoli)}</span> },
    { key: "comisionPayway", label: "Comisión PayWay", hint: "Costo de servicio que descontó Payway en el archivo.", render: (r) => <span className="font-mono">{fmt(r.comisionPayway)}</span> },
    { key: "pendienteNeto", label: "Pendiente neto", hint: "Neto a acreditar de los lotes que todavía no se acreditaron.", render: (r) => <span className="font-mono font-semibold">{fmt(r.pendienteNeto)}</span> },
    { key: "adelanto", label: "Adelanto", render: (r)=> r.adelanto ? <div><div className="font-mono text-xs">{fmt(r.adelanto.monto)}</div><Badge tone={r.adelanto.estado==="Solicitado"?"warn": r.adelanto.estado==="Acreditado"?"success":"neutral"}>{r.adelanto.estado}</Badge></div> : <span className="text-muted-foreground">—</span> },
    { key: "acreditacion", label: "Acreditación", hint: "Neto ya acreditado al comercio en el período.", render: (r) => <span className="font-mono font-semibold text-emerald-700">{fmt(r.acreditacion)}</span> },
    { key: "contracargo", label: "Contracargo retenido", hint: "Deuda pendiente por contracargos o liquidaciones negativas.", render: (r)=> r.contracargo ? <span className="font-mono text-red-600">{fmt(r.contracargo)}</span> : <span className="text-muted-foreground">—</span> },
  ];

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader title="Resumen general" description="Visión global de la operación de Link de Pago. Totales por período para MoliPay." />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-sm text-muted-foreground flex items-center gap-1"><Calendar size={14}/> Período:</span>
        <select value={period} onChange={(e)=> setPeriod(e.target.value as Periodo)} className="h-9 px-3 rounded-md border bg-card text-sm">
          <option value="hoy">Hoy</option>
          <option value="ayer">Ayer</option>
          <option value="7d">Últimos 7 días</option>
          <option value="30d">Últimos 30 días</option>
        </select>
        <Badge tone="neutral">{period}</Badge>
        {r && (
          <Badge tone={r.semaforo === "rojo" ? "danger" : r.semaforo === "amarillo" ? "warn" : "success"}>
            {r.semaforo === "rojo" ? "Rojo: no cierra" : r.semaforo === "amarillo" ? "Amarillo: hay pendientes" : "Verde: todo cierra"}
          </Badge>
        )}
        {resumenQ.isError && <span className="text-xs text-red-700">{(resumenQ.error as Error).message}</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><Wallet size={12}/> Total pendiente de acreditar</div><div className="font-mono text-xl font-semibold mt-1">{fmt(kpi.pendiente)}</div><div className="text-xs text-muted-foreground mt-1">Máximo adelantable</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><Landmark size={12}/> Total disponible en cuenta recaudadora</div><div className="font-mono text-xl font-semibold mt-1">{fmt(kpi.recaudadora)}</div><div className="text-xs text-muted-foreground mt-1">Fondos en cuenta (conciliado)</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total bruto</div><div className="font-mono text-xl font-semibold mt-1">{fmt(kpi.bruto)}</div><div className="text-xs text-muted-foreground mt-1">Suma operaciones</div></Card>
        <Card className="p-4 border-primary/20"><div className="text-xs text-muted-foreground flex items-center gap-1"><Percent size={12}/> Neto MoliPay</div><div className="font-mono text-xl font-semibold mt-1 text-emerald-700">{fmt(kpi.netoMoliPay)}</div><div className="text-[11px] text-muted-foreground mt-1">Tasa MoliPay + cierre de lote — cuánto genera en el período</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><ArrowUpRight size={12}/> Neto PayWay</div><div className="font-mono text-xl font-semibold mt-1">{fmt(kpi.netoPayWay)}</div><div className="text-[11px] text-muted-foreground mt-1">Costo de servicio de la pasarela</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Impuestos</div><div className="font-mono text-xl font-semibold mt-1">{fmt(kpi.impuestos)}</div><div className="text-xs text-muted-foreground mt-1">IVA, impuestos asignados e impuestos de Payway</div></Card>
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
        <DataTable columns={cols} data={data} keyExtractor={(r)=> r.comercioId} loading={lotesQ.isLoading} emptyMessage="Sin liquidaciones de Payway en el período." />
        <p className="text-[11px] text-muted-foreground mt-2">Una línea por comercio con impuestos, comisiones Moli/PayWay, pendiente neto, adelanto y estado, acreditación y contracargo retenido.</p>
      </Card>
    </PermissionGuard>
  );
}
