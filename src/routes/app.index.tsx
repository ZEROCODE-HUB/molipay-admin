import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Wallet, ArrowDownLeft, ArrowUpRight, Users, Link2, QrCode,
  Smartphone, TrendingUp, Clock, Download, FileSpreadsheet, FileText,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { PageHeader, Card, BtnOutline } from "@/components/portal-shell";
import { toast } from "sonner";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

const formatARS = (n: number) =>
  `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type PeriodKey = "today" | "15d" | "30d" | "60d" | "90d" | "day" | "range";

const QUICK: Array<{ k: PeriodKey; l: string; days: number }> = [
  { k: "today", l: "Hoy", days: 1 },
  { k: "15d", l: "15 dias", days: 15 },
  { k: "30d", l: "30 dias", days: 30 },
  { k: "60d", l: "60 dias", days: 60 },
  { k: "90d", l: "90 dias", days: 90 },
];

function seriesFor(days: number): Array<{
  date: string; depositos: number; cobrosQR: number; linkPago: number; total: number;
}> {
  const out: Array<any> = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const seed = d.getDate() + d.getMonth() * 31;
    const isZero = seed % 11 === 0;
    const dep = isZero ? 0 : (((seed * 37) % 90) + 10) * 100_000;
    const qr = isZero ? 0 : (((seed * 17) % 60) + 5) * 100_000;
    const link = isZero ? 0 : ((seed * 23) % 40) * 100_000;
    out.push({
      date: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
      depositos: dep,
      cobrosQR: qr,
      linkPago: link,
      total: dep + qr + link,
    });
  }
  return out;
}

function Dashboard() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const data = useMemo(() => {
    if (period === "day") return seriesFor(1);
    if (period === "range" && desde && hasta) {
      const diff = Math.ceil(
        (new Date(hasta + "T23:59:59").getTime() - new Date(desde + "T00:00:00").getTime())
          / (1000 * 60 * 60 * 24)
      );
      return seriesFor(Math.max(1, diff));
    }
    const days = QUICK.find((p) => p.k === period)?.days ?? 30;
    return seriesFor(days);
  }, [period, day, desde, hasta]);

  const periodLabel = useMemo(() => {
    if (period === "day") return day;
    if (period === "range") return `${desde || "?"} – ${hasta || "?"}`;
    return QUICK.find((p) => p.k === period)?.l ?? "30 dias";
  }, [period, day, desde, hasta]);

  const kpis = useMemo(() => {
    const totalDep = data.reduce((s, d) => s + d.depositos, 0);
    const totalQR = data.reduce((s, d) => s + d.cobrosQR, 0);
    const totalLink = data.reduce((s, d) => s + d.linkPago, 0);
    return {
      saldo: 12_480_330.42,
      depositos: totalDep,
      retiros: totalDep * 0.52,
      cuentas: 4,
      cobrosLink: totalLink,
      cobrosQR: totalQR,
      pagosQR: totalQR * 0.35,
    };
  }, [data]);

  const doExport = (fmt: "xlsx" | "pdf") =>
    toast.success(`Reporte ${periodLabel} exportado (${fmt.toUpperCase()})`);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Panel ejecutivo — estado de tu operacion financiera."
        action={
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <Clock size={14} /> Actualizado hace 2 min
          </div>
        }
      />

      {/* Filtros */}
      <Card className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">
            Periodo
          </span>
          {QUICK.map((p) => (
            <button
              key={p.k}
              onClick={() => setPeriod(p.k)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                period === p.k
                  ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-dark)] border-transparent"
                  : "bg-card hover:bg-muted"
              }`}
            >
              {p.l}
            </button>
          ))}
          <button
            onClick={() => setPeriod("day")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              period === "day"
                ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-dark)] border-transparent"
                : "bg-card hover:bg-muted"
            }`}
          >
            Dia especifico
          </button>
          <button
            onClick={() => setPeriod("range")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              period === "range"
                ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-dark)] border-transparent"
                : "bg-card hover:bg-muted"
            }`}
          >
            Rango
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Dia</span>
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="h-9 px-3 rounded-md border bg-card text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Desde</span>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="h-9 px-3 rounded-md border bg-card text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Hasta</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              min={desde || undefined}
              className="h-9 px-3 rounded-md border bg-card text-sm"
            />
          </div>
          <div className="ml-auto flex gap-2">
            <BtnOutline onClick={() => doExport("xlsx")}>
              <FileSpreadsheet size={14} /> Excel
            </BtnOutline>
            <BtnOutline onClick={() => doExport("pdf")}>
              <FileText size={14} /> PDF
            </BtnOutline>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Saldo total de la cuenta</div>
              <div className="text-xl md:text-2xl font-bold text-foreground">{formatARS(kpis.saldo)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">CBU ···· 67890</div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[color:var(--brand-soft)] flex items-center justify-center text-primary shrink-0">
              <Wallet size={18} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Depositos del periodo</div>
              <div className="text-xl md:text-2xl font-bold text-foreground">{formatARS(kpis.depositos)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{data.length} dias</div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <ArrowDownLeft size={18} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Retiros del periodo</div>
              <div className="text-xl md:text-2xl font-bold text-foreground">{formatARS(kpis.retiros)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">48 operaciones</div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-red-600 shrink-0">
              <ArrowUpRight size={18} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Total de cuentas</div>
              <div className="text-xl md:text-2xl font-bold text-foreground">{kpis.cuentas}</div>
              <div className="text-xs text-muted-foreground mt-0.5">1 principal + 3 subcuentas</div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <Users size={18} />
            </div>
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Cobros mediante Link de Pago</div>
              <div className="text-xl md:text-2xl font-bold text-foreground">{formatARS(kpis.cobrosLink)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{Math.round(kpis.cobrosLink / 85000)} transacciones</div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[color:var(--brand-blue-soft)] flex items-center justify-center text-[color:var(--brand-blue)] shrink-0">
              <Link2 size={18} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Cobros mediante Codigo QR</div>
              <div className="text-xl md:text-2xl font-bold text-foreground">{formatARS(kpis.cobrosQR)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{Math.round(kpis.cobrosQR / 32000)} transacciones</div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
              <QrCode size={18} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Pagos realizados mediante QR</div>
              <div className="text-xl md:text-2xl font-bold text-foreground">{formatARS(kpis.pagosQR)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{Math.round(kpis.pagosQR / 18000)} transacciones</div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <Smartphone size={18} />
            </div>
          </div>
        </Card>
      </div>

      {/* Grafico */}
      <Card>
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold truncate">Movimientos diarios</h3>
            <p className="text-xs text-muted-foreground truncate">{periodLabel}</p>
          </div>
          <span className="text-primary font-semibold inline-flex items-center gap-1 text-xs shrink-0">
            <TrendingUp size={14} /> +18,4%
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs mb-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#C8102E" }} /> Depositos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#16213E" }} /> Cobros QR
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#0891B2" }} /> Link de Pago
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#FBBF24" }} /> Total del dia
          </span>
        </div>
        <div className="w-full" style={{ height: Math.max(200, Math.min(360, 40 * data.length)) }}>
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barGap={2} barCategoryGap={data.length > 30 ? 4 : 8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#64748B" }}
                  tickLine={false}
                  axisLine={{ stroke: "#E2E8F0" }}
                  interval={data.length > 30 ? Math.floor(data.length / 10) : 0}
                />
                <YAxis
                  tickFormatter={(v: number) => `$${(v / 1_000_000).toFixed(1)}M`}
                  tick={{ fontSize: 10, fill: "#64748B" }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      depositos: "Depositos",
                      cobrosQR: "Cobros QR",
                      linkPago: "Link de Pago",
                      total: "Total del dia",
                    };
                    return [formatARS(value), labels[name] || name];
                  }}
                  labelFormatter={(label: string) => `Fecha: ${label}`}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="depositos" fill="#C8102E" radius={[2, 2, 0, 0]} maxBarSize={32} />
                <Bar dataKey="cobrosQR" fill="#16213E" radius={[2, 2, 0, 0]} maxBarSize={32} />
                <Bar dataKey="linkPago" fill="#0891B2" radius={[2, 2, 0, 0]} maxBarSize={32} />
                <Bar dataKey="total" fill="#FBBF24" radius={[2, 2, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              No hay datos para el periodo seleccionado.
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
