import { formatMoney } from "@/shared/lib/format";
import { getBatch, getBatchProjection } from "@/features/payment-links/batches.supabase";
import {
  type CalculoBatch,
  conciliar,
  confirmSettlement,
  establishmentDeBatch,
  huellaFile,
  previsualizarSettlement,
  rangeDelHeader,
  recalcularBatch,
  reconciliationDelDay,
  revisarCredit,
  runCredit,
} from "@/features/payment-links/credits.supabase";
import {
  generateCsvSettlementTestForBatch,
  parseFileSettlement,
} from "@/features/payment-links/settlements-parse";
import {
  type CalcMismatch,
  round2,
  verifyProjection,
  verifySettlement,
} from "@/features/payment-links/batch-test.rules";
import {
  createTestLink,
  createTestProduct,
  listLotsOfPayment,
  simulateTestPayment,
  type TestBrand,
  type TestLink,
  type TestLot,
  type TestMerchant,
  type TestPayment,
  type TestProduct,
} from "@/features/payment-links/batch-test.supabase";

export type TestRow = { label: string; value: string };
export type TestConfig = { merchant: TestMerchant; brand: TestBrand; monto: number };

type Ctx = TestConfig & {
  runId: string;
  products: TestProduct[];
  link?: TestLink;
  payment?: TestPayment;
  programmed?: TestLot;
  csv?: { filename: string; contenido: string };
  settled?: TestLot;
  calc?: CalculoBatch;
};

export type TestStep = { id: string; title: string; run: (ctx: Ctx) => Promise<TestRow[]> };

const money = (v: number | null | undefined) => formatMoney(Number(v ?? 0));
const pct = (v: number) => `${v.toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`;

const todayAr = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(
    new Date(),
  );

function failOnMismatch(mismatches: CalcMismatch[]) {
  if (mismatches.length === 0) return;
  throw new Error(
    mismatches
      .map((m) => `${m.concepto}: esperado ${money(m.esperado)}, obtenido ${money(m.obtenido)}`)
      .join(" · "),
  );
}

async function lotOfOrigin(ctx: Ctx, origen: string): Promise<TestLot | undefined> {
  const lots = await listLotsOfPayment(ctx.payment!.pagoId);
  return lots.find((l) => l.origen === origen);
}

export const TEST_STEPS: TestStep[] = [
  {
    id: "start",
    title: "Iniciando pruebas",
    run: async (ctx) => [
      { label: "Comercio", value: `${ctx.merchant.nombre} (${ctx.merchant.legajo})` },
      { label: "Bandera", value: ctx.brand.bandera },
      { label: "Importe bruto", value: money(ctx.monto) },
      { label: "Identificador de la prueba", value: ctx.runId },
    ],
  },
  {
    id: "products",
    title: "Creando productos de prueba",
    run: async (ctx) => {
      const first = round2(ctx.monto * 0.6);
      ctx.products = [
        await createTestProduct(ctx.merchant.legajo, `Producto A ${ctx.runId}`, first),
        await createTestProduct(
          ctx.merchant.legajo,
          `Producto B ${ctx.runId}`,
          round2(ctx.monto - first),
        ),
      ];
      return ctx.products.map((p) => ({ label: p.nombre, value: money(p.precio) }));
    },
  },
  {
    id: "link",
    title: "Creando link de pago de prueba",
    run: async (ctx) => {
      ctx.link = await createTestLink({
        merchant: ctx.merchant,
        brand: ctx.brand,
        products: ctx.products,
        monto: ctx.monto,
        reference: ctx.runId,
      });
      return [
        { label: "Link", value: ctx.link.url },
        { label: "Código", value: ctx.link.code },
        { label: "Referencia", value: ctx.runId },
        { label: "Total", value: money(ctx.link.monto) },
      ];
    },
  },
  {
    id: "payment",
    title: "Haciendo el pago del link",
    run: async (ctx) => {
      ctx.payment = await simulateTestPayment({
        code: ctx.link!.code,
        brandId: ctx.brand.id,
        monto: ctx.monto,
        siteTransactionId: ctx.runId,
      });
      return [
        { label: "Estado", value: "Aprobado (simulado, sin pasar por Payway)" },
        { label: "Pago", value: ctx.payment.pagoId },
        { label: "Referencia de pago", value: ctx.payment.paywayPaymentId },
        { label: "Importe", value: money(ctx.payment.amount) },
      ];
    },
  },
  {
    id: "estimate",
    title: "Mostrando el detalle financiero estimado en admin",
    run: async (ctx) => {
      ctx.programmed = await lotOfOrigin(ctx, "venta");
      if (!ctx.programmed) throw new Error("El pago no generó un lote Programado");
      if (ctx.programmed.estado !== "Programado") {
        throw new Error(`El lote quedó en estado ${ctx.programmed.estado}, se esperaba Programado`);
      }
      const p = await getBatchProjection(ctx.programmed.id);
      failOnMismatch(verifyProjection(p));
      return [
        { label: "Lote", value: ctx.programmed.codigo },
        { label: "Estado", value: ctx.programmed.estado },
        { label: "Acredita", value: ctx.programmed.fecha },
        { label: "Importe bruto del lote", value: money(p.bruto) },
        { label: `Arancel Payway (${pct(p.paywayPct)})`, value: `- ${money(p.paywayMonto)}` },
        {
          label: `Impuestos Payway (${pct(p.impuestosPct)})`,
          value: `- ${money(p.impuestosMonto)}`,
        },
        { label: "Subtotal neto estimado", value: money(p.netoPayway) },
        { label: `Tasa MoliPay (${pct(p.tasaPct)})`, value: `- ${money(p.tasaMonto)}` },
        { label: `IVA sobre tasa (${pct(p.ivaPct)})`, value: `- ${money(p.ivaMonto)}` },
        { label: `Cierre de lote (${pct(p.cierrePct)})`, value: `- ${money(p.cierreMonto)}` },
        ...(p.iibb
          ? [
              {
                label: `Retención IIBB (${pct(p.iibb.alicuota)})`,
                value: `- ${money(p.iibb.monto)}`,
              },
            ]
          : []),
        ...(p.dyc
          ? [
              {
                label: `Débitos y Créditos (${pct(p.dyc.alicuota)})`,
                value: `- ${money(p.dyc.monto)}`,
              },
            ]
          : []),
        { label: "Compensación de adelanto", value: `- ${money(p.compensacionAdelantos)}` },
        { label: "Estimado final a acreditar", value: money(p.netoFinal) },
      ];
    },
  },
  {
    id: "csv",
    title: "Obteniendo el CSV de Payway de ese lote",
    run: async (ctx) => {
      const batch = await getBatch(ctx.programmed!.id);
      if (!batch) throw new Error("No se pudo leer el lote");
      const est = await establishmentDeBatch(batch.id);
      const siteId = est.establecimiento?.trim();
      if (!siteId) {
        throw new Error(`El comercio no tiene establecimiento de Payway para ${batch.bandera}`);
      }
      ctx.csv = generateCsvSettlementTestForBatch(
        {
          codigo: batch.codigo,
          fecha: batch.fecha,
          bandera: batch.bandera,
          importeBruto: batch.importeBruto,
          tasaPaywayPct: Number(batch.tasaPaywayPct) || 0,
          impuestos: batch.impuestos,
          costoPaywayPagoUnico: batch.costoPaywayPagoUnico,
          comercio: { siteId },
        },
        [],
      );
      return [
        { label: "Archivo", value: `${ctx.csv.filename} (no se descarga)` },
        { label: "Establecimiento", value: siteId },
        { label: "Fecha de pago", value: batch.fecha },
      ];
    },
  },
  {
    id: "upload",
    title: "Subiendo el CSV y actualizando el detalle financiero",
    run: async (ctx) => {
      const file = new File([ctx.csv!.contenido], ctx.csv!.filename, { type: "text/csv" });
      const parsed = await parseFileSettlement(file);
      // Cada corrida es un archivo distinto aunque repita fecha e importes.
      const hash = await huellaFile(new File([ctx.csv!.contenido, ctx.runId], ctx.csv!.filename));
      await previsualizarSettlement(parsed.renglones, hash);
      const range = rangeDelHeader(parsed.encabezadoLineas);
      const imported = await confirmSettlement({
        renglones: parsed.renglones,
        archivoNombre: `${ctx.runId}-${ctx.csv!.filename}`,
        hash,
        desde: range.desde,
        hasta: range.hasta,
      });
      ctx.settled = await lotOfOrigin(ctx, "archivo");
      if (!ctx.settled) {
        throw new Error(
          `La venta no quedó en un lote del archivo (excepciones: ${imported.excepciones})`,
        );
      }
      if (ctx.settled.estado !== "Pendiente") {
        throw new Error(`El lote quedó en estado ${ctx.settled.estado}, se esperaba Pendiente`);
      }
      await recalcularBatch(ctx.settled.id);
      const batch = await getBatch(ctx.settled.id);
      if (!batch) throw new Error("No se pudo leer el lote del archivo");
      return [
        { label: "Resultado", value: "Subido correctamente" },
        { label: "Lote", value: batch.codigo },
        { label: "Estado", value: batch.estado },
        { label: "Importe bruto real", value: money(batch.importeBruto) },
        { label: "Costo de servicio Payway", value: `- ${money(batch.costoServicioPayway)}` },
        { label: "Impuestos Payway", value: `- ${money(batch.impuestosPayway)}` },
        { label: "Neto liquidado Payway", value: money(batch.netoPayway) },
        {
          label: `Tasa MoliPay (${pct(Number(batch.tasaMolipayPct))})`,
          value: `- ${money(batch.tasaMolipayMonto)}`,
        },
        { label: "IVA sobre tasa", value: `- ${money(batch.ivaTasaMonto)}` },
        { label: "Cierre de lote", value: `- ${money(batch.comisionCierreLoteMonto)}` },
        { label: "Importe final a acreditar", value: money(batch.importeNeto) },
      ];
    },
  },
  {
    id: "reconcile",
    title: "Haciendo la conciliación",
    run: async (ctx) => {
      const lot = ctx.settled!;
      if (lot.conciliado) {
        return [{ label: "Resultado", value: "Conciliado automáticamente al importar" }];
      }
      const brands = await reconciliationDelDay(lot.fecha);
      const row = brands.find((b) => b.marca === lot.marca_norm);
      if (!row) throw new Error(`No hay datos de conciliación para ${lot.marca_norm}`);
      // Conciliar afecta a todos los lotes de la fecha y la marca.
      if (row.sin_conciliar > 1) {
        throw new Error(
          `Hay ${row.sin_conciliar - 1} lote(s) más sin conciliar en ${lot.fecha} para ${row.marca}: se detiene para no asentarlos`,
        );
      }
      const res = await conciliar(lot.fecha, row.marca, round2(row.neto_archivo), ctx.runId);
      if (res.estado !== "conciliado") {
        throw new Error(`Quedó con diferencia de ${money(res.diferencia)}`);
      }
      return [
        { label: "Resultado", value: "Conciliado" },
        { label: "Neto del archivo", value: money(res.neto_archivo) },
        { label: "Ingresado", value: money(res.ingresado) },
        { label: "Diferencia", value: money(res.diferencia) },
        { label: "Lotes conciliados", value: String(res.lotes_conciliados) },
      ];
    },
  },
  {
    id: "verify",
    title: "Verificando los cálculos antes de acreditar",
    run: async (ctx) => {
      const review = await revisarCredit([ctx.settled!.id]);
      const skipped = review.omitidos[0];
      if (skipped) throw new Error(skipped.motivo);
      const calc = review.lotes[0];
      if (!calc) throw new Error("La revisión no devolvió el lote");
      failOnMismatch(verifySettlement(calc));
      ctx.calc = calc;
      return [
        { label: "Bruto", value: money(calc.bruto) },
        { label: "Neto Payway", value: money(calc.neto_payway) },
        {
          label: `Tasa MoliPay (${pct(calc.tasa_pct)} s/ bruto)`,
          value: `- ${money(calc.tasa_monto)}`,
        },
        { label: `IVA (${pct(calc.iva_pct)} s/ tasa)`, value: `- ${money(calc.iva_tasa_monto)}` },
        {
          label: `Cierre (${pct(calc.cierre_pct)} s/ bruto)`,
          value: `- ${money(calc.cierre_monto)}`,
        },
        { label: "Impuestos asignados e IIBB", value: `- ${money(calc.impuestos_monto)}` },
        { label: "Contracargos retenidos", value: `- ${money(calc.retencion_contracargos)}` },
        { label: "Compensación de adelantos", value: `- ${money(calc.compensacion_adelantos)}` },
        { label: "Recupero de deuda", value: `- ${money(calc.recuperacion_deuda)}` },
        { label: "Importe final a acreditar", value: money(calc.neto_a_acreditar) },
      ];
    },
  },
  {
    id: "credit",
    title: "Acreditando el lote",
    run: async (ctx) => {
      const lot = ctx.settled!;
      const res = await runCredit({
        ids: [lot.id],
        fecha: todayAr(),
        confirmaciones: { totales: true, compensaciones: true, irreversible: true },
        texto: "ACREDITAR",
        hashes: { [lot.id]: ctx.calc!.hash },
      });
      const item = res.items[0];
      if (item?.resultado !== "acreditado") {
        throw new Error(item?.motivo ?? "El lote no se acreditó");
      }
      const final = await getBatch(lot.id);
      if (final?.estado !== "Acreditado") {
        throw new Error(`El lote quedó en estado ${final?.estado ?? "desconocido"}`);
      }
      return [
        { label: "Estado", value: final.estado },
        { label: "Fecha de acreditación", value: final.fechaAcreditacion ?? "—" },
        { label: "Importe acreditado", value: money(item.neto_a_acreditar) },
        { label: "Operación contable", value: item.transaction_id ?? "—" },
      ];
    },
  },
];

export function newTestContext(config: TestConfig): Ctx {
  const stamp = Date.now().toString(36).toUpperCase();
  return { ...config, runId: `TEST-LOTE-${stamp}`, products: [] };
}
