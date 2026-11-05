import { ErrorNotice } from "@/shared/ui/error-notice";
import { useMemo,useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
QK_ACRED,
calendarioDayDetail,
type BatchDelDay,
} from "@/features/payment-links/credits.supabase";
import { Amount,errMsg } from "@/features/payment-links/components/credits-common";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Send } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { SimulateChargebacksModal } from "@/features/payment-links/components/simulate-chargebacks-modal";
import { type StatusDay } from "@/features/payment-links/credit-calendar.types";
import { STATUSES_DAY } from "@/features/payment-links/credit-calendar.rules";
import { RowBatch } from "./row-batch";

/**
 * Popup del dia (backoffice, todos los comercios): resumen por estado con
 * monto y cantidad, los lotes de ese dia agrupados por comercio con sus
 * operaciones, y la actividad del dia (acreditaciones ejecutadas, adelantos
 * acreditados, archivos de Payway importados).
 */
export function BatchesDelDay({
  f,
  comercio: merchant,
  onClose,
  onApertura: onBreakdown,
  onEjecutar: onRun,
}: {
  f: string;
  comercio: string;
  onClose: () => void;
  onApertura: (id: string) => void;
  onEjecutar: (ids: string[]) => void;
}) {
  const [brand, setBrand] = useState("");
  const [filter, setFilter] = useState<StatusDay | "todos">("todos");
  const [open, setOpen] = useState<string | null>(null);
  const [simulate, setSimulate] = useState(false);
  const q = useQuery({
    queryKey: [...QK_ACRED, "calendario-dia-detalle", f, merchant],
    queryFn: () => calendarioDayDetail(f, merchant || null),
  });
  const all = q.data?.lotes ?? [];
  const brands = Array.from(new Set(all.map((l) => l.bandera))).sort();
  const deBrand = all.filter((l) => !brand || l.bandera === brand);

  const summary = useMemo(() => {
    const r: Record<StatusDay, { n: number; monto: number; comercios: Set<string> }> = {
      acreditado: { n: 0, monto: 0, comercios: new Set() },
      pendiente: { n: 0, monto: 0, comercios: new Set() },
      programado: { n: 0, monto: 0, comercios: new Set() },
      vencido: { n: 0, monto: 0, comercios: new Set() },
    };
    for (const l of deBrand) {
      r[l.estado_dia].n++;
      r[l.estado_dia].monto += Number(l.neto);
      r[l.estado_dia].comercios.add(l.comercio_id);
    }
    return r;
  }, [deBrand]);

  const batches = deBrand.filter((l) => filter === "todos" || l.estado_dia === filter);
  const eligibles = batches.filter((l) => l.elegible).map((l) => l.id);
  const totalDay = deBrand.reduce((a, l) => a + Number(l.neto), 0);
  const grupos = useMemo(() => {
    const m = new Map<string, BatchDelDay[]>();
    for (const l of batches) m.set(l.comercio_id, [...(m.get(l.comercio_id) ?? []), l]);
    return [...m.values()];
  }, [batches]);
  const act = q.data?.actividad;
  const hayActividad =
    !!act &&
    (act.acreditaciones.length > 0 || act.adelantos.length > 0 || act.importaciones.length > 0);
  const dateLarga = new Date(`${f}T12:00:00`).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-5xl max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex flex-wrap justify-between items-start gap-3 z-10">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Acreditaciones del día · todos los comercios
            </div>
            <h3 className="font-display text-lg font-semibold capitalize">{dateLarga}</h3>
            <p className="text-sm text-muted-foreground">
              {deBrand.length} lote(s) · {new Set(deBrand.map((l) => l.comercio_id)).size}{" "}
              comercio(s) · total <Amount v={totalDay} strong />
            </p>
          </div>
          <div className="flex items-center gap-2">
            {brands.length > 1 && (
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="h-9 rounded-md border bg-background px-2 text-sm"
              >
                <option value="">Todas las banderas</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={onClose}
              className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-card text-foreground hover:bg-muted"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {q.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : q.isError ? (
            <p className="text-sm text-red-700">
              {errMsg(q.error)} (¿se aplicó la migración 20261030150000?)
            </p>
          ) : (
            <>
              {/* Resumen por estado: cada tarjeta filtra la lista */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {STATUSES_DAY.map((e) => {
                  const r = summary[e.k];
                  const active = filter === e.k;
                  return (
                    <button
                      key={e.k}
                      type="button"
                      disabled={r.n === 0}
                      onClick={() => setFilter(active ? "todos" : e.k)}
                      className={`rounded-xl border-2 p-4 text-left transition disabled:opacity-40 disabled:cursor-default ${e.borde} ${
                        active
                          ? `${e.fondo} ring-2 ring-offset-1 ring-primary/40`
                          : r.n
                            ? e.fondo
                            : "bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <span className={`h-2.5 w-2.5 rounded-full ${e.color}`} />
                        {e.titulo}
                      </div>
                      <div
                        className={`font-mono text-xl font-bold mt-1.5 tabular-nums ${r.n ? e.texto : "text-muted-foreground"}`}
                      >
                        <Amount v={r.monto} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {r.n} lote(s) · {r.comercios.size} comercio(s)
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">{e.ayuda}</div>
                    </button>
                  );
                })}
              </div>

              {summary.vencido.n > 0 && filter !== "vencido" && (
                <ErrorNotice icon={false}>
                  <span>
                    {summary.vencido.n} acreditación(es) vencida(s) por{" "}
                    <Amount v={summary.vencido.monto} />: pasó la fecha y no se acreditó.
                  </span>
                  <button
                    type="button"
                    className="text-xs font-semibold underline"
                    onClick={() => setFilter("vencido")}
                  >
                    Ver vencidas
                  </button>
                </ErrorNotice>
              )}

              {deBrand.length === 0 ? (
                <div className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
                  No hay lotes con fecha de este día.
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {(["todos", ...STATUSES_DAY.map((e) => e.k)] as const).map((k) => {
                        const def = STATUSES_DAY.find((e) => e.k === k);
                        const n = k === "todos" ? deBrand.length : summary[k].n;
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => setFilter(k)}
                            className={`h-8 px-3 rounded-full border text-xs font-semibold inline-flex items-center gap-1.5 ${
                              filter === k
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card text-foreground hover:bg-muted"
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
                        disabled={
                          !batches.some(
                            (l) => l.estado === "Programado" || l.estado === "Pendiente",
                          )
                        }
                        onClick={() => setSimulate(true)}
                        title="CSV de prueba de contracargos con ventas de estos lotes"
                      >
                        Simular contracargos
                      </BtnOutline>
                      <BtnPrimary
                        disabled={eligibles.length === 0}
                        onClick={() => onRun(eligibles)}
                      >
                        <Send size={15} /> Acreditar listas ({eligibles.length})
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
                            <span className="font-mono text-xs text-muted-foreground">
                              {ls[0].legajo}
                            </span>
                          </div>
                          <Amount v={ls.reduce((a, l) => a + Number(l.neto), 0)} strong />
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
                              <RowBatch
                                key={l.id}
                                l={l}
                                abierto={open === l.id}
                                onToggle={() => setOpen(open === l.id ? null : l.id)}
                                onApertura={() => onBreakdown(l.id)}
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
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Actividad del día
                </h4>
                {!hayActividad ? (
                  <p className="text-sm text-muted-foreground">
                    No se registraron acreditaciones, adelantos ni importaciones este día.
                  </p>
                ) : (
                  <div className="grid md:grid-cols-3 gap-3">
                    <Card className="p-3">
                      <div className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Acreditaciones
                        ejecutadas ({act!.acreditaciones.length})
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
                              <Amount v={a.neto} className="text-emerald-700" />
                            </li>
                          ))}
                        </ul>
                      )}
                    </Card>
                    <Card className="p-3">
                      <div className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-violet-500" /> Adelantos
                        acreditados ({act!.adelantos.length})
                      </div>
                      {act!.adelantos.length === 0 ? (
                        <p className="text-xs text-muted-foreground">—</p>
                      ) : (
                        <ul className="text-xs space-y-1 max-h-48 overflow-y-auto">
                          {act!.adelantos.map((a) => (
                            <li key={a.id} className="flex justify-between gap-2">
                              <span className="truncate">{a.comercio}</span>
                              <Amount v={a.neto ?? a.monto} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </Card>
                    <Card className="p-3">
                      <div className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-sky-500" /> Archivos de Payway
                        importados ({act!.importaciones.length})
                      </div>
                      {act!.importaciones.length === 0 ? (
                        <p className="text-xs text-muted-foreground">—</p>
                      ) : (
                        <ul className="text-xs space-y-1 max-h-48 overflow-y-auto">
                          {act!.importaciones.map((i) => (
                            <li key={i.id} className="flex justify-between gap-2">
                              <span className="truncate">{i.archivo}</span>
                              <span className="text-muted-foreground whitespace-nowrap">
                                {i.lotes ?? 0} lote(s)
                                {(i.excepciones ?? 0) > 0 ? ` · ${i.excepciones} exc.` : ""}
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
      {simulate && (
        <SimulateChargebacksModal
          loteIds={batches
            .filter((l) => l.estado === "Programado" || l.estado === "Pendiente")
            .map((l) => l.id)}
          onClose={() => setSimulate(false)}
        />
      )}
    </div>
  );
}
