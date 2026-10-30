import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, RefreshCw, X } from "lucide-react";
import { Badge, BtnOutline } from "@/components/portal-shell";
import { CadenaImportes, EstadoLote, Monto, fecha, fechaHora, errMsg } from "./comunes";
import { useCan } from "@/lib/permissions";
import { QK_ACRED, getLoteV2, recalcularLote, ventasDeLote } from "@/lib/api/acreditaciones";

/**
 * Apertura de un lote de acreditacion: como se formo el total.
 * Cabecera, cadena de importes, ventas incluidas e historial.
 */
export function LoteApertura({ loteId, onClose, acciones }: { loteId: string | null; onClose: () => void; acciones?: ReactNode }) {
  const { can } = useCan();
  const qc = useQueryClient();
  const [recalculando, setRecalculando] = useState(false);
  const loteQ = useQuery({ queryKey: [...QK_ACRED, "lote", loteId], queryFn: () => getLoteV2(loteId!), enabled: !!loteId });
  const ventasQ = useQuery({ queryKey: [...QK_ACRED, "lote-ventas", loteId], queryFn: () => ventasDeLote(loteId!), enabled: !!loteId });

  useEffect(() => {
    if (!loteId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loteId, onClose]);

  if (!loteId) return null;
  const l = loteQ.data;

  const recalcular = async () => {
    setRecalculando(true);
    try {
      await recalcularLote(loteId);
      qc.invalidateQueries({ queryKey: QK_ACRED });
      toast.success("Lote recalculado con los parámetros vigentes.");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setRecalculando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-4xl rounded-xl border bg-card shadow-2xl my-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Apertura del lote</div>
            <div className="font-mono text-sm font-semibold">{l?.codigo ?? "…"}</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-muted" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {loteQ.isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Cargando…</div>
        ) : loteQ.isError || !l ? (
          <div className="p-8 text-center text-sm text-red-700">{loteQ.isError ? errMsg(loteQ.error) : "Lote no encontrado"}</div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Campo label="Comercio" v={<span>{l.comercio_nombre ?? l.comercio_usuario} <span className="font-mono text-xs text-muted-foreground">{l.comercio_legajo}</span></span>} />
              <Campo label="Bandera" v={l.bandera} />
              <Campo label="Establecimiento" v={<span className="font-mono">{l.establecimiento ?? "—"}</span>} />
              <Campo label={l.origen === "archivo" ? "Fecha de pago" : "Fecha estimada"} v={fecha(l.fecha)} />
              <Campo label="Estado" v={<EstadoLote lote={l} />} />
              <Campo label="Origen" v={l.origen === "archivo" ? `Archivo ${l.importacion_archivo ?? ""}` : "Proyección desde ventas"} />
              <Campo label="Conciliado" v={l.origen === "archivo" ? (l.conciliado ? <Badge tone="success">Sí</Badge> : <Badge tone="warn">No</Badge>) : "—"} />
              <Campo label="Acreditado" v={l.fecha_acreditacion ? `${fecha(l.fecha_acreditacion)}` : "—"} />
            </div>

            {l.motivo_no_elegible && l.estado === "Pendiente" && (
              <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">{l.motivo_no_elegible}</p>
            )}

            {l.origen === "archivo" ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cadena de importes</h4>
                  {l.estado === "Pendiente" && !l.legacy && can("modificar", "comercios") && (
                    <BtnOutline className="h-8 text-xs px-2" onClick={() => void recalcular()} disabled={recalculando}>
                      {recalculando ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Recalcular
                    </BtnOutline>
                  )}
                </div>
                <CadenaImportes lote={l} />
                {l.estado === "Pendiente" && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Cálculo del {fechaHora(l.calculado_at)}. Al acreditar se vuelve a calcular con los valores vigentes (compensaciones incluidas).
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-lg border p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bruto vendido</span>
                  <Monto v={l.importe_bruto} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Neto estimado (proyección)</span>
                  <Monto v={l.importe_neto} strong />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Payway todavía no pagó estas ventas. El neto definitivo sale del archivo de liquidaciones.
                  {l.liquidado_en_lote_id && " Ya se liquidó en un lote del archivo."}
                </p>
              </div>
            )}

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Ventas incluidas ({ventasQ.data?.length ?? 0})
              </h4>
              {ventasQ.isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando…</p>
              ) : (ventasQ.data ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Sin ventas vinculadas. Con el archivo actual de Payway (totales por fecha y bandera) el vínculo es por suma y puede no estar completo [A-3].
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
                      {(ventasQ.data ?? []).map((v) => (
                        <tr key={v.id}>
                          <td className="px-2 py-1">{fechaHora(v.fecha)}</td>
                          <td className="px-2 py-1 font-mono">{v.id_txn}</td>
                          <td className="px-2 py-1">{v.bandera ?? "—"}</td>
                          <td className="px-2 py-1">{v.cuotas ?? 1}</td>
                          <td className="px-2 py-1 text-right">
                            <Monto v={v.monto_operacion} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Historial</h4>
              <ul className="text-xs space-y-1">
                <li>Creado: {fechaHora(l.created_at)}</li>
                {l.importacion_archivo && <li>Importación: {l.importacion_archivo}</li>}
                <li>Conciliación: {l.conciliado ? "conciliado con la recaudadora" : "pendiente"}</li>
                {l.contracargos > 0 && (
                  <li>
                    Contracargos vinculados: {l.contracargos}{" "}
                    <Link to="/admin/comercios/link-pago/contracargos" className="text-primary hover:underline">
                      ver
                    </Link>
                  </li>
                )}
                {l.estado === "Acreditado" && (
                  <li>
                    Acreditado el {fecha(l.fecha_acreditacion)} ({fechaHora(l.fecha_resolucion)})
                    {l.ejecucion_id && (
                      <>
                        {" · "}
                        <Link to="/admin/comercios/link-pago/ejecucion" search={{ ejecucion: l.ejecucion_id }} className="text-primary hover:underline">
                          ver ejecución
                        </Link>
                      </>
                    )}
                  </li>
                )}
              </ul>
            </div>

            {acciones && <div className="flex justify-end gap-2 border-t pt-4">{acciones}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function Campo({ label, v }: { label: string; v: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="truncate">{v}</div>
    </div>
  );
}

/** Las tres confirmaciones y la palabra ACREDITAR que exige la ejecucion. */
export type Confirmaciones = { totales: boolean; compensaciones: boolean; irreversible: boolean };

export function ConfirmacionesAcreditacion({
  value,
  onChange,
  texto,
  onTexto,
}: {
  value: Confirmaciones;
  onChange: (v: Confirmaciones) => void;
  texto: string;
  onTexto: (t: string) => void;
}) {
  const items: { k: keyof Confirmaciones; label: string }[] = [
    { k: "totales", label: "Revisé que los totales coinciden con la liquidación de Payway del día." },
    { k: "compensaciones", label: "Revisé los comercios con compensaciones, contracargos o saldo negativo." },
    { k: "irreversible", label: "Entiendo que la acreditación no se puede deshacer; solo se corrige con un ajuste." },
  ];
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <label key={i.k} className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={value[i.k]} onChange={(e) => onChange({ ...value, [i.k]: e.target.checked })} />
          <span>{i.label}</span>
        </label>
      ))}
      <div className="pt-1">
        <label className="text-xs font-semibold mb-1 block">Para ejecutar, escribí ACREDITAR</label>
        <input
          value={texto}
          onChange={(e) => onTexto(e.target.value)}
          className="w-full max-w-xs h-10 rounded-md border border-input bg-background px-3 text-sm font-mono uppercase"
          placeholder="ACREDITAR"
        />
      </div>
    </div>
  );
}

export function confirmacionesCompletas(c: Confirmaciones, texto: string) {
  return c.totales && c.compensaciones && c.irreversible && texto.trim().toUpperCase() === "ACREDITAR";
}
