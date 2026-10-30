import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { z } from "zod";
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
  getLote,
  listLoteMovimientos,
  resumenLotes,
  exportLotesAcreditacion,
} from "@/lib/api/lotes";
import { establecimientoDeLote, guardarSeleccion, QK_ACRED, recalcularLote } from "@/lib/api/acreditaciones";
import { ExtractoLiquidacion, type DatosLiquidacion } from "@/components/acreditaciones/comunes";
import { SimularContracargosModal } from "@/components/acreditaciones/simular-contracargos-modal";
import { listBanderas } from "@/lib/api/banderas";
import { listAdelantosByComercio } from "@/lib/api/adelantos";
import type { EstadoLote, LoteAcreditacion, Movimiento } from "@/lib/api/types";
import { useComercios } from "@/hooks/useComercios";
import { generarCsvLiquidacionTestParaLote } from "@/lib/liquidaciones/parse";
import * as XLSX from "xlsx";

/**
 * Deep links desde las otras pantallas del modulo:
 *   ?lote=<uuid>         abre el detalle del lote
 *   ?importacion=<uuid>  (informativo) lotes de una importacion
 */
const searchSchema = z.object({
  lote: z.string().optional(),
  importacion: z.string().optional(),
});

export const Route = createFileRoute("/admin/comercios/link-pago/lotes")({
  validateSearch: searchSchema,
  component: Page,
  head: () => ({
    meta: [
      { title: "Lotes de Acreditación — Links de Pago — Admin — Moli" },
      { name: "description", content: "Lotes generados por MoliPay para acreditar pagos a comercios." },
    ],
  }),
});

const PAGE_SIZES = [10, 20, 50];

function tone(e: EstadoLote | EstadoMostrado): "success" | "warn" | "danger" | "neutral" {
  if (e === "Acreditado") return "success";
  if (e === "Contracargo") return "danger";
  if (e === "Pendiente") return "warn";
  if (e === "Adelantado") return "warn";
  if (e === "Cancelado") return "neutral";
  return "neutral"; // Programado
}

/** Estado que ve el operador: Pendiente, Acreditado, Adelantado o Contracargo (+ Programado). */
type EstadoMostrado = "Programado" | "Pendiente" | "Acreditado" | "Adelantado" | "Contracargo" | "Cancelado" | "Liquidado";

function estadoMostrado(l: LoteAcreditacion): EstadoMostrado {
  if (l.estado === "Contracargo" || l.esNegativo || l.contracargos > 0) return "Contracargo";
  if (l.estado === "Pendiente" && l.compensacionAdelantos > 0) return "Adelantado";
  return l.estado;
}

const SUBESTADO_TXT: Record<string, string> = {
  listo: "Listo para acreditar",
  negativo: "Negativo",
  no_conciliado: "No conciliado",
  sin_tasa: "Sin tasa configurada",
  sin_calcular: "Sin calcular",
  comercio_inactivo: "Comercio inactivo",
};

/** ¿El lote viene del archivo de Payway (liquidacion real) o es una proyeccion? */
function esDelArchivo(l: LoteAcreditacion) {
  return l.origen === "archivo";
}

/** Neto a acreditar: el calculado en la base para los lotes del archivo; la proyeccion en los Programado. */
function netoLote(l: LoteAcreditacion) {
  return esDelArchivo(l) ? Number(l.netoAcreditar ?? l.importeNeto) : l.importeNeto;
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
  // Lote del archivo: impuestos y tasa de Payway (CSV) + tasa MoliPay (+ IVA
  // si esta configurado) + cierre de lote (lo calcula la base). Las
  // compensaciones de adelantos y deudas se muestran aparte.
  if (esDelArchivo(l)) {
    // Siempre bruto - importe final: el detalle cierra aunque haya
    // retenciones, compensaciones o recuperos.
    return round2(Number(l.importeBruto ?? 0) - Number(netoLote(l)));
  }
  // Proyeccion del flujo nuevo: el neto estimado ya descuenta Payway, tasa,
  // IVA y cierre (trigger lote_proyeccion_neto), igual que el detalle.
  if (!l.legacy && l.estado === "Programado") {
    return round2(Number(l.importeBruto ?? 0) - Number(l.importeNeto ?? 0));
  }
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

/**
 * Liquidacion de un lote del archivo de Payway: la cadena de importes que
 * calculo la base (lote_calculo). No se recalcula nada en el navegador.
 */
/** Liquidacion del lote con el formato de extracto comun (components/acreditaciones). */
function DesgloseLote({ lote }: { lote: LoteAcreditacion }) {
  const archivo = esDelArchivo(lote);
  const bruto = Number(lote.importeBruto ?? 0);
  const costo = archivo ? Number(lote.costoServicioPayway ?? 0) : round2((bruto * Number(lote.tasaPaywayPct ?? 0)) / 100);
  const impuestos = archivo ? Number(lote.impuestosPayway ?? 0) : 0;
  const d: DatosLiquidacion = {
    estimado: !archivo,
    estado: lote.estado,
    fechaAcreditacion: lote.fechaAcreditacion,
    conciliado: archivo ? lote.conciliado : null,
    bruto,
    impuestosPayway: impuestos,
    costoPayway: costo,
    netoPayway: archivo ? Number(lote.netoPayway ?? bruto - impuestos - costo) : round2(bruto - costo),
    tasaPct: Number(lote.tasaMolipayPct ?? 0),
    tasa: Number(lote.tasaMolipayMonto ?? 0),
    iva: Number(lote.ivaTasaMonto ?? 0),
    cierrePct: Number(lote.comisionCierreLotePct ?? 0),
    cierre: Number(lote.comisionCierreLoteMonto ?? 0),
    asignados: archivo ? lote.impuestosDetalle.map((x) => ({ nombre: x.nombre, monto: Number(x.monto) })) : [],
    retencion: archivo ? lote.retencionContracargos : 0,
    compensacion: archivo ? lote.compensacionAdelantos : 0,
    recuperacion: archivo ? lote.recuperacionDeuda : 0,
    neto: Number(netoLote(lote)),
  };
  return (
    <div className="space-y-3">
      <ExtractoLiquidacion d={d} />
      {archivo && lote.retencionContracargos === 0 && lote.retencionPendiente > 0 && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          Al acreditar se retienen {fmt(lote.retencionPendiente)} por contracargos de ventas incluidas en este lote.
        </p>
      )}
      {lote.esNegativo && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          Liquidación negativa (contracargo o devolución): al acreditar se debita del saldo del comercio; el faltante queda como deuda y
          se recupera de las próximas liquidaciones.
        </p>
      )}
      {lote.estado === "Pendiente" && lote.motivoNoElegible && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">{lote.motivoNoElegible}</p>
      )}
    </div>
  );
}

/** Dato de la ficha del lote. */
function DatoFicha({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 bg-card px-4 py-2.5">
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm">{children}</dd>
    </div>
  );
}

function LoteDetalle({
  lote: loteInicial,
  onClose,
  onSubirCsv,
  onAcreditar,
}: {
  lote: LoteAcreditacion;
  onClose: () => void;
  onSubirCsv: (l: LoteAcreditacion) => void;
  onAcreditar?: (l: LoteAcreditacion) => void;
}) {
  const queryClient = useQueryClient();
  // Un lote Pendiente se recalcula al abrirlo con los parametros vigentes
  // (mismo calculo que la revision), asi el detalle muestra lo que se va a
  // acreditar. Los acreditados se muestran como quedaron.
  const fresco = useQuery({
    queryKey: ["lote-detalle-recalculado", loteInicial.id],
    queryFn: async () => {
      if (loteInicial.estado === "Pendiente" && esDelArchivo(loteInicial)) {
        try {
          await recalcularLote(loteInicial.id);
          void queryClient.invalidateQueries({ queryKey: ["lotes"] });
        } catch {
          // Sin la migracion 20261031120000 se muestra lo guardado.
        }
      }
      return getLote(loteInicial.id);
    },
  });
  const lote = fresco.data ?? loteInicial;
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
      { Campo: "Neto Payway", Valor: lote.netoPayway ?? "" },
      { Campo: "Costo servicio Payway", Valor: lote.costoServicioPayway ?? "" },
      { Campo: "Impuestos Payway", Valor: lote.impuestosPayway ?? "" },
      { Campo: "IVA sobre la tasa", Valor: lote.ivaTasaMonto ?? 0 },
      { Campo: "Impuestos asignados", Valor: esDelArchivo(lote) ? lote.impuestos : 0 },
      { Campo: "Retención contracargos", Valor: lote.retencionContracargos },
      { Campo: "Compensación adelantos", Valor: lote.compensacionAdelantos },
      { Campo: "Recuperación deuda", Valor: lote.recuperacionDeuda },
      { Campo: "Descuentos e impuestos", Valor: totalDescuentos(lote) },
      { Campo: "Neto a acreditar", Valor: netoLote(lote) },
      { Campo: "Fecha de acreditación", Valor: lote.fechaAcreditacion ?? "" },
      { Campo: "Estado", Valor: estadoMostrado(lote) },
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
              Liquidación de lote
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
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
            <DatoFicha label="Comercio">
              <span className="font-medium">{lote.comercio?.nombreComercio ?? lote.comercio?.usuario ?? "—"}</span>
            </DatoFicha>
            <DatoFicha label="Legajo">
              <span className="font-mono">{lote.comercio?.legajo ?? lote.comercioId}</span>
            </DatoFicha>
            <DatoFicha label="Medio de pago">
              {lote.bandera} · {esCuotas ? `${lote.cuotas} cuotas` : "Pago único"}
            </DatoFicha>
            <DatoFicha label="Estado">
              <Badge tone={tone(estadoMostrado(lote))}>{estadoMostrado(lote)}</Badge>
              {lote.estado === "Pendiente" && lote.subestado && (
                <span className="ml-1.5 text-xs text-muted-foreground">{SUBESTADO_TXT[lote.subestado] ?? lote.subestado}</span>
              )}
            </DatoFicha>
            <DatoFicha label={esDelArchivo(lote) ? "Fecha de pago Payway" : "Fecha estimada de pago"}>
              <span className="font-mono">{parseDateLocal(lote.fecha).toLocaleDateString("es-AR")}</span>
            </DatoFicha>
            <DatoFicha label="Fecha de acreditación">
              <span className="font-mono">{lote.fechaAcreditacion ? fmtFechaCorta(lote.fechaAcreditacion) : "—"}</span>
            </DatoFicha>
            <DatoFicha label="Operaciones">
              <span className="font-mono">{lote.cantidadOperaciones}</span>
            </DatoFicha>
            <DatoFicha label="Establecimiento">
              <span className="font-mono">{(lote as { establecimiento?: string | null }).establecimiento ?? "—"}</span>
            </DatoFicha>
          </dl>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Liquidación</h4>
            <DesgloseLote lote={lote} />
          </section>

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
                    // La importacion identifica al comercio por el numero de
                    // establecimiento de Payway: el de la tabla de
                    // establecimientos para la marca del lote o, si no hay,
                    // el site_id de la ficha del comercio.
                    let siteId: string | undefined;
                    try {
                      const est = await establecimientoDeLote(lote.id);
                      siteId = est.establecimiento?.trim() || undefined;
                    } catch (e) {
                      toast.error(`No se pudo leer el establecimiento: ${(e as Error).message}`);
                    }
                    let aviso: string | null = null;
                    if (!siteId) {
                      aviso = `El comercio no tiene establecimiento de Payway para ${lote.bandera}. El archivo se generó con un placeholder (00000000): al importarlo va a quedar en Excepciones y desde ahí lo podés asignar.`;
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
            {lote.estado === "Pendiente" && onAcreditar && (
              <button
                onClick={() => onAcreditar(lote)}
                disabled={!lote.elegible}
                title={lote.elegible ? undefined : (lote.motivoNoElegible ?? "No se puede acreditar todavía")}
                className="h-9 px-4 rounded-md text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 size={14} className="inline mr-1.5" /> Acreditar
              </button>
            )}
            {lote.contracargos > 0 && (
              <Link
                to="/admin/comercios/link-pago/contracargos"
                className="h-9 px-4 rounded-md text-sm font-semibold bg-card border text-foreground hover:bg-muted inline-flex items-center"
              >
                <Gavel size={14} className="inline mr-1.5" /> Ver contracargo
              </Link>
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
                        <td className="px-2 py-1.5 text-right font-mono">{fmt(netoLote(l))}</td>
                        <td className="px-2 py-1.5">
                          <Badge tone={tone(estadoMostrado(l))}>{estadoMostrado(l)}</Badge>
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
  const navigate = useNavigate();
  const search_ = Route.useSearch();
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
  // Cargar CSV: null = cerrado. Si trae `lote`, modo per-lote; si no, modo general.
  const [cargarCsv, setCargarCsv] = useState<{ lote: LoteAcreditacion | null } | null>(null);
  const [simularCc, setSimularCc] = useState(false);
  const [confirmarAcreditacion, setConfirmarAcreditacion] = useState<LoteAcreditacion | null>(null);
  const [exportando, setExportando] = useState(false);
  const { can } = useCan();
  const puedeGestionar = can("modificar", "comercios");

  const { rows: comerciosOptions } = useComercios({ page: 0, pageSize: 100 });

  // ?lote=<uuid>: abre el detalle (lo usan Ejecucion masiva, Contracargos y Lotes de venta).
  useEffect(() => {
    if (!search_.lote) return;
    let vivo = true;
    getLote(search_.lote)
      .then((l) => vivo && l && setDetail(l))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [search_.lote]);

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
      // Lote del archivo: costo Payway real y descuentos MoliPay calculados
      // en la base. Proyeccion: estimado desde las ventas.
      const archivo = esDelArchivo(l);
      const pay = archivo
        ? Number(l.costoServicioPayway ?? 0) + Number(l.impuestosPayway ?? 0)
        : l.tasaPaywayMonto + (l.costoPaywayPagoUnico ?? 0);
      const moli = archivo
        ? Number(l.tasaMolipayMonto ?? 0) + Number(l.ivaTasaMonto ?? 0) + Number(l.comisionCierreLoteMonto ?? 0)
        : l.tasaMolipayMonto;
      const contra = archivo ? (l.esNegativo ? -Number(l.netoPayway ?? 0) : 0) + l.recuperacionDeuda : (l.contracargoMonto ?? 0);
      const neto = netoLote(l);
      const pendiente = l.estado === "Acreditado" ? 0 : neto;
      const imp = archivo ? Number(l.impuestos ?? 0) : l.impuestos;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, {
          comercio: nombre,
          legajo,
          comercioId: l.comercioId,
          cantidadLotes: 1,
          cantidadOps: l.cantidadOperaciones,
          totalBruto: l.importeBruto,
          totalImpuestos: imp,
          totalPayWay: pay,
          totalMoliPay: moli,
          totalContracargo: contra,
          totalFinal: neto,
          pendienteAcreditar: pendiente,
          pendienteImpuestos: l.estado === "Acreditado" ? 0 : imp,
        });
      } else {
        prev.cantidadLotes += 1;
        prev.cantidadOps += l.cantidadOperaciones;
        prev.totalBruto += l.importeBruto;
        prev.totalImpuestos += imp;
        prev.totalPayWay += pay;
        prev.totalMoliPay += moli;
        prev.totalContracargo += contra;
        prev.totalFinal += neto;
        prev.pendienteAcreditar += pendiente;
        prev.pendienteImpuestos += l.estado === "Acreditado" ? 0 : imp;
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
        `${r.aplicados} lote(s) del archivo quedaron Pendiente.${r.sinMatch > 0 ? ` ${r.sinMatch} renglón(es) fueron a Excepciones.` : ""} Falta conciliar con la recaudadora para poder acreditar.`,
      );
    } else {
      toast.warning(`Ningún renglón se pudo asignar a un comercio.${r.sinMatch > 0 ? ` ${r.sinMatch} quedaron en Excepciones.` : ""}`);
    }
    queryClient.invalidateQueries({ queryKey: QK_ACRED });
    queryClient.invalidateQueries({ queryKey: ["lotes"] });
    queryClient.invalidateQueries({ queryKey: ["lotes-resumen"] });
    queryClient.invalidateQueries({ queryKey: ["lotes-detalle"] });
    setCargarCsv(null);
  };

  const handleAcreditado = () => {
    toast.success(`Lote ${confirmarAcreditacion?.codigo ?? ""} acreditado`);
    queryClient.invalidateQueries({ queryKey: QK_ACRED });
    queryClient.invalidateQueries({ queryKey: ["lotes"] });
    queryClient.invalidateQueries({ queryKey: ["lotes-resumen"] });
    queryClient.invalidateQueries({ queryKey: ["lotes-detalle"] });
    setConfirmarAcreditacion(null);
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
        "Fecha de liquidación",
        "Comercio",
        "Legajo",
        "Bandera",
        "Ops",
        "Monto bruto liquidado",
        "Descuentos e impuestos",
        "Neto a acreditar",
        "Fecha de acreditación",
        "Estado",
      ];
      const lines: string[] = [HEADERS.join(";")];
      for (const l of rows) {
        lines.push(
          [
            l.codigo,
            esDelArchivo(l) ? l.fecha : `${l.fecha} (estimada)`,
            l.comercio?.nombreComercio ?? l.comercio?.usuario ?? "",
            l.comercio?.legajo ?? l.comercioId,
            l.bandera,
            l.cantidadOperaciones,
            l.importeBruto.toFixed(2).replace(".", ","),
            totalDescuentos(l).toFixed(2).replace(".", ","),
            netoLote(l).toFixed(2).replace(".", ","),
            l.fechaAcreditacion ?? "",
            estadoMostrado(l),
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
      { label: r.estado === "Acreditado" ? "Ver liquidación" : "Ver detalle", icon: Eye, onClick: () => setDetail(r) },
    ];
    if (r.estado === "Programado") {
      base.push({
        label: "Subir CSV",
        icon: FileUp,
        disabled: !puedeGestionar,
        onClick: () => onSubirCsv(r),
      });
    }
    if (r.estado === "Pendiente" && !r.legacy) {
      base.push({
        label: "Acreditar",
        icon: ArrowUpRight,
        disabled: !puedeGestionar || !r.elegible,
        onClick: () => {
          if (!puedeGestionar || !r.elegible) return;
          setDetail(null);
          setConfirmarAcreditacion(r);
        },
      });
      if (r.subestado === "no_conciliado") {
        base.push({
          label: "Conciliar con la recaudadora",
          icon: CheckCircle2,
          disabled: !puedeGestionar,
          onClick: () => void navigate({ to: "/admin/comercios/link-pago/acreditaciones", search: { fecha: r.fecha } }),
        });
      }
    }
    if (estadoMostrado(r) === "Contracargo") {
      base.push({
        label: "Ver contracargo",
        icon: Gavel,
        onClick: () => void navigate({ to: "/admin/comercios/link-pago/contracargos" }),
      });
    }
    return base;
  };

  // Boton principal segun estado: Subir CSV (Programado), Acreditar
  // (Pendiente listo), Conciliar (Pendiente sin conciliar), Ver
  // liquidacion (Acreditado).
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
    if (r.estado === "Pendiente" && !r.legacy) {
      if (r.subestado === "no_conciliado") {
        return (
          <button
            onClick={() => void navigate({ to: "/admin/comercios/link-pago/acreditaciones", search: { fecha: r.fecha } })}
            className="h-8 px-3 rounded-md text-xs font-semibold bg-card border text-foreground hover:bg-muted inline-flex items-center gap-1"
            title="Falta verificar que el neto entró a la recaudadora"
          >
            <CheckCircle2 size={13} /> Conciliar
          </button>
        );
      }
      return (
        <button
          onClick={() => setConfirmarAcreditacion(r)}
          disabled={!r.elegible}
          title={r.elegible ? undefined : (r.motivoNoElegible ?? undefined)}
          className="h-8 px-3 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1 disabled:opacity-50"
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
          <ReceiptIcon size={13} /> Ver liquidación
        </button>
      );
    }
    return null;
  };

  const columns: Column<LoteAcreditacion>[] = [
    {
      key: "fecha",
      label: "Fecha de liquidación",
      hint: "Día en que Payway procesó la planilla de pago (FECHA del archivo). En los lotes Programado es la fecha estimada.",
      minWidth: 150,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs tabular-nums">{parseDateLocal(r.fecha).toLocaleDateString("es-AR")}</span>
          <span className="flex items-center gap-1">
            {esDelArchivo(r) ? <Badge tone="success">liquidado</Badge> : <Badge tone="neutral">est.</Badge>}
          </span>
        </div>
      ),
    },
    {
      key: "comercio",
      label: "Comercio",
      minWidth: 200,
      maxWidth: 320,
      render: (r) => (
        <div>
          <div className="font-semibold text-sm truncate max-w-[180px]">
            {r.comercio?.nombreComercio ?? r.comercio?.usuario ?? "—"}
          </div>
          <div className="font-mono text-xs text-muted-foreground">{r.comercio?.legajo ?? r.comercioId}</div>
        </div>
      ),
    },
    {
      key: "bandera",
      label: "Bandera",
      minWidth: 120,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-muted/50">{r.bandera}</span>
          <span className="font-mono text-[10px] text-muted-foreground">{r.codigo}</span>
        </div>
      ),
    },
    {
      key: "importeBruto",
      label: "Monto bruto liquidado",
      hint: "Base bruta de ventas del lote.",
      minWidth: 150,
      render: (r) => (
        <span className={`font-mono tabular-nums ${esLoteEstimado(r) ? "text-muted-foreground/60" : ""}`}>
          {fmt(r.importeBruto)}
          {esLoteEstimado(r) && <span className="ml-1 text-[10px] text-muted-foreground/70">(Est.)</span>}
        </span>
      ),
    },
    {
      key: "descuentos",
      label: "Descuentos e impuestos",
      hint: "Aranceles e impuestos de Payway + tasa MoliPay con IVA + cierre de lote 0,45% + impuestos asignados al comercio (Ingresos Brutos, Ley de Cheques, etc.).",
      minWidth: 160,
      render: (r) => {
        const estimado = esLoteEstimado(r);
        return (
          <span className={`font-mono tabular-nums ${estimado ? "text-muted-foreground/60" : "text-red-600"}`}>
            - {fmt(totalDescuentos(r))}
            {estimado && <span className="ml-1 text-[10px] text-muted-foreground/70">(sin 0,45%)</span>}
          </span>
        );
      },
    },
    {
      key: "importeNeto",
      label: "Neto a acreditar",
      hint: "Importe neto real que ingresa al saldo del comercio (ya descontados adelantos y deudas, si los hay).",
      minWidth: 160,
      render: (r) => {
        const estimado = esLoteEstimado(r);
        const neto = netoLote(r);
        return (
          <span
            className={`font-mono tabular-nums font-semibold ${
              neto < 0 ? "text-red-600" : estimado ? "text-muted-foreground/70" : "text-emerald-700"
            }`}
          >
            {fmt(neto)}
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
      key: "fechaAcreditacion",
      label: "Fecha de acreditación",
      hint: "Fecha efectiva de liberación del dinero al comercio.",
      minWidth: 130,
      render: (r) => <span className="font-mono text-xs tabular-nums">{r.fechaAcreditacion ? fmtFechaCorta(r.fechaAcreditacion) : "—"}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      hint: "Programado: Payway todavía no pagó. Pendiente: llegó en el archivo y falta acreditar. Adelantado: el comercio ya cobró parte por un adelanto. Acreditado: es saldo del comercio. Contracargo: liquidación negativa o con contracargo.",
      minWidth: 140,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <Badge tone={tone(estadoMostrado(r))}>{estadoMostrado(r)}</Badge>
          {r.estado === "Pendiente" && r.subestado && r.subestado !== "listo" && (
            <span className="text-[10px] text-muted-foreground" title={r.motivoNoElegible ?? undefined}>
              {SUBESTADO_TXT[r.subestado] ?? r.subestado}
            </span>
          )}
          {r.legacy && <span className="text-[10px] text-muted-foreground">histórico</span>}
        </div>
      ),
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
        description="Lo que Payway liquidó a cada comercio por bandera: Programado → (Subir CSV) → Pendiente → (Conciliar) → (Acreditar) → Acreditado."
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
              <BtnOutline onClick={() => setSimularCc(true)} title="CSV de prueba de contracargos con ventas reales de lotes Programados o Pendientes">
                <Download size={14} /> Simular contracargos
              </BtnOutline>
            )}
            <Link to="/admin/comercios/link-pago/excepciones" className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-accent">
              <AlertTriangle size={14} /> Excepciones
            </Link>
            <Link to="/admin/comercios/link-pago/acreditaciones" className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-accent">
              <Calendar size={14} /> Conciliar por día
            </Link>
            {puedeGestionar && (
              <BtnOutline
                onClick={() => {
                  guardarSeleccion(lotes.filter((l) => l.elegible).map((l) => l.id));
                  void navigate({ to: "/admin/comercios/link-pago/ejecucion" });
                }}
              >
                <Wallet size={14} /> Ejecución masiva
              </BtnOutline>
            )}
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
        <LoteDetalle
          lote={detail}
          onClose={() => {
            setDetail(null);
            if (search_.lote) void navigate({ to: "/admin/comercios/link-pago/lotes", search: {} });
          }}
          onSubirCsv={onSubirCsv}
          onAcreditar={(l) => {
            setDetail(null);
            setConfirmarAcreditacion(l);
          }}
        />
      )}

      {simularCc && <SimularContracargosModal onClose={() => setSimularCc(false)} />}
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
