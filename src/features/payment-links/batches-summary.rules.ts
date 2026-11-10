import { type BatchCredit } from "@/infrastructure/supabase/legacy/types";
import { esDelFile, netBatch } from "@/features/payment-links/batches.rules";
import { type SummaryMerchant } from "@/features/payment-links/batches.types";

/** Agrega por comercio los lotes recibidos (hoy, los de la pagina actual). */
export function summarizeBatchesByMerchant(batches: BatchCredit[]): SummaryMerchant[] {
  const map = new Map<string, SummaryMerchant>();
  for (const l of batches) {
    const name = l.comercio?.nombreComercio ?? l.comercio?.usuario ?? "—";
    const legajo = l.comercio?.legajo ?? l.comercioId;
    const key = l.comercioId;
    // Lote del archivo: costo Payway real y descuentos MoliPay calculados
    // en la base. Proyeccion: estimado desde las ventas.
    const file = esDelFile(l);
    const pay = file
      ? Number(l.costoServicioPayway ?? 0) + Number(l.impuestosPayway ?? 0)
      : l.tasaPaywayMonto + (l.costoPaywayPagoUnico ?? 0);
    const moli = file
      ? Number(l.tasaMolipayMonto ?? 0) +
        Number(l.ivaTasaMonto ?? 0) +
        Number(l.comisionCierreLoteMonto ?? 0)
      : l.tasaMolipayMonto;
    const contra = file
      ? (l.esNegativo ? -Number(l.netoPayway ?? 0) : 0) +
        Number(l.retencionContracargos ?? 0) +
        l.recuperacionDeuda
      : (l.contracargoMonto ?? 0);
    const advances = file ? Number(l.compensacionAdelantos ?? 0) : 0;
    const net = netBatch(l);
    const pending = l.estado === "Acreditado" ? 0 : net;
    const imp = file ? Number(l.impuestos ?? 0) : l.impuestos;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, {
        comercio: name,
        legajo,
        comercioId: l.comercioId,
        cantidadLotes: 1,
        cantidadOps: l.cantidadOperaciones,
        totalBruto: l.importeBruto,
        totalImpuestos: imp,
        totalPayWay: pay,
        totalMoliPay: moli,
        totalContracargo: contra,
        totalAdelantos: advances,
        totalFinal: net,
        pendienteAcreditar: pending,
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
      prev.totalAdelantos += advances;
      prev.totalFinal += net;
      prev.pendienteAcreditar += pending;
      prev.pendienteImpuestos += l.estado === "Acreditado" ? 0 : imp;
    }
  }
  return Array.from(map.values());
}
