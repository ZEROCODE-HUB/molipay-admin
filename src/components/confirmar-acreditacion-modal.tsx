import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Info, Wallet } from "lucide-react";
import { FormDialog } from "@/components/form-dialog";
import { Badge, Input, Label } from "@/components/portal-shell";
import { useQuery } from "@tanstack/react-query";
import { listAdelantosByComercio } from "@/lib/api/adelantos";
import { acreditarLote } from "@/lib/api/lotes";
import type { LoteAcreditacion } from "@/lib/api/types";

// Confirmar Acreditación: el segundo paso del flujo.
// El lote ya está Pendiente con el snapshot real del CSV (importe_neto,
// comisiones, retenciones) escrito en `aplicar_liquidacion_lote`. Este
// modal muestra el desglose desde el snapshot y, si el comercio tiene
// adelantos Pendiente/Aprobado, una línea de deducción adicional. Confirmar
// llama la RPC `acreditar_lote` que deposita en la subcuenta Operativa
// y descuenta los adelantos en FIFO.

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
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  // Adelantos del comercio: el modal sólo necesita el montoPorAcreditar
  // de los estados Pendiente/Aprobado. staleTime largo porque el dato
  // no cambia mientras el modal está abierto (el RPC acreditar_lote
  // los va a bajar al confirmar).
  const adelantosQuery = useQuery({
    queryKey: ["adelantos", lote?.comercioId],
    queryFn: () => listAdelantosByComercio(lote!.comercioId),
    enabled: !!lote,
    staleTime: 30_000,
  });

  // Suma del pendiente a devolver al comercio. El RPC acreditar_lote
  // valida que no supere el neto del lote, así que en la práctica siempre
  // cabe; se muestra un warning si la suma lo superara para que el
  // operador lo sepa antes de confirmar.
  const deduccionAdelantos = useMemo(() => {
    const rs = adelantosQuery.data ?? [];
    return rs
      .filter((a) => a.estado === "Pendiente" || a.estado === "Aprobado")
      .reduce((s, a) => s + Number(a.montoPorAcreditar ?? 0), 0);
  }, [adelantosQuery.data]);

  // Reset del estado cuando cambia el lote
  useEffect(() => {
    setNotas("");
    setErrorGuardado(null);
    setGuardando(false);
  }, [lote?.id]);

  const importeNeto = lote?.importeNeto ?? 0;
  const netoFinal = Math.max(0, importeNeto - deduccionAdelantos);
  const deduccionExcedeNeto = deduccionAdelantos > importeNeto;

  const comisionMolipayMonto = lote?.tasaMolipayMonto ?? 0;
  const comisionCierreMonto = lote?.comisionCierreLoteMonto ?? 0;
  const debitoCreditoMonto = lote?.debitoCreditoMonto ?? 0;
  const ivaMonto = lote?.ivaMonto ?? 0;
  const iibbMonto = lote?.iibbMonto ?? 0;
  const totalDescuentos =
    comisionMolipayMonto + comisionCierreMonto + debitoCreditoMonto + ivaMonto + iibbMonto;
  // netoCsv = importeNeto + descuentos (reconstruido del snapshot)
  const netoCsv = importeNeto + totalDescuentos;

  const submitLabel = lote
    ? `Acreditar y depositar ${fmt(netoFinal)}`
    : "Acreditar";

  const confirmar = async () => {
    if (!lote) return;
    setGuardando(true);
    setErrorGuardado(null);
    try {
      await acreditarLote(lote.id, notas, deduccionAdelantos);
      onAcreditado();
      onClose();
    } catch (e) {
      setErrorGuardado(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <FormDialog
      open={!!lote}
      onClose={onClose}
      title={lote ? `Confirmar acreditación — ${lote.codigo}` : "Confirmar acreditación"}
      description="El lote ya está Pendiente con los importes reales del CSV. Confirmá para acreditar el neto a la subcuenta Operativa del comercio."
      onSubmit={confirmar}
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
                <div className="font-semibold truncate">
                  {lote.comercio?.nombreComercio ?? lote.comercio?.usuario ?? lote.comercioId}
                </div>
                <div className="font-mono text-[11px] text-muted-foreground truncate">
                  {lote.comercio?.legajo ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Bandera</div>
                <div className="font-semibold">{lote.bandera}</div>
                <div className="text-[11px] text-muted-foreground">{lote.cantidadOperaciones} ops</div>
              </div>
              <div>
                <div className="text-muted-foreground">Fecha estimada</div>
                <div className="font-mono font-semibold">{fmtFecha(lote.fecha)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Fecha cobro real</div>
                <div className="font-mono font-semibold flex items-center gap-1.5">
                  {fmtFecha(lote.fechaCobroReal)}
                  {lote.fechaCobroReal ? (
                    <Badge tone="success">real</Badge>
                  ) : (
                    <Badge tone="neutral">est.</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Desglose del snapshot del CSV */}
          <div className="rounded-lg border p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Desglose del archivo de liquidación
            </h4>

            <CalcRow
              label="Neto liquidado por Payway (CSV)"
              value={fmt(netoCsv)}
              hint="TOTAL_NETO reconstruido del snapshot"
            />
            <div className="border-t my-1" />

            <CalcRow
              label="Comisión MoliPay"
              value={`- ${fmt(comisionMolipayMonto)}`}
              tone="subtract"
              hint={`${lote.tasaMolipayPct}% sobre el neto CSV`}
            />
            <CalcRow
              label="Comisión de cierre de lote"
              value={`- ${fmt(comisionCierreMonto)}`}
              tone="subtract"
              hint={
                lote.comisionCierreLotePct != null
                  ? `${lote.comisionCierreLotePct}% — snapshot del lote`
                  : "snapshot del lote"
              }
            />
            <CalcRow
              label="Retención débito/crédito"
              value={`- ${fmt(debitoCreditoMonto)}`}
              tone="subtract"
              hint="RG 2111/4172"
            />
            <CalcRow
              label="Retención IVA"
              value={`- ${fmt(ivaMonto)}`}
              tone="subtract"
              hint="21% sobre la comisión MoliPay"
            />
            <CalcRow
              label="Retención Ingresos Brutos"
              value={`- ${fmt(iibbMonto)}`}
              tone="subtract"
            />

            <div className="border-t mt-1 pt-1" />
            <CalcRow
              label="Importe a acreditar (lote Pendiente)"
              value={fmt(importeNeto)}
              tone="total"
              hint="a depositar en la subcuenta Operativa"
            />
          </div>

          {/* Adelantos: la línea solo aparece si hay. Decisión confirmada
              (vía API de adelantos): mostrar deducción sólo si hay
              adelantos Pendiente/Aprobado. */}
          {adelantosQuery.isLoading ? (
            <p className="text-xs text-muted-foreground">Cargando adelantos del comercio…</p>
          ) : deduccionAdelantos > 0 ? (
            <div className="rounded-lg border p-3 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Wallet size={14} /> Adelantos previos
              </h4>
              <CalcRow
                label="Deducción por adelantos Pendiente/Aprobado"
                value={`- ${fmt(deduccionAdelantos)}`}
                tone="subtract"
                hint="se descuenta del neto acreditado (FIFO)"
              />
              <div className="border-t pt-1">
                <CalcRow
                  label="Neto final a depositar en la subcuenta"
                  value={fmt(netoFinal)}
                  tone="final"
                  hint="importe_neto - deducción adelantos"
                />
              </div>
              {deduccionExcedeNeto && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>
                    La deducción ({fmt(deduccionAdelantos)}) supera el neto del lote. La RPC
                    rechazará esta confirmación; revisá los adelantos.
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info size={13} /> El comercio no tiene adelantos previos pendientes.
            </p>
          )}

          {/* Notas */}
          <div>
            <Label htmlFor="acredit-notas">Notas (opcional)</Label>
            <textarea
              id="acredit-notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Ticket de Payway, motivo, comentarios..."
              className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

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
