import { useMemo,useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download,Info } from "lucide-react";
import { ModalDialog } from "@/shared/ui/modal-dialog";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { QK_ACRED,listBatchesV2,type BatchV2 } from "@/features/payment-links/credits.supabase";
import { downloadCsv } from "@/features/payment-links/importers/chargeback-real-csv";
import { generateSimulationChargebacks } from "@/features/payment-links/importers/chargeback-batches-csv";
import { Amount,errMsg,date } from "@/features/payment-links/components/credits-common";

/**
 * Descarga un reporte de contracargos simulado (formato Payway) con ventas
 * reales de lotes Programados o Pendientes, y opcionalmente el archivo de
 * liquidacion con el renglon negativo de esas ventas. Sirve para probar el
 * flujo como si fueran casos reales:
 *   1. subir el reporte en Contracargos > Importar -> retencion programada;
 *   2. acreditar el lote -> el neto baja por la retencion;
 *   3. subir la liquidacion negativa -> se vincula, no se cobra dos veces.
 */
export function SimulateChargebacksModal({
  loteIds: batchIds,
  onClose,
}: {
  loteIds?: string[];
  onClose: () => void;
}) {
  const fixeds = !!batchIds?.length;
  const [status, setStatus] = useState<"Pendiente" | "Programado">("Pendiente");
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState<string[]>(batchIds ?? []);
  const [salesByBatch, setSalesByBatch] = useState(1);
  const [modo, setModo] = useState<"total" | "parcial">("total");
  const [withSettlement, setWithSettlement] = useState(true);
  const [generating, setGenerating] = useState(false);

  const q = useQuery({
    queryKey: [...QK_ACRED, "simular-contracargos", fixeds ? batchIds : status, search],
    queryFn: () =>
      listBatchesV2(
        fixeds ? { ids: batchIds } : { estado: status, search: search || undefined },
        0,
        50,
      ).then((r) => r.rows),
  });
  const batches = useMemo(
    () =>
      (q.data ?? []).filter((l: BatchV2) => l.estado === "Programado" || l.estado === "Pendiente"),
    [q.data],
  );

  const generate = async () => {
    const elegidos = batches.filter((l) => sel.includes(l.id));
    setGenerating(true);
    try {
      const r = await generateSimulationChargebacks(
        elegidos.map((l) => ({ id: l.id, codigo: l.codigo, bandera: l.bandera })),
        { ventasPorLote: salesByBatch, modo, conLiquidacion: withSettlement },
      );
      downloadCsv(r.reporte);
      if (r.liquidacion) setTimeout(() => downloadCsv(r.liquidacion!), 400);
      toast.success(
        `Simulación generada: ${r.ventas} contracargo(s)${r.liquidacion ? " + liquidación negativa" : ""}.` +
          (r.sinTid > 0 ? ` ${r.sinTid} venta(s) sin site_transaction_id se saltearon.` : ""),
      );
      if (r.lotesSinEstablecimiento.length > 0) {
        toast.warning(
          `Sin establecimiento cargado: ${r.lotesSinEstablecimiento.join(", ")}. La liquidación usará 00000000.`,
        );
      }
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setGenerating(false);
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
        {!fixeds && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex gap-1.5">
              {(["Pendiente", "Programado"] as const).map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    setStatus(e);
                    setSel([]);
                  }}
                  className={`h-8 px-3 rounded-full border text-xs font-semibold ${
                    status === e
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card hover:bg-muted"
                  }`}
                >
                  {e === "Pendiente"
                    ? "Pendientes (llegaron en el archivo)"
                    : "Programadas (proyección)"}
                </button>
              ))}
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
          ) : batches.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No hay lotes Programados o Pendientes con ese filtro.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 text-xs text-muted-foreground">
                <tr className="text-left">
                  <th className="px-3 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={batches.length > 0 && batches.every((l) => sel.includes(l.id))}
                      onChange={(e) => setSel(e.target.checked ? batches.map((l) => l.id) : [])}
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
                {batches.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/30">
                    <td className="px-3 py-1.5">
                      <input
                        type="checkbox"
                        checked={sel.includes(l.id)}
                        onChange={(e) =>
                          setSel(e.target.checked ? [...sel, l.id] : sel.filter((x) => x !== l.id))
                        }
                      />
                    </td>
                    <td className="px-3 py-1.5 text-xs">{date(l.fecha)}</td>
                    <td className="px-3 py-1.5">{l.comercio_nombre}</td>
                    <td className="px-3 py-1.5 text-xs">
                      {l.bandera} · <span className="font-mono">{l.codigo}</span>
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">{l.cantidad_operaciones}</td>
                    <td className="px-3 py-1.5 text-right">
                      <Amount v={l.importe_bruto} />
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
            <span className="block text-xs font-semibold text-muted-foreground mb-1">
              Ventas por lote
            </span>
            <input
              type="number"
              min={1}
              max={20}
              value={salesByBatch}
              onChange={(e) =>
                setSalesByBatch(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
              }
              className="h-9 w-full rounded-md border bg-background px-3"
            />
          </label>
          <label className="text-sm">
            <span className="block text-xs font-semibold text-muted-foreground mb-1">
              Importe del contracargo
            </span>
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
            <input
              type="checkbox"
              checked={withSettlement}
              onChange={(e) => setWithSettlement(e.target.checked)}
            />
            También el CSV de liquidación con el renglón negativo
          </label>
        </div>

        <div className="flex gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
          <Info size={14} className="mt-0.5 shrink-0" />
          <div>
            Cómo probar: 1) subí el reporte en <b>Contracargos › Importar</b>: el contracargo queda
            "Retención programada" si el lote no se acreditó, o se debita del saldo si ya se
            acreditó. 2) Acreditá el lote: el neto baja por la retención. 3) Subí la liquidación
            negativa en <b>Lotes › Cargar CSV</b>: se vincula al contracargo y lo ya retenido cubre
            el descuento de Payway. 4) Cerralo como "Cerrado acreditado" para ver la devolución al
            comercio.
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <BtnOutline onClick={onClose}>Cancelar</BtnOutline>
          <BtnPrimary disabled={sel.length === 0 || generating} onClick={() => void generate()}>
            <Download size={15} />{" "}
            {generating
              ? "Generando…"
              : `Descargar (${sel.length} lote${sel.length === 1 ? "" : "s"})`}
          </BtnPrimary>
        </div>
      </div>
    </ModalDialog>
  );
}
