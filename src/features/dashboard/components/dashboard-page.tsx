import { Link } from "@tanstack/react-router";
import { useState,useMemo } from "react";
import {
Building2,
ShieldAlert,
TrendingUp,
Activity,
CheckCircle2,
XCircle,
Clock,
ArrowUpRight,
Wallet,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { Card,Stat } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Input,Label } from "@/shared/ui/form-controls";
import { DataTable,type Column } from "@/shared/ui/data-table";
import { useMovements } from "@/features/movements/movements.hooks";
import { formatMoney } from "@/shared/lib/format";

const volumeData = [82, 95, 78, 110, 124, 132, 118, 145, 138, 162, 158, 184, 172, 195];

function DashboardFeesCard() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  const [from, setFrom] = useState(toISO(firstDay));
  const [to, setTo] = useState(toISO(today));
  const [showDesglose, setShowDesglose] = useState(false);

  const { rows: depRows, isLoading: depLoading } = useMovements({
    page: 0,
    pageSize: 1000,
    tipo: "deposito",
    fechaDesde: from,
    fechaHasta: to ? to + "T23:59:59" : undefined,
    countMode: "exact",
  } as any);
  const { rows: retRows, isLoading: retLoading } = useMovements({
    page: 0,
    pageSize: 1000,
    tipo: "retiro",
    fechaDesde: from,
    fechaHasta: to ? to + "T23:59:59" : undefined,
    countMode: "exact",
  } as any);

  const isLoading = depLoading || retLoading;

  const {
    montoTransaccionado: amountTransaccionado,
    comisionTotal: feeTotal,
    remanente,
    porComercio: byMerchant,
  } = useMemo(() => {
    const all = [...(depRows ?? []), ...(retRows ?? [])];
    let amount = 0;
    let fee = 0;
    const map = new Map<
      string,
      { legajo: string; nombre: string; monto: number; comision: number; count: number }
    >();
    for (const m of all) {
      amount += Number(m.montoOperacion ?? 0);
      fee += Number(m.comision ?? 0);
      const key = m.legajo;
      const prev = map.get(key);
      const name = (m as any).cliente?.nombre ?? m.legajo;
      if (!prev)
        map.set(key, {
          legajo: key,
          nombre: name,
          monto: Number(m.montoOperacion ?? 0),
          comision: Number(m.comision ?? 0),
          count: 1,
        });
      else {
        prev.monto += Number(m.montoOperacion ?? 0);
        prev.comision += Number(m.comision ?? 0);
        prev.count += 1;
      }
    }
    const byMerchant = Array.from(map.values()).sort((a, b) => b.monto - a.monto);
    return {
      montoTransaccionado: amount,
      comisionTotal: fee,
      remanente: amount - fee,
      porComercio: byMerchant,
    };
  }, [depRows, retRows]);

  const desgloseColumns: Column<(typeof byMerchant)[number]>[] = [
    {
      key: "legajo",
      label: "Legajo",
      render: (r) => <span className="font-mono text-xs">{r.legajo}</span>,
    },
    {
      key: "nombre",
      label: "Cliente",
      render: (r) => (
        <span className="text-sm truncate max-w-[180px] inline-block">{r.nombre}</span>
      ),
    },
    {
      key: "count",
      label: "Ops",
      render: (r) => <span className="font-mono text-xs">{r.count}</span>,
    },
    {
      key: "monto",
      label: "Monto transaccionado",
      render: (r) => <span className="font-mono text-xs">{formatMoney(r.monto)}</span>,
    },
    {
      key: "comision",
      label: "Comisión",
      render: (r) => <span className="font-mono text-xs">{formatMoney(r.comision)}</span>,
    },
    {
      key: "remanente",
      label: "Remanente",
      render: (r) => (
        <span className="font-mono text-xs font-semibold">{formatMoney(r.monto - r.comision)}</span>
      ),
    },
  ];

  return (
    <Card className="p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Wallet size={14} /> Comisiones — Depósitos y Retiros
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="com-desde">Desde</Label>
            <Input
              id="com-desde"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 text-xs w-[150px]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="com-hasta">Hasta</Label>
            <Input
              id="com-hasta"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 text-xs w-[150px]"
            />
          </div>
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando comisiones…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border bg-muted/30 px-3 py-3">
              <div className="text-xs text-muted-foreground">Monto transaccionado</div>
              <div className="font-mono font-semibold mt-1">
                {formatMoney(amountTransaccionado)}
              </div>
              <div className="text-[11px] text-muted-foreground">Depósitos + Retiros</div>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-3">
              <div className="text-xs text-muted-foreground">Comisión total</div>
              <div className="font-mono font-semibold mt-1 text-red-600">
                {formatMoney(feeTotal)}
              </div>
              <div className="text-[11px] text-muted-foreground">Suma comision</div>
            </div>
            <div className="rounded-lg border bg-primary/10 px-3 py-3">
              <div className="text-xs text-muted-foreground">Remanente</div>
              <div className="font-mono font-semibold mt-1 text-emerald-700">
                {formatMoney(remanente)}
              </div>
              <div className="text-[11px] text-muted-foreground">Monto − Comisión</div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Este cuadro refleja el flujo de transacciones del periodo seleccionado, no el saldo
            acumulado de la cuenta recaudadora.
          </p>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowDesglose((v) => !v)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {showDesglose
                ? "Ocultar desglose por comercio"
                : `Ver desglose por comercio (${byMerchant.length})`}
            </button>
            {showDesglose && (
              <div className="mt-3">
                {byMerchant.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin movimientos en el periodo.</p>
                ) : (
                  <DataTable
                    columns={desgloseColumns}
                    data={byMerchant}
                    keyExtractor={(r) => r.legajo}
                    showGlobalFilter={false}
                    showDownloadButton={false}
                  />
                )}
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

export function DashboardPage() {
  const max = Math.max(...volumeData);
  return (
    <div className="bg-white -m-4 md:-m-6 lg:-mx-8 lg:-my-6 p-4 md:p-6 lg:p-8 min-h-[calc(100vh-3.5rem)]">
      <PageHeader
        title="Dashboard administrativo"
        description="Estado global de la plataforma Moli."
        action={
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <Activity size={14} className="text-moli-red" /> Sistema operativo · 99,98%
          </div>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Clientes activos" value="312" sub="+8 esta semana" />
        <Stat label="Volumen del dia" value="$ 184,2M" sub="ARS · 12.480 ops" />
        <Stat label="Alertas pendientes" value="7" sub="3 criticas" />
        <Stat label="Altas en revision" value="12" sub="Validacion de legajo" />
      </div>

      {/* Acreditaciones — formato operación */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Acreditaciones — Link de Pago
        </h3>
        <Link
          to="/admin/comercios/link-pago/resumen"
          className="text-xs text-primary font-semibold inline-flex items-center gap-1"
        >
          Ver detalle <ArrowUpRight size={12} />
        </Link>
      </div>
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Bruto</span>
              <span className="font-mono font-semibold">$ 2,69M</span>
            </div>
            <div className="flex justify-between gap-4 text-xs">
              <span className="text-muted-foreground">− Impuestos</span>
              <span className="font-mono text-red-600">− $ 45k</span>
            </div>
            <div className="flex justify-between gap-4 text-xs">
              <span className="text-muted-foreground">− Comisión PayWay (3%)</span>
              <span className="font-mono text-red-600">− $ 110k</span>
            </div>
            <div className="flex justify-between gap-4 text-xs">
              <span className="text-muted-foreground">− Comisión MoliPay (neto)</span>
              <span className="font-mono text-red-600">− $ 85k</span>
            </div>
            <div className="border-t my-1.5" />
            <div className="flex justify-between gap-4 font-semibold">
              <span>Neto MoliPay</span>
              <span className="font-mono text-emerald-700">$ 85k</span>
            </div>
            <div className="flex justify-between gap-4 text-xs text-muted-foreground">
              <span>Pendiente de acreditar</span>
              <span className="font-mono">$ 2,45M</span>
            </div>
          </div>
          <div className="space-y-1.5 text-sm md:border-l md:pl-6 pt-4 md:pt-0 border-t md:border-t-0">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Cuenta recaudadora</span>
              <span className="font-mono font-semibold">$ 12,8M</span>
            </div>
            <div className="flex justify-between gap-4 text-xs">
              <span className="text-muted-foreground">Disponible</span>
              <span className="font-mono">$ 12,8M</span>
            </div>
            <div className="flex justify-between gap-4 text-xs">
              <span className="text-muted-foreground">+ Pendiente</span>
              <span className="font-mono text-emerald-700">+ $ 2,45M</span>
            </div>
            <div className="border-t my-1.5" />
            <div className="flex justify-between gap-4 font-semibold">
              <span>Total</span>
              <span className="font-mono">$ 15,25M</span>
            </div>
            <div className="text-[11px] text-muted-foreground">Período hoy</div>
          </div>
        </div>
      </Card>

      <DashboardFeesCard />

      {/* Volume chart + system health */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold">Volumen transaccional</h3>
              <p className="text-xs text-muted-foreground">ultimos 14 dias — ARS</p>
            </div>
            <div className="text-xs text-primary font-semibold inline-flex items-center gap-1">
              <TrendingUp size={14} /> +24,6%
            </div>
          </div>
          <div className="flex items-end gap-1.5 h-44">
            {volumeData.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-moli-blue to-moli-red"
                  style={{ height: `${(v / max) * 100}%` }}
                />
                <span className="text-[10px] text-muted-foreground">{i + 1}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-display font-semibold mb-4">Estado del sistema</h3>
          <ul className="space-y-3 text-sm">
            {[
              ["API publica", "operativo", "120 ms"],
              ["Procesador CVU", "operativo", "210 ms"],
              ["QR realtime", "operativo", "85 ms"],
              ["Webhooks", "degradado", "640 ms"],
              ["Conciliacion batch", "operativo", "—"],
            ].map(([n, e, l]) => (
              <li key={n} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {e === "operativo" ? (
                    <CheckCircle2 size={16} className="text-primary" />
                  ) : (
                    <XCircle size={16} className="text-amber-600" />
                  )}
                  {n}
                </span>
                <span className="text-xs text-muted-foreground font-mono tabular-nums">{l}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Lower row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold flex items-center gap-2">
              <Building2 size={16} className="text-moli-blue" /> Últimos registros
            </h3>
            <Link to="/admin/general/usuarios" className="text-xs text-primary font-semibold">
              Ver todos ?
            </Link>
          </div>
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b">
                  <th className="text-left font-display font-semibold py-2 px-5">Razon social</th>
                  <th className="text-left font-display font-semibold py-2">CUIT</th>
                  <th className="text-left font-display font-semibold py-2">Segmento</th>
                  <th className="text-left font-display font-semibold py-2">Estado</th>
                  <th className="text-right font-display font-semibold py-2 px-5">Volumen</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  [
                    "Consorcio Larrea 1200",
                    "30-71235678-2",
                    "Consorcio",
                    "warn",
                    "Pendiente validacion",
                    "—",
                  ],
                  [
                    "Microcreditos del Sur",
                    "30-71239988-0",
                    "Microcredito",
                    "success",
                    "Activo",
                    "$ 8,4M",
                  ],
                  [
                    "Administradora Plaza",
                    "30-71244455-1",
                    "Alquileres",
                    "warn",
                    "Documentacion",
                    "—",
                  ],
                  [
                    "Municipalidad de Chivilcoy",
                    "30-99876543-2",
                    "Municipio",
                    "success",
                    "Activo",
                    "$ 21,2M",
                  ],
                  ["Pagos Express SRL", "30-71300011-4", "Empresa", "danger", "Bloqueado", "—"],
                ].map(([n, c, seg, tone, e, v]) => (
                  <tr key={n}>
                    <td className="py-2.5 px-5 font-semibold">{n}</td>
                    <td className="text-xs text-muted-foreground font-mono tabular-nums">{c}</td>
                    <td className="text-xs">{seg}</td>
                    <td>
                      <Badge tone={tone as "success" | "warn" | "danger"}>{e}</Badge>
                    </td>
                    <td className="text-right px-5 font-semibold font-mono tabular-nums">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold flex items-center gap-2">
              <ShieldAlert size={16} className="text-moli-red" /> Alertas recientes
            </h3>
            <Link
              to="/admin/general/alertas/bloqueos"
              className="text-xs text-primary font-semibold"
            >
              Compliance ?
            </Link>
          </div>
          <div className="divide-y">
            {[
              ["Movimiento superior a $5M", "Microcreditos del Sur", "danger", "Hace 12 min"],
              ["Frecuencia anomala – 48 ops/h", "Pagos Express SRL", "warn", "Hace 1 h"],
              ["CUIT en lista de control", "Comercializadora ABC", "danger", "Hace 3 h"],
              ["KYC vencido", "Consorcio Belgrano", "warn", "Hoy 09:00"],
            ].map(([a, c, tone, t]) => (
              <div key={a} className="py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-semibold">{a}</div>
                  <Badge tone={tone as "warn" | "danger"}>!</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{c}</div>
                <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1 mt-1">
                  <Clock size={11} /> {t}
                </div>
              </div>
            ))}
          </div>
          <Link
            to="/admin/general/movimientos"
            className="mt-4 inline-flex items-center gap-1 text-xs text-primary font-semibold"
          >
            Ver movimientos en tiempo real <ArrowUpRight size={12} />
          </Link>
        </Card>
      </div>
    </div>
  );
}
