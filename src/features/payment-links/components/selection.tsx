import { useMemo, useState } from "react";
import {
  Amount,
  MerchantPicker,
  StatusBatch,
  date,
  errMsg,
  todayIso,
} from "@/features/payment-links/components/credits-common";
import { useQuery } from "@tanstack/react-query";
import { QK_ACRED, listBatchesV2, type BatchV2 } from "@/features/payment-links/credits.supabase";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/form-controls";
import { BtnOutline, BtnPrimary } from "@/shared/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { GrupoRows } from "./execution-parts";

export function Selection({
  sel,
  setSel,
  onSiguiente,
  revisando,
}: {
  sel: Set<string>;
  setSel: (s: Set<string>) => void;
  onSiguiente: () => void;
  revisando: boolean;
}) {
  const [to, setTo] = useState(todayIso());
  const [merchant, setMerchant] = useState("");
  const [incluirNegativos, setIncluirNegativos] = useState(false);
  const [showNoEligibles, setShowNoEligibles] = useState(false);

  const q = useQuery({
    queryKey: [...QK_ACRED, "ejecucion-candidatos", to, merchant],
    queryFn: () =>
      listBatchesV2(
        { hasta: to, comercioId: merchant || undefined, estado: "Pendiente", origen: "archivo" },
        0,
        1000,
      ),
  });
  // Los lotes que vienen ya elegidos desde otro listado se traen aparte, por si quedan fuera del filtro.
  const preQ = useQuery({
    queryKey: [...QK_ACRED, "ejecucion-preseleccion", [...sel].sort().join(",")],
    queryFn: () => listBatchesV2({ ids: [...sel] }, 0, 1000),
    enabled: sel.size > 0,
  });

  const batches = useMemo(() => {
    const m = new Map<string, BatchV2>();
    for (const l of [...(preQ.data?.rows ?? []), ...(q.data?.rows ?? [])]) m.set(l.id, l);
    return [...m.values()].filter(
      (l) =>
        (showNoEligibles || l.elegible) && (incluirNegativos || !l.es_negativo || sel.has(l.id)),
    );
  }, [q.data, preQ.data, showNoEligibles, incluirNegativos, sel]);

  const eligibles = batches.filter((l) => l.elegible && (incluirNegativos || !l.es_negativo));
  const grupos = useMemo(() => {
    const m = new Map<string, BatchV2[]>();
    for (const l of batches) {
      const k = `${l.fecha}|${l.comercio_id}`;
      m.set(k, [...(m.get(k) ?? []), l]);
    }
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [batches]);

  const selBatches = batches.filter((l) => sel.has(l.id));
  const toggle = (ids: string[], on: boolean) => {
    const n = new Set(sel);
    ids.forEach((id) => (on ? n.add(id) : n.delete(id)));
    setSel(n);
  };

  return (
    <div className="space-y-3">
      <Card className="p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-semibold mb-1 block">Fecha de pago hasta</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="min-w-[260px]">
          <label className="text-xs font-semibold mb-1 block">Comercio</label>
          <MerchantPicker value={merchant} onChange={(id) => setMerchant(id)} />
        </div>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={incluirNegativos}
            onChange={(e) => setIncluirNegativos(e.target.checked)}
          />{" "}
          Incluir lotes negativos
        </label>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={showNoEligibles}
            onChange={(e) => setShowNoEligibles(e.target.checked)}
          />{" "}
          Mostrar no elegibles
        </label>
        <div className="flex-1" />
        <BtnOutline
          onClick={() =>
            toggle(
              eligibles.map((l) => l.id),
              true,
            )
          }
          disabled={eligibles.length === 0}
        >
          Seleccionar los {eligibles.length} elegibles del filtro
        </BtnOutline>
      </Card>

      {q.isLoading ? (
        <Card className="text-sm text-muted-foreground">Cargando…</Card>
      ) : q.isError ? (
        <Card className="text-sm text-red-700">{errMsg(q.error)}</Card>
      ) : grupos.length === 0 ? (
        <Card className="text-sm text-muted-foreground">
          No hay lotes Pendiente listos para acreditar con este filtro.
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="max-h-[560px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 text-xs text-muted-foreground">
                <tr className="text-left">
                  <th className="px-3 py-2 w-8" />
                  <th className="px-3 py-2">Lote</th>
                  <th className="px-3 py-2">Bandera</th>
                  <th className="px-3 py-2 text-right">Neto Payway</th>
                  <th className="px-3 py-2 text-right">Descuentos</th>
                  <th className="px-3 py-2 text-right">Compensaciones</th>
                  <th className="px-3 py-2 text-right">Neto a acreditar</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {grupos.map(([k, ls]) => {
                  const eleg = ls.filter((l) => l.elegible).map((l) => l.id);
                  const todo = eleg.length > 0 && eleg.every((id) => sel.has(id));
                  return (
                    <GrupoRows key={k}>
                      <tr className="bg-muted/30 border-t">
                        <td className="px-3 py-1.5">
                          <input
                            type="checkbox"
                            checked={todo}
                            disabled={eleg.length === 0}
                            onChange={() => toggle(eleg, !todo)}
                          />
                        </td>
                        <td colSpan={5} className="px-3 py-1.5 text-xs font-semibold">
                          {date(ls[0].fecha)} · {ls[0].comercio_nombre ?? ls[0].comercio_usuario}{" "}
                          <span className="font-mono text-muted-foreground">
                            {ls[0].comercio_legajo}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-right text-xs">
                          <Amount
                            v={ls.reduce((a, l) => a + Number(l.neto_a_acreditar ?? 0), 0)}
                            strong
                          />
                        </td>
                        <td />
                      </tr>
                      {ls.map((l) => (
                        <tr key={l.id} className="border-t">
                          <td className="px-3 py-1.5">
                            <span title={l.elegible ? undefined : (l.motivo_no_elegible ?? "")}>
                              <input
                                type="checkbox"
                                checked={sel.has(l.id)}
                                disabled={!l.elegible}
                                onChange={() => toggle([l.id], !sel.has(l.id))}
                              />
                            </span>
                          </td>
                          <td className="px-3 py-1.5 font-mono text-xs">{l.codigo}</td>
                          <td className="px-3 py-1.5 text-xs">{l.bandera}</td>
                          <td className="px-3 py-1.5 text-right">
                            <Amount v={l.neto_payway} />
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <Amount
                              v={
                                -(
                                  Number(l.tasa_molipay_monto) +
                                  Number(l.iva_tasa_monto ?? 0) +
                                  Number(l.comision_cierre_lote_monto ?? 0) +
                                  Number(l.impuestos ?? 0)
                                )
                              }
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <Amount
                              v={
                                -(
                                  Number(l.retencion_contracargos ?? 0) +
                                  Number(l.compensacion_adelantos) +
                                  Number(l.recuperacion_deuda)
                                )
                              }
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <Amount v={l.neto_a_acreditar} strong />
                          </td>
                          <td className="px-3 py-1.5">
                            <StatusBatch lote={l} />
                          </td>
                        </tr>
                      ))}
                    </GrupoRows>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="sticky bottom-3 z-10">
        <Card className="p-3 flex flex-wrap items-center justify-between gap-2 shadow-lg">
          <div className="text-sm flex flex-wrap gap-x-4">
            <span>
              <b>{sel.size}</b> lote(s)
            </span>
            <span>{new Set(selBatches.map((l) => l.comercio_id)).size} comercio(s)</span>
            <span>
              Neto Payway:{" "}
              <Amount v={selBatches.reduce((a, l) => a + Number(l.neto_payway ?? 0), 0)} />
            </span>
            <span>
              Neto a acreditar:{" "}
              <Amount
                v={selBatches
                  .filter((l) => !l.es_negativo)
                  .reduce((a, l) => a + Number(l.neto_a_acreditar ?? 0), 0)}
                strong
              />
            </span>
            {selBatches.some((l) => l.es_negativo) && (
              <span className="text-red-700">
                Negativos:{" "}
                <Amount
                  v={selBatches
                    .filter((l) => l.es_negativo)
                    .reduce((a, l) => a + Number(l.neto_payway ?? 0), 0)}
                />
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <BtnOutline onClick={() => setSel(new Set())} disabled={sel.size === 0}>
              Limpiar
            </BtnOutline>
            <BtnPrimary onClick={onSiguiente} disabled={sel.size === 0 || revisando}>
              {revisando ? <Loader2 size={15} className="animate-spin" /> : null} Siguiente: revisar{" "}
              <ArrowRight size={15} />
            </BtnPrimary>
          </div>
        </Card>
      </div>
    </div>
  );
}
