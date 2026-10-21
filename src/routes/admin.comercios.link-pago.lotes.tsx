import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Eye,
  Calendar,
  Store,
  Receipt,
  Percent,
  ArrowUpRight,
  CreditCard,
  Wallet,
  Search,
  AlertTriangle,
  Inbox,
  Download,
  Upload,
  FileUp,
  CheckCircle2,
  Receipt as ReceiptIcon,
  Gavel,
} from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import {
  PageHeader,
  Badge,
  Card,
  Input,
  Label,
  BtnOutline,
  BtnPrimary,
} from "@/components/portal-shell";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PermissionGuard } from "@/components/permission-guard";
import { Pagination } from "@/components/pagination";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CargarCsvModal } from "@/components/cargar-csv-modal";
import { ConfirmarAcreditacionModal } from "@/components/confirmar-acreditacion-modal";
import { toast } from "sonner";
import { useCan } from "@/lib/permissions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataAccessError } from "@/lib/api/errors";
import {
  listLotes,
  updateLote,
  listLoteMovimientos,
  resumenLotes,
  exportLotesAcreditacion,
} from "@/lib/api/lotes";
import { listBanderas } from "@/lib/api/banderas";
import { listAdelantosByComercio } from "@/lib/api/adelantos";
import type { EstadoLote, LoteAcreditacion, Movimiento } from "@/lib/api/types";
import { useComercios } from "@/hooks/useComercios";
import { generarCsvLiquidacionTestParaLote } from "@/lib/liquidaciones/parse";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/admin/comercios/link-pago/lotes")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Lotes de Acreditación — Links de Pago — Admin — Moli" },
      { name: "description", content: "Lotes generados por MoliPay para acreditar pagos a comercios." },
    ],
  }),
});

const PAGE_SIZES = [10, 20, 50];

function tone(e: EstadoLote): "success" | "warn" | "danger" | "neutral" {
  if (e === "Acreditado") return "success";
  if (e === "Contracargo") return "danger";
  if (e === "Pendiente") return "warn";
  if (e === "Cancelado") return "neutral";
  return "neutral"; // Programado
}

/**
 * Tone para el estado de un movimiento (link de pago, no lote).
 *
 * Mapea por `estadoCodigo` cuando está presente (códigos del catálogo
 * `estados_movimiento`); si el código es desconocido cae a `warn` para
 * que el operador note que hay un estado que no está en la lista y lo
 * revise, en vez de mostrarlo silenciosamente como neutral.
 */
function estadoMovimientoTone(codigo: string | null | undefined): "success" | "warn" | "danger" | "neutral" {
  if (!codigo) return "neutral";
  const c = codigo.toUpperCase();
  if (c === "APROBADO" || c === "ACREDITADO" || c === "COMPLETADO") return "success";
  if (c === "RECHAZADO" || c === "CANCELADO" || c === "DEVUELTO") return "danger";
  if (c === "PENDIENTE" || c === "EN_PROGRESO" || c === "EN_REVISION" || c === "REQUIERE_ACCION") return "warn";
  return "warn";
}

function fmt(n: number) {
  return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function parseDateLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function fmtFechaCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * ¿El lote está todavía en etapa de proyección?
 *
 * En `Programado` los importes son estimaciones y la comisión por
 * cierre de lote (0,45%) NO se descuenta hasta que se aplica la
 * liquidación de Payway. A partir de `Pendiente` (con el snapshot
 * real del CSV ya grabado) y `Acreditado`, todos los importes son
 * firmes y la 0,45% ya fue debitada.
 */
function esLoteEstimado(l: LoteAcreditacion): boolean {
  return l.estado === "Programado";
}

/**
 * Tasas (en pesos) que la UI muestra en el desglose del lote.
 *
 * NO se leen de las columnas `tasa_payway_monto` / `tasa_molipay_monto`
 * de la DB: esos valores vienen mal acumulados del job que arma los
 * lotes (no son el resultado correcto de `bruto × pct / 100`). Para
 * no mentir en pantalla, los recalculamos acá a partir del bruto y
 * el porcentaje, que es lo que la regla de negocio manda.
 *
 * En el snapshot del CSV (estado Pendiente) las columnas se
 * sobreescriben con el cálculo del modal de acreditación, así que
 * después de aplicar la liquidación estos números siguen siendo
 * válidos como auditoría: importes_bruto × pct / 100.
 */
function tasasCalculadas(l: LoteAcreditacion): {
  paywayMonto: number;
  molipayMonto: number;
} {
  const paywayPct = Number(l.tasaPaywayPct) || 0;
  const molipayPct = Number(l.tasaMolipayPct) || 0;
  const bruto = Number(l.importeBruto) || 0;
  return {
    paywayMonto: round2((bruto * paywayPct) / 100),
    molipayMonto: round2((bruto * molipayPct) / 100),
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Suma de descuentos que se muestra al operador.
 *
 * Reglas:
 *  - Las tasas PayWay / MoliPay se calculan acá como `bruto × pct / 100`,
 *    NO se leen de las columnas `tasa_payway_monto` / `tasa_molipay_monto`
 *    de la DB: esos valores vienen mal acumulados del job de armado
 *    de lotes y romperían el total. Las columnas quedan como auditoría.
 *  - En `Programado` el 0,45% no se debita todavía, así que se excluye
 *    del total mostrado. En `Pendiente`/`Acreditado`/`Contracargo` se
 *    incluye como cualquier otro descuento firme.
 */
function totalDescuentos(l: LoteAcreditacion): number {
  const cierre = esLoteEstimado(l) ? 0 : (l.comisionCierreLoteMonto ?? 0);
  const tasas = tasasCalculadas(l);
  // Si los 3 snapshots están en 0 y el legacy > 0, usamos el legacy
  // (lotes viejos acreditados con la fórmula hardcoded). Si no, usamos
  // la suma de los snapshots reales del motor de retenciones.
  const totalReal =
    (l.ivaMonto ?? 0) + (l.debitoCreditoMonto ?? 0) + (l.iibbMonto ?? 0);
  const usarLegacy = totalReal === 0 && (l.impuestos ?? 0) > 0;
  const impuestos = usarLegacy
    ? (l.impuestos ?? 0)
    : totalReal;
  return (
    impuestos +
    tasas.paywayMonto +
    tasas.molipayMonto +
    (l.costoPaywayPagoUnico ?? 0) +
    cierre +
    (l.contracargoMonto ?? 0)
  );
}

function LoteDetalle({
  lote,
  onClose,
  onSubirCsv,
}: {
  lote: LoteAcreditacion;
  onClose: () => void;
  onSubirCsv: (l: LoteAcreditacion) => void;
}) {
  const queryClient = useQueryClient();
  const { data: movimientos } = useQuery({
    queryKey: ["lote-movimientos", lote.id],
    queryFn: () => listLoteMovimientos(lote.id),
  });
  const contracargo = lote.contracargoMonto ?? 0;
  const comisionCierre = lote.comisionCierreLoteMonto ?? 0;
  // Los lotes Programado guardan comisionCierreLotePct=0 porque el
  // 0,45% no se debita hasta confirmar la liquidación. Para no
  // mostrar "0%" en el desglose del detalle (que confunde al
  // operador), caemos al default 0,45 cuando el valor es 0 o null.
  // El monto en $ sigue siendo 0 en Programado (no se debitó todavía).
  const comisionCierrePct =
    (lote.comisionCierreLotePct ?? 0) > 0 ? (lote.comisionCierreLotePct as number) : 0.45;
  const loteEstimado = esLoteEstimado(lote);
  // En Programado la 0,45% no se debita; mostrar $ 0,00 con leyenda
  // "Pendiente de cierre" para que el operador no la confunda con un
  // cargo firme.
  const comisionCierreMostrar = loteEstimado ? 0 : comisionCierre;
  // Tasas (en pesos) recalculadas desde el bruto × porcentaje. Los
  // campos de la DB están mal acumulados; usar el cálculo en pantalla
  // para que el desglose siempre cuadre con la regla de negocio.
  const { paywayMonto: tasaPaywayMostrar, molipayMonto: tasaMolipayMostrar } = tasasCalculadas(lote);
  const totalDesc = totalDescuentos(lote);
  // "Menos impuestos": usa los snapshots reales (iva + dc + iibb) y
  // cae al legacy solo si los 3 están en 0 (lotes viejos).
  const totalImpuestosReal =
    (lote.ivaMonto ?? 0) + (lote.debitoCreditoMonto ?? 0) + (lote.iibbMonto ?? 0);
  const menosImpuestos =
    totalImpuestosReal > 0
      ? lote.importeBruto - totalImpuestosReal
      : lote.importeBruto - (lote.impuestos ?? 0);
  const esCuotas = (lote.cuotas ?? 1) > 1;
  const esContracargo = lote.estado === "Contracargo" || contracargo > 0;
  const movs = movimientos ?? [];

  const exportLote = () => {
    const data = [
      { Campo: "Código", Valor: lote.codigo },
      { Campo: "Fecha estimada", Valor: parseDateLocal(lote.fecha).toLocaleDateString("es-AR") },
      { Campo: "Fecha cobro real", Valor: lote.fechaCobroReal ? fmtFechaCorta(lote.fechaCobroReal) : "—" },
      { Campo: "Comercio", Valor: lote.comercio?.nombreComercio ?? lote.comercio?.usuario ?? "—" },
      { Campo: "Legajo", Valor: lote.comercio?.legajo ?? lote.comercioId },
      { Campo: "Bandera", Valor: lote.bandera },
      { Campo: "Cuotas", Valor: esCuotas ? `${lote.cuotas}` : "Pago único" },
      { Campo: "Cantidad operaciones", Valor: lote.cantidadOperaciones },
      { Campo: "Importe bruto", Valor: lote.importeBruto },
      { Campo: "IVA", Valor: lote.ivaMonto ?? 0 },
      { Campo: "Ingresos Brutos (IIBB)", Valor: lote.iibbMonto ?? 0 },
      { Campo: "Impuesto Débito/Crédito", Valor: lote.debitoCreditoMonto ?? 0 },
      { Campo: "Total Impuestos (legacy)", Valor: lote.impuestos },
      { Campo: "Tasa PayWay (%)", Valor: lote.tasaPaywayPct },
      { Campo: "Tasa PayWay ($) [DB]", Valor: lote.tasaPaywayMonto },
      { Campo: "Tasa PayWay ($) [recalculada]", Valor: tasaPaywayMostrar },
      { Campo: "Tasa MoliPay (%)", Valor: lote.tasaMolipayPct },
      { Campo: "Tasa MoliPay ($) [DB]", Valor: lote.tasaMolipayMonto },
      { Campo: "Tasa MoliPay ($) [recalculada]", Valor: tasaMolipayMostrar },
      { Campo: "Comisión cierre lote (%)", Valor: comisionCierrePct },
      { Campo: "Comisión cierre lote ($)", Valor: comisionCierre },
      { Campo: "Contracargo", Valor: contracargo },
      { Campo: "Importe neto", Valor: lote.importeNeto },
      { Campo: "Estado", Valor: lote.estado },
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Detalle Lote");
    XLSX.writeFile(wb, `lote_${lote.codigo}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <Receipt size={18} /> Detalle del lote
            </h3>
            <p className="text-sm font-mono text-muted-foreground">
              {lote.codigo} · {parseDateLocal(lote.fecha).toLocaleDateString("es-AR")} ·{" "}
              {lote.comercio?.nombreComercio ?? lote.comercio?.usuario ?? lote.comercioId} ·{" "}
              {lote.bandera} {esCuotas ? `· ${lote.cuotas} cuotas` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportLote} className="p-1.5 hover:bg-muted rounded-md" title="Exportar a Excel">
              <Download size={18} />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">✕</button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar size={12} /> Fecha estimada
              </div>
              <div className="font-mono font-semibold mt-1">
                {parseDateLocal(lote.fecha).toLocaleDateString("es-AR")}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                Cobro real:{" "}
                {lote.fechaCobroReal ? (
                  <>
                    <span className="font-mono">{fmtFechaCorta(lote.fechaCobroReal)}</span>
                    <Badge tone="success">real</Badge>
                  </>
                ) : (
                  <Badge tone="neutral">est.</Badge>
                )}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Store size={12} /> Comercio
              </div>
              <div className="font-semibold mt-1 truncate">
                {lote.comercio?.nombreComercio ?? lote.comercio?.usuario ?? "—"}
              </div>
              <div className="font-mono text-xs text-muted-foreground">{lote.comercio?.legajo ?? lote.comercioId}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Bandera</div>
              <div className="font-semibold mt-1">{lote.bandera}</div>
              <div className="text-xs text-muted-foreground">
                {esCuotas ? `${lote.cuotas} cuotas` : "Pago único"}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Estado</div>
              <div className="mt-1">
                <Badge tone={tone(lote.estado)}>{lote.estado}</Badge>
              </div>
              <div className="font-mono text-xs mt-1">{lote.cantidadOperaciones} ops</div>
            </Card>
          </div>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Detalle financiero del lote
              </h4>
              {loteEstimado && (
                <Badge tone="neutral">Proyección — sujeto al CSV de Payway</Badge>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Importe bruto</span>
                <span
                  className={`font-mono font-semibold ${
                    loteEstimado ? "text-muted-foreground/70" : ""
                  }`}
                >
                  {fmt(lote.importeBruto)}
                  {loteEstimado && (
                    <span className="ml-1 text-[10px] text-muted-foreground/70">(Est.)</span>
                  )}
                </span>
              </div>
              {(() => {
                // Snapshots reales del motor de retenciones (vienen de
                // la acreditación del lote). Si los 3 están en 0 y el
                // legacy > 0, caemos al legacy (lotes viejos donde el
                // cálculo se hacía con la fórmula hardcoded).
                const iva = lote.ivaMonto ?? 0;
                const dc = lote.debitoCreditoMonto ?? 0;
                const iibb = lote.iibbMonto ?? 0;
                const legacy = lote.impuestos ?? 0;
                const totalReal = iva + dc + iibb;
                const usarLegacy = totalReal === 0 && legacy > 0;
                return (
                  <>
                    {iva > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Receipt size={12} /> IVA
                          {lote.tasaMolipayPct > 0 && (
                            <span className="text-[10px] text-muted-foreground/70">
                              ({(iva / Math.max(lote.tasaMolipayMonto, 0.01) * 100).toFixed(0)}% s/comision)
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-red-600">- {fmt(iva)}</span>
                      </div>
                    )}
                    {dc > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Receipt size={12} /> Débito/Crédito
                        </span>
                        <span className="font-mono text-red-600">- {fmt(dc)}</span>
                      </div>
                    )}
                    {iibb > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Receipt size={12} /> Ingresos Brutos
                        </span>
                        <span className="font-mono text-red-600">- {fmt(iibb)}</span>
                      </div>
                    )}
                    {usarLegacy && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Receipt size={12} /> Impuestos
                          <span className="text-[10px] text-muted-foreground/70">
                            (legacy)
                          </span>
                        </span>
                        <span className="font-mono text-red-600">- {fmt(legacy)}</span>
                      </div>
                    )}
                    {totalReal === 0 && !usarLegacy && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Receipt size={12} /> Impuestos
                        </span>
                        <span className="font-mono text-muted-foreground/60">- $ 0,00</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-muted-foreground">Menos impuestos</span>
                      <span className={`font-mono ${loteEstimado ? "text-muted-foreground/70" : ""}`}>
                        {fmt(lote.importeBruto - (usarLegacy ? legacy : totalReal))}
                      </span>
                    </div>
                  </>
                );
              })()}
              <div className="border-t my-2" />
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Percent size={12} /> Tasa de interés PayWay ({lote.tasaPaywayPct}%)
                </span>
                <span
                  className={`font-mono ${loteEstimado ? "text-muted-foreground/60" : "text-red-600"}`}
                >
                  - {fmt(tasaPaywayMostrar)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Percent size={12} /> Tasa de interés MoliPay ({lote.tasaMolipayPct}%)
                </span>
                <span
                  className={`font-mono ${loteEstimado ? "text-muted-foreground/60" : "text-red-600"}`}
                >
                  - {fmt(tasaMolipayMostrar)}
                </span>
              </div>
              {esCuotas && lote.costoPaywayPagoUnico != null && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <CreditCard size={12} /> Costo PayWay por pago único ({lote.cuotas} cuotas)
                  </span>
                  <span
                    className={`font-mono ${loteEstimado ? "text-muted-foreground/60" : "text-red-600"}`}
                  >
                    - {fmt(lote.costoPaywayPagoUnico)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Percent size={12} /> Comisión cierre de lote ({comisionCierrePct}%)
                </span>
                {loteEstimado ? (
                  <span className="font-mono text-muted-foreground/60">
                    $ 0,00 <span className="text-[10px]">— Pendiente de cierre</span>
                  </span>
                ) : (
                  <span className="font-mono text-red-600">- {fmt(comisionCierre)}</span>
                )}
              </div>
              {esContracargo && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Receipt size={12} /> Contracargo{" "}
                    <Badge tone="danger" className="ml-1">retenido</Badge>
                  </span>
                  <span className="font-mono text-red-600">- {fmt(contracargo)}</span>
                </div>
              )}
              {esCuotas && (
                <p className="text-[11px] text-muted-foreground">
                  Si el comprador paga en cuotas, PayWay acredita a MoliPay en un solo pago y
                  cobra fee por esa liquidación.
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Tasa MoliPay = tasa cobrada al comercio − tasa PayWay a MoliPay (neto).
              </p>
              {loteEstimado && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                  El 0,45% de cierre de lote se calcula y debita únicamente
                  al confirmar la liquidación (estado Pendiente → Acreditado).
                  Hasta entonces los importes son una proyección.
                </p>
              )}
              <div className="border-t my-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Total descuentos</span>
                <span
                  className={`font-mono ${loteEstimado ? "text-muted-foreground/70" : ""}`}
                >
                  - {fmt(totalDesc)}
                </span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Importe final a acreditar</span>
                <span
                  className={`font-mono flex items-center gap-1.5 ${
                    lote.estado === "Contracargo"
                      ? "text-red-600"
                      : loteEstimado
                        ? "text-muted-foreground/80"
                        : "text-emerald-700"
                  }`}
                >
                  {fmt(lote.importeNeto)}
                  {loteEstimado && <Badge tone="neutral">Est.</Badge>}
                </span>
              </div>
              {esContracargo && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5 mt-2">
                  Incluye contracargo ({fmt(contracargo)} retenido): el lote descuenta ese pago.
                </p>
              )}
              {lote.notasResolucion && (
                <p className="text-xs text-muted-foreground border rounded px-2 py-1.5 mt-2 whitespace-pre-wrap">
                  Notas: {lote.notasResolucion}
                </p>
              )}
              {lote.resueltoPor && (
                <p className="text-[11px] text-muted-foreground">
                  Resuelto por {lote.resueltoPor}{" "}
                  {lote.fechaResolucion ? `· ${new Date(lote.fechaResolucion).toLocaleString("es-AR")}` : ""}
                </p>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Movimientos incluidos ({movs.length})
            </h4>
            {movs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin movimientos vinculados — el lote aún no tiene movimientos asignados o no se
                pudo cargar.
              </p>
            ) : (
              <div className="overflow-x-auto max-h-64 overflow-y-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/50 border-b">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">ID Txn</th>
                      <th className="px-3 py-2 font-medium">Cliente</th>
                      <th className="px-3 py-2 font-medium text-right">Importe</th>
                      <th className="px-3 py-2 font-medium">Fecha</th>
                      <th className="px-3 py-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {movs.map((m: Movimiento) => (
                      <tr key={m.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono text-xs">{m.idTxn}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium truncate max-w-[140px]">
                            {m.cliente?.nombre ?? "—"}
                          </div>
                          <div className="text-muted-foreground text-[10px]">{m.cliente?.correo}</div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold">
                          {fmt(m.montoOperacion)}
                        </td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">
                          {new Date(m.fecha).toLocaleString("es-AR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-3 py-2">
                          <Badge tone={estadoMovimientoTone(m.estadoCodigo)}>
                            {m.estadoNombre ?? m.estadoCodigo ?? "—"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            {lote.estado === "Programado" && (
              <>
                <button
                  onClick={async () => {
                    // El número de establecimiento que Payway usa en su
                    // archivo NO vive en `comercio_establecimientos` (ese
                    // mapa es para resolver comercio desde el CSV), sino
                    // en `comercios.site_id`: el identificador del sitio
                    // que el banco le asignó al comercio. Lo leemos del
                    // embed que ya viene en el lote.
                    //
                    // El archivo se arma a partir de los movimientos
                    // reales del lote: una fila por movimiento, con la
                    // fecha y el monto individuales. Si no hay
                    // movimientos cargados todavía, se cae a una sola
                    // fila agregada con el total del lote. Nunca se
                    // incluyen otros lotes u otras banderas.
                    const siteId = lote.comercio?.siteId?.trim();
                    let aviso: string | null = null;
                    if (!siteId) {
                      aviso =
                        "El comercio no tiene site_id cargado. El archivo se generó con un placeholder (00000000); cargalo en la ficha del comercio y volvé a bajar el CSV.";
                    }
                    const { filename, contenido } = generarCsvLiquidacionTestParaLote(
                      {
                        codigo: lote.codigo,
                        fecha: lote.fecha,
                        bandera: lote.bandera,
                        importeBruto: lote.importeBruto,
                        // Porcentaje PayWay (3 = 3%), NO el monto. El
                        // helper deriva COSTO_DE_SERVICIO del CSV
                        // como -(bruto × pct / 100), igual que la UI.
                        tasaPaywayPct: Number(lote.tasaPaywayPct) || 0,
                        impuestos: lote.impuestos,
                        costoPaywayPagoUnico: lote.costoPaywayPagoUnico,
                        comercio: { siteId: siteId ?? null },
                      },
                      movs.map((m) => ({
                        fecha: m.fecha,
                        montoOperacion: Number(m.montoOperacion) || 0,
                      })),
                    );
                    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                    const cantFilas = Math.max(1, movs.length);
                    toast.success(
                      `CSV de prueba generado: ${filename} (${cantFilas} fila${cantFilas === 1 ? "" : "s"})`,
                    );
                    if (aviso) toast.warning(aviso, { duration: 8000 });
                  }}
                  className="h-9 px-4 rounded-md text-sm font-semibold bg-card border text-foreground hover:bg-muted"
                  title="Genera un archivo de Payway coherente con este lote, para probar el flujo Programado → Pendiente sin esperar al archivo real"
                >
                  <FileUp size={14} className="inline mr-1.5" /> Descargar CSV de prueba
                </button>
                <button
                  onClick={() => onSubirCsv(lote)}
                  className="h-9 px-4 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90"
                >
                  <FileUp size={14} className="inline mr-1.5" /> Subir CSV
                </button>
              </>
            )}
          </div>
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

function ComercioDetalleModal({
  data,
  lotes,
  onClose,
}: {
  data: ResumenComercio;
  lotes: LoteAcreditacion[];
  onClose: () => void;
}) {
  const { data: adelantos, isLoading: adelantosLoading } = useQuery({
    queryKey: ["adelantos", data.comercioId],
    queryFn: () => listAdelantosByComercio(data.comercioId),
  });
  const lotesDelComercio = lotes.filter((l) => l.comercioId === data.comercioId);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div>
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <Store size={18} /> {data.comercio}
            </h3>
            <p className="text-sm font-mono text-muted-foreground">
              {data.legajo} · {data.cantidadLotes} lotes · {data.cantidadOps} ops
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Total pendiente de acreditar</div>
              <div className="font-mono font-semibold mt-1">{fmt(data.pendienteAcreditar)}</div>
              <div className="text-[11px] text-muted-foreground">
                Máximo adelantable{" "}
                {data.totalContracargo ? `— contracargo ${fmt(data.totalContracargo)} descontado` : ""}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Pendiente de impuestos</div>
              <div className="font-mono font-semibold mt-1">{fmt(data.pendienteImpuestos)}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Comisión total PayWay</div>
              <div className="font-mono font-semibold mt-1">{fmt(data.totalPayWay)}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Neto MoliPay</div>
              <div className="font-mono font-semibold mt-1 text-emerald-700">
                {fmt(data.totalMoliPay)}
              </div>
            </Card>
            {data.totalContracargo > 0 && (
              <Card className="p-3 border-red-200 bg-red-50">
                <div className="text-xs text-red-700">Contracargo retenido</div>
                <div className="font-mono font-semibold mt-1 text-red-600">
                  - {fmt(data.totalContracargo)}
                </div>
                <div className="text-[11px] text-red-600">Restado del total a acreditar</div>
              </Card>
            )}
            <Card className={`p-3 ${data.totalContracargo > 0 ? "" : "col-span-2"}`}>
              <div className="text-xs text-muted-foreground">Total a pagar al comercio</div>
              <div className="font-mono font-semibold mt-1 text-emerald-700">
                {fmt(data.totalFinal)}
              </div>
            </Card>
          </div>
          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Lotes por bandera de este comercio ({lotesDelComercio.length})
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-2 py-1.5">Lote</th>
                    <th className="px-2 py-1.5">Bandera</th>
                    <th className="px-2 py-1.5">Fecha</th>
                    <th className="px-2 py-1.5 text-right">Importe a acreditar</th>
                    <th className="px-2 py-1.5">Estado</th>
                    {lotesDelComercio.some((l) => (l.contracargoMonto ?? 0) > 0) && (
                      <th className="px-2 py-1.5 text-right">Contracargo</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {lotesDelComercio.map((l) => {
                    const contra = l.contracargoMonto ?? 0;
                    return (
                      <tr key={l.id} className="border-b last:border-0">
                        <td className="px-2 py-1.5 font-mono">{l.codigo}</td>
                        <td className="px-2 py-1.5">
                          <span className="inline-flex rounded-full border px-2 py-0.5 text-[11px] bg-muted/50">
                            {l.bandera}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 font-mono">
                          {parseDateLocal(l.fecha).toLocaleDateString("es-AR")}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">{fmt(l.importeNeto)}</td>
                        <td className="px-2 py-1.5">
                          <Badge tone={tone(l.estado)}>{l.estado}</Badge>
                        </td>
                        {lotesDelComercio.some((x) => (x.contracargoMonto ?? 0) > 0) && (
                          <td className="px-2 py-1.5 text-right font-mono text-red-600">
                            {contra ? `- ${fmt(contra)}` : "—"}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
              <Wallet size={12} /> Adelantos
            </h4>
            {adelantosLoading ? (
              <p className="text-sm text-muted-foreground">Cargando adelantos…</p>
            ) : !adelantos || adelantos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin solicitudes de adelanto para este comercio.
              </p>
            ) : (
              <div className="space-y-3">
                {adelantos.map((a) => (
                  <div key={a.id} className="rounded-lg border px-3 py-2 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Estado</span>
                      <Badge
                        tone={
                          a.estado === "Pendiente"
                            ? "warn"
                            : a.estado === "Aprobado" || a.estado === "Acreditado"
                              ? "success"
                              : a.estado === "Rechazado"
                                ? "danger"
                                : "neutral"
                        }
                      >
                        {a.estado}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Monto solicitado</span>
                      <span className="font-mono font-semibold">{fmt(a.montoSolicitado)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Plazo</span>
                      <span className="font-mono">
                        {a.plazoAdelantadoDias}d / {a.plazoOriginalDias}d ·{" "}
                        {a.tasaInteresPct != null ? `${a.tasaInteresPct}%` : "tasa pendiente"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Solicitado {new Date(a.fechaSolicitud).toLocaleDateString("es-AR")}
                      {a.fechaResolucion
                        ? ` · Resuelto ${new Date(a.fechaResolucion).toLocaleDateString("es-AR")}`
                        : ""}
                    </div>
                    {a.montoPorAcreditar != null && a.montoPorAcreditar > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Monto por acreditar</span>
                        <span className="font-mono font-semibold text-amber-700">
                          {fmt(a.montoPorAcreditar)}
                        </span>
                      </div>
                    )}
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
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<EstadoLote | "">("");
  const [banderaFilter, setBanderaFilter] = useState("");
  const [comercioFilter, setComercioFilter] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [tab, setTab] = useState<"lotes" | "resumen">("lotes");
  const [detail, setDetail] = useState<LoteAcreditacion | null>(null);
  const [comercioDetail, setComercioDetail] = useState<ResumenComercio | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string } | null>(null);
  const [contracargoModal, setContracargoModal] = useState<
    { lote: LoteAcreditacion; notas: string; contracargoMonto: string } | null
  >(null);
  // Cargar CSV: null = cerrado. Si trae `lote`, modo per-lote; si no, modo general.
  const [cargarCsv, setCargarCsv] = useState<{ lote: LoteAcreditacion | null } | null>(null);
  const [confirmarAcreditacion, setConfirmarAcreditacion] = useState<LoteAcreditacion | null>(null);
  const [exportando, setExportando] = useState(false);
  const { can } = useCan();
  const puedeGestionar = can("modificar", "comercios");

  const { rows: comerciosOptions } = useComercios({ page: 0, pageSize: 100 });

  // Banderas dinámicas desde el catálogo (no hardcodeadas). Si la
  // tabla no existe / falla, se cae al set de fallback que tenía la
  // pantalla vieja.
  const { data: banderasCatalogo } = useQuery({
    queryKey: ["banderas", "Activo"],
    queryFn: () => listBanderas("Activo"),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const opcionesBandera = (banderasCatalogo ?? []).map((b) => b.nombre);

  const filtros = {
    page,
    pageSize,
    search: search || undefined,
    estado: estadoFilter || undefined,
    bandera: banderaFilter || undefined,
    comercioId: comercioFilter || undefined,
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["lotes", filtros],
    queryFn: () => listLotes(filtros),
  });

  const lotes = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // KPIs. Se invalidan junto con ["lotes", ...] al hacer cualquier
  // mutación, así que las cards se refrescan solas.
  const resumenQuery = useQuery({
    queryKey: ["lotes-resumen", fechaDesde, fechaHasta],
    queryFn: () => resumenLotes({ fechaDesde: fechaDesde || undefined, fechaHasta: fechaHasta || undefined }),
  });
  const resumen = resumenQuery.data;

  // Resumen: agregación client-side sobre la página actual. Comentario
  // preservado: si se necesita global, cambiar a fetch separado.
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

  const onSubirCsv = (lote: LoteAcreditacion) => {
    if (!puedeGestionar) return;
    setDetail(null);
    setCargarCsv({ lote });
  };

  const handleCsvCargado = (r: { aplicados: number; sinMatch: number }) => {
    if (r.aplicados > 0) {
      toast.success(
        r.aplicados === 1
          ? `Lote pasado a Pendiente.${r.sinMatch > 0 ? ` ${r.sinMatch} renglón(es) sin match siguen en Programado.` : ""}`
          : `${r.aplicados} lotes pasados a Pendiente.${r.sinMatch > 0 ? ` ${r.sinMatch} renglón(es) sin match.` : ""}`,
      );
    } else {
      toast.warning("Ningún renglón del archivo matcheó contra lotes Programado.");
    }
    queryClient.invalidateQueries({ queryKey: ["lotes"] });
    queryClient.invalidateQueries({ queryKey: ["lotes-resumen"] });
    queryClient.invalidateQueries({ queryKey: ["lotes-detalle"] });
    setCargarCsv(null);
  };

  const handleAcreditado = () => {
    toast.success(`Lote ${confirmarAcreditacion?.codigo ?? ""} acreditado`);
    queryClient.invalidateQueries({ queryKey: ["lotes"] });
    queryClient.invalidateQueries({ queryKey: ["lotes-resumen"] });
    queryClient.invalidateQueries({ queryKey: ["lotes-detalle"] });
    setConfirmarAcreditacion(null);
  };

  const handleContracargo = async () => {
    if (!contracargoModal) return;
    const { lote, notas, contracargoMonto } = contracargoModal;
    const parsedContracargo =
      contracargoMonto.trim() === ""
        ? undefined
        : parseFloat(contracargoMonto.replace(",", ".")) || 0;
    try {
      await updateLote(lote.id, {
        estado: "Acreditado",
        contracargoMonto: parsedContracargo,
        notasResolucion: notas || null,
      });
      toast.success(`Lote ${lote.codigo} acreditado${notas ? ` — ${notas}` : ""}`);
      queryClient.invalidateQueries({ queryKey: ["lotes"] });
      queryClient.invalidateQueries({ queryKey: ["lotes-resumen"] });
      setContracargoModal(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const exportarCsv = async () => {
    if (exportando) return;
    setExportando(true);
    try {
      const rows = await exportLotesAcreditacion({
        search: search || undefined,
        estado: estadoFilter || undefined,
        bandera: banderaFilter || undefined,
        comercioId: comercioFilter || undefined,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
      });
      if (rows.length === 0) {
        toast.warning("No hay lotes para exportar con esos filtros.");
        return;
      }
      const HEADERS = [
        "Código",
        "Fecha estimada",
        "Fecha cobro real",
        "Comercio",
        "Legajo",
        "Bandera",
        "Cuotas",
        "Ops",
        "Importe bruto",
        "Descuentos",
        "Importe a acreditar",
        "Estado",
      ];
      const lines: string[] = [HEADERS.join(";")];
      for (const l of rows) {
        const cuotas = l.cuotas != null ? `${l.cuotas}c` : "1c";
        lines.push(
          [
            l.codigo,
            l.fecha,
            l.fechaCobroReal ?? "",
            l.comercio?.nombreComercio ?? l.comercio?.usuario ?? "",
            l.comercio?.legajo ?? l.comercioId,
            l.bandera,
            cuotas,
            l.cantidadOperaciones,
            l.importeBruto.toFixed(2).replace(".", ","),
            totalDescuentos(l).toFixed(2).replace(".", ","),
            l.importeNeto.toFixed(2).replace(".", ","),
            l.estado,
          ]
            .map((v) => {
              const s = String(v);
              return s.includes(";") || s.includes('"') || s.includes("\n")
                ? `"${s.replace(/"/g, '""')}"`
                : s;
            })
            .join(";"),
        );
      }
      // BOM para que Excel detecte el encoding y respete acentos.
      const csv = "\uFEFF" + lines.join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lotes_acreditacion_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`${rows.length} lotes exportados.`);
    } catch (e) {
      toast.error(`Error al exportar: ${(e as Error).message}`);
    } finally {
      setExportando(false);
    }
  };

  const getActions = (r: LoteAcreditacion): ActionItem[] => {
    const base: ActionItem[] = [
      { label: "Ver detalle", icon: Eye, onClick: () => setDetail(r) },
    ];
    if (r.estado === "Programado") {
      base.push({
        label: "Subir CSV",
        icon: FileUp,
        disabled: !puedeGestionar,
        onClick: () => onSubirCsv(r),
      });
    }
    if (r.estado === "Pendiente") {
      base.push({
        label: "Acreditar",
        icon: ArrowUpRight,
        disabled: !puedeGestionar,
        onClick: () => {
          if (!puedeGestionar) return;
          setDetail(null);
          setConfirmarAcreditacion(r);
        },
      });
    }
    if (r.estado === "Contracargo") {
      base.push({
        label: "Ver Disputa",
        icon: Gavel,
        disabled: !puedeGestionar,
        onClick: () =>
          setContracargoModal({ lote: r, notas: "", contracargoMonto: String(r.contracargoMonto ?? "") }),
      });
    }
    return base;
  };

  // Botón principal según estado. Aplica color distinto: emerald
  // para Acreditar (lote que ya tiene los números del CSV),
  // primario para Subir CSV, slate para Comprobante/Ver Disputa.
  const botonAccion = (r: LoteAcreditacion) => {
    if (!puedeGestionar) return null;
    if (r.estado === "Programado") {
      return (
        <button
          onClick={() => onSubirCsv(r)}
          className="h-8 px-3 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-1"
        >
          <FileUp size={13} /> Subir CSV
        </button>
      );
    }
    if (r.estado === "Pendiente") {
      return (
        <button
          onClick={() => setConfirmarAcreditacion(r)}
          className="h-8 px-3 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1"
        >
          <CheckCircle2 size={13} /> Acreditar
        </button>
      );
    }
    if (r.estado === "Acreditado") {
      return (
        <button
          onClick={() => setDetail(r)}
          className="h-8 px-3 rounded-md text-xs font-semibold bg-card border text-foreground hover:bg-muted inline-flex items-center gap-1"
        >
          <ReceiptIcon size={13} /> Comprobante
        </button>
      );
    }
    if (r.estado === "Contracargo") {
      return (
        <button
          onClick={() =>
            setContracargoModal({ lote: r, notas: "", contracargoMonto: String(r.contracargoMonto ?? "") })
          }
          className="h-8 px-3 rounded-md text-xs font-semibold bg-card border text-foreground hover:bg-muted inline-flex items-center gap-1"
        >
          <Gavel size={13} /> Ver Disputa
        </button>
      );
    }
    return null;
  };

  const columns: Column<LoteAcreditacion>[] = [
    {
      key: "fecha",
      label: "Fecha (est./real)",
      minWidth: 160,
      render: (r) => {
        // El lote Programado siempre muestra "est.": no tiene aún la
        // fecha real de cobro. A partir de Pendiente/Acreditado la
        // fecha real aparece si el CSV la aportó.
        const badge = r.fechaCobroReal
          ? { tone: "success" as const, txt: "real" }
          : { tone: "neutral" as const, txt: "est." };
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs tabular-nums">
              {parseDateLocal(r.fecha).toLocaleDateString("es-AR")}
            </span>
            <span className="flex items-center gap-1">
              <Badge tone={badge.tone}>{badge.txt}</Badge>
              {r.fechaCobroReal && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  cob. {fmtFechaCorta(r.fechaCobroReal)}
                </span>
              )}
            </span>
          </div>
        );
      },
    },
    {
      key: "codigo",
      label: "Lote",
      minWidth: 150,
      maxWidth: 260,
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-semibold">{r.codigo}</span>
        </div>
      ),
    },
    {
      key: "comercio",
      label: "Comercio / Legajo",
      minWidth: 200,
      maxWidth: 320,
      render: (r) => (
        <div>
          <div className="font-semibold text-sm truncate max-w-[180px]">
            {r.comercio?.nombreComercio ?? r.comercio?.usuario ?? "—"}
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            {r.comercio?.legajo ?? r.comercioId}
          </div>
        </div>
      ),
    },
    {
      key: "bandera",
      label: "Bandera",
      minWidth: 100,
      render: (r) => (
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-muted/50">
          {r.bandera}
        </span>
      ),
    },
    {
      key: "cantidadOperaciones",
      label: "Ops",
      minWidth: 70,
      render: (r) => (
        <span className="font-mono tabular-nums">
          {r.cantidadOperaciones}
          {r.cuotas && r.cuotas > 1 ? ` · ${r.cuotas}c` : ""}
        </span>
      ),
    },
    {
      key: "importeBruto",
      label: "Importe bruto",
      minWidth: 130,
      render: (r) => (
        <span
          className={`font-mono tabular-nums ${esLoteEstimado(r) ? "text-muted-foreground/60" : ""}`}
        >
          {fmt(r.importeBruto)}
          {esLoteEstimado(r) && (
            <span className="ml-1 text-[10px] text-muted-foreground/70">(Est.)</span>
          )}
        </span>
      ),
    },
    {
      key: "descuentos",
      label: "Descuentos",
      minWidth: 150,
      render: (r) => {
        // En Programado: la 0,45% está "Pendiente de cierre" — no
        // se descuenta todavía, así que la cifra va atenuada y con la
        // leyenda para que el operador no la confunda con un cargo firme.
        const estimado = esLoteEstimado(r);
        return (
          <span
            className={`font-mono tabular-nums ${
              estimado ? "text-muted-foreground/60" : "text-red-600"
            }`}
          >
            - {fmt(totalDescuentos(r))}
            {estimado && (
              <span className="ml-1 text-[10px] text-muted-foreground/70">
                (sin 0,45%)
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: "importeNeto",
      label: "Importe a acreditar",
      minWidth: 170,
      render: (r) => {
        const estimado = esLoteEstimado(r);
        // En Programado el importe a acreditar todavía es proyección:
        // incluye la comisión MoliPay/IVA estimada pero NO el 0,45%
        // de cierre (que se aplica al confirmar). Lo dejamos claro
        // con un badge (Est.) al lado.
        return (
          <span
            className={`font-mono tabular-nums font-semibold ${
              r.estado === "Contracargo"
                ? "text-red-600"
                : estimado
                  ? "text-muted-foreground/70"
                  : "text-emerald-700"
            }`}
          >
            {fmt(r.importeNeto)}
            {estimado && (
              <Badge tone="neutral" className="ml-1.5 align-middle">
                Est.
              </Badge>
            )}
          </span>
        );
      },
    },
    {
      key: "estado",
      label: "Estado",
      minWidth: 120,
      render: (r) => <Badge tone={tone(r.estado)}>{r.estado}</Badge>,
    },
  ];

  const resumenColumns: Column<ResumenComercio>[] = [
    {
      key: "comercio",
      label: "Comercio / Legajo",
      minWidth: 200,
      maxWidth: 320,
      render: (r) => (
        <div>
          <div className="font-semibold text-sm truncate max-w-[160px]">{r.comercio}</div>
          <div className="font-mono text-xs text-muted-foreground">{r.legajo}</div>
        </div>
      ),
    },
    {
      key: "pendienteAcreditar",
      label: "Pendiente de acreditar",
      minWidth: 150,
      render: (r) => <span className="font-mono text-xs font-semibold">{fmt(r.pendienteAcreditar)}</span>,
    },
    {
      key: "pendienteImpuestos",
      label: "Pendiente de impuestos",
      minWidth: 150,
      render: (r) => <span className="font-mono text-xs">{fmt(r.pendienteImpuestos)}</span>,
    },
    {
      key: "totalPayWay",
      label: "Comisión PayWay",
      minWidth: 140,
      render: (r) => <span className="font-mono text-xs">{fmt(r.totalPayWay)}</span>,
    },
    {
      key: "totalMoliPay",
      label: "Neto MoliPay",
      minWidth: 140,
      render: (r) => <span className="font-mono text-xs text-emerald-700">{fmt(r.totalMoliPay)}</span>,
    },
    {
      key: "totalFinal",
      label: "Total a pagar",
      minWidth: 140,
      render: (r) => <span className="font-mono font-semibold text-emerald-700">{fmt(r.totalFinal)}</span>,
    },
  ];

  const err = error instanceof DataAccessError ? error : null;

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Lotes de Acreditación"
        description="Corte diario generado por MoliPay por bandera: Programado → (Subir CSV) → Pendiente → (Acreditar) → Acreditado."
        action={
          <div className="flex flex-wrap gap-2">
            <BtnOutline onClick={exportarCsv} disabled={exportando}>
              {exportando ? (
                <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
              ) : (
                <Download size={14} />
              )}
              Descargar CSV
            </BtnOutline>
            {puedeGestionar && (
              <BtnPrimary
                onClick={() => setCargarCsv({ lote: null })}
                disabled={tab !== "lotes"}
                title={tab !== "lotes" ? "Cambiá a la pestaña Lotes por bandera" : undefined}
              >
                <Upload size={14} />
                Subir CSV de Payway
              </BtnPrimary>
            )}
          </div>
        }
      />

      {/* KPIs: 4 cards por estado. Mismas fechas que la grilla. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Programados</span>
            <Badge tone="neutral">est.</Badge>
          </div>
          <div className="font-mono text-xl font-semibold mt-1">{resumen?.programados.cantidad ?? 0}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
            {fmt(resumen?.programados.monto ?? 0)}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Pendientes</span>
            <Badge tone="warn">Pend.</Badge>
          </div>
          <div className="font-mono text-xl font-semibold mt-1 text-amber-700">
            {resumen?.pendientes.cantidad ?? 0}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
            {fmt(resumen?.pendientes.monto ?? 0)}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Acreditados (Mes)</span>
            <Badge tone="success">OK</Badge>
          </div>
          <div className="font-mono text-xl font-semibold mt-1 text-emerald-700">
            {resumen?.acreditados.cantidad ?? 0}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
            {fmt(resumen?.acreditados.monto ?? 0)}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Contracargo</span>
            <Badge tone="danger">Disc.</Badge>
          </div>
          <div className="font-mono text-xl font-semibold mt-1 text-red-600">
            {resumen?.contracargo.cantidad ?? 0}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
            {fmt(resumen?.contracargo.monto ?? 0)}
          </div>
        </Card>
      </div>

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <Label>Buscar</Label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Código, comercio, legajo o CUIT…"
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
          <div>
            <Label>Estado</Label>
            <select
              value={estadoFilter}
              onChange={(e) => {
                setEstadoFilter(e.target.value as EstadoLote | "");
                setPage(0);
              }}
              className="w-full sm:min-w-[130px] h-8 px-2 rounded-md border bg-background text-xs"
            >
              <option value="">Todos</option>
              <option value="Programado">Programado</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Acreditado">Acreditado</option>
              <option value="Contracargo">Contracargo</option>
            </select>
          </div>
          <div>
            <Label>Bandera</Label>
            <select
              value={banderaFilter}
              onChange={(e) => {
                setBanderaFilter(e.target.value);
                setPage(0);
              }}
              className="w-full sm:min-w-[130px] h-8 px-2 rounded-md border bg-background text-xs"
            >
              <option value="">Todas</option>
              {opcionesBandera.length > 0
                ? opcionesBandera.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))
                : // Fallback por si el catálogo no responde
                  ["Visa", "Mastercard", "Amex", "Cabal", "Diners"].map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
            </select>
          </div>
          <div>
            <Label>Comercio</Label>
            <select
              value={comercioFilter}
              onChange={(e) => {
                setComercioFilter(e.target.value);
                setPage(0);
              }}
              className="w-full sm:min-w-[180px] h-8 px-2 rounded-md border bg-background text-xs"
            >
              <option value="">Todos</option>
              {comerciosOptions.map((c: import("@/lib/api/types").Comercio) => (
                <option key={c.id} value={c.id}>
                  {c.nombreComercio ?? c.usuario} · {c.legajo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Desde</Label>
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                setFechaDesde(e.target.value);
                setPage(0);
              }}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label>Hasta</Label>
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                setFechaHasta(e.target.value);
                setPage(0);
              }}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </Card>

      <div className="flex gap-2 mb-4 border-b">
        <button
          onClick={() => setTab("lotes")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "lotes" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Lotes por bandera
        </button>
        <button
          onClick={() => setTab("resumen")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "resumen" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Resumen por comercio
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando lotes…
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
          <AlertTriangle size={28} />
          <p>{err?.message ?? "Error"}</p>
          <button onClick={() => refetch()} className="h-9 px-4 rounded-md bg-primary text-primary-foreground">
            Reintentar
          </button>
        </div>
      ) : lotes.length === 0 && tab === "lotes" ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          <Inbox size={28} />
          <p>No hay lotes que coincidan con los filtros.</p>
          {puedeGestionar && (
            <BtnPrimary onClick={() => setCargarCsv({ lote: null })}>
              <Upload size={14} />
              Subir CSV de Payway
            </BtnPrimary>
          )}
        </div>
      ) : tab === "lotes" ? (
        <>
          <DataTable
            columns={columns}
            data={lotes}
            keyExtractor={(r) => r.id}
            actions={(r) => (
              <div className="flex items-center gap-1.5">
                {botonAccion(r)}
                <ActionsDropdown actions={getActions(r)} />
              </div>
            )}
            hidePagination
            showGlobalFilter={false}
          />
          <Pagination
            page={page + 1}
            totalPages={totalPages}
            pageSize={pageSize}
            total={total}
            countLabel="lotes"
            pageSizes={PAGE_SIZES}
            disabled={isFetching}
            onPageChange={(p) => setPage(p - 1)}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(0);
            }}
          />
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-3">
            Total consolidado que corresponde pagar a cada comercio (suma de todos sus lotes
            por bandera). Pendiente de acreditar = máximo adelantable. Agregación client-side
            sobre la página actual; para total global sin paginación usar query separada.
          </p>
          <DataTable
            columns={resumenColumns}
            data={resumenData}
            keyExtractor={(r) => r.comercioId}
            actions={(r) => (
              <ActionsDropdown
                actions={[{ label: "Ver detalle", icon: Eye, onClick: () => setComercioDetail(r) }]}
              />
            )}
            hidePagination
            showGlobalFilter={false}
          />
        </>
      )}

      {detail && (
        <LoteDetalle lote={detail} onClose={() => setDetail(null)} onSubirCsv={onSubirCsv} />
      )}

      {cargarCsv && (
        <CargarCsvModal
          open={!!cargarCsv}
          lote={cargarCsv.lote}
          onClose={() => setCargarCsv(null)}
          onCargado={handleCsvCargado}
        />
      )}

      {confirmarAcreditacion && (
        <ConfirmarAcreditacionModal
          lote={confirmarAcreditacion}
          onClose={() => setConfirmarAcreditacion(null)}
          onAcreditado={handleAcreditado}
        />
      )}

      {comercioDetail && (
        <ComercioDetalleModal data={comercioDetail} lotes={lotes} onClose={() => setComercioDetail(null)} />
      )}

      {contracargoModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setContracargoModal(null)} />
          <div className="relative bg-card rounded-xl w-full max-w-md shadow-xl p-6 space-y-4">
            <h3 className="font-display font-semibold text-lg">
              Resolver contracargo — {contracargoModal.lote.codigo}
            </h3>
            <p className="text-sm text-muted-foreground">
              Lote {contracargoModal.lote.bandera} ·{" "}
              {contracargoModal.lote.comercio?.nombreComercio ??
                contracargoModal.lote.comercio?.usuario}{" "}
              · Contracargo actual {fmt(contracargoModal.lote.contracargoMonto)}.
            </p>
            <div>
              <Label>Contracargo monto (opcional, recalcula neto)</Label>
              <Input
                value={contracargoModal.contracargoMonto}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^[0-9]*[.,]?[0-9]*$/.test(v))
                    setContracargoModal({ ...contracargoModal, contracargoMonto: v });
                }}
                placeholder="0.00"
                className="font-mono"
                inputMode="decimal"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Neto recalculado:{" "}
                {(() => {
                  // Recalcular las tasas desde bruto × pct en vez de
                  // usar los valores de la DB (que están mal acumulados
                  // del job que arma los lotes). La DB queda como
                  // auditoría; la UI muestra siempre la fórmula
                  // correcta.
                  const tasas = tasasCalculadas(contracargoModal.lote);
                  return fmt(
                    contracargoModal.lote.importeBruto -
                      contracargoModal.lote.impuestos -
                      tasas.paywayMonto -
                      tasas.molipayMonto -
                      (parseFloat(contracargoModal.contracargoMonto.replace(",", ".") || "0") || 0) -
                      (contracargoModal.lote.comisionCierreLoteMonto ?? 0),
                  );
                })()}
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold">Notas</label>
              <textarea
                value={contracargoModal.notas}
                onChange={(e) => setContracargoModal({ ...contracargoModal, notas: e.target.value })}
                rows={3}
                placeholder="Motivo, ticket PayWay, notas internas..."
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setContracargoModal(null)}
                className="h-9 px-3 rounded-md border bg-card text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleContracargo()}
                className="h-9 px-4 rounded-md text-sm font-semibold bg-primary text-primary-foreground"
              >
                Acreditar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          open={!!confirm}
          onClose={() => setConfirm(null)}
          title={confirm.title}
          message={confirm.message}
          confirmLabel="Cerrar"
          variant="default"
          onConfirm={() => setConfirm(null)}
        />
      )}
    </PermissionGuard>
  );
}
