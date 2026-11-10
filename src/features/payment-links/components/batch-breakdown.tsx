import { Modal } from "@/shared/ui/modal";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, RefreshCw, X } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline } from "@/shared/ui/button";
import {
  CadenaAmounts,
  StatusBatch,
  Amount,
  date,
  errMsg,
} from "@/features/payment-links/components/credits-common";
import {
  QK_ACRED,
  getBatchV2,
  recalcularBatch,
  salesDeBatch,
} from "@/features/payment-links/credits.supabase";
import { formatDateTime } from "@/shared/lib/format";
import { useCan } from "@/features/rbac/rbac.hooks";

/**
 * Apertura de un lote de acreditacion: como se formo el total.
 * Cabecera, cadena de importes, ventas incluidas e historial.
 */
export function BatchBreakdown({
  loteId: batchId,
  onClose,
  acciones: actions,
}: {
  loteId: string | null;
  onClose: () => void;
  acciones?: ReactNode;
}) {
  const { can } = useCan();
  const qc = useQueryClient();
  const [recalculando, setRecalculando] = useState(false);
  const batchQ = useQuery({
    queryKey: [...QK_ACRED, "lote", batchId],
    queryFn: () => getBatchV2(batchId!),
    enabled: !!batchId,
  });
  const salesQ = useQuery({
    queryKey: [...QK_ACRED, "lote-ventas", batchId],
    queryFn: () => salesDeBatch(batchId!),
    enabled: !!batchId,
  });

  useEffect(() => {
    if (!batchId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [batchId, onClose]);

  if (!batchId) return null;
  const l = batchQ.data;

  const recalcular = async () => {
    setRecalculando(true);
    try {
      await recalcularBatch(batchId);
      qc.invalidateQueries({ queryKey: QK_ACRED });
      toast.success("Lote recalculado con los parámetros vigentes.");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setRecalculando(false);
    }
  };

  return (
    <Modal open onClose={onClose} size="custom" className="max-w-4xl">
      <div className="min-h-0 flex-1 overflow-y-auto border my-6">
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Apertura del lote
            </div>
            <div className="font-mono text-sm font-semibold">{l?.codigo ?? "…"}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {batchQ.isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Cargando…</div>
        ) : batchQ.isError || !l ? (
          <div className="p-8 text-center text-sm text-red-700">
            {batchQ.isError ? errMsg(batchQ.error) : "Lote no encontrado"}
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Field
                label="Comercio"
                v={
                  <span>
                    {l.comercio_nombre ?? l.comercio_usuario}{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      {l.comercio_legajo}
                    </span>
                  </span>
                }
              />
              <Field label="Bandera" v={l.bandera} />
              <Field
                label="Establecimiento"
                v={<span className="font-mono">{l.establecimiento ?? "—"}</span>}
              />
              <Field
                label={l.origen === "archivo" ? "Fecha de pago" : "Fecha estimada"}
                v={date(l.fecha)}
              />
              <Field label="Estado" v={<StatusBatch lote={l} />} />
              <Field
                label="Origen"
                v={
                  l.origen === "archivo"
                    ? `Archivo ${l.importacion_archivo ?? ""}`
                    : "Proyección desde ventas"
                }
              />
              <Field
                label="Conciliado"
                v={
                  l.origen === "archivo" ? (
                    l.conciliado ? (
                      <Badge tone="success">Sí</Badge>
                    ) : (
                      <Badge tone="warn">No</Badge>
                    )
                  ) : (
                    "—"
                  )
                }
              />
              <Field
                label="Acreditado"
                v={l.fecha_acreditacion ? `${date(l.fecha_acreditacion)}` : "—"}
              />
            </div>

            {l.motivo_no_elegible && l.estado === "Pendiente" && (
              <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {l.motivo_no_elegible}
              </p>
            )}

            {l.origen === "archivo" ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Cadena de importes
                  </h4>
                  {l.estado === "Pendiente" && !l.legacy && can("modificar", "comercios") && (
                    <BtnOutline
                      className="h-8 text-xs px-2"
                      onClick={() => void recalcular()}
                      disabled={recalculando}
                    >
                      {recalculando ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <RefreshCw size={13} />
                      )}{" "}
                      Recalcular
                    </BtnOutline>
                  )}
                </div>
                <CadenaAmounts lote={l} />
                {l.estado === "Pendiente" && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Cálculo del {formatDateTime(l.calculado_at)}. Al acreditar se vuelve a calcular
                    con los valores vigentes (compensaciones incluidas).
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-lg border p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bruto vendido</span>
                  <Amount v={l.importe_bruto} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Neto estimado (proyección)</span>
                  <Amount v={l.importe_neto} strong />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Payway todavía no pagó estas ventas. El neto definitivo sale del archivo de
                  liquidaciones.
                  {l.liquidado_en_lote_id && " Ya se liquidó en un lote del archivo."}
                </p>
              </div>
            )}

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Ventas incluidas ({salesQ.data?.length ?? 0})
              </h4>
              {salesQ.isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando…</p>
              ) : (salesQ.data ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Sin ventas vinculadas. Con el archivo actual de Payway (totales por fecha y
                  bandera) el vínculo es por suma y puede no estar completo [A-3].
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/60 text-muted-foreground">
                      <tr className="text-left">
                        <th className="px-2 py-1.5">Fecha de venta</th>
                        <th className="px-2 py-1.5">Operación</th>
                        <th className="px-2 py-1.5">Bandera</th>
                        <th className="px-2 py-1.5">Cuotas</th>
                        <th className="px-2 py-1.5 text-right">Bruto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(salesQ.data ?? []).map((v) => (
                        <tr key={v.id}>
                          <td className="px-2 py-1">{formatDateTime(v.fecha)}</td>
                          <td className="px-2 py-1 font-mono">{v.id_txn}</td>
                          <td className="px-2 py-1">{v.bandera ?? "—"}</td>
                          <td className="px-2 py-1">{v.cuotas ?? 1}</td>
                          <td className="px-2 py-1 text-right">
                            <Amount v={v.monto_operacion} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Historial
              </h4>
              <ul className="text-xs space-y-1">
                <li>Creado: {formatDateTime(l.created_at)}</li>
                {l.importacion_archivo && <li>Importación: {l.importacion_archivo}</li>}
                <li>
                  Conciliación: {l.conciliado ? "conciliado con la recaudadora" : "pendiente"}
                </li>
                {l.contracargos > 0 && (
                  <li>
                    Contracargos vinculados: {l.contracargos}{" "}
                    <Link
                      to="/admin/comercios/link-pago/contracargos"
                      className="text-primary hover:underline"
                    >
                      ver
                    </Link>
                  </li>
                )}
                {l.estado === "Acreditado" && (
                  <li>
                    Acreditado el {date(l.fecha_acreditacion)} ({formatDateTime(l.fecha_resolucion)}
                    )
                    {l.ejecucion_id && (
                      <>
                        {" · "}
                        <Link
                          to="/admin/comercios/link-pago/ejecucion"
                          search={{ ejecucion: l.ejecucion_id }}
                          className="text-primary hover:underline"
                        >
                          ver ejecución
                        </Link>
                      </>
                    )}
                  </li>
                )}
              </ul>
            </div>

            {actions && <div className="flex justify-end gap-2 border-t pt-4">{actions}</div>}
          </div>
        )}
      </div>
    </Modal>
  );
}

function Field({ label, v }: { label: string; v: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="truncate">{v}</div>
    </div>
  );
}

/** Las tres confirmaciones y la palabra ACREDITAR que exige la ejecucion. */
export type Confirmaciones = { totales: boolean; compensaciones: boolean; irreversible: boolean };

export function ConfirmacionesCredit({
  value,
  onChange,
  texto: text,
  onTexto: onText,
}: {
  value: Confirmaciones;
  onChange: (v: Confirmaciones) => void;
  texto: string;
  onTexto: (t: string) => void;
}) {
  const items: { k: keyof Confirmaciones; label: string }[] = [
    {
      k: "totales",
      label: "Revisé que los totales coinciden con la liquidación de Payway del día.",
    },
    {
      k: "compensaciones",
      label: "Revisé los comercios con compensaciones, contracargos o saldo negativo.",
    },
    {
      k: "irreversible",
      label: "Entiendo que la acreditación no se puede deshacer; solo se corrige con un ajuste.",
    },
  ];
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <label key={i.k} className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={value[i.k]}
            onChange={(e) => onChange({ ...value, [i.k]: e.target.checked })}
          />
          <span>{i.label}</span>
        </label>
      ))}
      <div className="pt-1">
        <label className="text-xs font-semibold mb-1 block">Para ejecutar, escribí ACREDITAR</label>
        <input
          value={text}
          onChange={(e) => onText(e.target.value)}
          className="w-full max-w-xs h-10 rounded-md border border-input bg-background px-3 text-sm font-mono uppercase"
          placeholder="ACREDITAR"
        />
      </div>
    </div>
  );
}

export function confirmacionesCompletas(c: Confirmaciones, text: string) {
  return (
    c.totales && c.compensaciones && c.irreversible && text.trim().toUpperCase() === "ACREDITAR"
  );
}
