import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, History, Loader2, RotateCcw, XCircle } from "lucide-react";
import { PageHeader, Badge, BtnOutline, BtnPrimary, Card, Input } from "@/components/portal-shell";
import { PermissionGuard } from "@/components/permission-guard";
import { ComercioPicker, EstadoLote, Monto, fecha, fechaHora, hoyIso, errMsg } from "@/components/acreditaciones/comunes";
import { ConfirmacionesAcreditacion, confirmacionesCompletas, type Confirmaciones } from "@/components/acreditaciones/lote-apertura";
import { useCan } from "@/lib/permissions";
import {
  QK_ACRED,
  ejecutarAcreditacion,
  itemsDeEjecucion,
  guardarSeleccion,
  leerSeleccion,
  limpiarSeleccion,
  listEjecuciones,
  listLotesV2,
  revisarAcreditacion,
  type LoteV2,
  type ResultadoEjecucion,
  type Revision,
} from "@/lib/api/acreditaciones";

const searchSchema = z.object({ ejecucion: z.string().optional(), vista: z.enum(["historial"]).optional() });

export const Route = createFileRoute("/admin/comercios/link-pago/ejecucion")({
  validateSearch: searchSchema,
  component: Page,
  head: () => ({
    meta: [
      { title: "Ejecución masiva — Links de Pago — Admin — Moli" },
      { name: "description", content: "Acreditación de varios lotes en una sola operación." },
    ],
  }),
});

type Paso = 1 | 2 | 3 | 4;

function Page() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/comercios/link-pago/ejecucion" });
  const historial = search.vista === "historial" || !!search.ejecucion;

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Ejecución masiva de acreditaciones"
        description="Seleccionar, revisar, confirmar y ver resultados. Nada se acredita hasta el paso 3, y solo se llega si los números cierran."
        action={
          historial ? (
            <BtnOutline onClick={() => void navigate({ search: {} })}>Nueva ejecución</BtnOutline>
          ) : (
            <BtnOutline onClick={() => void navigate({ search: { vista: "historial" } })}>
              <History size={15} /> Historial de ejecuciones
            </BtnOutline>
          )
        }
      />
      {historial ? <Historial ejecucionId={search.ejecucion} /> : <Asistente />}
    </PermissionGuard>
  );
}

function Asistente() {
  const { can } = useCan();
  const puede = can("modificar", "comercios");
  const qc = useQueryClient();
  const [paso, setPaso] = useState<Paso>(1);
  const [sel, setSel] = useState<Set<string>>(() => new Set(leerSeleccion()));
  const [rev, setRev] = useState<Revision | null>(null);
  const [revisando, setRevisando] = useState(false);
  const [quitados, setQuitados] = useState<Set<string>>(new Set());
  const [fechaAcr, setFechaAcr] = useState(hoyIso());
  const [conf, setConf] = useState<Confirmaciones>({ totales: false, compensaciones: false, irreversible: false });
  const [texto, setTexto] = useState("");
  const [ejecutando, setEjecutando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoEjecucion | null>(null);

  // La seleccion que vino de otro listado ya se uso: no se arrastra a la proxima visita.
  useEffect(() => limpiarSeleccion(), []);

  const revisar = async () => {
    if (sel.size === 0) return;
    setRevisando(true);
    try {
      const r = await revisarAcreditacion([...sel]);
      setRev(r);
      setQuitados(new Set());
      setConf({ totales: false, compensaciones: false, irreversible: false });
      setTexto("");
      setPaso(2);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setRevisando(false);
    }
  };

  // Lo que efectivamente se ejecuta: lotes revisados de comercios no quitados.
  const lotesAEjecutar = (rev?.lotes ?? []).filter((l) => !quitados.has(l.comercio_id));
  const totalesEj = useMemo(() => {
    const s = (fn: (l: (typeof lotesAEjecutar)[number]) => number) => Math.round(lotesAEjecutar.reduce((a, l) => a + fn(l), 0) * 100) / 100;
    return {
      lotes: lotesAEjecutar.length,
      comercios: new Set(lotesAEjecutar.map((l) => l.comercio_id)).size,
      bruto: s((l) => Number(l.bruto)),
      netoPayway: s((l) => Number(l.neto_payway)),
      tasa: s((l) => Number(l.tasa_monto) + Number(l.iva_tasa_monto)),
      cierre: s((l) => Number(l.cierre_monto)),
      impuestos: s((l) => Number(l.impuestos_monto ?? 0)),
      comp: s((l) => Number(l.compensacion_adelantos)),
      recup: s((l) => Number(l.recuperacion_deuda)),
      neto: s((l) => (Number(l.neto_payway) >= 0 ? Number(l.neto_a_acreditar) : 0)),
      negativos: lotesAEjecutar.filter((l) => Number(l.neto_payway) < 0).length,
      negativosMonto: s((l) => (Number(l.neto_payway) < 0 ? Number(l.neto_payway) : 0)),
    };
  }, [lotesAEjecutar]);
  const disponible = Number(rev?.recaudadora.pendiente_acreditar ?? 0);
  const alcanza = totalesEj.netoPayway <= disponible;

  const ejecutar = async () => {
    if (!confirmacionesCompletas(conf, texto) || lotesAEjecutar.length === 0) return;
    setEjecutando(true);
    try {
      const hashes = Object.fromEntries(lotesAEjecutar.map((l) => [l.lote_id, l.hash]));
      const r = await ejecutarAcreditacion({ ids: lotesAEjecutar.map((l) => l.lote_id), fecha: fechaAcr, confirmaciones: conf, texto, hashes });
      setResultado(r);
      setPaso(4);
      qc.invalidateQueries({ queryKey: QK_ACRED });
      if (r.errores === 0 && r.omitidos === 0) toast.success(`${r.acreditados} lote(s) acreditados.`);
      else toast.warning(`${r.acreditados} acreditado(s), ${r.errores} con error, ${r.omitidos} omitido(s).`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setEjecutando(false);
    }
  };

  const reintentar = (ids: string[]) => {
    setSel(new Set(ids));
    setRev(null);
    setResultado(null);
    setPaso(1);
  };

  return (
    <div className="space-y-4">
      <Pasos paso={paso} />
      {paso === 1 && <Seleccion sel={sel} setSel={setSel} onSiguiente={() => void revisar()} revisando={revisando} />}

      {paso === 2 && rev && (
        <div className="space-y-4">
          {rev.omitidos.length > 0 && (
            <Card className="border-amber-300 text-sm">
              <div className="font-semibold mb-1 flex items-center gap-1.5">
                <AlertTriangle size={14} /> {rev.omitidos.length} lote(s) quedaron fuera (dejaron de ser elegibles)
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
                    const alerta = c.saldo_despues < 0 || c.deuda_actual > 0 || c.compensacion_adelantos > 0 || c.recuperacion_deuda > 0;
                    return (
                      <tr key={c.comercio_id} className={fuera ? "opacity-40" : alerta ? "bg-amber-50/60" : ""}>
                        <td className="px-3 py-2">
                          <div className="text-sm font-semibold">{c.comercio}</div>
                          <div className="text-[11px] font-mono text-muted-foreground">{c.legajo}</div>
                        </td>
                        <td className="px-3 py-2 text-right">{c.lotes}</td>
                        <td className="px-3 py-2 text-xs">{c.banderas.join(", ")}</td>
                        <td className="px-3 py-2 text-right"><Monto v={c.neto_payway} /></td>
                        <td className="px-3 py-2 text-right"><Monto v={-(c.tasa + c.iva_tasa)} /></td>
                        <td className="px-3 py-2 text-right"><Monto v={-c.cierre} /></td>
                        <td className="px-3 py-2 text-right"><Monto v={-(c.impuestos ?? 0)} /></td>
                        <td className="px-3 py-2 text-right"><Monto v={-c.compensacion_adelantos} /></td>
                        <td className="px-3 py-2 text-right"><Monto v={-c.recuperacion_deuda} /></td>
                        <td className="px-3 py-2 text-right"><Monto v={c.neto_a_acreditar} strong /></td>
                        <td className="px-3 py-2 text-right"><Monto v={c.saldo_actual} /></td>
                        <td className="px-3 py-2 text-right"><Monto v={c.saldo_despues} strong /></td>
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
              <Linea l="Lotes y comercios" v={`${totalesEj.lotes} lote(s) · ${totalesEj.comercios} comercio(s)`} />
              <Linea l="Bruto" v={<Monto v={totalesEj.bruto} />} />
              <Linea l="Neto de Payway" v={<Monto v={totalesEj.netoPayway} />} />
              <Linea l="Tasa por bandera (con IVA)" v={<Monto v={-totalesEj.tasa} />} />
              <Linea l="Cierre de lote 0,45% [A-2]" v={<Monto v={-totalesEj.cierre} />} />
              <Linea l="Impuestos asignados" v={<Monto v={-totalesEj.impuestos} />} />
              <Linea l="Compensación de adelantos" v={<Monto v={-totalesEj.comp} />} />
              <Linea l="Recuperación de contracargos / deuda" v={<Monto v={-totalesEj.recup} />} />
              <div className="border-t pt-2">
                <Linea l="Neto a acreditar" v={<Monto v={totalesEj.neto} strong className="text-base" />} />
              </div>
              {totalesEj.negativos > 0 && <Linea l={`Lotes negativos (${totalesEj.negativos})`} v={<Monto v={totalesEj.negativosMonto} />} />}
              <Linea l="Disponible en la recaudadora (pendiente de acreditar)" v={<Monto v={disponible} />} />
              <div className={`rounded-md px-3 py-2 text-sm font-semibold ${alcanza ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                {alcanza ? "Alcanza" : "No alcanza: no se puede ejecutar"}
              </div>
            </Card>

            <Card className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Cuenta de origen de los fondos</label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" defaultValue="payway">
                    <option value="payway">Recaudadora de Payway</option>
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Último corte: {fechaHora(rev.recaudadora.ultimo_corte)}. Las recaudadoras de CBU e impuestos nunca se ofrecen.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Fecha de acreditación</label>
                  <Input type="date" value={fechaAcr} onChange={(e) => setFechaAcr(e.target.value)} />
                  <p className="text-[11px] text-muted-foreground mt-1">No puede ser anterior a la fecha de pago del lote.</p>
                </div>
              </div>
              <ConfirmacionesAcreditacion value={conf} onChange={setConf} texto={texto} onTexto={setTexto} />
              <div className="flex justify-between gap-2">
                <BtnOutline onClick={() => setPaso(1)}>
                  <ArrowLeft size={15} /> Volver
                </BtnOutline>
                <BtnPrimary
                  onClick={() => setPaso(3)}
                  disabled={!alcanza || lotesAEjecutar.length === 0 || !conf.totales || !conf.compensaciones || !conf.irreversible}
                >
                  Siguiente <ArrowRight size={15} />
                </BtnPrimary>
              </div>
            </Card>
          </div>
        </div>
      )}

      {paso === 3 && rev && (
        <Card className="space-y-4 max-w-2xl">
          <h3 className="font-semibold">Confirmación</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Linea l="Neto a acreditar" v={<Monto v={totalesEj.neto} strong />} />
            <Linea l="Lotes / comercios" v={`${totalesEj.lotes} / ${totalesEj.comercios}`} />
            <Linea l="Cuenta de origen" v="Recaudadora de Payway" />
            <Linea l="Fecha" v={fecha(fechaAcr)} />
          </div>
          <ConfirmacionesAcreditacion value={conf} onChange={setConf} texto={texto} onTexto={setTexto} />
          <div className="flex justify-between gap-2">
            <BtnOutline onClick={() => setPaso(2)}>
              <ArrowLeft size={15} /> Volver
            </BtnOutline>
            <BtnPrimary onClick={() => void ejecutar()} disabled={!puede || ejecutando || !confirmacionesCompletas(conf, texto) || !alcanza}>
              {ejecutando ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Ejecutar acreditación
            </BtnPrimary>
          </div>
        </Card>
      )}

      {paso === 4 && resultado && <Resultados ejecucionId={resultado.ejecucion_id} onReintentar={reintentar} resumen={resultado} />}
    </div>
  );
}

function Seleccion({
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
  const [hasta, setHasta] = useState(hoyIso());
  const [comercio, setComercio] = useState("");
  const [incluirNegativos, setIncluirNegativos] = useState(false);
  const [mostrarNoElegibles, setMostrarNoElegibles] = useState(false);

  const q = useQuery({
    queryKey: [...QK_ACRED, "ejecucion-candidatos", hasta, comercio],
    queryFn: () => listLotesV2({ hasta, comercioId: comercio || undefined, estado: "Pendiente", origen: "archivo" }, 0, 1000),
  });
  // Los lotes que vienen ya elegidos desde otro listado se traen aparte, por si quedan fuera del filtro.
  const preQ = useQuery({
    queryKey: [...QK_ACRED, "ejecucion-preseleccion", [...sel].sort().join(",")],
    queryFn: () => listLotesV2({ ids: [...sel] }, 0, 1000),
    enabled: sel.size > 0,
  });

  const lotes = useMemo(() => {
    const m = new Map<string, LoteV2>();
    for (const l of [...(preQ.data?.rows ?? []), ...(q.data?.rows ?? [])]) m.set(l.id, l);
    return [...m.values()].filter((l) => (mostrarNoElegibles || l.elegible) && (incluirNegativos || !l.es_negativo || sel.has(l.id)));
  }, [q.data, preQ.data, mostrarNoElegibles, incluirNegativos, sel]);

  const elegibles = lotes.filter((l) => l.elegible && (incluirNegativos || !l.es_negativo));
  const grupos = useMemo(() => {
    const m = new Map<string, LoteV2[]>();
    for (const l of lotes) {
      const k = `${l.fecha}|${l.comercio_id}`;
      m.set(k, [...(m.get(k) ?? []), l]);
    }
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [lotes]);

  const selLotes = lotes.filter((l) => sel.has(l.id));
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
          <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <div className="min-w-[260px]">
          <label className="text-xs font-semibold mb-1 block">Comercio</label>
          <ComercioPicker value={comercio} onChange={(id) => setComercio(id)} />
        </div>
        <label className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" checked={incluirNegativos} onChange={(e) => setIncluirNegativos(e.target.checked)} /> Incluir lotes negativos
        </label>
        <label className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" checked={mostrarNoElegibles} onChange={(e) => setMostrarNoElegibles(e.target.checked)} /> Mostrar no elegibles
        </label>
        <div className="flex-1" />
        <BtnOutline onClick={() => toggle(elegibles.map((l) => l.id), true)} disabled={elegibles.length === 0}>
          Seleccionar los {elegibles.length} elegibles del filtro
        </BtnOutline>
      </Card>

      {q.isLoading ? (
        <Card className="text-sm text-muted-foreground">Cargando…</Card>
      ) : q.isError ? (
        <Card className="text-sm text-red-700">{errMsg(q.error)}</Card>
      ) : grupos.length === 0 ? (
        <Card className="text-sm text-muted-foreground">No hay lotes Pendiente listos para acreditar con este filtro.</Card>
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
                    <GrupoFilas key={k}>
                      <tr className="bg-muted/30 border-t">
                        <td className="px-3 py-1.5">
                          <input type="checkbox" checked={todo} disabled={eleg.length === 0} onChange={() => toggle(eleg, !todo)} />
                        </td>
                        <td colSpan={5} className="px-3 py-1.5 text-xs font-semibold">
                          {fecha(ls[0].fecha)} · {ls[0].comercio_nombre ?? ls[0].comercio_usuario}{" "}
                          <span className="font-mono text-muted-foreground">{ls[0].comercio_legajo}</span>
                        </td>
                        <td className="px-3 py-1.5 text-right text-xs">
                          <Monto v={ls.reduce((a, l) => a + Number(l.neto_a_acreditar ?? 0), 0)} strong />
                        </td>
                        <td />
                      </tr>
                      {ls.map((l) => (
                        <tr key={l.id} className="border-t">
                          <td className="px-3 py-1.5">
                            <span title={l.elegible ? undefined : (l.motivo_no_elegible ?? "")}>
                              <input type="checkbox" checked={sel.has(l.id)} disabled={!l.elegible} onChange={() => toggle([l.id], !sel.has(l.id))} />
                            </span>
                          </td>
                          <td className="px-3 py-1.5 font-mono text-xs">{l.codigo}</td>
                          <td className="px-3 py-1.5 text-xs">{l.bandera}</td>
                          <td className="px-3 py-1.5 text-right"><Monto v={l.neto_payway} /></td>
                          <td className="px-3 py-1.5 text-right">
                            <Monto v={-(Number(l.tasa_molipay_monto) + Number(l.iva_tasa_monto ?? 0) + Number(l.comision_cierre_lote_monto ?? 0) + Number(l.impuestos ?? 0))} />
                          </td>
                          <td className="px-3 py-1.5 text-right"><Monto v={-(Number(l.retencion_contracargos ?? 0) + Number(l.compensacion_adelantos) + Number(l.recuperacion_deuda))} /></td>
                          <td className="px-3 py-1.5 text-right"><Monto v={l.neto_a_acreditar} strong /></td>
                          <td className="px-3 py-1.5"><EstadoLote lote={l} /></td>
                        </tr>
                      ))}
                    </GrupoFilas>
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
            <span>{new Set(selLotes.map((l) => l.comercio_id)).size} comercio(s)</span>
            <span>
              Neto Payway: <Monto v={selLotes.reduce((a, l) => a + Number(l.neto_payway ?? 0), 0)} />
            </span>
            <span>
              Neto a acreditar: <Monto v={selLotes.filter((l) => !l.es_negativo).reduce((a, l) => a + Number(l.neto_a_acreditar ?? 0), 0)} strong />
            </span>
            {selLotes.some((l) => l.es_negativo) && (
              <span className="text-red-700">
                Negativos: <Monto v={selLotes.filter((l) => l.es_negativo).reduce((a, l) => a + Number(l.neto_payway ?? 0), 0)} />
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <BtnOutline onClick={() => setSel(new Set())} disabled={sel.size === 0}>
              Limpiar
            </BtnOutline>
            <BtnPrimary onClick={onSiguiente} disabled={sel.size === 0 || revisando}>
              {revisando ? <Loader2 size={15} className="animate-spin" /> : null} Siguiente: revisar <ArrowRight size={15} />
            </BtnPrimary>
          </div>
        </Card>
      </div>
    </div>
  );
}

function GrupoFilas({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function Resultados({ ejecucionId, onReintentar, resumen }: { ejecucionId: string; onReintentar?: (ids: string[]) => void; resumen?: ResultadoEjecucion }) {
  const q = useQuery({ queryKey: [...QK_ACRED, "ejecucion-items", ejecucionId], queryFn: () => itemsDeEjecucion(ejecucionId) });
  const [filtro, setFiltro] = useState<"" | "acreditado" | "error" | "omitido">("");
  const [reint, setReint] = useState<Set<string>>(new Set());
  const items = (q.data ?? []).filter((i) => !filtro || i.resultado === filtro);
  const cuenta = (r: string) => (q.data ?? []).filter((i) => i.resultado === r).length;

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Resultados</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge tone="success">Acreditados: {cuenta("acreditado")}</Badge>
          <Badge tone="danger">Con error: {cuenta("error")}</Badge>
          <Badge tone="neutral">Omitidos: {cuenta("omitido")}</Badge>
          {resumen && (
            <span>
              Neto acreditado: <Monto v={resumen.neto_acreditado} strong />
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="">Todos los resultados</option>
          <option value="acreditado">Acreditado</option>
          <option value="error">Error</option>
          <option value="omitido">Omitido</option>
        </select>
        {onReintentar && (
          <BtnOutline onClick={() => onReintentar([...reint])} disabled={reint.size === 0}>
            <RotateCcw size={14} /> Reintentar seleccionados ({reint.size})
          </BtnOutline>
        )}
      </div>
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="text-left">
                <th className="py-1.5 pr-2 w-8" />
                <th className="py-1.5 pr-3">Lote</th>
                <th className="py-1.5 pr-3">Bandera</th>
                <th className="py-1.5 pr-3">Fecha de pago</th>
                <th className="py-1.5 pr-3 text-right">Neto</th>
                <th className="py-1.5 pr-3">Resultado</th>
                <th className="py-1.5">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="py-1.5 pr-2">
                    {i.resultado !== "acreditado" && onReintentar && (
                      <input
                        type="checkbox"
                        checked={reint.has(i.lote_id)}
                        onChange={() =>
                          setReint((s) => {
                            const n = new Set(s);
                            if (n.has(i.lote_id)) n.delete(i.lote_id);
                            else n.add(i.lote_id);
                            return n;
                          })
                        }
                      />
                    )}
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-xs">
                    <Link to="/admin/comercios/link-pago/lotes" search={{ lote: i.lote_id }} className="text-primary hover:underline">
                      {i.lote?.codigo ?? i.lote_id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-3 text-xs">{i.lote?.bandera}</td>
                  <td className="py-1.5 pr-3 text-xs">{fecha(i.lote?.fecha)}</td>
                  <td className="py-1.5 pr-3 text-right">{i.neto_acreditar != null ? <Monto v={i.neto_acreditar} /> : "—"}</td>
                  <td className="py-1.5 pr-3">
                    {i.resultado === "acreditado" ? (
                      <Badge tone="success">Acreditado</Badge>
                    ) : i.resultado === "error" ? (
                      <Badge tone="danger">Error</Badge>
                    ) : (
                      <Badge tone="neutral">Omitido</Badge>
                    )}
                  </td>
                  <td className="py-1.5 text-xs text-muted-foreground">{i.motivo ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Historial({ ejecucionId }: { ejecucionId?: string }) {
  const navigate = useNavigate({ from: "/admin/comercios/link-pago/ejecucion" });
  const q = useQuery({ queryKey: [...QK_ACRED, "ejecuciones"], queryFn: () => listEjecuciones(100) });
  const [reint, setReint] = useState<string[] | null>(null);

  useEffect(() => {
    if (reint) {
      // Reintentar desde el historial abre una ejecucion nueva con esos lotes.
      guardarSeleccion(reint);
      void navigate({ search: {} });
    }
  }, [reint, navigate]);

  return (
    <div className="space-y-4">
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr className="text-left">
              <th className="px-3 py-2">N°</th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Fecha de acreditación</th>
              <th className="px-3 py-2 text-right">Lotes</th>
              <th className="px-3 py-2 text-right">Acreditados</th>
              <th className="px-3 py-2 text-right">Con error</th>
              <th className="px-3 py-2 text-right">Omitidos</th>
              <th className="px-3 py-2 text-right">Neto</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {(q.data ?? []).map((e) => (
              <tr key={e.id} className={e.id === ejecucionId ? "bg-primary/5" : ""}>
                <td className="px-3 py-2 font-mono text-xs">#{e.numero}</td>
                <td className="px-3 py-2 text-xs">{fechaHora(e.created_at)}</td>
                <td className="px-3 py-2 text-xs">{fecha(e.fecha_acreditacion)}</td>
                <td className="px-3 py-2 text-right">{e.totales?.lotes ?? "—"}</td>
                <td className="px-3 py-2 text-right">{e.totales?.acreditados ?? 0}</td>
                <td className="px-3 py-2 text-right">{e.totales?.errores ?? 0}</td>
                <td className="px-3 py-2 text-right">{e.totales?.omitidos ?? 0}</td>
                <td className="px-3 py-2 text-right"><Monto v={e.totales?.neto_acreditado ?? 0} /></td>
                <td className="px-3 py-2">
                  {e.estado === "completada" ? (
                    <Badge tone="success">Completada</Badge>
                  ) : e.estado === "completada_con_errores" ? (
                    <Badge tone="warn">Completada con errores</Badge>
                  ) : (
                    <Badge tone="neutral">En curso</Badge>
                  )}
                </td>
                <td className="px-3 py-2">
                  <button type="button" className="text-xs text-primary hover:underline" onClick={() => void navigate({ search: { ejecucion: e.id } })}>
                    Ver resultados
                  </button>
                </td>
              </tr>
            ))}
            {!q.isLoading && (q.data ?? []).length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                  Todavía no hay ejecuciones.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      {ejecucionId && <Resultados ejecucionId={ejecucionId} onReintentar={(ids) => setReint(ids)} />}
      {!ejecucionId && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <XCircle size={12} /> Un lote con error queda Pendiente y se puede reintentar: un error no deshace los demás.
        </p>
      )}
    </div>
  );
}

function Pasos({ paso }: { paso: Paso }) {
  const nombres = ["Selección", "Revisión", "Confirmación", "Resultados"];
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {nombres.map((n, i) => {
        const k = (i + 1) as Paso;
        return (
          <li key={n} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${
                k === paso ? "bg-primary text-primary-foreground border-primary" : k < paso ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "text-muted-foreground"
              }`}
            >
              {k}
            </span>
            <span className={k === paso ? "font-semibold" : "text-muted-foreground"}>{n}</span>
            {k < 4 && <span className="text-muted-foreground">›</span>}
          </li>
        );
      })}
    </ol>
  );
}

function Linea({ l, v }: { l: string; v: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{l}</span>
      <span>{v}</span>
    </div>
  );
}
