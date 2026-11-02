import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Info, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table";
import { Badge, BtnOutline, BtnPrimary, Label } from "@/components/portal-shell";
import { KpiCard } from "@/components/kpi-card";
import { listPadronesIibb, QK_PADRONES } from "@/lib/api/padron-iibb";
import {
  QK_NORMALIZACION,
  QK_PRESENTACIONES,
  aplicarNormalizacion,
  descartarNormalizacion,
  generarPreviewNormalizacion,
  listItemsCorrida,
  type CorridaNormalizacion,
  type ItemNormalizacion,
} from "@/lib/api/iibb-reportes";

/**
 * Normalizacion retroactiva de IIBB (preview-first): recalcula con el padron
 * vigente del mes en curso lo ya retenido en el mes y muestra, por CUIT, la
 * diferencia = base x (alicuota nueva - alicuota aplicada). Nada cambia hasta
 * "Confirmar y aplicar". Los meses anteriores no se normalizan nunca.
 */

const money = (v: number) =>
  `$ ${v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (v: number) =>
  `${v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`;
const fecha = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

/** AAAA-MM del dia argentino. */
const mesEnCurso = () =>
  new Date()
    .toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
    .slice(0, 7);

const selectCls =
  "w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

/** Una fila por CUIT y par de alicuotas (anterior -> nueva). */
type FilaCuit = {
  clave: string;
  cuit: string;
  razonSocial: string;
  legajo: string;
  alicuotaAnterior: number;
  alicuotaNueva: number;
  operaciones: number;
  base: number;
  ajuste: number;
};

function agruparPorCuit(items: ItemNormalizacion[]): FilaCuit[] {
  const m = new Map<string, FilaCuit>();
  for (const i of items) {
    const clave = `${i.cuit ?? i.legajo}|${i.alicuotaAnterior}|${i.alicuotaNueva}`;
    const f = m.get(clave) ?? {
      clave,
      cuit: i.cuit ?? "—",
      razonSocial: i.razonSocial ?? "",
      legajo: i.legajo,
      alicuotaAnterior: i.alicuotaAnterior,
      alicuotaNueva: i.alicuotaNueva,
      operaciones: 0,
      base: 0,
      ajuste: 0,
    };
    f.operaciones += 1;
    f.base += i.base;
    f.ajuste += i.ajuste;
    m.set(clave, f);
  }
  return [...m.values()].sort((a, b) => Math.abs(b.ajuste) - Math.abs(a.ajuste));
}

export function NormalizacionIibbDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const mes = mesEnCurso();
  const padrones = useQuery({ queryKey: QK_PADRONES, queryFn: listPadronesIibb });
  const candidatos = useMemo(
    () => (padrones.data ?? []).filter((p) => p.estado === "Vigente" && p.periodo === mes),
    [padrones.data, mes],
  );
  const [padronId, setPadronId] = useState("");
  const elegido = padronId || candidatos[0]?.id || "";

  const [corrida, setCorrida] = useState<CorridaNormalizacion | null>(null);
  const [items, setItems] = useState<ItemNormalizacion[]>([]);
  const [trabajando, setTrabajando] = useState<"preview" | "aplicar" | "descartar" | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const filas = useMemo(() => agruparPorCuit(items), [items]);

  const generar = async () => {
    if (!elegido) return;
    setTrabajando("preview");
    setConfirmando(false);
    try {
      const c = await generarPreviewNormalizacion(elegido);
      setCorrida(c);
      setItems(c.operaciones > 0 ? await listItemsCorrida(c.id) : []);
      void qc.invalidateQueries({ queryKey: QK_NORMALIZACION });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTrabajando(null);
    }
  };

  const aplicar = async () => {
    if (!corrida) return;
    setTrabajando("aplicar");
    try {
      const r = await aplicarNormalizacion(corrida.id);
      toast.success(
        `Normalización aplicada: ${r.operaciones} operación(es), ajuste ${money(r.totalAjuste)}.` +
          (r.reportesRegenerados > 0
            ? ` ${r.reportesRegenerados} reporte(s) de tramo pasaron a una versión nueva.`
            : ""),
      );
      void qc.invalidateQueries({ queryKey: QK_NORMALIZACION });
      void qc.invalidateQueries({ queryKey: QK_PRESENTACIONES });
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTrabajando(null);
    }
  };

  const descartar = async () => {
    if (corrida?.estado === "Preview") {
      setTrabajando("descartar");
      try {
        await descartarNormalizacion(corrida.id);
        void qc.invalidateQueries({ queryKey: QK_NORMALIZACION });
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setTrabajando(null);
      }
    }
    onClose();
  };

  const columns: Column<FilaCuit>[] = [
    {
      key: "cuit",
      label: "CUIT",
      render: (f) => (
        <div className="leading-tight">
          <div className="font-mono tabular-nums">{f.cuit}</div>
          <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">
            {f.razonSocial || f.legajo}
          </div>
        </div>
      ),
    },
    {
      key: "alicuotaAnterior",
      label: "Alícuota anterior",
      render: (f) => <span className="font-mono tabular-nums">{pct(f.alicuotaAnterior)}</span>,
    },
    {
      key: "alicuotaNueva",
      label: "Alícuota nueva",
      render: (f) => (
        <span className="font-mono tabular-nums font-semibold">{pct(f.alicuotaNueva)}</span>
      ),
    },
    {
      key: "operaciones",
      label: "Operaciones",
      render: (f) => <span className="font-mono tabular-nums">{f.operaciones}</span>,
    },
    {
      key: "base",
      label: "Monto bruto",
      render: (f) => <span className="font-mono tabular-nums">{money(f.base)}</span>,
    },
    {
      key: "ajuste",
      label: "Ajuste",
      render: (f) => (
        <span
          className={`font-mono tabular-nums font-semibold ${f.ajuste > 0 ? "text-red-700" : "text-emerald-700"}`}
        >
          {f.ajuste > 0 ? "+" : ""}
          {money(f.ajuste)}
        </span>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={trabajando ? undefined : onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-5xl max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 z-10 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div>
            <h3 className="font-display text-lg font-semibold">Normalización retroactiva</h3>
            <p className="text-sm text-muted-foreground">
              Recalcula con el padrón vigente lo ya retenido en {mes}. Nada cambia hasta confirmar.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={!!trabajando}
            className="p-1.5 hover:bg-muted rounded-md"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {padrones.isLoading ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Cargando padrones…
            </div>
          ) : candidatos.length === 0 ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              No hay un padrón vigente del mes en curso ({mes}). Cargá y confirmá el padrón del mes
              para normalizar.
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[260px]">
                <Label>Padrón vigente</Label>
                <select
                  className={selectCls}
                  value={elegido}
                  disabled={!!trabajando}
                  onChange={(e) => {
                    setPadronId(e.target.value);
                    setCorrida(null);
                    setItems([]);
                  }}
                >
                  {candidatos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} · {p.organismo ?? "—"} · {p.periodo}
                    </option>
                  ))}
                </select>
              </div>
              <BtnPrimary onClick={generar} disabled={!elegido || !!trabajando}>
                {trabajando === "preview" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Calculando…
                  </>
                ) : corrida ? (
                  "Recalcular preview"
                ) : (
                  "Generar preview"
                )}
              </BtnPrimary>
            </div>
          )}

          {corrida && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard
                  label="Operaciones a ajustar"
                  value={corrida.operaciones.toLocaleString("es-AR")}
                />
                <KpiCard label="Comercios" value={corrida.clientes.toLocaleString("es-AR")} />
                <KpiCard label="Monto bruto operado" value={money(corrida.totalBase)} />
                <KpiCard
                  label="Ajuste total"
                  value={`${corrida.totalAjuste > 0 ? "+" : ""}${money(corrida.totalAjuste)}`}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Operaciones del {fecha(corrida.desde)} al {fecha(corrida.hasta)}. Ajuste = monto
                bruto × (alícuota nueva − alícuota aplicada). Positivo: se retuvo de menos.
              </p>

              {corrida.operaciones === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-3 text-sm">
                  <Badge tone="success">Sin diferencias</Badge>
                  Todo lo retenido en el período coincide con el padrón.
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={filas}
                  keyExtractor={(f) => f.clave}
                  pageSize={10}
                  showGlobalFilter={false}
                  showDownloadButton={false}
                />
              )}

              <div className="flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <Info size={14} className="mt-0.5 shrink-0" />
                Al aplicar, cada ajuste entra en el reporte del tramo de su operación (los tramos ya
                generados pasan a una versión nueva). Cobrar o devolver la diferencia en el saldo
                del comercio está pendiente de definición.
              </div>
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-card border-t px-6 py-3 flex flex-wrap justify-end gap-2">
          <BtnOutline onClick={descartar} disabled={!!trabajando}>
            {corrida?.estado === "Preview" ? "Descartar preview" : "Cerrar"}
          </BtnOutline>
          {corrida && corrida.operaciones > 0 && corrida.estado === "Preview" && (
            <BtnPrimary
              onClick={() => (confirmando ? aplicar() : setConfirmando(true))}
              disabled={!!trabajando}
            >
              {trabajando === "aplicar" ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Aplicando…
                </>
              ) : confirmando ? (
                `Sí, aplicar ${money(corrida.totalAjuste)}`
              ) : (
                "Confirmar y aplicar"
              )}
            </BtnPrimary>
          )}
        </div>
      </div>
    </div>
  );
}
