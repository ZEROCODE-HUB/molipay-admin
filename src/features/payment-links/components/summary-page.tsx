import { listOpenMerchantDebts } from "@/features/payment-links/advances.supabase";
import { userMessage } from "@/shared/lib/errors";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Wallet, Landmark, Percent, ArrowUpRight, Calendar } from "lucide-react";
import {
  QK_ACRED,
  listAdvancesV2,
  listBatchesV2,
  summaryCredits,
  type AdvanceV2,
} from "@/features/payment-links/credits.supabase";
import { formatMoney } from "@/shared/lib/format";
import { PermissionGuard } from "@/features/rbac/access-gate";

type Period = "hoy" | "ayer" | "7d" | "30d";

function iso(d: Date) {
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function range(p: Period): { desde: string; hasta: string } {
  const today = new Date();
  const menos = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return iso(d);
  };
  if (p === "hoy") return { desde: iso(today), hasta: iso(today) };
  if (p === "ayer") return { desde: menos(1), hasta: menos(1) };
  if (p === "7d") return { desde: menos(6), hasta: iso(today) };
  return { desde: menos(29), hasta: iso(today) };
}

type RowMerchant = {
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
  /** Desglose de impuestos y de lo que se descontó del neto en los lotes del período. */
  iibb: number;
  dyc: number;
  retenido: number;
  compensado: number;
  recupero: number;
};

const EMPTY_TOTALS = { iibb: 0, dyc: 0, retenido: 0, compensado: 0, recupero: 0, neto: 0 };

export function SummaryPage() {
  const [period, setPeriod] = useState<Period>("hoy");
  const { desde: from, hasta: to } = useMemo(() => range(period), [period]);

  // KPIs del periodo: los calcula la base (resumen_acreditaciones).
  const summaryQ = useQuery({
    queryKey: [...QK_ACRED, "resumen-general", from, to],
    queryFn: () => summaryCredits(from, to),
  });
  const r = summaryQ.data;
  const kpi = {
    // Lo que falta acreditar (maximo adelantable): proyectado + llegado sin acreditar.
    pendiente: r
      ? Number(r.por_acreditar.programado) +
        Number(r.por_acreditar.no_conciliado) +
        Number(r.por_acreditar.listo)
      : 0,
    // Saldo actual del libro mayor (no depende del periodo): suma el neto de Payway de cada
    // lote conciliado y no baja al acreditar, porque la plata sigue en la cuenta.
    recaudadora: r ? Number(r.recaudadora.saldo_conciliado) : 0,
    recPendiente: r ? Number(r.recaudadora.pendiente_acreditar) : 0,
    recAdelantos: r ? Number(r.recaudadora.adelantos_sin_compensar) : 0,
    recDeuda: r ? Number(r.recaudadora.deuda_comercios) : 0,
    // Lo que todavia no entro a la recaudadora (lo "listo" ya esta adentro).
    porEntrar: r ? Number(r.por_acreditar.programado) + Number(r.por_acreditar.no_conciliado) : 0,
    netoMoliPay: r ? Number(r.descuentos.tasa) + Number(r.descuentos.cierre) : 0,
    netoPayWay: r ? Number(r.liquidado.costo_servicio) : 0,
    impuestos: r
      ? Number(r.descuentos.iva_tasa) +
        Number(r.descuentos.impuestos ?? 0) +
        Number(r.liquidado.impuestos)
      : 0,
    bruto: r ? Number(r.ventas.bruto) : 0,
  };

  // Una linea por comercio: lotes del archivo de Payway del periodo, adelanto
  // vigente y deuda por contracargos.
  const batchesQ = useQuery({
    queryKey: [...QK_ACRED, "resumen-general-lotes", from, to],
    queryFn: () => listBatchesV2({ desde: from, hasta: to, origen: "archivo", fechaEfectiva: true }, 0, 2000),
  });
  const advancesQ = useQuery({
    queryKey: [...QK_ACRED, "resumen-general-adelantos"],
    queryFn: () => listAdvancesV2({}),
  });
  const deudasQ = useQuery({
    queryKey: [...QK_ACRED, "resumen-general-deudas"],
    queryFn: listOpenMerchantDebts,
  });

  const data: RowMerchant[] = useMemo(() => {
    const m = new Map<string, RowMerchant>();
    for (const l of batchesQ.data?.rows ?? []) {
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
          iibb: 0,
          dyc: 0,
          retenido: 0,
          compensado: 0,
          recupero: 0,
        } as RowMerchant);
      const net = Number(l.neto_a_acreditar ?? 0);
      f.pendiente +=
        Number(l.iva_tasa_monto ?? 0) + Number(l.impuestos ?? 0) + Number(l.impuestos_payway ?? 0);
      for (const t of l.impuestos_detalle ?? []) {
        if ((t as { fuente?: string }).fuente === "taxpayer_registry") f.iibb += Number(t.monto);
        else if (["DEBITOS_CREDITOS", "DC"].includes((t.codigo ?? "").toUpperCase()))
          f.dyc += Number(t.monto);
      }
      f.retenido += Number(l.retencion_contracargos ?? 0);
      f.compensado += Number(l.compensacion_adelantos ?? 0);
      f.recupero += Number(l.recuperacion_deuda ?? 0);
      f.comisionMoli +=
        Number(l.tasa_molipay_monto ?? 0) + Number(l.comision_cierre_lote_monto ?? 0);
      f.comisionPayway += Number(l.costo_servicio_payway ?? 0);
      if (l.estado === "Acreditado") f.acreditacion += net;
      else f.pendienteNeto += net;
      m.set(l.comercio_id, f);
    }
    const effective = new Map<string, AdvanceV2>();
    for (const a of advancesQ.data ?? []) {
      if (!["Pendiente", "Aprobado", "Aceptado", "Acreditado"].includes(a.estado)) continue;
      if (!effective.has(a.comercio_id)) effective.set(a.comercio_id, a);
    }
    for (const [id, a] of effective) {
      const f = m.get(id);
      if (f)
        f.adelanto = {
          monto: Number(a.monto_ofertado ?? a.monto_solicitado),
          estado: a.estado_etiqueta,
        };
    }
    for (const d of deudasQ.data ?? []) {
      const f = d.comercio_id ? m.get(d.comercio_id) : undefined;
      if (f) f.contracargo += Number(d.monto) - Number(d.recuperado);
    }
    return [...m.values()];
  }, [batchesQ.data, advancesQ.data, deudasQ.data]);

  // Totales del período desde los mismos lotes de la tabla.
  const totals = useMemo(
    () =>
      data.reduce(
        (t, r) => ({
          iibb: t.iibb + r.iibb,
          dyc: t.dyc + r.dyc,
          retenido: t.retenido + r.retenido,
          compensado: t.compensado + r.compensado,
          recupero: t.recupero + r.recupero,
          neto: t.neto + r.acreditacion + r.pendienteNeto,
        }),
        EMPTY_TOTALS,
      ),
    [data],
  );

  const cols: Column<RowMerchant>[] = [
    {
      key: "comercio",
      label: "Comercio / Legajo",
      filterable: true,
      render: (r) => (
        <div>
          <div className="font-semibold text-sm">{r.comercio}</div>
          <div className="font-mono text-xs text-muted-foreground">{r.legajo}</div>
        </div>
      ),
    },
    {
      key: "pendiente",
      label: "Impuestos",
      hint: "IVA de la tasa + impuestos asignados (incluye IIBB y Débitos y Créditos) + impuestos de Payway.",
      render: (r) => (
        <div>
          <span className="font-mono text-amber-700">{formatMoney(r.pendiente)}</span>
          {r.iibb > 0 && (
            <div className="text-[10px] text-muted-foreground">IIBB {formatMoney(r.iibb)}</div>
          )}
          {r.dyc > 0 && (
            <div className="text-[10px] text-muted-foreground">DyC {formatMoney(r.dyc)}</div>
          )}
        </div>
      ),
    },
    {
      key: "comisionMoli",
      label: "Comisión Moli",
      hint: "Tasa MoliPay + cierre de lote 0,45%.",
      render: (r) => (
        <span className="font-mono text-emerald-700">{formatMoney(r.comisionMoli)}</span>
      ),
    },
    {
      key: "comisionPayway",
      label: "Comisión PayWay",
      hint: "Costo de servicio que descontó Payway en el archivo.",
      render: (r) => <span className="font-mono">{formatMoney(r.comisionPayway)}</span>,
    },
    {
      key: "pendienteNeto",
      label: "Pendiente neto",
      hint: "Neto a acreditar de los lotes que todavía no se acreditaron.",
      render: (r) => (
        <span className="font-mono font-semibold">{formatMoney(r.pendienteNeto)}</span>
      ),
    },
    {
      key: "adelanto",
      label: "Adelanto",
      render: (r) =>
        r.adelanto ? (
          <div>
            <div className="font-mono text-xs">{formatMoney(r.adelanto.monto)}</div>
            <Badge
              tone={
                r.adelanto.estado === "Solicitado"
                  ? "warn"
                  : r.adelanto.estado === "Acreditado"
                    ? "success"
                    : "neutral"
              }
            >
              {r.adelanto.estado}
            </Badge>
            {r.compensado > 0 && (
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {formatMoney(r.compensado)} compensado en lotes
              </div>
            )}
          </div>
        ) : r.compensado > 0 ? (
          <div className="font-mono text-xs">{formatMoney(r.compensado)} compensado en lotes</div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "acreditacion",
      label: "Acreditación",
      hint: "Neto ya acreditado al comercio en el período.",
      render: (r) => (
        <span className="font-mono font-semibold text-emerald-700">
          {formatMoney(r.acreditacion)}
        </span>
      ),
    },
    {
      key: "contracargo",
      label: "Contracargo retenido",
      hint: "Retenido en los lotes del período por contracargos, y deuda abierta (contracargos o lotes negativos).",
      render: (r) =>
        r.retenido || r.contracargo || r.recupero ? (
          <div className="font-mono text-xs">
            {r.retenido > 0 && (
              <div className="text-red-600">{formatMoney(r.retenido)} retenido</div>
            )}
            {r.recupero > 0 && (
              <div className="text-emerald-700">{formatMoney(r.recupero)} deuda recuperada</div>
            )}
            {r.contracargo > 0 && (
              <div className="text-amber-700">{formatMoney(r.contracargo)} deuda abierta</div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Resumen general"
        description="Visión global de la operación de Link de Pago. Totales por período para MoliPay."
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <Calendar size={14} /> Período:
        </span>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="h-9 px-3 rounded-md border bg-card text-sm"
        >
          <option value="hoy">Hoy</option>
          <option value="ayer">Ayer</option>
          <option value="7d">Últimos 7 días</option>
          <option value="30d">Últimos 30 días</option>
        </select>
        <Badge tone="neutral">{period}</Badge>
        {r && (
          <Badge
            tone={r.semaforo === "rojo" ? "danger" : r.semaforo === "amarillo" ? "warn" : "success"}
          >
            {r.semaforo === "rojo"
              ? "Rojo: no cierra"
              : r.semaforo === "amarillo"
                ? "Amarillo: hay pendientes"
                : "Verde: todo cierra"}
          </Badge>
        )}
        {summaryQ.isError && (
          <span className="text-xs text-red-700">{userMessage(summaryQ.error)}</span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Wallet size={12} /> Total pendiente de acreditar
          </div>
          <div className="font-mono text-xl font-semibold mt-1">{formatMoney(kpi.pendiente)}</div>
          <div className="text-xs text-muted-foreground mt-1">Máximo adelantable</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Landmark size={12} /> Fondos de Payway en la recaudadora de MoliPay
          </div>
          <div className="font-mono text-xl font-semibold mt-1">{formatMoney(kpi.recaudadora)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Saldo actual · no depende del período
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Suma el neto de Payway de cada lote conciliado. No baja al acreditar: la plata sigue en
            la cuenta y pasa a ser saldo de los comercios, adelantos recuperados y comisiones e
            impuestos de MoliPay.
          </p>
          <dl className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <dt>Conciliado sin acreditar</dt>
              <dd className="font-mono">{formatMoney(kpi.recPendiente)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Ya acreditado (comercios, adelantos y comisiones)</dt>
              <dd className="font-mono">
                {formatMoney(Math.max(kpi.recaudadora - kpi.recPendiente, 0))}
              </dd>
            </div>
            {kpi.recAdelantos > 0 && (
              <div className="flex justify-between">
                <dt>Adelantos sin compensar</dt>
                <dd className="font-mono">{formatMoney(kpi.recAdelantos)}</dd>
              </div>
            )}
            {kpi.recDeuda > 0 && (
              <div className="flex justify-between">
                <dt>Deuda de comercios</dt>
                <dd className="font-mono">{formatMoney(kpi.recDeuda)}</dd>
              </div>
            )}
          </dl>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total bruto</div>
          <div className="font-mono text-xl font-semibold mt-1">{formatMoney(kpi.bruto)}</div>
          <div className="text-xs text-muted-foreground mt-1">Suma operaciones</div>
        </Card>
        <Card className="p-4 border-primary/20">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Percent size={12} /> Neto MoliPay
          </div>
          <div className="font-mono text-xl font-semibold mt-1 text-emerald-700">
            {formatMoney(kpi.netoMoliPay)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Tasa MoliPay + cierre de lote — cuánto genera en el período
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <ArrowUpRight size={12} /> Neto PayWay
          </div>
          <div className="font-mono text-xl font-semibold mt-1">{formatMoney(kpi.netoPayWay)}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Costo de servicio de la pasarela
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Impuestos</div>
          <div className="font-mono text-xl font-semibold mt-1">{formatMoney(kpi.impuestos)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            IVA, impuestos asignados e impuestos de Payway
          </div>
        </Card>
      </div>

      <Card className="p-4 mb-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Resultado económico del período
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bruto</span>
            <span className="font-mono">{formatMoney(kpi.bruto)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Impuestos</span>
            <span className="font-mono text-red-600">- {formatMoney(kpi.impuestos)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Neto PayWay</span>
            <span className="font-mono text-red-600">- {formatMoney(kpi.netoPayWay)}</span>
          </div>
          {(totals.iibb > 0 || totals.dyc > 0) && (
            <div className="flex justify-between text-[11px] pl-3">
              <span className="text-muted-foreground">
                de los cuales IIBB {formatMoney(totals.iibb)} · Débitos y Créditos{" "}
                {formatMoney(totals.dyc)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Neto MoliPay</span>
            <span className="font-mono text-emerald-700">{formatMoney(kpi.netoMoliPay)}</span>
          </div>
          {totals.retenido > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Retenido por contracargos</span>
              <span className="font-mono text-red-600">- {formatMoney(totals.retenido)}</span>
            </div>
          )}
          {totals.compensado > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Adelantos compensados</span>
              <span className="font-mono text-red-600">- {formatMoney(totals.compensado)}</span>
            </div>
          )}
          {totals.recupero > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Recupero de deuda</span>
              <span className="font-mono text-red-600">- {formatMoney(totals.recupero)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs font-semibold">
            <span>Neto para comercios (acreditado + por acreditar)</span>
            <span className="font-mono">{formatMoney(totals.neto)}</span>
          </div>
          <div className="border-t my-2" />
          <div className="flex justify-between font-semibold">
            <span>En cuenta + por entrar de Payway</span>
            <span className="font-mono">{formatMoney(kpi.recaudadora + kpi.porEntrar)}</span>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Impuestos y pagos asociados por comercio
        </h4>
        <DataTable
          columns={cols}
          data={data}
          keyExtractor={(r) => r.comercioId}
          loading={batchesQ.isLoading}
          emptyMessage="Sin liquidaciones de Payway en el período."
        />
        <p className="text-[11px] text-muted-foreground mt-2">
          Una línea por comercio con impuestos, comisiones Moli/PayWay, pendiente neto, adelanto y
          estado, acreditación y contracargo retenido.
        </p>
      </Card>
    </PermissionGuard>
  );
}
