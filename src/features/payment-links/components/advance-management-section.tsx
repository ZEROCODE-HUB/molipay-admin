import { formatMoney } from "@/shared/lib/format";
import { Banknote, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Input, Label } from "@/shared/ui/form-controls";
import { BtnOutline, BtnPrimary } from "@/shared/ui/button";

import type { DetailVm } from "./use-advance-detail";

export function AdvanceManagementSection({
  readOnly,
  a,
  amountOferta,
  setAmountOferta,
  rateInteres,
  setRateInteres,
  ratePctNum,
  interesEstimated,
  netEstimated,
  notes,
  setNotes,
  busy,
  handleAprobar,
  poolInsuficiente,
  handleCredit,
  handleRechazar,
  onClose,
}: Pick<
  DetailVm,
  | "readOnly"
  | "a"
  | "amountOferta"
  | "setAmountOferta"
  | "rateInteres"
  | "setRateInteres"
  | "ratePctNum"
  | "interesEstimated"
  | "netEstimated"
  | "notes"
  | "setNotes"
  | "busy"
  | "handleAprobar"
  | "poolInsuficiente"
  | "handleCredit"
  | "handleRechazar"
  | "onClose"
>) {
  return (
    <>
      {!readOnly && (
        <Card className="p-4 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Gestión (Admin)
          </h4>

          {a.estado === "Aprobado" && (
            <p className="text-sm text-muted-foreground">
              Oferta enviada. Esperando que la empresa la acepte o la cancele desde su portal.
            </p>
          )}

          {a.estado === "Pendiente" && (
            <div>
              <Label htmlFor="monto-oferta">Monto aprobado (no puede superar el tope)</Label>
              <Input
                id="monto-oferta"
                value={amountOferta}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v !== "" && !/^[0-9]*[.,]?[0-9]*$/.test(v)) return;
                  setAmountOferta(v);
                }}
                className="h-9"
                inputMode="decimal"
              />
            </div>
          )}

          {a.estado === "Pendiente" && (
            <div>
              <Label htmlFor="tasa-interes">Tasa (%) — descuento único sobre el monto</Label>
              <Input
                id="tasa-interes"
                value={rateInteres}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v !== "" && !/^[0-9]*[.,]?[0-9]*$/.test(v)) return;
                  setRateInteres(v);
                }}
                placeholder="Ej: 4.5"
                className="h-9"
                inputMode="decimal"
              />
              {ratePctNum != null && (
                <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-3">
                  <span>
                    Descuento:{" "}
                    <span className="font-mono font-semibold text-red-600">
                      - {formatMoney(interesEstimated)}
                    </span>
                  </span>
                  <span>
                    Neto que recibe el comercio:{" "}
                    <span className="font-mono font-semibold text-emerald-700">
                      {formatMoney(netEstimated)}
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Notas: se concatenan al motivo del adelanto */}
          <div>
            <Label htmlFor="notas">Notas / motivo</Label>
            <textarea
              id="notas"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ej. tasa preferencial por volumen, rechazo por tope agotado, etc."
              className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {/* Aprobar (sólo Pendiente) */}
            {a.estado === "Pendiente" && (
              <BtnPrimary disabled={busy} onClick={handleAprobar}>
                <CheckCircle2 size={14} className="mr-1" /> Enviar oferta
              </BtnPrimary>
            )}

            {/* Acreditar (sólo Aceptado por la empresa) — mueve plata */}
            {a.estado === "Aceptado" && (
              <BtnPrimary
                disabled={busy || poolInsuficiente}
                onClick={handleCredit}
                className={
                  poolInsuficiente
                    ? "bg-red-300 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }
                title={
                  poolInsuficiente
                    ? "La recaudadora de Payway no alcanza para este adelanto. La RPC rechazará la operación."
                    : "Sale de la recaudadora de Payway y acredita el neto en la Operativa del comercio"
                }
              >
                <Banknote size={14} className="mr-1" />
                {poolInsuficiente ? "Recaudadora insuficiente" : "Acreditar y mover saldo"}
              </BtnPrimary>
            )}

            {/* Rechazar (solo Solicitado) */}
            {a.estado === "Pendiente" && (
              <BtnOutline
                disabled={busy}
                onClick={handleRechazar}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <XCircle size={14} className="mr-1" /> Rechazar
              </BtnOutline>
            )}

            <BtnOutline disabled={busy} onClick={onClose}>
              Cerrar
            </BtnOutline>
          </div>
        </Card>
      )}
    </>
  );
}
