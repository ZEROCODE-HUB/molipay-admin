import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Eye, Calendar, Store, Receipt, Percent, ArrowUpRight, CreditCard, Wallet, XCircle, Search, AlertTriangle, Inbox } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader, Badge, Card, Input, Label, BtnOutline } from "@/components/portal-shell";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PermissionGuard } from "@/components/permission-guard";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { useCan } from "@/lib/permissions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataAccessError } from "@/lib/api/errors";
import { listLotes, updateLote, listLoteMovimientos } from "@/lib/api/lotes";
import { listAdelantosByComercio } from "@/lib/api/adelantos";
import type { EstadoLote, LoteAcreditacion } from "@/lib/api/types";
import { useComercios } from "@/hooks/useComercios";

export const Route = createFileRoute("/admin/comercios/link-pago/lotes")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Lotes de Acreditación — Links de Pago — Admin — Moli" },
      { name: "description", content: "Lotes generados por MoliPay para acreditar pagos a comercios." },
    ],
  }),
});

const PAGE_SIZE = 10;

function tone(e: EstadoLote): "success" | "warn" | "danger" | "neutral" {
  if (e === "Acreditado") return "success";
  if (e === "Contracargo") return "danger";
  return "warn";
}

function fmt(n: number) {
  return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function LoteDetalle({ lote, onClose }: { lote: LoteAcreditacion; onClose: () => void }) {
  const { data: movimientoIds } = useQuery({
    queryKey: ["lote-movimientos", lote.id],
    queryFn: () => listLoteMovimientos(lote.id),
  });
  const contracargo = lote.contracargoMonto ?? 0;
  const totalDescuentos = lote.impuestos + lote.tasaPaywayMonto + lote.tasaMolipayMonto + (lote.costoPaywayPagoUnico ?? 0) + contracargo;
  const menosImpuestos = lote.importeBruto - lote.impuestos;
  const esCuotas = (lote.cuotas ?? 1) > 1;
  const esContracargo = lote.estado === "Contracargo" || contracargo > 0;
  const linkIds = movimientoIds ?? [];
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2"><Receipt size={18}/> Detalle del lote</h3>
            <p className="text-sm font-mono text-muted-foreground">{lote.codigo} · {new Date(lote.fecha).toLocaleDateString("es-AR")} · {lote.comercio?.nombreComercio ?? lote.comercio?.usuario ?? lote.comercioId} · {lote.bandera} {esCuotas ? `· ${lote.cuotas} cuotas` : ""}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3"><div className="text-xs text-muted-foreground flex items-center gap-1"><Calendar size={12}/> Fecha</div><div className="font-mono font-semibold mt-1">{new Date(lote.fecha).toLocaleDateString("es-AR")}</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground flex items-center gap-1"><Store size={12}/> Comercio</div><div className="font-semibold mt-1 truncate">{lote.comercio?.nombreComercio ?? lote.comercio?.usuario ?? "—"}</div><div className="font-mono text-xs text-muted-foreground">{lote.comercio?.legajo ?? lote.comercioId}</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground">Bandera</div><div className="font-semibold mt-1">{lote.bandera}</div><div className="text-xs text-muted-foreground">{esCuotas ? `${lote.cuotas} cuotas` : "Pago único"}</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground">Estado</div><div className="mt-1"><Badge tone={tone(lote.estado)}>{lote.estado}</Badge></div><div className="font-mono text-xs mt-1">{lote.cantidadOperaciones} ops</div></Card>
          </div>

          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Detalle financiero del lote</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Importe bruto</span><span className="font-mono font-semibold">{fmt(lote.importeBruto)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground flex items-center gap-1"><Receipt size={12}/> Impuestos</span><span className="font-mono text-red-600">- {fmt(lote.impuestos)}</span></div>
              <div className="flex justify-between text-xs font-medium"><span className="text-muted-foreground">Menos impuestos</span><span className="font-mono">{fmt(menosImpuestos)}</span></div>
              <div className="border-t my-2"/>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground flex items-center gap-1"><Percent size={12}/> Tasa de interés PayWay ({lote.tasaPaywayPct}%)</span><span className="font-mono text-red-600">- {fmt(lote.tasaPaywayMonto)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground flex items-center gap-1"><Percent size={12}/> Tasa de interés MoliPay ({lote.tasaMolipayPct}%)</span><span className="font-mono text-red-600">- {fmt(lote.tasaMolipayMonto)}</span></div>
              {esCuotas && lote.costoPaywayPagoUnico != null && (
                <div className="flex justify-between text-xs"><span className="text-muted-foreground flex items-center gap-1"><CreditCard size={12}/> Costo PayWay por pago único ({lote.cuotas} cuotas)</span><span className="font-mono text-red-600">- {fmt(lote.costoPaywayPagoUnico)}</span></div>
              )}
              {esContracargo && (
                <div className="flex justify-between text-xs"><span className="text-muted-foreground flex items-center gap-1"><Receipt size={12}/> Contracargo <Badge tone="danger" className="ml-1">retenido</Badge></span><span className="font-mono text-red-600">- {fmt(contracargo)}</span></div>
              )}
              {esCuotas && <p className="text-[11px] text-muted-foreground">Si el comprador paga en cuotas, PayWay acredita a MoliPay en un solo pago y cobra fee por esa liquidación.</p>}
              <p className="text-[11px] text-muted-foreground">Tasa MoliPay = tasa cobrada al comercio − tasa PayWay a MoliPay (neto).</p>
              <div className="border-t my-2"/>
              <div className="flex justify-between text-xs text-muted-foreground"><span>Total descuentos</span><span className="font-mono">- {fmt(totalDescuentos)}</span></div>
              <div className="flex justify-between text-base font-semibold"><span>Importe final a acreditar</span><span className="font-mono text-emerald-700">{fmt(lote.importeNeto)}</span></div>
              {esContracargo && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5 mt-2">Incluye contracargo ({fmt(contracargo)} retenido): el lote descuenta ese pago. Ver pestaña Contracargos para ticket PayWay.</p>}
              {lote.notasResolucion && <p className="text-xs text-muted-foreground border rounded px-2 py-1.5 mt-2">Notas: {lote.notasResolucion}</p>}
              {lote.resueltoPor && <p className="text-[11px] text-muted-foreground">Resuelto por {lote.resueltoPor} {lote.fechaResolucion ? `· ${new Date(lote.fechaResolucion).toLocaleString("es-AR")}` : ""}</p>}
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Movimientos incluidos ({lote.cantidadOperaciones})</h4>
            {linkIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin movimientos vinculados (lote_movimientos vacío) — el lote aún no tiene movimientos asignados o no se pudo cargar.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {linkIds.map((id) => (
                  <span key={id} className="inline-flex items-center rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs font-mono">{id}</span>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

type ResumenComercio = {
  comercio: string;
  legajo: string;
  comercioId: string;
  cantidadLotes: number;
  cantidadOps: number;
  totalBruto: number;
  totalImpuestos: number;
  totalPayWay: number;
  totalMoliPay: number;
  totalContracargo: number;
  totalFinal: number;
  pendienteAcreditar: number;
  pendienteImpuestos: number;
};

function ComercioDetalleModal({ data, lotes, onClose }: { data: ResumenComercio; lotes: LoteAcreditacion[]; onClose: () => void }) {
  const { data: adelantos, isLoading: adelantosLoading } = useQuery({
    queryKey: ["adelantos", data.comercioId],
    queryFn: () => listAdelantosByComercio(data.comercioId),
  });
  const lotesDelComercio = lotes.filter(l=> l.comercioId === data.comercioId);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div>
            <h3 className="font-display text-lg font-semibold flex items-center gap-2"><Store size={18}/> {data.comercio}</h3>
            <p className="text-sm font-mono text-muted-foreground">{data.legajo} · {data.cantidadLotes} lotes · {data.cantidadOps} ops</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3"><div className="text-xs text-muted-foreground">Total pendiente de acreditar</div><div className="font-mono font-semibold mt-1">{fmt(data.pendienteAcreditar)}</div><div className="text-[11px] text-muted-foreground">Máximo adelantable {data.totalContracargo ? `— contracargo ${fmt(data.totalContracargo)} descontado` : ""}</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground">Pendiente de impuestos</div><div className="font-mono font-semibold mt-1">{fmt(data.pendienteImpuestos)}</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground">Comisión total PayWay</div><div className="font-mono font-semibold mt-1">{fmt(data.totalPayWay)}</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground">Neto MoliPay</div><div className="font-mono font-semibold mt-1 text-emerald-700">{fmt(data.totalMoliPay)}</div></Card>
            {data.totalContracargo > 0 && <Card className="p-3 border-red-200 bg-red-50"><div className="text-xs text-red-700">Contracargo retenido</div><div className="font-mono font-semibold mt-1 text-red-600">- {fmt(data.totalContracargo)}</div><div className="text-[11px] text-red-600">Restado del total a acreditar</div></Card>}
            <Card className={`p-3 ${data.totalContracargo > 0 ? "" : "col-span-2"}`}><div className="text-xs text-muted-foreground">Total a pagar al comercio</div><div className="font-mono font-semibold mt-1 text-emerald-700">{fmt(data.totalFinal)}</div></Card>
          </div>
          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Lotes por bandera de este comercio ({lotesDelComercio.length})</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="px-2 py-1.5">Lote</th><th className="px-2 py-1.5">Bandera</th><th className="px-2 py-1.5">Fecha</th><th className="px-2 py-1.5 text-right">Importe a acreditar</th><th className="px-2 py-1.5">Estado</th>{lotesDelComercio.some(l=> (l.contracargoMonto ?? 0) >0) && <th className="px-2 py-1.5 text-right">Contracargo</th>}</tr></thead>
                <tbody>
                  {lotesDelComercio.map(l=> {
                    const contra = l.contracargoMonto ?? 0;
                    return (
                      <tr key={l.id} className="border-b last:border-0">
                        <td className="px-2 py-1.5 font-mono">{l.codigo}</td>
                        <td className="px-2 py-1.5"><span className="inline-flex rounded-full border px-2 py-0.5 text-[11px] bg-muted/50">{l.bandera}</span></td>
                        <td className="px-2 py-1.5 font-mono">{new Date(l.fecha).toLocaleDateString("es-AR")}</td>
                        <td className="px-2 py-1.5 text-right font-mono">{fmt(l.importeNeto)}</td>
                        <td className="px-2 py-1.5"><Badge tone={tone(l.estado)}>{l.estado}</Badge></td>
                        {lotesDelComercio.some(x=> (x.contracargoMonto ?? 0) >0) && <td className="px-2 py-1.5 text-right font-mono text-red-600">{contra ? `- ${fmt(contra)}` : "—"}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1"><Wallet size={12}/> Adelantos</h4>
            {adelantosLoading ? (
              <p className="text-sm text-muted-foreground">Cargando adelantos…</p>
            ) : !adelantos || adelantos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin solicitudes de adelanto para este comercio.</p>
            ) : (
              <div className="space-y-3">
                {adelantos.map((a) => (
                  <div key={a.id} className="rounded-lg border px-3 py-2 space-y-1">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Estado</span><Badge tone={a.estado === "Pendiente" ? "warn" : a.estado === "Aprobado" || a.estado === "Acreditado" ? "success" : a.estado === "Rechazado" ? "danger" : "neutral"}>{a.estado}</Badge></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Monto solicitado</span><span className="font-mono font-semibold">{fmt(a.montoSolicitado)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Plazo</span><span className="font-mono">{a.plazoAdelantadoDias}d / {a.plazoOriginalDias}d · {a.tasaInteresPct != null ? `${a.tasaInteresPct}%` : "tasa pendiente"}</span></div>
                    <div className="text-xs text-muted-foreground">Solicitado {new Date(a.fechaSolicitud).toLocaleDateString("es-AR")}{a.fechaResolucion ? ` · Resuelto ${new Date(a.fechaResolucion).toLocaleDateString("es-AR")}` : ""}</div>
                    {a.estado === "Pendiente" && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">Pendiente de aprobación — definir tasa en módulo Adelantos.</p>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Page() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<EstadoLote | "">("");
  const [banderaFilter, setBanderaFilter] = useState("");
  const [comercioFilter, setComercioFilter] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [tab, setTab] = useState<"lotes" | "resumen">("lotes");
  const [detail, setDetail] = useState<LoteAcreditacion | null>(null);
  const [comercioDetail, setComercioDetail] = useState<ResumenComercio | null>(null);
  const [confirm, setConfirm] = useState<{title:string;message:string} | null>(null);
  const [contracargoModal, setContracargoModal] = useState<{lote: LoteAcreditacion, accion: "Acreditar" | "Rechazar", notas: string, contracargoMonto: string} | null>(null);
  const { can } = useCan();
  const puedeGestionar = can("modificar","comercios");

  const { rows: comerciosOptions } = useComercios({ page: 0, pageSize: 100 });

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["lotes", page, search, estadoFilter, banderaFilter, comercioFilter, fechaDesde, fechaHasta],
    queryFn: () => listLotes({
      page,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      estado: estadoFilter || undefined,
      bandera: banderaFilter || undefined,
      comercioId: comercioFilter || undefined,
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined,
    }),
  });

  const lotes = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Resumen: agregación client-side sobre página actual (para performance, evita fetch extra)
  // Si necesitás resumen global exacto, cambiar a fetch separado con pageSize 1000 sin paginación.
  const resumenData: ResumenComercio[] = useMemo(() => {
    const map = new Map<string, ResumenComercio>();
    for (const l of lotes) {
      const nombre = l.comercio?.nombreComercio ?? l.comercio?.usuario ?? "—";
      const legajo = l.comercio?.legajo ?? l.comercioId;
      const key = l.comercioId;
      const pay = l.tasaPaywayMonto + (l.costoPaywayPagoUnico ?? 0);
      const moli = l.tasaMolipayMonto;
      const contra = l.contracargoMonto ?? 0;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, {
          comercio: nombre,
          legajo,
          comercioId: l.comercioId,
          cantidadLotes: 1,
          cantidadOps: l.cantidadOperaciones,
          totalBruto: l.importeBruto,
          totalImpuestos: l.impuestos,
          totalPayWay: pay,
          totalMoliPay: moli,
          totalContracargo: contra,
          totalFinal: l.importeNeto,
          pendienteAcreditar: l.importeNeto,
          pendienteImpuestos: l.impuestos,
        });
      } else {
        prev.cantidadLotes += 1;
        prev.cantidadOps += l.cantidadOperaciones;
        prev.totalBruto += l.importeBruto;
        prev.totalImpuestos += l.impuestos;
        prev.totalPayWay += pay;
        prev.totalMoliPay += moli;
        prev.totalContracargo += contra;
        prev.totalFinal += l.importeNeto;
        prev.pendienteAcreditar += l.importeNeto;
        prev.pendienteImpuestos += l.impuestos;
      }
    }
    return Array.from(map.values());
  }, [lotes]);

  const handleContracargo = async (accion: "Acreditar" | "Rechazar") => {
    if (!contracargoModal) return;
    const { lote, notas, contracargoMonto } = contracargoModal;
    const parsedContracargo = contracargoMonto.trim() === "" ? undefined : parseFloat(contracargoMonto.replace(",", ".")) || 0;
    try {
      // Si se ingresó nuevo contracargo y estado es Contracargo, se recalcula importe_neto en API
      await updateLote(lote.id, {
        estado: accion === "Acreditar" ? "Acreditado" : "Rechazado",
        contracargoMonto: parsedContracargo,
        notasResolucion: notas || null,
      });
      toast.success(`Lote ${lote.codigo} ${accion==="Acreditar" ? "acreditado" : "rechazado"}${notas ? ` — ${notas}` : ""}`);
      queryClient.invalidateQueries({ queryKey: ["lotes"] });
      setContracargoModal(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const getActions = (r: LoteAcreditacion): ActionItem[] => {
    const base: ActionItem[] = [{ label:"Ver detalle", icon: Eye, onClick:()=> setDetail(r) }];
    if (r.estado === "Contracargo") {
      base.push({ label:"Acreditar", icon: ArrowUpRight, disabled:!puedeGestionar, onClick:()=> setContracargoModal({lote: r, accion: "Acreditar", notas: "", contracargoMonto: String(r.contracargoMonto ?? "")}) } as ActionItem);
      base.push({ label:"Rechazar", icon: XCircle as any, disabled:!puedeGestionar, variant:"danger" as const, onClick:()=> setContracargoModal({lote: r, accion: "Rechazar", notas: "", contracargoMonto: String(r.contracargoMonto ?? "")}) } as ActionItem);
    }
    base.push({ label:"Reprocesar", icon: ArrowUpRight, disabled:!puedeGestionar || r.estado==="Acreditado", onClick:()=> {
      toast.info("Reprocesando lote");
      setConfirm({title:"Lote reprocesado",message:`${r.codigo} en reproceso.`});
    }} as ActionItem);
    return base;
  };

  const columns: Column<LoteAcreditacion>[] = [
    { key:"fecha", label:"Fecha", render:(r)=> <span className="font-mono text-xs tabular-nums">{new Date(r.fecha).toLocaleDateString("es-AR")}</span> },
    { key:"codigo", label:"Lote", render:(r)=> <span className="font-mono text-xs font-semibold">{r.codigo}</span> },
    { key:"comercio", label:"Comercio / Legajo", filterable:true, render:(r)=> <div><div className="font-semibold text-sm truncate max-w-[160px]">{r.comercio?.nombreComercio ?? r.comercio?.usuario ?? "—"}</div><div className="font-mono text-xs text-muted-foreground">{r.comercio?.legajo ?? r.comercioId}</div></div> },
    { key:"bandera", label:"Bandera", filterable:"enum", filterOptions:["Visa","Mastercard","Amex","Cabal","Diners"], render:(r)=> <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-muted/50">{r.bandera}</span> },
    { key:"cantidadOperaciones", label:"Ops", render:(r)=> <span className="font-mono tabular-nums">{r.cantidadOperaciones}{r.cuotas && r.cuotas>1 ? ` · ${r.cuotas}c` : ""}</span> },
    { key:"importeNeto", label:"Importe a acreditar", render:(r)=> <span className={`font-mono tabular-nums font-semibold ${r.estado==="Contracargo" ? "text-red-600" : "text-emerald-700"}`}>{fmt(r.importeNeto)}</span> },
    { key:"estado", label:"Estado", filterable:"enum", filterOptions:["Acreditado","Rechazado","Contracargo"], render:(r)=> <Badge tone={tone(r.estado)}>{r.estado}</Badge> },
  ];

  const resumenColumns: Column<ResumenComercio>[] = [
    { key:"comercio", label:"Comercio / Legajo", filterable:true, render:(r)=> <div><div className="font-semibold text-sm truncate max-w-[160px]">{r.comercio}</div><div className="font-mono text-xs text-muted-foreground">{r.legajo}</div></div> },
    { key:"pendienteAcreditar", label:"Pendiente de acreditar", render:(r)=> <span className="font-mono text-xs font-semibold">{fmt(r.pendienteAcreditar)}</span> },
    { key:"pendienteImpuestos", label:"Pendiente de impuestos", render:(r)=> <span className="font-mono text-xs">{fmt(r.pendienteImpuestos)}</span> },
    { key:"totalPayWay", label:"Comisión PayWay", render:(r)=> <span className="font-mono text-xs">{fmt(r.totalPayWay)}</span> },
    { key:"totalMoliPay", label:"Neto MoliPay", render:(r)=> <span className="font-mono text-xs text-emerald-700">{fmt(r.totalMoliPay)}</span> },
    { key:"totalFinal", label:"Total a pagar", render:(r)=> <span className="font-mono font-semibold text-emerald-700">{fmt(r.totalFinal)}</span> },
  ];

  const err = error instanceof DataAccessError ? error : null;

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader title="Lotes de Acreditación" description="Corte diario generado por MoliPay por bandera: qué pagos se acreditan al comercio y con qué descuentos." />

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <Label>Buscar</Label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input value={search} onChange={(e)=> { setSearch(e.target.value); setPage(0); }} placeholder="Código, bandera, comercio..." className="pl-8 h-8 text-xs" />
            </div>
          </div>
          <div>
            <Label>Estado</Label>
            <select value={estadoFilter} onChange={(e)=> { setEstadoFilter(e.target.value as EstadoLote | ""); setPage(0); }} className="w-full sm:min-w-[130px] h-8 px-2 rounded-md border bg-background text-xs">
              <option value="">Todos</option>
              <option value="Acreditado">Acreditado</option>
              <option value="Rechazado">Rechazado</option>
              <option value="Contracargo">Contracargo</option>
            </select>
          </div>
          <div>
            <Label>Bandera</Label>
            <select value={banderaFilter} onChange={(e)=> { setBanderaFilter(e.target.value); setPage(0); }} className="w-full sm:min-w-[130px] h-8 px-2 rounded-md border bg-background text-xs">
              <option value="">Todas</option>
              <option value="Visa">Visa</option>
              <option value="Mastercard">Mastercard</option>
              <option value="Amex">Amex</option>
              <option value="Cabal">Cabal</option>
              <option value="Diners">Diners</option>
            </select>
          </div>
          <div>
            <Label>Comercio</Label>
            <select value={comercioFilter} onChange={(e)=> { setComercioFilter(e.target.value); setPage(0); }} className="w-full sm:min-w-[180px] h-8 px-2 rounded-md border bg-background text-xs">
              <option value="">Todos</option>
              {comerciosOptions.map((c: import("@/lib/api/types").Comercio) => (
                <option key={c.id} value={c.id}>{c.nombreComercio ?? c.usuario} · {c.legajo}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Desde</Label>
            <Input type="date" value={fechaDesde} onChange={(e)=> { setFechaDesde(e.target.value); setPage(0); }} className="h-8 text-xs" />
          </div>
          <div>
            <Label>Hasta</Label>
            <Input type="date" value={fechaHasta} onChange={(e)=> { setFechaHasta(e.target.value); setPage(0); }} className="h-8 text-xs" />
          </div>
        </div>
      </Card>

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

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border bg-card py-16 text-sm text-muted-foreground"><span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />Cargando lotes…</div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700"><AlertTriangle size={28} /><p>{err?.message ?? "Error"}</p><button onClick={() => refetch()} className="h-9 px-4 rounded-md bg-primary text-primary-foreground">Reintentar</button></div>
      ) : lotes.length === 0 && tab === "lotes" ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center text-sm text-muted-foreground"><Inbox size={28} /><p>No hay lotes que coincidan con los filtros.</p></div>
      ) : tab === "lotes" ? (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Card className="p-3"><div className="text-xs text-muted-foreground">Acreditados</div><div className="font-mono text-xl font-semibold mt-1 text-emerald-700">{lotes.filter(l=>l.estado==="Acreditado").length}</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground">Contracargo</div><div className="font-mono text-xl font-semibold mt-1 text-red-600">{lotes.filter(l=>l.estado==="Contracargo").length}</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground">Rechazados</div><div className="font-mono text-xl font-semibold mt-1">{lotes.filter(l=>l.estado==="Rechazado").length}</div></Card>
          </div>
          <DataTable columns={columns} data={lotes} keyExtractor={(r)=> r.id} actions={(r)=> <ActionsDropdown actions={getActions(r)} />} hidePagination />
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground"><span>{total} lotes · página {page + 1} de {totalPages}</span><div className="flex gap-2"><button disabled={page === 0 || isFetching} onClick={() => setPage((p) => Math.max(0, p - 1))} className="h-9 px-3 rounded-md border bg-card disabled:opacity-50">Anterior</button><button disabled={page + 1 >= totalPages || isFetching} onClick={() => setPage((p) => p + 1)} className="h-9 px-3 rounded-md border bg-card disabled:opacity-50">Siguiente</button></div></div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-3">Total consolidado que corresponde pagar a cada comercio (suma de todos sus lotes por bandera). Pendiente de acreditar = máximo adelantable. Agregación client-side sobre página actual; para total global sin paginación usar query separada.</p>
          <DataTable columns={resumenColumns} data={resumenData} keyExtractor={(r)=> r.comercioId} actions={(r)=> <ActionsDropdown actions={[{ label:"Ver detalle", icon: Eye, onClick:()=> setComercioDetail(r) }]} />} hidePagination />
        </>
      )}

      {detail && <LoteDetalle lote={detail} onClose={()=> setDetail(null)} />}
      {comercioDetail && <ComercioDetalleModal data={comercioDetail} lotes={lotes} onClose={()=> setComercioDetail(null)} />}
      {contracargoModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={()=> setContracargoModal(null)} />
          <div className="relative bg-card rounded-xl w-full max-w-md shadow-xl p-6 space-y-4">
            <h3 className="font-display font-semibold text-lg">{contracargoModal.accion} lote {contracargoModal.lote.codigo}</h3>
            <p className="text-sm text-muted-foreground">Lote {contracargoModal.lote.bandera} · {contracargoModal.lote.comercio?.nombreComercio ?? contracargoModal.lote.comercio?.usuario} · Contracargo actual {fmt(contracargoModal.lote.contracargoMonto)}.</p>
            <div>
              <Label>Contracargo monto (opcional, recalcula neto)</Label>
              <Input value={contracargoModal.contracargoMonto} onChange={(e)=> { const v=e.target.value; if(v===""||/^[0-9]*[.,]?[0-9]*$/.test(v)) setContracargoModal({...contracargoModal, contracargoMonto: v}); }} placeholder="0.00" className="font-mono" inputMode="decimal" />
              <p className="text-[11px] text-muted-foreground mt-1">Neto recalculado: {fmt(contracargoModal.lote.importeBruto - contracargoModal.lote.impuestos - contracargoModal.lote.tasaPaywayMonto - contracargoModal.lote.tasaMolipayMonto - (parseFloat(contracargoModal.contracargoMonto.replace(",",".")||"0")||0))}</p>
            </div>
            <div>
              <label className="text-xs font-semibold">Notas</label>
              <textarea value={contracargoModal.notas} onChange={(e)=> setContracargoModal({...contracargoModal, notas: e.target.value})} rows={3} placeholder="Motivo, ticket PayWay, notas internas..." className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={()=> setContracargoModal(null)} className="h-9 px-3 rounded-md border bg-card text-sm">Cancelar</button>
              <button onClick={()=> handleContracargo(contracargoModal.accion)} className={`h-9 px-4 rounded-md text-sm font-semibold ${contracargoModal.accion==="Acreditar" ? "bg-primary text-primary-foreground" : "bg-red-600 text-white"}`}>{contracargoModal.accion}</button>
            </div>
          </div>
        </div>
      )}
      {confirm && <ConfirmDialog open={!!confirm} onClose={()=> setConfirm(null)} title={confirm.title} message={confirm.message} confirmLabel="Cerrar" variant="default" onConfirm={()=> setConfirm(null)} />}
    </PermissionGuard>
  );
}
