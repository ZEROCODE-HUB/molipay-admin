import { type BatchCredit } from "@/infrastructure/supabase/legacy/types";
import { useMutation,useQuery,useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { recalcularBatch } from "@/features/payment-links/credits.supabase";
import {
getBatch,
getBatchProjection,
listBatchMovements,
setBatchUsaDyc,
setBatchUsaIibb,
} from "@/features/payment-links/batches.supabase";
import { downloadXlsx } from "@/shared/lib/download";
import {
esBatchEstimated,
esDelFile,
fmtDateCorta,
netBatch,
parseDateLocal,
ratesCalculadas,
statusMostrado,
totalDescuentos,
esDyc,
} from "@/features/payment-links/batches.rules";
import { round2 } from "@/shared/lib/money-round";

/** Estado y acciones de BatchDetail: el componente solo dibuja. */
export function useBatchDetail({
  lote: batchInitial,
  onClose,
  onSubirCsv,
  onAcreditar: onCredit,
}: {
  lote: BatchCredit;
  onClose: () => void;
  onSubirCsv: (l: BatchCredit) => void;
  onAcreditar?: (l: BatchCredit) => void;
}) {
  const queryClient = useQueryClient();
  // Un lote Pendiente se recalcula al abrirlo con los parametros vigentes
  // (mismo calculo que la revision), asi el detalle muestra lo que se va a
  // acreditar. Los acreditados se muestran como quedaron.
  const fresco = useQuery({
    queryKey: ["lote-detalle-recalculado", batchInitial.id],
    queryFn: async () => {
      if (batchInitial.estado === "Pendiente" && esDelFile(batchInitial)) {
        try {
          await recalcularBatch(batchInitial.id);
          void queryClient.invalidateQueries({ queryKey: ["lotes"] });
        } catch {
          // Sin la migracion 20261031120000 se muestra lo guardado.
        }
      }
      return getBatch(batchInitial.id);
    },
  });
  const batch = fresco.data ?? batchInitial;
  const { data: movements } = useQuery({
    queryKey: ["lote-movimientos", batch.id],
    queryFn: () => listBatchMovements(batch.id),
  });
  const projectionQ = useQuery({
    queryKey: ["lote-proyeccion", batch.id, batch.importeBruto],
    queryFn: () => getBatchProjection(batch.id),
    enabled: batch.estado !== "Acreditado",
  });
  const iibbMutation = useMutation({
    mutationFn: (usa: boolean) => setBatchUsaIibb(batch.id, usa),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lotes"] });
      void queryClient.invalidateQueries({ queryKey: ["lote-detalle-recalculado", batch.id] });
      void queryClient.invalidateQueries({ queryKey: ["lote-proyeccion", batch.id] });
    },
    onError: (e) => toast.error(userMessage(e)),
  });
  const dycMutation = useMutation({
    mutationFn: (usa: boolean) => setBatchUsaDyc(batch.id, usa),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lotes"] });
      void queryClient.invalidateQueries({ queryKey: ["lote-detalle-recalculado", batch.id] });
      void queryClient.invalidateQueries({ queryKey: ["lote-proyeccion", batch.id] });
    },
    onError: (e) => toast.error(userMessage(e)),
  });
  // El checkbox solo aplica a lotes todavia sin acreditar.
  const iibbEditable = esDelFile(batch) ? batch.estado === "Pendiente" : batch.estado === "Programado";
  const chargeback = batch.contracargoMonto ?? 0;
  const feeClosing = batch.comisionCierreLoteMonto ?? 0;
  // Los lotes Programado guardan comisionCierreLotePct=0 porque el
  // 0,45% no se debita hasta confirmar la liquidación. Para no
  // mostrar "0%" en el desglose del detalle (que confunde al
  // operador), caemos al default 0,45 cuando el valor es 0 o null.
  // El monto en $ sigue siendo 0 en Programado (no se debitó todavía).
  const feeClosingPct =
    (batch.comisionCierreLotePct ?? 0) > 0 ? (batch.comisionCierreLotePct as number) : 0.45;
  const batchEstimated = esBatchEstimated(batch);
  // Tasas (en pesos) recalculadas desde el bruto × porcentaje. Los
  // campos de la DB están mal acumulados; usar el cálculo en pantalla
  // para que el desglose siempre cuadre con la regla de negocio.
  const { paywayMonto: ratePaywayShow, molipayMonto: rateMolipayShow } = ratesCalculadas(batch);
  const totalDesc = totalDescuentos(batch);
  const esInstallments = (batch.cuotas ?? 1) > 1;
  const movs = movements ?? [];
  // Importes de la liquidacion: los calcula la base en los dos casos.
  const fin = (() => {
    const file = esDelFile(batch);
    if (!file) {
      const p = projectionQ.data;
      const gross = p?.bruto ?? Number(batch.importeBruto ?? 0);
      const costPayway = p?.paywayMonto ?? 0;
      const rate = p?.tasaMonto ?? 0;
      const iva = p?.ivaMonto ?? 0;
      const closing = p?.cierreMonto ?? 0;
      const taxes = p?.impuestosMonto ?? 0;
      const iibb = p?.usaIibb ? p.iibb : null;
      const dyc = p?.usaDyc ? p.dyc : null;
      return {
        archivo: false,
        estimado: true,
        bruto: gross,
        costoPayway: costPayway,
        arancelPct: p?.paywayPct ?? 0,
        impuestosPayway: taxes,
        impuestosPct: p?.impuestosPct ?? 0,
        netoPayway: p?.netoPayway ?? gross,
        tasaPct: p?.tasaPct ?? 0,
        tasa: rate,
        ivaPct: p?.ivaPct ?? 0,
        iva,
        cierrePct: p?.cierrePct ?? 0,
        cierre: closing,
        iibb,
        dyc,
        asignados: [] as { nombre: string; monto: number }[],
        totalDescuentos: round2(
          costPayway + taxes + rate + iva + closing + (iibb?.monto ?? 0) + (dyc?.monto ?? 0),
        ),
        retencion: 0,
        compensacion: p?.compensacionAdelantos ?? 0,
        recuperacion: 0,
        neto: p?.netoFinal ?? Number(netBatch(batch)),
      };
    }
    const costPayway = Number(batch.costoServicioPayway ?? 0);
    const taxesPayway = Number(batch.impuestosPayway ?? 0);
    const gross = Number(batch.importeBruto ?? 0);
    const iibbItem = batch.impuestosDetalle.find((x) => x.fuente === "taxpayer_registry");
    const iibb = iibbItem
      ? {
          alicuota: Number(iibbItem.alicuota ?? 0),
          monto: Number(iibbItem.monto),
          nota: iibbItem.nota ?? null,
        }
      : null;
    const dycItem = batch.impuestosDetalle.find(esDyc);
    const dyc = dycItem
      ? {
          alicuota: Number(dycItem.alicuota ?? 0),
          monto: Number(dycItem.monto),
          nota: dycItem.nota ?? null,
        }
      : null;
    const asignados = batch.impuestosDetalle
      .filter((x) => x !== iibbItem && x !== dycItem)
      .map((x) => ({ nombre: x.nombre, monto: Number(x.monto) }))
      .filter((x) => x.monto > 0);
    const rate = Number(batch.tasaMolipayMonto ?? 0);
    const iva = Number(batch.ivaTasaMonto ?? 0);
    const closing = Number(batch.comisionCierreLoteMonto ?? 0);
    return {
      archivo: true,
      estimado: false,
      bruto: gross,
      costoPayway: costPayway,
      arancelPct: 0,
      impuestosPayway: taxesPayway,
      impuestosPct: 0,
      netoPayway: Number(batch.netoPayway ?? gross - taxesPayway - costPayway),
      tasaPct: Number(batch.tasaMolipayPct ?? 0),
      tasa: rate,
      ivaPct: rate > 0 ? round2((iva / rate) * 100) : 0,
      iva,
      cierrePct: Number(batch.comisionCierreLotePct ?? 0),
      cierre: closing,
      iibb,
      dyc,
      asignados,
      totalDescuentos: round2(
        costPayway +
          taxesPayway +
          rate +
          iva +
          closing +
          (iibb?.monto ?? 0) +
          (dyc?.monto ?? 0) +
          asignados.reduce((t, x) => t + x.monto, 0),
      ),
      retencion: Number(batch.retencionContracargos ?? 0),
      compensacion: Number(batch.compensacionAdelantos ?? 0),
      recuperacion: Number(batch.recuperacionDeuda ?? 0),
      neto: Number(netBatch(batch)),
    };
  })();

  const exportBatch = () => {
    const data = [
      { Campo: "Código", Valor: batch.codigo },
      { Campo: "Fecha estimada", Valor: parseDateLocal(batch.fecha).toLocaleDateString("es-AR") },
      {
        Campo: "Fecha cobro real",
        Valor: batch.fechaCobroReal ? fmtDateCorta(batch.fechaCobroReal) : "—",
      },
      {
        Campo: "Comercio",
        Valor: batch.comercio?.nombreComercio ?? batch.comercio?.usuario ?? "—",
      },
      { Campo: "Legajo", Valor: batch.comercio?.legajo ?? batch.comercioId },
      { Campo: "Bandera", Valor: batch.bandera },
      { Campo: "Cuotas", Valor: esInstallments ? `${batch.cuotas}` : "Pago único" },
      { Campo: "Cantidad operaciones", Valor: batch.cantidadOperaciones },
      { Campo: "Importe bruto", Valor: batch.importeBruto },
      { Campo: "IVA", Valor: batch.ivaMonto ?? 0 },
      { Campo: "Ingresos Brutos (IIBB)", Valor: batch.iibbMonto ?? 0 },
      { Campo: "Impuesto Débito/Crédito", Valor: batch.debitoCreditoMonto ?? 0 },
      { Campo: "Total Impuestos (legacy)", Valor: batch.impuestos },
      { Campo: "Tasa PayWay (%)", Valor: batch.tasaPaywayPct },
      { Campo: "Tasa PayWay ($) [DB]", Valor: batch.tasaPaywayMonto },
      { Campo: "Tasa PayWay ($) [recalculada]", Valor: ratePaywayShow },
      { Campo: "Tasa MoliPay (%)", Valor: batch.tasaMolipayPct },
      { Campo: "Tasa MoliPay ($) [DB]", Valor: batch.tasaMolipayMonto },
      { Campo: "Tasa MoliPay ($) [recalculada]", Valor: rateMolipayShow },
      { Campo: "Comisión cierre lote (%)", Valor: feeClosingPct },
      { Campo: "Comisión cierre lote ($)", Valor: feeClosing },
      { Campo: "Contracargo", Valor: chargeback },
      { Campo: "Neto Payway", Valor: batch.netoPayway ?? "" },
      { Campo: "Costo servicio Payway", Valor: batch.costoServicioPayway ?? "" },
      { Campo: "Impuestos Payway", Valor: batch.impuestosPayway ?? "" },
      { Campo: "IVA sobre la tasa", Valor: batch.ivaTasaMonto ?? 0 },
      { Campo: "Impuestos asignados", Valor: esDelFile(batch) ? batch.impuestos : 0 },
      { Campo: "Retención contracargos", Valor: batch.retencionContracargos },
      { Campo: "Compensación adelantos", Valor: batch.compensacionAdelantos },
      { Campo: "Recuperación deuda", Valor: batch.recuperacionDeuda },
      { Campo: "Descuentos e impuestos", Valor: totalDescuentos(batch) },
      { Campo: "Neto a acreditar", Valor: netBatch(batch) },
      { Campo: "Fecha de acreditación", Valor: batch.fechaAcreditacion ?? "" },
      { Campo: "Estado", Valor: statusMostrado(batch) },
    ];

    downloadXlsx(`lote_${batch.codigo}_${new Date().toISOString().slice(0, 10)}.xlsx`, data, {
      sheetName: "Detalle Lote",
    });
  };
  return {
    onClose,
    onSubirCsv,
    onCredit,
    batch,
    movements,
    esInstallments,
    movs,
    fin,
    projectionQ,
    iibbMutation,
    dycMutation,
    iibbEditable,
    exportBatch,
  };
}

export type BatchDetailVm = ReturnType<typeof useBatchDetail>;
