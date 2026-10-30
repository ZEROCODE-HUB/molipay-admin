import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download, Send } from "lucide-react";
import * as XLSX from "xlsx";
import { PageHeader, Card, BtnOutline, BtnPrimary } from "@/components/portal-shell";
import { PermissionGuard } from "@/components/permission-guard";
import { ComercioPicker, Monto, fecha, fechaHora, errMsg } from "@/components/acreditaciones/comunes";
import { LoteApertura } from "@/components/acreditaciones/lote-apertura";
import { SimularContracargosModal } from "@/components/acreditaciones/simular-contracargos-modal";
import { QK_ACRED, calendarioDiaDetalle, calendarioV3, guardarSeleccion, ventasDeLote, type DiaCalendario, type LoteDelDia } from "@/lib/api/acreditaciones";

export const Route = createFileRoute("/admin/comercios/link-pago/calendario-acreditaciones")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Calendario de acreditaciones — Links de Pago — Admin — Moli" },
      { name: "description", content: "Cuánto se espera cobrar, cuánto llegó y cuánto ya se acreditó, por día hábil." },
    ],
  }),
});

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type Capa = "programado" | "pendiente" | "acreditado" | "vencido";
const CAPAS: { k: Capa; label: string; color: string; ayuda: string }[] = [
  { k: "programado", label: "Programada", color: "bg-amber-400", ayuda: "Fecha estimada futura; Payway todavía no pagó." },
  { k: "pendiente", label: "Pendiente", color: "bg-sky-500", ayuda: "Llegó en el archivo; falta acreditarla." },
  { k: "acreditado", label: "Completada", color: "bg-emerald-500", ayuda: "Ya acreditada al comercio." },
  { k: "vencido", label: "Vencida", color: "bg-red-500", ayuda: "Pasó la fecha y no llegó en el archivo, o llegó y no se acreditó [A-18]." },
];

function Page() {
  const navigate = useNavigate();
  const hoy = new Date();
  const [mes, setMes] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [comercio, setComercio] = useState("");
  const [capas, setCapas] = useState<Record<Capa, boolean>>({ programado: true, pendiente: true, acreditado: true, vencido: true });
  const [dia, setDia] = useState<string | null>(null);
  const [apertura, setApertura] = useState<string | null>(null);

  const desde = iso(mes);
  const hasta = iso(new Date(mes.getFullYear(), mes.getMonth() + 1, 0));
  const q = useQuery({ queryKey: [...QK_ACRED, "calendario", desde, hasta, comercio], queryFn: () => calendarioV3(desde, hasta, comercio || null) });
  const porFecha = useMemo(() => new Map((q.data?.dias ?? []).map((d) => [d.fecha, d])), [q.data]);

  const tot = (q.data?.dias ?? []).reduce(
    (a, d) => ({ programado: a.programado + Number(d.programado), pendiente: a.pendiente + Number(d.pendiente), acreditado: a.acreditado + Number(d.acreditado), vencido: a.vencido + Number(d.vencido) }),
    { programado: 0, pendiente: 0, acreditado: 0, vencido: 0 },
  );
  const hoyDato = porFecha.get(iso(hoy));

  // Grilla lunes a domingo.
  const celdas = useMemo(() => {
    const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const offset = (primero.getDay() + 6) % 7;
    const dias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    const out: (string | null)[] = Array(offset).fill(null);
    for (let i = 1; i <= dias; i++) out.push(iso(new Date(mes.getFullYear(), mes.getMonth(), i)));
    while (out.length % 7) out.push(null);
    return out;
  }, [mes]);

  const exportar = () => {
    const data = (q.data?.dias ?? []).map((d) => ({
      Fecha: fecha(d.fecha),
      "No hábil": d.no_habil ? "Sí" : "",
      Programado: Number(d.programado),
      Pendiente: Number(d.pendiente),
      Acreditado: Number(d.acreditado),
      Vencido: Number(d.vencido),
      Total: Number(d.total),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Calendario");
    XLSX.writeFile(wb, `calendario_acreditaciones_${desde.slice(0, 7)}.xlsx`);
  };

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Calendario de acreditaciones"
        description="Por día hábil: cuánto se espera cobrar, cuánto llegó en el archivo de Payway y cuánto ya se acreditó."
        action={
          <BtnOutline onClick={exportar} disabled={!q.data}>
            <Download size={15} /> Exportar el mes
          </BtnOutline>
        }
      />

      <Card className="p-4 mb-3 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-input bg-background text-foreground shadow-sm hover:bg-muted"
            onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
            aria-label="Mes anterior"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <div className="min-w-[150px] text-center font-semibold">
            {MESES[mes.getMonth()]} {mes.getFullYear()}
          </div>
          <button
            type="button"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-input bg-background text-foreground shadow-sm hover:bg-muted"
            onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
            aria-label="Mes siguiente"
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>
        <div className="min-w-[260px]">
          <ComercioPicker value={comercio} onChange={(id) => setComercio(id)} />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {CAPAS.map((c) => (
            <label key={c.k} className="flex items-center gap-1.5" title={c.ayuda}>
              <input type="checkbox" checked={capas[c.k]} onChange={(e) => setCapas({ ...capas, [c.k]: e.target.checked })} />
              <span className={`h-2.5 w-2.5 rounded-full ${c.color}`} /> {c.label}
            </label>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3 text-xs">
        {CAPAS.map((c) => (
          <Card key={c.k} className="p-3">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${c.color}`} /> {c.label} del mes
            </div>
            <Monto v={tot[c.k]} strong />
            <div className="text-[10px] text-muted-foreground">
              Hoy: <Monto v={hoyDato ? Number(hoyDato[c.k]) : 0} />
            </div>
          </Card>
        ))}
      </div>

      {q.isError ? (
        <Card className="text-sm text-red-700">{errMsg(q.error)}</Card>
      ) : (
        <Card className="p-2">
          <div className="grid grid-cols-7 gap-1 text-[11px] text-muted-foreground mb-1">
            {DIAS.map((d) => (
              <div key={d} className="px-1 font-semibold">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {celdas.map((f, i) =>
              f ? (
                <Celda key={f} f={f} d={porFecha.get(f)} capas={capas} activo={dia === f} esHoy={f === iso(hoy)} onClick={() => setDia(f)} />
              ) : (
                <div key={`v${i}`} />
              ),
            )}
          </div>
        </Card>
      )}

      {dia && (
        <LotesDelDia
          f={dia}
          comercio={comercio}
          onClose={() => setDia(null)}
          onApertura={setApertura}
          onEjecutar={(ids) => {
            guardarSeleccion(ids);
            void navigate({ to: "/admin/comercios/link-pago/ejecucion" });
          }}
        />
      )}
      <div className="relative z-[80]">
        <LoteApertura loteId={apertura} onClose={() => setApertura(null)} />
      </div>
    </PermissionGuard>
  );
}

function Celda({ f, d, capas, activo, esHoy, onClick }: { f: string; d?: DiaCalendario; capas: Record<Capa, boolean>; activo: boolean; esHoy: boolean; onClick: () => void }) {
  const noHabil = d?.no_habil ?? [0, 6].includes(new Date(`${f}T12:00:00`).getDay());
  const tieneAlgo = d && CAPAS.some((c) => capas[c.k] && Number(d[c.k]) !== 0);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[86px] rounded-md border p-1.5 text-left text-[11px] transition ${noHabil ? "bg-muted/50" : "bg-card hover:bg-muted/30"} ${
        activo ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className={`font-semibold ${esHoy ? "text-primary" : "text-muted-foreground"}`}>{Number(f.slice(8))}</div>
      {tieneAlgo &&
        CAPAS.filter((c) => capas[c.k] && Number(d![c.k]) !== 0).map((c) => (
          <div key={c.k} className="flex items-center gap-1 mt-0.5">
            <span className={`h-1.5 w-1.5 rounded-full ${c.color}`} />
            <Monto v={Number(d![c.k])} className="text-[10px]" />
          </div>
        ))}
      {noHabil && tieneAlgo && <div className="text-[9px] text-amber-700 mt-0.5">Día no hábil [A-22]</div>}
    </button>
  );
}

type EstadoDia = "acreditado" | "pendiente" | "programado" | "vencido";

const ESTADOS_DIA: { k: EstadoDia; titulo: string; singular: string; ayuda: string; color: string; borde: string; fondo: string; texto: string }[] = [
  { k: "acreditado", titulo: "Completadas", singular: "Completada", ayuda: "Ya son saldo del comercio", color: "bg-emerald-500", borde: "border-emerald-200", fondo: "bg-emerald-50/60", texto: "text-emerald-700" },
  { k: "pendiente", titulo: "Pendientes", singular: "Pendiente", ayuda: "Llegaron en el archivo de Payway; falta acreditar", color: "bg-sky-500", borde: "border-sky-200", fondo: "bg-sky-50/60", texto: "text-sky-700" },
  { k: "programado", titulo: "Programadas", singular: "Programada", ayuda: "Estimadas; Payway todavía no pagó", color: "bg-amber-400", borde: "border-amber-200", fondo: "bg-amber-50/60", texto: "text-amber-700" },
  { k: "vencido", titulo: "Vencidas", singular: "Vencida", ayuda: "Pasó la fecha y no se acreditó", color: "bg-red-500", borde: "border-red-200", fondo: "bg-red-50/60", texto: "text-red-700" },
];

/**
 * Popup del dia (backoffice, todos los comercios): resumen por estado con
 * monto y cantidad, los lotes de ese dia agrupados por comercio con sus
 * operaciones, y la actividad del dia (acreditaciones ejecutadas, adelantos
 * acreditados, archivos de Payway importados).
 */
function LotesDelDia({
  f,
  comercio,
  onClose,
  onApertura,
  onEjecutar,
}: {
  f: string;
  comercio: string;
  onClose: () => void;
  onApertura: (id: string) => void;
  onEjecutar: (ids: string[]) => void;
}) {
  const [bandera, setBandera] = useState("");
  const [filtro, setFiltro] = useState<EstadoDia | "todos">("todos");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [simular, setSimular] = useState(false);
  const q = useQuery({
    queryKey: [...QK_ACRED, "calendario-dia-detalle", f, comercio],
    queryFn: () => calendarioDiaDetalle(f, comercio || null),
  });
  const todos = q.data?.lotes ?? [];
  const banderas = Array.from(new Set(todos.map((l) => l.bandera))).sort();
  const deBandera = todos.filter((l) => !bandera || l.bandera === bandera);

  const resumen = useMemo(() => {
    const r: Record<EstadoDia, { n: number; monto: number; comercios: Set<string> }> = {
      acreditado: { n: 0, monto: 0, comercios: new Set() },
      pendiente: { n: 0, monto: 0, comercios: new Set() },
      programado: { n: 0, monto: 0, comercios: new Set() },
      vencido: { n: 0, monto: 0, comercios: new Set() },
    };
    for (const l of deBandera) {
      r[l.estado_dia].n++;
      r[l.estado_dia].monto += Number(l.neto);
      r[l.estado_dia].comercios.add(l.comercio_id);
    }
    return r;
  }, [deBandera]);

  const lotes = deBandera.filter((l) => filtro === "todos" || l.estado_dia === filtro);
  const elegibles = lotes.filter((l) => l.elegible).map((l) => l.id);
  const totalDia = deBandera.reduce((a, l) => a + Number(l.neto), 0);
  const grupos = useMemo(() => {
    const m = new Map<string, LoteDelDia[]>();
    for (const l of lotes) m.set(l.comercio_id, [...(m.get(l.comercio_id) ?? []), l]);
    return [...m.values()];
  }, [lotes]);
  const act = q.data?.actividad;
  const hayActividad = !!act && (act.acreditaciones.length > 0 || act.adelantos.length > 0 || act.importaciones.length > 0);
  const fechaLarga = new Date(`${f}T12:00:00`).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-5xl max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex flex-wrap justify-between items-start gap-3 z-10">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Acreditaciones del día · todos los comercios</div>
            <h3 className="font-display text-lg font-semibold capitalize">{fechaLarga}</h3>
            <p className="text-sm text-muted-foreground">
              {deBandera.length} lote(s) · {new Set(deBandera.map((l) => l.comercio_id)).size} comercio(s) · total{" "}
              <Monto v={totalDia} strong />
            </p>
          </div>
          <div className="flex items-center gap-2">
            {banderas.length > 1 && (
              <select value={bandera} onChange={(e) => setBandera(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
                <option value="">Todas las banderas</option>
                {banderas.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            )}
            <button onClick={onClose} className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-card text-foreground hover:bg-muted" aria-label="Cerrar">
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {q.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : q.isError ? (
            <p className="text-sm text-red-700">{errMsg(q.error)} (¿se aplicó la migración 20261030150000?)</p>
          ) : (
            <>
              {/* Resumen por estado: cada tarjeta filtra la lista */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {ESTADOS_DIA.map((e) => {
                  const r = resumen[e.k];
                  const activo = filtro === e.k;
                  return (
                    <button
                      key={e.k}
                      type="button"
                      disabled={r.n === 0}
                      onClick={() => setFiltro(activo ? "todos" : e.k)}
                      className={`rounded-xl border-2 p-4 text-left transition disabled:opacity-40 disabled:cursor-default ${e.borde} ${
                        activo ? `${e.fondo} ring-2 ring-offset-1 ring-primary/40` : r.n ? e.fondo : "bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <span className={`h-2.5 w-2.5 rounded-full ${e.color}`} />
                        {e.titulo}
                      </div>
                      <div className={`font-mono text-xl font-bold mt-1.5 tabular-nums ${r.n ? e.texto : "text-muted-foreground"}`}>
                        <Monto v={r.monto} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {r.n} lote(s) · {r.comercios.size} comercio(s)
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">{e.ayuda}</div>
                    </button>
                  );
                })}
              </div>

              {resumen.vencido.n > 0 && filtro !== "vencido" && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  <span>
                    {resumen.vencido.n} acreditación(es) vencida(s) por <Monto v={resumen.vencido.monto} />: pasó la fecha y no se acreditó.
                  </span>
                  <button type="button" className="text-xs font-semibold underline" onClick={() => setFiltro("vencido")}>
                    Ver vencidas
                  </button>
                </div>
              )}

              {deBandera.length === 0 ? (
                <div className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">No hay lotes con fecha de este día.</div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {(["todos", ...ESTADOS_DIA.map((e) => e.k)] as const).map((k) => {
                        const def = ESTADOS_DIA.find((e) => e.k === k);
                        const n = k === "todos" ? deBandera.length : resumen[k].n;
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => setFiltro(k)}
                            className={`h-8 px-3 rounded-full border text-xs font-semibold inline-flex items-center gap-1.5 ${
                              filtro === k ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground hover:bg-muted"
                            }`}
                          >
                            {def && <span className={`h-2 w-2 rounded-full ${def.color}`} />}
                            {def ? def.titulo : "Todas"} ({n})
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <BtnOutline
                        disabled={!lotes.some((l) => l.estado === "Programado" || l.estado === "Pendiente")}
                        onClick={() => setSimular(true)}
                        title="CSV de prueba de contracargos con ventas de estos lotes"
                      >
                        Simular contracargos
                      </BtnOutline>
                      <BtnPrimary disabled={elegibles.length === 0} onClick={() => onEjecutar(elegibles)}>
                        <Send size={15} /> Acreditar listas ({elegibles.length})
                      </BtnPrimary>
                    </div>
                  </div>

                  {grupos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay lotes en este estado.</p>
                  ) : (
                    grupos.map((ls) => (
                      <Card key={ls[0].comercio_id} className="p-0 overflow-hidden">
                        <div className="flex items-center justify-between bg-muted/40 px-4 py-2">
                          <div>
                            <span className="font-semibold text-sm">{ls[0].comercio}</span>{" "}
                            <span className="font-mono text-xs text-muted-foreground">{ls[0].legajo}</span>
                          </div>
                          <Monto v={ls.reduce((a, l) => a + Number(l.neto), 0)} strong />
                        </div>
                        <table className="w-full text-sm">
                          <thead className="text-xs text-muted-foreground">
                            <tr className="text-left">
                              <th className="px-4 py-1.5">Bandera</th>
                              <th className="px-4 py-1.5">Lote</th>
                              <th className="px-4 py-1.5 text-right">Ops</th>
                              <th className="px-4 py-1.5 text-right">Bruto</th>
                              <th className="px-4 py-1.5 text-right">Neto</th>
                              <th className="px-4 py-1.5">Estado</th>
                              <th className="px-4 py-1.5" />
                            </tr>
                          </thead>
                          <tbody>
                            {ls.map((l) => (
                              <FilaLote
                                key={l.id}
                                l={l}
                                abierto={abierto === l.id}
                                onToggle={() => setAbierto(abierto === l.id ? null : l.id)}
                                onApertura={() => onApertura(l.id)}
                              />
                            ))}
                          </tbody>
                        </table>
                      </Card>
                    ))
                  )}
                </>
              )}

              {/* Actividad del dia */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Actividad del día</h4>
                {!hayActividad ? (
                  <p className="text-sm text-muted-foreground">No se registraron acreditaciones, adelantos ni importaciones este día.</p>
                ) : (
                  <div className="grid md:grid-cols-3 gap-3">
                    <Card className="p-3">
                      <div className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Acreditaciones ejecutadas ({act!.acreditaciones.length})
                      </div>
                      {act!.acreditaciones.length === 0 ? (
                        <p className="text-xs text-muted-foreground">—</p>
                      ) : (
                        <ul className="text-xs space-y-1 max-h-48 overflow-y-auto">
                          {act!.acreditaciones.map((a) => (
                            <li key={a.id} className="flex justify-between gap-2">
                              <span className="truncate">
                                {a.comercio} · {a.bandera}
                              </span>
                              <Monto v={a.neto} className="text-emerald-700" />
                            </li>
                          ))}
                        </ul>
                      )}
                    </Card>
                    <Card className="p-3">
                      <div className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-violet-500" /> Adelantos acreditados ({act!.adelantos.length})
                      </div>
                      {act!.adelantos.length === 0 ? (
                        <p className="text-xs text-muted-foreground">—</p>
                      ) : (
                        <ul className="text-xs space-y-1 max-h-48 overflow-y-auto">
                          {act!.adelantos.map((a) => (
                            <li key={a.id} className="flex justify-between gap-2">
                              <span className="truncate">{a.comercio}</span>
                              <Monto v={a.neto ?? a.monto} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </Card>
                    <Card className="p-3">
                      <div className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-sky-500" /> Archivos de Payway importados ({act!.importaciones.length})
                      </div>
                      {act!.importaciones.length === 0 ? (
                        <p className="text-xs text-muted-foreground">—</p>
                      ) : (
                        <ul className="text-xs space-y-1 max-h-48 overflow-y-auto">
                          {act!.importaciones.map((i) => (
                            <li key={i.id} className="flex justify-between gap-2">
                              <span className="truncate">{i.archivo}</span>
                              <span className="text-muted-foreground whitespace-nowrap">
                                {i.lotes ?? 0} lote(s){(i.excepciones ?? 0) > 0 ? ` · ${i.excepciones} exc.` : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Card>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {simular && (
        <SimularContracargosModal
          loteIds={lotes.filter((l) => l.estado === "Programado" || l.estado === "Pendiente").map((l) => l.id)}
          onClose={() => setSimular(false)}
        />
      )}
    </div>
  );
}

function FilaLote({ l, abierto, onToggle, onApertura }: { l: LoteDelDia; abierto: boolean; onToggle: () => void; onApertura: () => void }) {
  const ventas = useQuery({ queryKey: [...QK_ACRED, "lote-ventas", l.id], queryFn: () => ventasDeLote(l.id), enabled: abierto });
  const e = ESTADOS_DIA.find((x) => x.k === l.estado_dia)!;
  return (
    <>
      <tr className="border-t">
        <td className="px-4 py-1.5">{l.bandera}</td>
        <td className="px-4 py-1.5 font-mono text-xs">
          {l.codigo}
          {l.legacy && <span className="ml-1 text-[10px] text-muted-foreground">(histórico)</span>}
        </td>
        <td className="px-4 py-1.5 text-right font-mono">{l.cantidad_operaciones}</td>
        <td className="px-4 py-1.5 text-right">
          <Monto v={l.bruto} />
        </td>
        <td className="px-4 py-1.5 text-right">
          <Monto v={l.neto} strong />
        </td>
        <td className="px-4 py-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
            <span className={`h-2 w-2 rounded-full ${e.color}`} />
            <span className={e.texto}>{e.singular}</span>
          </span>
          {l.estado === "Pendiente" && l.motivo && <div className="text-[10px] text-muted-foreground">{l.motivo}</div>}
        </td>
        <td className="px-4 py-1.5 whitespace-nowrap text-right">
          <button type="button" className="text-xs text-primary hover:underline mr-3" onClick={onToggle}>
            {abierto ? "Ocultar operaciones" : "Ver operaciones"}
          </button>
          <button type="button" className="text-xs text-primary hover:underline" onClick={onApertura}>
            Apertura
          </button>
        </td>
      </tr>
      {abierto && (
        <tr className="bg-muted/20">
          <td colSpan={7} className="px-4 py-2">
            {ventas.isLoading ? (
              <p className="text-xs text-muted-foreground">Cargando operaciones…</p>
            ) : ventas.isError ? (
              <p className="text-xs text-red-700">{errMsg(ventas.error)}</p>
            ) : (ventas.data ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin operaciones vinculadas a este lote.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="text-left">
                    <th className="py-1 pr-3">Fecha de venta</th>
                    <th className="py-1 pr-3">Operación</th>
                    <th className="py-1 pr-3">Cuotas</th>
                    <th className="py-1 text-right">Bruto</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(ventas.data ?? []).map((v) => (
                    <tr key={v.id}>
                      <td className="py-1 pr-3">{fechaHora(v.fecha)}</td>
                      <td className="py-1 pr-3 font-mono">{v.id_txn}</td>
                      <td className="py-1 pr-3">{v.cuotas ?? 1}</td>
                      <td className="py-1 text-right">
                        <Monto v={v.monto_operacion} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
