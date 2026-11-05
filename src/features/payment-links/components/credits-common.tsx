import { userMessage } from "@/shared/lib/errors";
import { useState,type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { HeaderHint } from "@/shared/ui/header-hint";
import { listMerchants } from "@/features/merchants/merchants.supabase";
import {
SUBESTADO_LABEL,
type CalculoBatch,
type TaxAplicado,
type BatchV2,
} from "@/features/payment-links/credits.supabase";
import { esDyc } from "@/features/payment-links/batches.rules";
import { formatDateTime } from "@/shared/lib/format";

// Piezas comunes de las pantallas de Acreditaciones.

export function fmt(n: number | null | undefined) {
  const v = Number(n ?? 0);
  const s = Math.abs(v).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${v < 0 ? "−" : ""}$ ${s}`;
}

/** Importe alineado a la derecha; negativo en rojo con signo menos. */
export function Amount({
  v,
  className = "",
  strong = false,
}: {
  v: number | null | undefined;
  className?: string;
  strong?: boolean;
}) {
  const n = Number(v ?? 0);
  return (
    <span
      className={`font-mono tabular-nums whitespace-nowrap ${n < 0 ? "text-red-600" : ""} ${strong ? "font-semibold" : ""} ${className}`}
    >
      {fmt(n)}
    </span>
  );
}

export function date(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Fecha local de hoy (YYYY-MM-DD) desplazada en dias. */
export function todayIso(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function errMsg(e: unknown) {
  return userMessage(e);
}

const TONE_SUBESTADO: Record<string, "neutral" | "success" | "warn" | "danger"> = {
  listo: "success",
  acreditado: "success",
  negativo: "danger",
  no_conciliado: "warn",
  sin_tasa: "warn",
  sin_calcular: "warn",
  comercio_inactivo: "danger",
  programado: "neutral",
  liquidado: "neutral",
  legacy: "neutral",
};

/** Estado del lote con su subestado (Pendiente · Listo, Pendiente · No conciliado...). */
export function StatusBatch({
  lote: batch,
}: {
  lote: Pick<BatchV2, "estado" | "subestado" | "motivo_no_elegible" | "legacy" | "es_negativo">;
}) {
  const sub = batch.subestado;
  const tone = TONE_SUBESTADO[sub] ?? "neutral";
  const text =
    batch.estado === "Pendiente" && sub && sub !== "pendiente"
      ? `Pendiente · ${SUBESTADO_LABEL[sub] ?? sub}`
      : batch.legacy
        ? `${batch.estado} (histórico)`
        : batch.estado === "Acreditado" && batch.es_negativo
          ? "Acreditado · Negativo"
          : batch.estado;
  return (
    <span title={batch.motivo_no_elegible ?? undefined}>
      <Badge tone={batch.estado === "Acreditado" ? "success" : tone}>{text}</Badge>
    </span>
  );
}

export function Kpi({
  label,
  value,
  sub,
  hint,
  tone,
  onClick,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  hint?: string;
  tone?: "warn" | "danger" | "success";
  onClick?: () => void;
}) {
  const border =
    tone === "danger"
      ? "border-red-300"
      : tone === "warn"
        ? "border-amber-300"
        : tone === "success"
          ? "border-emerald-300"
          : "";
  const inner = (
    <>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        {label}
        {hint && <HeaderHint title={label} text={hint} />}
      </div>
      <div className="font-mono text-lg font-semibold mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </>
  );
  return (
    <Card
      className={`p-4 ${border} ${onClick ? "cursor-pointer hover:bg-muted/40 transition" : ""}`}
    >
      {onClick ? (
        <button type="button" onClick={onClick} className="block w-full text-left">
          {inner}
        </button>
      ) : (
        inner
      )}
    </Card>
  );
}

/** Buscador de comercio (nombre de usuario o legajo). */
export function MerchantPicker({
  value,
  onChange,
  placeholder = "Buscar comercio por usuario o legajo",
  allowEmpty = true,
}: {
  value: string;
  onChange: (id: string, label: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
}) {
  const [q, setQ] = useState("");
  const query = useQuery({
    queryKey: ["comercios-picker", q],
    queryFn: () => listMerchants({ page: 0, pageSize: 30, search: q || undefined }),
    staleTime: 30_000,
  });
  const rows = query.data?.rows ?? [];
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full h-9 pl-8 pr-3 rounded-md border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring/30"
        />
      </div>
      <select
        value={value}
        onChange={(e) => {
          const c = rows.find((r) => r.id === e.target.value);
          onChange(e.target.value, c ? `${c.nombreComercio ?? c.usuario} · ${c.legajo}` : "");
        }}
        className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
      >
        {allowEmpty && <option value="">Todos los comercios</option>}
        {!allowEmpty && <option value="">Elegí un comercio…</option>}
        {rows.map((c) => (
          <option key={c.id} value={c.id}>
            {(c.nombreComercio ?? c.usuario) +
              " · " +
              c.legajo +
              (c.cliente?.cuit ? ` · ${c.cliente.cuit}` : "")}
          </option>
        ))}
      </select>
    </div>
  );
}

type Row = {
  label: string;
  valor: number;
  signo?: "-" | "+" | "=";
  nota?: string;
  strong?: boolean;
};

/** Datos de una liquidacion de lote, independientes de la fuente (vista o calculo). */
export type DataSettlement = {
  estimado: boolean;
  estado: string;
  fechaAcreditacion?: string | null;
  calculadoAt?: string | null;
  archivo?: string | null;
  conciliado?: boolean | null;
  bruto: number;
  impuestosPayway: number;
  costoPayway: number;
  netoPayway: number;
  tasaPct: number;
  tasa: number;
  iva: number;
  cierrePct: number;
  cierre: number;
  cierreBase?: number | null;
  asignados?: { nombre: string; monto: number }[];
  iibb?: { alicuota: number; monto: number } | null;
  dyc?: { alicuota: number; monto: number } | null;
  retencion?: number;
  compensacion?: number;
  recuperacion?: number;
  neto: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const pctTxt = (n: number) =>
  `${(Math.round(n * 100) / 100).toLocaleString("es-AR", { maximumFractionDigits: 2 })} %`;
const amountTxt = (n: number) => (n < 0 ? `− ${fmt(Math.abs(n))}` : fmt(n));

function RowExtracto({
  concepto: concept,
  detalle: detail,
  base,
  alicuota: rate,
  importe: amount,
  tipo: kind = "linea",
}: {
  concepto: string;
  detalle?: string;
  base?: number | null;
  alicuota?: string | null;
  importe: number;
  tipo?: "linea" | "subtotal" | "referencia";
}) {
  const sub = kind === "subtotal";
  return (
    <tr
      className={
        sub ? "border-t bg-muted/30 font-semibold" : "border-t border-dashed first:border-t-0"
      }
    >
      <td className={`py-2 pl-4 pr-2 align-top ${sub ? "" : "pl-6"}`}>
        <div className={kind === "referencia" ? "text-muted-foreground" : ""}>{concept}</div>
        {detail && (
          <div className="text-[11px] font-normal text-muted-foreground leading-tight">
            {detail}
          </div>
        )}
      </td>
      <td className="py-2 px-2 text-right align-top font-mono tabular-nums text-xs text-muted-foreground whitespace-nowrap">
        {base != null ? fmt(base) : ""}
      </td>
      <td className="py-2 px-2 text-right align-top font-mono tabular-nums text-xs text-muted-foreground whitespace-nowrap">
        {rate ?? ""}
      </td>
      <td
        className={`py-2 pl-2 pr-4 text-right align-top font-mono tabular-nums whitespace-nowrap ${
          kind === "referencia" ? "text-muted-foreground" : ""
        }`}
      >
        {amountTxt(amount)}
      </td>
    </tr>
  );
}

function SectionExtracto({ letra, titulo: title }: { letra: string; titulo: string }) {
  return (
    <tr className="border-t-2 border-border">
      <td
        colSpan={4}
        className="bg-muted/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {letra}. {title}
      </td>
    </tr>
  );
}

/**
 * Liquidacion de un lote con formato de extracto: resumen (bruto,
 * deducciones, neto), detalle contable por seccion (Payway, cargos MoliPay,
 * compensaciones) con base, alicuota e importe, y notas sobre el origen de
 * los datos. Se usa en el detalle del lote, la apertura y la ejecucion.
 */
export function ExtractoSettlement({ d }: { d: DataSettlement }) {
  const asignados = (d.asignados ?? []).filter((x) => Number(x.monto) > 0);
  const asignadosTotal = r2(asignados.reduce((t, x) => t + Number(x.monto), 0));
  const iibbMonto = Number(d.iibb?.monto ?? 0);
  const dycMonto = Number(d.dyc?.monto ?? 0);
  const ret = Number(d.retencion ?? 0);
  const comp = Number(d.compensacion ?? 0);
  const recup = Number(d.recuperacion ?? 0);
  const compensaciones = r2(ret + comp + recup);
  const cargosMolipay = d.estimado
    ? r2(d.netoPayway - d.neto)
    : r2(d.tasa + d.iva + d.cierre + iibbMonto + dycMonto + asignadosTotal);
  const deducciones = r2(d.bruto - d.neto);
  const arancelPct = d.bruto > 0 ? (d.costoPayway / d.bruto) * 100 : 0;
  const ivaPct = d.tasa > 0 ? (d.iva / d.tasa) * 100 : 0;
  const closingBase =
    d.cierreBase ?? (d.cierrePct > 0 ? r2(d.cierre / (d.cierrePct / 100)) : d.netoPayway);
  const credited = d.estado === "Acreditado";
  const labelNet = credited
    ? "Neto acreditado"
    : d.estimado
      ? "Neto estimado a acreditar"
      : "Neto a acreditar";

  return (
    <div className="space-y-3">
      {/* Resumen */}
      <div className="grid grid-cols-3 divide-x rounded-lg border">
        <div className="px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Importe bruto
          </div>
          <div className="mt-1 font-mono text-lg tabular-nums">{fmt(d.bruto)}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Total deducciones
          </div>
          <div className="mt-1 font-mono text-lg tabular-nums">
            {amountTxt(-Math.max(deducciones, 0))}
          </div>
        </div>
        <div className="bg-muted/40 px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {labelNet}
          </div>
          <div
            className={`mt-1 font-mono text-lg font-semibold tabular-nums ${d.neto < 0 ? "text-red-700" : ""}`}
          >
            {fmt(d.neto)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {credited
              ? `Acreditado${d.fechaAcreditacion ? ` el ${date(d.fechaAcreditacion)}` : ""}`
              : d.estimado
                ? "Proyección"
                : "Pendiente de acreditación"}
          </div>
        </div>
      </div>

      {/* Detalle */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pl-4 pr-2 text-left font-medium">Concepto</th>
              <th className="py-2 px-2 text-right font-medium">Base de cálculo</th>
              <th className="py-2 px-2 text-right font-medium">Alícuota</th>
              <th className="py-2 pl-2 pr-4 text-right font-medium">Importe (ARS)</th>
            </tr>
          </thead>
          <tbody>
            <SectionExtracto letra="A" titulo="Liquidación del adquirente (Payway)" />
            <RowExtracto concepto="Ventas brutas del lote" importe={d.bruto} />
            {!d.estimado && (
              <RowExtracto
                concepto="Impuestos retenidos por Payway"
                detalle="Informados en el archivo de liquidación. Se muestran como referencia."
                importe={-d.impuestosPayway}
                tipo="referencia"
              />
            )}
            <RowExtracto
              concepto="Arancel Payway (costo de servicio)"
              detalle={
                d.estimado
                  ? "Estimado con la tasa Payway del comercio"
                  : "Según archivo de liquidación"
              }
              base={d.bruto}
              alicuota={pctTxt(arancelPct)}
              importe={-d.costoPayway}
            />
            <RowExtracto
              concepto={d.estimado ? "Neto estimado de Payway" : "Neto liquidado por Payway"}
              importe={d.netoPayway}
              tipo="subtotal"
            />

            <SectionExtracto letra="B" titulo="Cargos MoliPay" />
            {d.estimado ? (
              <RowExtracto
                concepto="Tasa de servicio, IVA y comisión de cierre"
                detalle="Estimados con los parámetros vigentes"
                base={d.netoPayway}
                alicuota={pctTxt(d.tasaPct)}
                importe={-cargosMolipay}
              />
            ) : (
              <>
                <RowExtracto
                  concepto="Tasa de servicio MoliPay"
                  base={d.netoPayway}
                  alicuota={pctTxt(d.tasaPct)}
                  importe={-d.tasa}
                />
                {d.iva > 0 && (
                  <RowExtracto
                    concepto="IVA sobre tasa de servicio"
                    base={d.tasa}
                    alicuota={pctTxt(ivaPct)}
                    importe={-d.iva}
                  />
                )}
                <RowExtracto
                  concepto="Comisión de cierre de lote"
                  base={closingBase}
                  alicuota={pctTxt(d.cierrePct)}
                  importe={-d.cierre}
                />
                {iibbMonto > 0 && (
                  <RowExtracto
                    concepto="Retención IIBB / SIRCUPA oficial"
                    alicuota={pctTxt(Number(d.iibb?.alicuota ?? 0))}
                    importe={-iibbMonto}
                  />
                )}
                {dycMonto > 0 && (
                  <RowExtracto
                    concepto="Débitos y Créditos"
                    alicuota={pctTxt(Number(d.dyc?.alicuota ?? 0))}
                    importe={-dycMonto}
                  />
                )}
                {asignados.length > 0 && (
                  <RowExtracto
                    concepto="Impuestos asignados (cálculo anterior)"
                    detalle={`${asignados.map((x) => x.nombre).join(", ")}. Ya no se aplican: se quitan al recalcular el lote.`}
                    importe={-asignadosTotal}
                  />
                )}
              </>
            )}
            <RowExtracto concepto="Total cargos MoliPay" importe={-cargosMolipay} tipo="subtotal" />

            {compensaciones > 0 && (
              <>
                <SectionExtracto letra="C" titulo="Compensaciones y retenciones" />
                {ret > 0 && (
                  <RowExtracto
                    concepto="Retención por contracargo"
                    detalle="Se libera si la disputa se resuelve a favor del comercio"
                    importe={-ret}
                  />
                )}
                {comp > 0 && (
                  <RowExtracto
                    concepto="Compensación de adelanto"
                    detalle="Importe adelantado al comercio"
                    importe={-comp}
                  />
                )}
                {recup > 0 && (
                  <RowExtracto
                    concepto="Recupero de deuda"
                    detalle="Contracargos o liquidaciones negativas anteriores"
                    importe={-recup}
                  />
                )}
                <RowExtracto
                  concepto="Total compensaciones"
                  importe={-compensaciones}
                  tipo="subtotal"
                />
              </>
            )}

            <tr className="border-t-2 border-foreground/40">
              <td className="py-3 pl-4 pr-2 font-semibold" colSpan={3}>
                {labelNet}
              </td>
              <td
                className={`py-3 pl-2 pr-4 text-right font-mono text-base font-bold tabular-nums ${d.neto < 0 ? "text-red-700" : ""}`}
              >
                {fmt(d.neto)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Notas */}
      <ul className="space-y-0.5 text-[11px] leading-snug text-muted-foreground">
        {d.estimado ? (
          <li>
            Proyección sobre las ventas registradas. Los importes definitivos surgen del archivo de
            liquidación de Payway.
          </li>
        ) : (
          <li>
            Fuente: archivo de liquidación de Payway{d.archivo ? ` (${d.archivo})` : ""}.{" "}
            {d.conciliado != null &&
              (d.conciliado
                ? "Conciliado con la cuenta recaudadora."
                : "Pendiente de conciliación con la cuenta recaudadora.")}
          </li>
        )}
        <li>
          La tasa MoliPay y el cierre de lote se calculan sobre el importe bruto, con la tasa
          configurada para el comercio y la bandera. El IVA se calcula sobre la tasa.
          {d.calculadoAt && !credited
            ? ` Cálculo del ${formatDateTime(d.calculadoAt)}; al acreditar se recalcula con los valores vigentes.`
            : ""}
        </li>
      </ul>
    </div>
  );
}

/** Liquidacion de un lote de la vista v_lotes_acreditacion (o de un calculo de revision). */
export function CadenaAmounts({
  lote: batch,
  calculo,
}: {
  lote: Pick<
    BatchV2,
    "importe_bruto" | "costo_servicio_payway" | "impuestos_payway" | "neto_payway"
  > &
    Partial<BatchV2>;
  calculo?: CalculoBatch | null;
}) {
  const gross = Number(batch.importe_bruto ?? 0);
  const imps: TaxAplicado[] = calculo?.impuestos ?? batch.impuestos_detalle ?? [];
  const d: DataSettlement = {
    estimado: batch.origen === "venta",
    estado: batch.estado ?? "",
    fechaAcreditacion: batch.fecha_acreditacion ?? null,
    calculadoAt: batch.calculado_at ?? null,
    archivo: batch.importacion_archivo ?? null,
    conciliado: batch.origen === "archivo" ? (batch.conciliado ?? null) : null,
    bruto: gross,
    impuestosPayway: Number(batch.impuestos_payway ?? 0),
    costoPayway: Number(batch.costo_servicio_payway ?? 0),
    netoPayway: Number(calculo?.neto_payway ?? batch.neto_payway ?? 0),
    tasaPct: Number(calculo?.tasa_pct ?? batch.tasa_molipay_pct ?? 0),
    tasa: Number(calculo?.tasa_monto ?? batch.tasa_molipay_monto ?? 0),
    iva: Number(calculo?.iva_tasa_monto ?? batch.iva_tasa_monto ?? 0),
    cierrePct: Number(calculo?.cierre_pct ?? batch.comision_cierre_lote_pct ?? 0),
    cierre: Number(calculo?.cierre_monto ?? batch.comision_cierre_lote_monto ?? 0),
    cierreBase: calculo?.cierre_base_monto ?? null,
    asignados: imps
      .filter((i) => i.fuente !== "taxpayer_registry" && !esDyc(i))
      .map((i) => ({ nombre: i.nombre, monto: Number(i.monto) })),
    iibb: (() => {
      const item = imps.find((i) => i.fuente === "taxpayer_registry");
      return item ? { alicuota: Number(item.alicuota ?? 0), monto: Number(item.monto) } : null;
    })(),
    dyc: (() => {
      const item = imps.find(esDyc);
      return item ? { alicuota: Number(item.alicuota ?? 0), monto: Number(item.monto) } : null;
    })(),
    retencion: Number(calculo?.retencion_contracargos ?? batch.retencion_contracargos ?? 0),
    compensacion: Number(calculo?.compensacion_adelantos ?? batch.compensacion_adelantos ?? 0),
    recuperacion: Number(calculo?.recuperacion_deuda ?? batch.recuperacion_deuda ?? 0),
    neto: Number(calculo?.neto_a_acreditar ?? batch.neto_a_acreditar ?? batch.importe_neto ?? 0),
  };
  return <ExtractoSettlement d={d} />;
}
