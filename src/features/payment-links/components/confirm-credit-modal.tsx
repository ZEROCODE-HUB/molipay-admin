import { ErrorNotice } from "@/shared/ui/error-notice";
import { userMessage } from "@/shared/lib/errors";
import { useEffect, useState } from "react";
import { AlertTriangle, Info, Wallet } from "lucide-react";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Badge } from "@/shared/ui/badge";
import { Label } from "@/shared/ui/form-controls";
import {
  ConfirmacionesCredit,
  confirmacionesCompletas,
  type Confirmaciones,
} from "@/features/payment-links/components/batch-breakdown";
import type { BatchCredit } from "@/infrastructure/supabase/legacy/types";
import { runCredit, revisarCredit, type Revision } from "@/features/payment-links/credits.supabase";
import { formatMoney, formatIsoDate } from "@/shared/lib/format";

// Confirmacion de la acreditacion de un lote Pendiente.
//
// El desglose lo calcula la base (acreditacion_revisar): neto de Payway,
// tasa MoliPay, IVA de la tasa, cierre de lote, impuestos asignados al
// comercio y compensacion de adelantos / deudas. Al confirmar se llama a
// acreditacion_ejecutar con el hash de la revision: si algo cambio en el
// medio (un parametro, un adelanto), el lote se omite y hay que revisar.

type Props = {
  lote: BatchCredit | null;
  onClose: () => void;
  onAcreditado: () => void;
};

function today() {
  const d = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function CalcRow({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "subtract" | "total" | "final";
  hint?: string;
}) {
  const color =
    tone === "final"
      ? "font-semibold text-emerald-700"
      : tone === "total"
        ? "font-semibold text-foreground"
        : tone === "subtract"
          ? "text-red-600"
          : "";
  return (
    <div className="flex items-start justify-between gap-3 text-sm py-1">
      <span className="text-muted-foreground">
        {label}
        {hint && <span className="block text-[11px] opacity-80">{hint}</span>}
      </span>
      <span className={`font-mono tabular-nums whitespace-nowrap ${color}`}>{value}</span>
    </div>
  );
}

export function ConfirmCreditModal({ lote: batch, onClose, onAcreditado: onCredited }: Props) {
  const [rev, setRev] = useState<Revision | null>(null);
  const [loading, setLoading] = useState(false);
  const [conf, setConf] = useState<Confirmaciones>({
    totales: false,
    compensaciones: false,
    irreversible: false,
  });
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  useEffect(() => {
    setRev(null);
    setErrorGuardado(null);
    setConf({ totales: false, compensaciones: false, irreversible: false });
    setText("");
    if (!batch) return;
    setLoading(true);
    revisarCredit([batch.id])
      .then(setRev)
      .catch((e) => setErrorGuardado(userMessage(e)))
      .finally(() => setLoading(false));
  }, [batch]);

  const calc = rev?.lotes[0] ?? null;
  const com = rev?.comercios[0] ?? null;
  const omitido = rev?.omitidos[0] ?? null;

  const confirm = async () => {
    if (!batch || !calc) return;
    if (!confirmacionesCompletas(conf, text)) {
      setErrorGuardado("Completá las tres confirmaciones y escribí ACREDITAR.");
      return;
    }
    setSaving(true);
    setErrorGuardado(null);
    try {
      const r = await runCredit({
        ids: [batch.id],
        fecha: today(),
        confirmaciones: conf,
        texto: text,
        hashes: { [batch.id]: calc.hash },
      });
      const it = r.items[0];
      if (it?.resultado === "acreditado") {
        onCredited();
      } else {
        setErrorGuardado(
          `${it?.resultado === "omitido" ? "Omitido" : "Error"}: ${it?.motivo ?? "sin detalle"}`,
        );
      }
    } catch (e) {
      setErrorGuardado(userMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const submitLabel = saving
    ? "Acreditando…"
    : calc
      ? `Acreditar ${formatMoney(calc.neto_a_acreditar)}`
      : "Acreditar";

  return (
    <FormDialog
      open={!!batch}
      onClose={onClose}
      title={batch ? `Confirmar acreditación — ${batch.codigo}` : "Confirmar acreditación"}
      description="El lote está Pendiente con los importes reales del archivo de Payway y conciliado con la recaudadora. Confirmá para acreditar el neto a la subcuenta Operativa del comercio."
      onSubmit={() => void confirm()}
      submitLabel={submitLabel}
      size="lg"
      isSubmitting={saving}
      cancelLabel="Cancelar"
    >
      {batch && (
        <div className="space-y-5">
          {/* Contexto del lote */}
          <div className="rounded-lg border bg-muted/30 p-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="min-w-0">
                <div className="text-muted-foreground">Comercio</div>
                <div className="font-semibold truncate">
                  {batch.comercio?.nombreComercio ?? batch.comercio?.usuario ?? batch.comercioId}
                </div>
                <div className="font-mono text-[11px] text-muted-foreground truncate">
                  {batch.comercio?.legajo ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Bandera</div>
                <div className="font-semibold">{batch.bandera}</div>
                <div className="text-[11px] text-muted-foreground">
                  {batch.cantidadOperaciones} ops
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Fecha de liquidación</div>
                <div className="font-mono font-semibold">{formatIsoDate(batch.fecha)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Recaudadora</div>
                <div className="font-semibold flex items-center gap-1.5">
                  {batch.conciliado ? (
                    <Badge tone="success">conciliado</Badge>
                  ) : (
                    <Badge tone="warn">sin conciliar</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {loading && <p className="text-sm text-muted-foreground">Calculando…</p>}

          {omitido && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{omitido.motivo}</span>
            </div>
          )}

          {calc && (
            <>
              {/* Desglose calculado en la base */}
              <div className="rounded-lg border p-3">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Desglose de la liquidación
                </h4>
                <CalcRow label="Importe bruto" value={formatMoney(calc.bruto)} />
                <CalcRow
                  label="Impuestos y tasa de interés PayWay (CSV)"
                  value={`- ${formatMoney(calc.bruto - calc.neto_payway)}`}
                  tone="subtract"
                  hint="Referencia: los descontó Payway antes de depositar"
                />
                <CalcRow label="Neto liquidado por Payway" value={formatMoney(calc.neto_payway)} />
                <div className="border-t my-1" />
                <CalcRow
                  label="Tasa de interés MoliPay"
                  value={`- ${formatMoney(calc.tasa_monto)}`}
                  tone="subtract"
                  hint={`${calc.tasa_pct}% sobre el importe bruto`}
                />
                {calc.iva_tasa_monto > 0 && (
                  <CalcRow
                    label="IVA sobre la tasa MoliPay"
                    value={`- ${formatMoney(calc.iva_tasa_monto)}`}
                    tone="subtract"
                    hint={`${calc.iva_pct}% de la tasa`}
                  />
                )}
                <CalcRow
                  label="Comisión cierre de lote"
                  value={`- ${formatMoney(calc.cierre_monto)}`}
                  tone="subtract"
                  hint={`${calc.cierre_pct}% sobre el importe bruto`}
                />
                {calc.impuestos
                  .filter((i) => Number(i.monto) > 0)
                  .map((i) => (
                    <CalcRow
                      key={i.asignacion_id}
                      label={`${i.nombre} (${i.codigo})`}
                      value={`- ${formatMoney(i.monto)}`}
                      tone="subtract"
                      hint={
                        i.nota ??
                        `${i.alicuota != null ? `${i.alicuota}% · ` : ""}aplica a: ${i.aplica_a}`
                      }
                    />
                  ))}
                <div className="border-t mt-1 pt-1" />
                <CalcRow
                  label="Importe a acreditar antes de compensaciones"
                  value={formatMoney(
                    calc.neto_a_acreditar +
                      (calc.retencion_contracargos ?? 0) +
                      calc.compensacion_adelantos +
                      calc.recuperacion_deuda,
                  )}
                  tone="total"
                />
              </div>

              {/* Adelantos y deudas: solo si hay algo que compensar */}
              {(calc.retencion_contracargos ?? 0) > 0 ||
              calc.compensacion_adelantos > 0 ||
              calc.recuperacion_deuda > 0 ? (
                <div className="rounded-lg border p-3 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Wallet size={14} /> Adelantos y deudas
                  </h4>
                  {(calc.retencion_contracargos ?? 0) > 0 && (
                    <CalcRow
                      label="Retención por contracargos"
                      value={`- ${formatMoney(calc.retencion_contracargos ?? 0)}`}
                      tone="subtract"
                      hint="ventas de este lote desconocidas por el pagador"
                    />
                  )}
                  {calc.compensacion_adelantos > 0 && (
                    <CalcRow
                      label="Compensación de adelantos acreditados"
                      value={`- ${formatMoney(calc.compensacion_adelantos)}`}
                      tone="subtract"
                      hint="el comercio ya cobró esto por adelantado (FIFO)"
                    />
                  )}
                  {calc.recuperacion_deuda > 0 && (
                    <CalcRow
                      label="Recuperación de deuda"
                      value={`- ${formatMoney(calc.recuperacion_deuda)}`}
                      tone="subtract"
                      hint="contracargos o lotes negativos anteriores"
                    />
                  )}
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Info size={13} /> El comercio no tiene adelantos ni deudas pendientes de
                  compensar.
                </p>
              )}

              <div className="rounded-lg border p-3">
                <CalcRow
                  label="Neto final a depositar en la subcuenta"
                  value={formatMoney(calc.neto_a_acreditar)}
                  tone="final"
                />
                {com && (
                  <>
                    <CalcRow
                      label="Saldo actual de la Operativa"
                      value={formatMoney(com.saldo_actual)}
                    />
                    <CalcRow
                      label="Saldo después de acreditar"
                      value={formatMoney(com.saldo_despues)}
                      tone="total"
                    />
                  </>
                )}
                {!rev?.alcanza && (
                  <p className="text-xs text-red-700 mt-1">
                    La recaudadora no cubre este lote: no se puede acreditar.
                  </p>
                )}
              </div>

              <div>
                <Label>Confirmaciones</Label>
                <ConfirmacionesCredit
                  value={conf}
                  onChange={setConf}
                  texto={text}
                  onTexto={setText}
                />
              </div>
            </>
          )}

          {errorGuardado && (
            <ErrorNotice>
              <span>{errorGuardado}</span>
            </ErrorNotice>
          )}
        </div>
      )}
    </FormDialog>
  );
}
