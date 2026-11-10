import { useCan } from "@/features/rbac/rbac.hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  QK_ACRED,
  limpiarSelection,
  readSelection,
  revisarCredit,
  runCredit,
  type ResultExecution,
  type Revision,
} from "@/features/payment-links/credits.supabase";
import { Amount, date, errMsg, todayIso } from "@/features/payment-links/components/credits-common";
import {
  ConfirmacionesCredit,
  confirmacionesCompletas,
  type Confirmaciones,
} from "@/features/payment-links/components/batch-breakdown";
import { toast } from "sonner";
import { Card } from "@/shared/ui/card";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { formatDateTime } from "@/shared/lib/format";
import { Input, Select } from "@/shared/ui/form-controls";
import { BtnOutline, BtnPrimary } from "@/shared/ui/button";
import { type Step } from "@/features/payment-links/execution.types";
import { Line, Steps } from "./execution-parts";
import { Selection } from "./selection";
import { Results } from "./results";

export function Asistente() {
  const { can } = useCan();
  const puede = can("modificar", "comercios");
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [sel, setSel] = useState<Set<string>>(() => new Set(readSelection()));
  const [rev, setRev] = useState<Revision | null>(null);
  const [revisando, setRevisando] = useState(false);
  const [quitados, setQuitados] = useState<Set<string>>(new Set());
  const [dateAcr, setDateAcr] = useState(todayIso());
  const [conf, setConf] = useState<Confirmaciones>({
    totales: false,
    compensaciones: false,
    irreversible: false,
  });
  const [text, setText] = useState("");
  const [ejecutando, setEjecutando] = useState(false);
  const [result, setResult] = useState<ResultExecution | null>(null);

  // La seleccion que vino de otro listado ya se uso: no se arrastra a la proxima visita.
  useEffect(() => limpiarSelection(), []);

  const revisar = async () => {
    if (sel.size === 0) return;
    setRevisando(true);
    try {
      const r = await revisarCredit([...sel]);
      setRev(r);
      setQuitados(new Set());
      setConf({ totales: false, compensaciones: false, irreversible: false });
      setText("");
      setStep(2);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setRevisando(false);
    }
  };

  // Lo que efectivamente se ejecuta: lotes revisados de comercios no quitados.
  const batchesARun = (rev?.lotes ?? []).filter((l) => !quitados.has(l.comercio_id));
  const totalesEj = useMemo(() => {
    const s = (fn: (l: (typeof batchesARun)[number]) => number) =>
      Math.round(batchesARun.reduce((a, l) => a + fn(l), 0) * 100) / 100;
    return {
      lotes: batchesARun.length,
      comercios: new Set(batchesARun.map((l) => l.comercio_id)).size,
      bruto: s((l) => Number(l.bruto)),
      netoPayway: s((l) => Number(l.neto_payway)),
      tasa: s((l) => Number(l.tasa_monto) + Number(l.iva_tasa_monto)),
      cierre: s((l) => Number(l.cierre_monto)),
      impuestos: s((l) => Number(l.impuestos_monto ?? 0)),
      comp: s((l) => Number(l.compensacion_adelantos)),
      recup: s((l) => Number(l.recuperacion_deuda)),
      neto: s((l) => (Number(l.neto_payway) >= 0 ? Number(l.neto_a_acreditar) : 0)),
      negativos: batchesARun.filter((l) => Number(l.neto_payway) < 0).length,
      negativosMonto: s((l) => (Number(l.neto_payway) < 0 ? Number(l.neto_payway) : 0)),
    };
  }, [batchesARun]);
  const available = Number(rev?.recaudadora.pendiente_acreditar ?? 0);
  const alcanza = totalesEj.netoPayway <= available;

  const run = async () => {
    if (!confirmacionesCompletas(conf, text) || batchesARun.length === 0) return;
    setEjecutando(true);
    try {
      const hashes = Object.fromEntries(batchesARun.map((l) => [l.lote_id, l.hash]));
      const r = await runCredit({
        ids: batchesARun.map((l) => l.lote_id),
        fecha: dateAcr,
        confirmaciones: conf,
        texto: text,
        hashes,
      });
      setResult(r);
      setStep(4);
      qc.invalidateQueries({ queryKey: QK_ACRED });
      if (r.errores === 0 && r.omitidos === 0)
        toast.success(`${r.acreditados} lote(s) acreditados.`);
      else
        toast.warning(
          `${r.acreditados} acreditado(s), ${r.errores} con error, ${r.omitidos} omitido(s).`,
        );
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setEjecutando(false);
    }
  };

  const reintentar = (ids: string[]) => {
    setSel(new Set(ids));
    setRev(null);
    setResult(null);
    setStep(1);
  };

  return (
    <div className="space-y-4">
      <Steps paso={step} />
      {step === 1 && (
        <Selection
          sel={sel}
          setSel={setSel}
          onSiguiente={() => void revisar()}
          revisando={revisando}
        />
      )}

      {step === 2 && rev && (
        <div className="space-y-4">
          {rev.omitidos.length > 0 && (
            <Card className="border-amber-300 text-sm">
              <div className="font-semibold mb-1 flex items-center gap-1.5">
                <AlertTriangle size={14} /> {rev.omitidos.length} lote(s) quedaron fuera (dejaron de
                ser elegibles)
              </div>
              <ul className="text-xs text-muted-foreground list-disc pl-5">
                {rev.omitidos.slice(0, 10).map((o) => (
                  <li key={o.lote_id}>
                    {o.codigo}: {o.motivo}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr className="text-left">
                    <th className="px-3 py-2">Comercio</th>
                    <th className="px-3 py-2 text-right">Lotes</th>
                    <th className="px-3 py-2">Banderas</th>
                    <th className="px-3 py-2 text-right">Neto Payway</th>
                    <th className="px-3 py-2 text-right">Tasa + IVA</th>
                    <th className="px-3 py-2 text-right">Cierre 0,45%</th>
                    <th className="px-3 py-2 text-right">Impuestos</th>
                    <th className="px-3 py-2 text-right">Adelantos</th>
                    <th className="px-3 py-2 text-right">Contracargos / deuda</th>
                    <th className="px-3 py-2 text-right">Neto a acreditar</th>
                    <th className="px-3 py-2 text-right">Saldo actual</th>
                    <th className="px-3 py-2 text-right">Saldo después</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rev.comercios.map((c) => {
                    const fuera = quitados.has(c.comercio_id);
                    const alert =
                      c.saldo_despues < 0 ||
                      c.deuda_actual > 0 ||
                      c.compensacion_adelantos > 0 ||
                      c.recuperacion_deuda > 0;
                    return (
                      <tr
                        key={c.comercio_id}
                        className={fuera ? "opacity-40" : alert ? "bg-amber-50/60" : ""}
                      >
                        <td className="px-3 py-2">
                          <div className="text-sm font-semibold">{c.comercio}</div>
                          <div className="text-[11px] font-mono text-muted-foreground">
                            {c.legajo}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">{c.lotes}</td>
                        <td className="px-3 py-2 text-xs">{c.banderas.join(", ")}</td>
                        <td className="px-3 py-2 text-right">
                          <Amount v={c.neto_payway} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Amount v={-(c.tasa + c.iva_tasa)} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Amount v={-c.cierre} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Amount v={-(c.impuestos ?? 0)} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Amount v={-c.compensacion_adelantos} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Amount v={-c.recuperacion_deuda} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Amount v={c.neto_a_acreditar} strong />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Amount v={c.saldo_actual} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Amount v={c.saldo_despues} strong />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline"
                            onClick={() =>
                              setQuitados((s) => {
                                const n = new Set(s);
                                if (n.has(c.comercio_id)) n.delete(c.comercio_id);
                                else n.add(c.comercio_id);
                                return n;
                              })
                            }
                          >
                            {fuera ? "Volver a incluir" : "Quitar"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="space-y-2 text-sm">
              <h3 className="font-semibold">Resumen</h3>
              <Line
                l="Lotes y comercios"
                v={`${totalesEj.lotes} lote(s) · ${totalesEj.comercios} comercio(s)`}
              />
              <Line l="Bruto" v={<Amount v={totalesEj.bruto} />} />
              <Line l="Neto de Payway" v={<Amount v={totalesEj.netoPayway} />} />
              <Line l="Tasa por bandera (con IVA)" v={<Amount v={-totalesEj.tasa} />} />
              <Line l="Cierre de lote 0,45% [A-2]" v={<Amount v={-totalesEj.cierre} />} />
              <Line l="Impuestos asignados" v={<Amount v={-totalesEj.impuestos} />} />
              <Line l="Compensación de adelantos" v={<Amount v={-totalesEj.comp} />} />
              <Line l="Recuperación de contracargos / deuda" v={<Amount v={-totalesEj.recup} />} />
              <div className="border-t pt-2">
                <Line
                  l="Neto a acreditar"
                  v={<Amount v={totalesEj.neto} strong className="text-base" />}
                />
              </div>
              {totalesEj.negativos > 0 && (
                <Line
                  l={`Lotes negativos (${totalesEj.negativos})`}
                  v={<Amount v={totalesEj.negativosMonto} />}
                />
              )}
              <Line
                l="Disponible en la recaudadora (pendiente de acreditar)"
                v={<Amount v={available} />}
              />
              <div
                className={`rounded-md px-3 py-2 text-sm font-semibold ${alcanza ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}
              >
                {alcanza ? "Alcanza" : "No alcanza: no se puede ejecutar"}
              </div>
            </Card>

            <Card className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block">
                    Cuenta de origen de los fondos
                  </label>
                  <Select defaultValue="payway">
                    <option value="payway">Recaudadora de Payway</option>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Último corte: {formatDateTime(rev.recaudadora.ultimo_corte)}. Las recaudadoras
                    de CBU e impuestos nunca se ofrecen.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Fecha de acreditación</label>
                  <Input type="date" value={dateAcr} onChange={(e) => setDateAcr(e.target.value)} />
                </div>
              </div>
              <ConfirmacionesCredit
                value={conf}
                onChange={setConf}
                texto={text}
                onTexto={setText}
              />
              <div className="flex justify-between gap-2">
                <BtnOutline onClick={() => setStep(1)}>
                  <ArrowLeft size={15} /> Volver
                </BtnOutline>
                <BtnPrimary
                  onClick={() => setStep(3)}
                  disabled={
                    !alcanza ||
                    batchesARun.length === 0 ||
                    !conf.totales ||
                    !conf.compensaciones ||
                    !conf.irreversible
                  }
                >
                  Siguiente <ArrowRight size={15} />
                </BtnPrimary>
              </div>
            </Card>
          </div>
        </div>
      )}

      {step === 3 && rev && (
        <Card className="space-y-4 max-w-2xl">
          <h3 className="font-semibold">Confirmación</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Line l="Neto a acreditar" v={<Amount v={totalesEj.neto} strong />} />
            <Line l="Lotes / comercios" v={`${totalesEj.lotes} / ${totalesEj.comercios}`} />
            <Line l="Cuenta de origen" v="Recaudadora de Payway" />
            <Line l="Fecha" v={date(dateAcr)} />
          </div>
          <ConfirmacionesCredit value={conf} onChange={setConf} texto={text} onTexto={setText} />
          <div className="flex justify-between gap-2">
            <BtnOutline onClick={() => setStep(2)}>
              <ArrowLeft size={15} /> Volver
            </BtnOutline>
            <BtnPrimary
              onClick={() => void run()}
              disabled={!puede || ejecutando || !confirmacionesCompletas(conf, text) || !alcanza}
            >
              {ejecutando ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <CheckCircle2 size={15} />
              )}{" "}
              Ejecutar acreditación
            </BtnPrimary>
          </div>
        </Card>
      )}

      {step === 4 && result && (
        <Results ejecucionId={result.ejecucion_id} onReintentar={reintentar} resumen={result} />
      )}
    </div>
  );
}
