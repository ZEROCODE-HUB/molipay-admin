import { useEffect, useState } from "react";
import { AlertTriangle, Info, Wallet } from "lucide-react";
import { FormDialog } from "@/components/form-dialog";
import { Badge, Label } from "@/components/portal-shell";
import { ConfirmacionesAcreditacion, confirmacionesCompletas, type Confirmaciones } from "@/components/acreditaciones/lote-apertura";
import type { LoteAcreditacion } from "@/lib/api/types";
import { ejecutarAcreditacion, revisarAcreditacion, type Revision } from "@/lib/api/acreditaciones";

// Confirmacion de la acreditacion de un lote Pendiente.
//
// El desglose lo calcula la base (acreditacion_revisar): neto de Payway,
// tasa MoliPay, IVA de la tasa, cierre de lote, impuestos asignados al
// comercio y compensacion de adelantos / deudas. Al confirmar se llama a
// acreditacion_ejecutar con el hash de la revision: si algo cambio en el
// medio (un parametro, un adelanto), el lote se omite y hay que revisar.

type Props = {
  lote: LoteAcreditacion | null;
  onClose: () => void;
  onAcreditado: () => void;
};

function fmt(n: number): string {
  return `$ ${Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function hoy() {
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

export function ConfirmarAcreditacionModal({ lote, onClose, onAcreditado }: Props) {
  const [rev, setRev] = useState<Revision | null>(null);
  const [cargando, setCargando] = useState(false);
  const [conf, setConf] = useState<Confirmaciones>({ totales: false, compensaciones: false, irreversible: false });
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  useEffect(() => {
    setRev(null);
    setErrorGuardado(null);
    setConf({ totales: false, compensaciones: false, irreversible: false });
    setTexto("");
    if (!lote) return;
    setCargando(true);
    revisarAcreditacion([lote.id])
      .then(setRev)
      .catch((e) => setErrorGuardado(e instanceof Error ? e.message : String(e)))
      .finally(() => setCargando(false));
  }, [lote]);

  const calc = rev?.lotes[0] ?? null;
  const com = rev?.comercios[0] ?? null;
  const omitido = rev?.omitidos[0] ?? null;

  const confirmar = async () => {
    if (!lote || !calc) return;
    if (!confirmacionesCompletas(conf, texto)) {
      setErrorGuardado("Completá las tres confirmaciones y escribí ACREDITAR.");
      return;
    }
    setGuardando(true);
    setErrorGuardado(null);
    try {
      const r = await ejecutarAcreditacion({
        ids: [lote.id],
        fecha: hoy(),
        confirmaciones: conf,
        texto,
        hashes: { [lote.id]: calc.hash },
      });
      const it = r.items[0];
      if (it?.resultado === "acreditado") {
        onAcreditado();
      } else {
        setErrorGuardado(`${it?.resultado === "omitido" ? "Omitido" : "Error"}: ${it?.motivo ?? "sin detalle"}`);
      }
    } catch (e) {
      setErrorGuardado(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  };

  const submitLabel = guardando ? "Acreditando…" : calc ? `Acreditar ${fmt(calc.neto_a_acreditar)}` : "Acreditar";

  return (
    <FormDialog
      open={!!lote}
      onClose={onClose}
      title={lote ? `Confirmar acreditación — ${lote.codigo}` : "Confirmar acreditación"}
      description="El lote está Pendiente con los importes reales del archivo de Payway y conciliado con la recaudadora. Confirmá para acreditar el neto a la subcuenta Operativa del comercio."
      onSubmit={() => void confirmar()}
      submitLabel={submitLabel}
      size="lg"
      isSubmitting={guardando}
      cancelLabel="Cancelar"
    >
      {lote && (
        <div className="space-y-5">
          {/* Contexto del lote */}
          <div className="rounded-lg border bg-muted/30 p-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="min-w-0">
                <div className="text-muted-foreground">Comercio</div>
                <div className="font-semibold truncate">{lote.comercio?.nombreComercio ?? lote.comercio?.usuario ?? lote.comercioId}</div>
                <div className="font-mono text-[11px] text-muted-foreground truncate">{lote.comercio?.legajo ?? "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Bandera</div>
                <div className="font-semibold">{lote.bandera}</div>
                <div className="text-[11px] text-muted-foreground">{lote.cantidadOperaciones} ops</div>
              </div>
              <div>
                <div className="text-muted-foreground">Fecha de liquidación</div>
                <div className="font-mono font-semibold">{fmtFecha(lote.fecha)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Recaudadora</div>
                <div className="font-semibold flex items-center gap-1.5">
                  {lote.conciliado ? <Badge tone="success">conciliado</Badge> : <Badge tone="warn">sin conciliar</Badge>}
                </div>
              </div>
            </div>
          </div>

          {cargando && <p className="text-sm text-muted-foreground">Calculando…</p>}

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
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Desglose de la liquidación</h4>
                <CalcRow label="Importe bruto" value={fmt(calc.bruto)} />
                <CalcRow
                  label="Impuestos y tasa de interés PayWay (CSV)"
                  value={`- ${fmt(calc.bruto - calc.neto_payway)}`}
                  tone="subtract"
                  hint="Referencia: los descontó Payway antes de depositar"
                />
                <CalcRow label="Neto liquidado por Payway" value={fmt(calc.neto_payway)} />
                <div className="border-t my-1" />
                <CalcRow label="Tasa de interés MoliPay" value={`- ${fmt(calc.tasa_monto)}`} tone="subtract" hint={`${calc.tasa_pct}% sobre el neto de Payway`} />
                {calc.iva_tasa_monto > 0 && (
                  <CalcRow label="IVA sobre la tasa MoliPay" value={`- ${fmt(calc.iva_tasa_monto)}`} tone="subtract" hint={`${calc.iva_pct}% de la tasa`} />
                )}
                <CalcRow
                  label="Comisión cierre de lote"
                  value={`- ${fmt(calc.cierre_monto)}`}
                  tone="subtract"
                  hint={`${calc.cierre_pct}% sobre ${calc.cierre_base === "neto_menos_tasa" ? "el neto menos la tasa" : "el neto de Payway"}`}
                />
                {calc.impuestos.filter((i) => Number(i.monto) > 0).map((i) => (
                  <CalcRow
                    key={i.asignacion_id}
                    label={`${i.nombre} (${i.codigo})`}
                    value={`- ${fmt(i.monto)}`}
                    tone="subtract"
                    hint={i.nota ?? `${i.alicuota != null ? `${i.alicuota}% · ` : ""}aplica a: ${i.aplica_a}`}
                  />
                ))}
                <div className="border-t mt-1 pt-1" />
                <CalcRow
                  label="Importe a acreditar antes de compensaciones"
                  value={fmt(calc.neto_a_acreditar + (calc.retencion_contracargos ?? 0) + calc.compensacion_adelantos + calc.recuperacion_deuda)}
                  tone="total"
                />
              </div>

              {/* Adelantos y deudas: solo si hay algo que compensar */}
              {(calc.retencion_contracargos ?? 0) > 0 || calc.compensacion_adelantos > 0 || calc.recuperacion_deuda > 0 ? (
                <div className="rounded-lg border p-3 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Wallet size={14} /> Adelantos y deudas
                  </h4>
                  {(calc.retencion_contracargos ?? 0) > 0 && (
                    <CalcRow
                      label="Retención por contracargos"
                      value={`- ${fmt(calc.retencion_contracargos ?? 0)}`}
                      tone="subtract"
                      hint="ventas de este lote desconocidas por el pagador"
                    />
                  )}
                  {calc.compensacion_adelantos > 0 && (
                    <CalcRow
                      label="Compensación de adelantos acreditados"
                      value={`- ${fmt(calc.compensacion_adelantos)}`}
                      tone="subtract"
                      hint="el comercio ya cobró esto por adelantado (FIFO)"
                    />
                  )}
                  {calc.recuperacion_deuda > 0 && (
                    <CalcRow
                      label="Recuperación de deuda"
                      value={`- ${fmt(calc.recuperacion_deuda)}`}
                      tone="subtract"
                      hint="contracargos o lotes negativos anteriores"
                    />
                  )}
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Info size={13} /> El comercio no tiene adelantos ni deudas pendientes de compensar.
                </p>
              )}

              <div className="rounded-lg border p-3">
                <CalcRow label="Neto final a depositar en la subcuenta" value={fmt(calc.neto_a_acreditar)} tone="final" />
                {com && (
                  <>
                    <CalcRow label="Saldo actual de la Operativa" value={fmt(com.saldo_actual)} />
                    <CalcRow label="Saldo después de acreditar" value={fmt(com.saldo_despues)} tone="total" />
                  </>
                )}
                {!rev?.alcanza && <p className="text-xs text-red-700 mt-1">La recaudadora no cubre este lote: no se puede acreditar.</p>}
              </div>

              <div>
                <Label>Confirmaciones</Label>
                <ConfirmacionesAcreditacion value={conf} onChange={setConf} texto={texto} onTexto={setTexto} />
              </div>
            </>
          )}

          {errorGuardado && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{errorGuardado}</span>
            </div>
          )}
        </div>
      )}
    </FormDialog>
  );
}
