import { Percent,Receipt,Wallet } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { formatMoney } from "@/shared/lib/format";
import { fmtDateCorta,statusMostrado } from "@/features/payment-links/batches.rules";
import { userMessage } from "@/shared/lib/errors";
import { RowDescuento } from "./batches-parts";

import type { BatchDetailVm } from "./use-batch-detail";

const pctLabel = (v: number) => `${v.toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`;
const iibbPctLabel = (v: number) =>
  `${v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

export function BatchFinancialSection({
  fin,
  projectionQ,
  iibbMutation,
  dycMutation,
  iibbEditable,
  esInstallments,
  batch,
}: Pick<
  BatchDetailVm,
  | "fin"
  | "projectionQ"
  | "iibbMutation"
  | "dycMutation"
  | "iibbEditable"
  | "esInstallments"
  | "batch"
>) {
  const est = fin.estimado;
  const faded = est ? "text-muted-foreground/70" : "";
  const accredits = batch.fechaAcreditacion ?? batch.fecha;
  return (
    <Card className="p-4">
      <div className="mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Detalle financiero del lote — {batch.bandera} (Acredita: {fmtDateCorta(accredits)})
        </h4>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          Estado del lote:
          {est ? (
            <Badge tone="neutral">Proyectado / Estimado</Badge>
          ) : batch.estado === "Acreditado" ? (
            <Badge tone="success">Acreditado</Badge>
          ) : (
            <Badge tone="success">Confirmado Payway / Pendiente de acreditar</Badge>
          )}
        </div>
      </div>
      {est && projectionQ.isError && (
        <p className="mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">
          No se pudo calcular la proyección: {userMessage(projectionQ.error)}
        </p>
      )}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {est ? "Importe bruto acumulado (ventas)" : "Importe bruto total (suma Payway)"}
          </span>
          <span className={`font-mono font-semibold ${faded}`}>{formatMoney(fin.bruto)}</span>
        </div>
        <RowDescuento
          icon={<Percent size={12} />}
          label={
            est
              ? `Arancel / costo Payway estimado (${pctLabel(fin.arancelPct)})`
              : "Arancel / costo de servicio Payway real"
          }
          monto={fin.costoPayway}
          estimado={est}
        />
        <RowDescuento
          icon={<Receipt size={12} />}
          label={
            est
              ? `Impuestos / retenciones Payway estimado (${pctLabel(fin.impuestosPct)})`
              : "Impuestos / retenciones reales Payway"
          }
          monto={fin.impuestosPayway}
          estimado={est}
        />
        <div className="flex justify-between text-xs font-medium border-t pt-2">
          <span className="text-muted-foreground">
            {est ? "Subtotal neto estimado de Payway" : "Subtotal neto liquidado real Payway"}
          </span>
          <span className={`font-mono ${faded}`}>{formatMoney(fin.netoPayway)}</span>
        </div>
        <RowDescuento
          icon={<Percent size={12} />}
          label={`Tasa de servicio MoliPay (${pctLabel(fin.tasaPct)})`}
          monto={fin.tasa}
          estimado={est}
        />
        <RowDescuento
          icon={<Receipt size={12} />}
          label={`IVA sobre tasa MoliPay (${pctLabel(fin.ivaPct)} s/ ${formatMoney(fin.tasa)})`}
          monto={fin.iva}
          estimado={est}
        />
        <RowDescuento
          icon={<Percent size={12} />}
          label={`Comisión cierre de lote (${pctLabel(fin.cierrePct)})`}
          monto={fin.cierre}
          estimado={est}
        />
        {fin.iibb && (
          <>
            <RowDescuento
              icon={<Receipt size={12} />}
              label={`Retención IIBB / SIRCUPA oficial (Padrón ${iibbPctLabel(fin.iibb.alicuota)})`}
              monto={fin.iibb.monto}
              estimado={est}
            />
            {fin.iibb.monto === 0 && fin.iibb.nota && (
              <p className="text-[11px] text-muted-foreground">{fin.iibb.nota}</p>
            )}
          </>
        )}
        {fin.dyc && (
          <>
            <RowDescuento
              icon={<Receipt size={12} />}
              label={`Débitos y Créditos (${iibbPctLabel(fin.dyc.alicuota)})`}
              monto={fin.dyc.monto}
              estimado={est}
            />
            {fin.dyc.monto === 0 && fin.dyc.nota && (
              <p className="text-[11px] text-muted-foreground">{fin.dyc.nota}</p>
            )}
          </>
        )}
        {fin.asignados.map((x) => (
          <RowDescuento
            key={x.nombre}
            icon={<Receipt size={12} />}
            label={`${x.nombre} (cálculo anterior)`}
            monto={x.monto}
          />
        ))}
        <div className="flex justify-between text-xs font-semibold border-t pt-2">
          <span>{est ? "Total descuentos estimados" : "Total descuentos reales"}</span>
          <span className={`font-mono ${est ? faded : "text-red-600"}`}>
            - {formatMoney(fin.totalDescuentos)}
          </span>
        </div>
        {fin.compensacion > 0 && (
          <RowDescuento
            icon={<Wallet size={12} />}
            label="Compensación de adelanto"
            monto={fin.compensacion}
            estimado={est}
          />
        )}
        {fin.retencion > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Receipt size={12} /> Contracargo{" "}
              <Badge tone="danger" className="ml-1">
                retenido
              </Badge>
            </span>
            <span className="font-mono text-red-600">- {formatMoney(fin.retencion)}</span>
          </div>
        )}
        {fin.recuperacion > 0 && (
          <RowDescuento
            icon={<Receipt size={12} />}
            label="Recupero de deuda"
            monto={fin.recuperacion}
          />
        )}
        <div className="border-t-2 my-2" />
        <div className="flex justify-between text-base font-semibold">
          <span>
            {est
              ? "Estimado final a acreditar"
              : batch.estado === "Acreditado"
                ? "Importe acreditado"
                : "Importe final real a acreditar"}
          </span>
          <span
            className={`font-mono flex items-center gap-1.5 ${
              fin.neto < 0 || statusMostrado(batch) === "Contracargo"
                ? "text-red-600"
                : est
                  ? "text-muted-foreground/80"
                  : "text-emerald-700"
            }`}
          >
            {formatMoney(fin.neto)}
            {est && <Badge tone="neutral">Est.</Badge>}
          </span>
        </div>
        {esInstallments && (
          <p className="text-[11px] text-muted-foreground">
            Si el comprador paga en cuotas, PayWay acredita a MoliPay en un solo pago y cobra fee
            por esa liquidación.
          </p>
        )}
        {est && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
            Los importes son estimados y pueden variar al procesar la liquidación oficial de Payway.
          </p>
        )}
        {fin.archivo && batch.retencionContracargos === 0 && batch.retencionPendiente > 0 && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5 mt-2">
            Al acreditar se retienen {formatMoney(batch.retencionPendiente)} por contracargos de
            ventas incluidas en este lote.
          </p>
        )}
        {batch.esNegativo && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5 mt-2">
            Liquidación negativa (contracargo o devolución): al acreditar se debita del saldo del
            comercio; el faltante queda como deuda y se recupera de las próximas liquidaciones.
          </p>
        )}
        {batch.estado === "Pendiente" && batch.motivoNoElegible && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-2">
            {batch.motivoNoElegible}
          </p>
        )}
        {batch.notasResolucion && (
          <p className="text-xs text-muted-foreground border rounded px-2 py-1.5 mt-2 whitespace-pre-wrap">
            Notas: {batch.notasResolucion}
          </p>
        )}
        {batch.resueltoPor && (
          <p className="text-[11px] text-muted-foreground">
            Resuelto por {batch.resueltoPor}{" "}
            {batch.fechaResolucion
              ? `· ${new Date(batch.fechaResolucion).toLocaleString("es-AR")}`
              : ""}
          </p>
        )}
        {iibbEditable && projectionQ.data && (
          <div className="mt-2 space-y-1.5 border-t pt-2 text-xs text-muted-foreground">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={projectionQ.data.usaIibb}
                disabled={iibbMutation.isPending}
                onChange={(e) => iibbMutation.mutate(e.target.checked)}
              />
              Descontar retención IIBB del padrón en este lote
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={projectionQ.data.usaDyc}
                disabled={dycMutation.isPending}
                onChange={(e) => dycMutation.mutate(e.target.checked)}
              />
              Descontar Débitos y Créditos en este lote
            </label>
          </div>
        )}
      </div>
    </Card>
  );
}
