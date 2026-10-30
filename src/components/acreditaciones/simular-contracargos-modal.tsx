import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Info } from "lucide-react";
import { ModalDialog } from "@/components/modal-dialog";
import { BtnOutline, BtnPrimary } from "@/components/portal-shell";
import { QK_ACRED, listLotesV2, type LoteV2 } from "@/lib/api/acreditaciones";
import { descargarCsv } from "@/lib/api/importers/generar-csv-contracargo-real";
import { generarSimulacionContracargos } from "@/lib/api/importers/generar-csv-contracargo-lotes";
import { Monto, errMsg, fecha } from "./comunes";

/**
 * Descarga un reporte de contracargos simulado (formato Payway) con ventas
 * reales de lotes Programados o Pendientes, y opcionalmente el archivo de
 * liquidacion con el renglon negativo de esas ventas. Sirve para probar el
 * flujo como si fueran casos reales:
 *   1. subir el reporte en Contracargos > Importar -> retencion programada;
 *   2. acreditar el lote -> el neto baja por la retencion;
 *   3. subir la liquidacion negativa -> se vincula, no se cobra dos veces.
 */
export function SimularContracargosModal({ loteIds, onClose }: { loteIds?: string[]; onClose: () => void }) {
  const fijos = !!loteIds?.length;
  const [estado, setEstado] = useState<"Pendiente" | "Programado">("Pendiente");
  const [buscar, setBuscar] = useState("");
  const [sel, setSel] = useState<string[]>(loteIds ?? []);
  const [ventasPorLote, setVentasPorLote] = useState(1);
  const [modo, setModo] = useState<"total" | "parcial">("total");
  const [conLiquidacion, setConLiquidacion] = useState(true);
  const [generando, setGenerando] = useState(false);

  const q = useQuery({
    queryKey: [...QK_ACRED, "simular-contracargos", fijos ? loteIds : estado, buscar],
    queryFn: () =>
      listLotesV2(fijos ? { ids: loteIds } : { estado, search: buscar || undefined }, 0, 50).then((r) => r.rows),
  });
  const lotes = useMemo(
    () => (q.data ?? []).filter((l: LoteV2) => l.estado === "Programado" || l.estado === "Pendiente"),
    [q.data],
  );

  const generar = async () => {
    const elegidos = lotes.filter((l) => sel.includes(l.id));
    setGenerando(true);
    try {
      const r = await generarSimulacionContracargos(
        elegidos.map((l) => ({ id: l.id, codigo: l.codigo, bandera: l.bandera })),
        { ventasPorLote, modo, conLiquidacion },
      );
      descargarCsv(r.reporte);
      if (r.liquidacion) setTimeout(() => descargarCsv(r.liquidacion!), 400);
      toast.success(
        `Simulación generada: ${r.ventas} contracargo(s)${r.liquidacion ? " + liquidación negativa" : ""}.` +
          (r.sinTid > 0 ? ` ${r.sinTid} venta(s) sin site_transaction_id se saltearon.` : ""),
      );
      if (r.lotesSinEstablecimiento.length > 0) {
        toast.warning(`Sin establecimiento cargado: ${r.lotesSinEstablecimiento.join(", ")}. La liquidación usará 00000000.`);
      }
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setGenerando(false);
    }
  };

  return (
    <ModalDialog
      open
      onClose={onClose}
      size="xl"
      title="CSV de simulación de contracargos"
      description="Arma el reporte de Contracargos y Devoluciones de Payway con ventas reales de lotes Programados o Pendientes, para probar el flujo como un caso real."
    >
      <div className="space-y-4">
        {!fijos && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex gap-1.5">
              {(["Pendiente", "Programado"] as const).map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    setEstado(e);
                    setSel([]);
                  }}
                  className={`h-8 px-3 rounded-full border text-xs font-semibold ${
                    estado === e ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"
                  }`}
                >
                  {e === "Pendiente" ? "Pendientes (llegaron en el archivo)" : "Programadas (proyección)"}
                </button>
              ))}
            </div>
            <input
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder="Buscar comercio, legajo o código…"
              className="h-9 flex-1 min-w-[200px] rounded-md border bg-background px-3 text-sm"
            />
          </div>
        )}

        <div className="max-h-72 overflow-y-auto rounded-lg border">
          {q.isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Cargando lotes…</p>
          ) : q.isError ? (
            <p className="p-4 text-sm text-red-700">{errMsg(q.error)}</p>
          ) : lotes.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No hay lotes Programados o Pendientes con ese filtro.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 text-xs text-muted-foreground">
                <tr className="text-left">
                  <th className="px-3 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={lotes.length > 0 && lotes.every((l) => sel.includes(l.id))}
                      onChange={(e) => setSel(e.target.checked ? lotes.map((l) => l.id) : [])}
                    />
                  </th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Comercio</th>
                  <th className="px-3 py-2">Bandera / lote</th>
                  <th className="px-3 py-2 text-right">Ops</th>
                  <th className="px-3 py-2 text-right">Bruto</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lotes.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/30">
                    <td className="px-3 py-1.5">
                      <input
                        type="checkbox"
                        checked={sel.includes(l.id)}
                        onChange={(e) => setSel(e.target.checked ? [...sel, l.id] : sel.filter((x) => x !== l.id))}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-xs">{fecha(l.fecha)}</td>
                    <td className="px-3 py-1.5">{l.comercio_nombre}</td>
                    <td className="px-3 py-1.5 text-xs">
                      {l.bandera} · <span className="font-mono">{l.codigo}</span>
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">{l.cantidad_operaciones}</td>
                    <td className="px-3 py-1.5 text-right">
                      <Monto v={l.importe_bruto} />
                    </td>
                    <td className="px-3 py-1.5 text-xs">{l.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="block text-xs font-semibold text-muted-foreground mb-1">Ventas por lote</span>
            <input
              type="number"
              min={1}
              max={20}
              value={ventasPorLote}
              onChange={(e) => setVentasPorLote(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              className="h-9 w-full rounded-md border bg-background px-3"
            />
          </label>
          <label className="text-sm">
            <span className="block text-xs font-semibold text-muted-foreground mb-1">Importe del contracargo</span>
            <select
              value={modo}
              onChange={(e) => setModo(e.target.value as "total" | "parcial")}
              className="h-9 w-full rounded-md border bg-background px-2"
            >
              <option value="total">Total de la venta</option>
              <option value="parcial">Parcial (50%)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm pt-5">
            <input type="checkbox" checked={conLiquidacion} onChange={(e) => setConLiquidacion(e.target.checked)} />
            También el CSV de liquidación con el renglón negativo
          </label>
        </div>

        <div className="flex gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
          <Info size={14} className="mt-0.5 shrink-0" />
          <div>
            Cómo probar: 1) subí el reporte en <b>Contracargos › Importar</b>: el contracargo queda "Retención programada" si el lote
            no se acreditó, o se debita del saldo si ya se acreditó. 2) Acreditá el lote: el neto baja por la retención. 3) Subí la
            liquidación negativa en <b>Lotes › Cargar CSV</b>: se vincula al contracargo y lo ya retenido cubre el descuento de Payway.
            4) Cerralo como "Cerrado acreditado" para ver la devolución al comercio.
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <BtnOutline onClick={onClose}>Cancelar</BtnOutline>
          <BtnPrimary disabled={sel.length === 0 || generando} onClick={() => void generar()}>
            <Download size={15} /> {generando ? "Generando…" : `Descargar (${sel.length} lote${sel.length === 1 ? "" : "s"})`}
          </BtnPrimary>
        </div>
      </div>
    </ModalDialog>
  );
}
