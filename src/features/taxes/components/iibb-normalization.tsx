import { selectCls } from "@/features/taxes/taxes.rules";
import { monthEnCurso } from "@/features/taxes/tax-reports.rules";
import { Modal } from "@/shared/ui/modal";
import { userMessage } from "@/shared/lib/errors";
import { useMemo,useState } from "react";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { AlertTriangle,Info,Loader2,X } from "lucide-react";
import { toast } from "sonner";
import { DataTable,type Column } from "@/shared/ui/data-table";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Label } from "@/shared/ui/form-controls";
import { KpiCard } from "@/shared/ui/kpi-card";
import { listRegistriesIibb,QK_REGISTRIES } from "@/features/taxes/iibb-registry.supabase";
import {
QK_NORMALIZATION,
QK_FILINGS,
applyNormalization,
descartarNormalization,
generatePreviewNormalization,
listItemsRun,
type RunNormalization,
type ItemNormalization,
} from "@/features/taxes/iibb-reports.supabase";

/**
 * Normalizacion retroactiva de IIBB (preview-first): recalcula con el padron
 * vigente del mes en curso lo ya retenido en el mes y muestra, por CUIT, la
 * diferencia = base x (alicuota nueva - alicuota aplicada). Nada cambia hasta
 * "Confirmar y aplicar". Los meses anteriores no se normalizan nunca.
 */

export const money = (v: number) =>
  `$ ${v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const pct = (v: number) =>
  `${v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`;
const date = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

/** Una fila por CUIT y par de alicuotas (anterior -> nueva). */
type RowCuit = {
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

function agruparByCuit(items: ItemNormalization[]): RowCuit[] {
  const m = new Map<string, RowCuit>();
  for (const i of items) {
    const key = `${i.cuit ?? i.legajo}|${i.alicuotaAnterior}|${i.alicuotaNueva}`;
    const f = m.get(key) ?? {
      clave: key,
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
    m.set(key, f);
  }
  return [...m.values()].sort((a, b) => Math.abs(b.ajuste) - Math.abs(a.ajuste));
}

export function NormalizationIibbDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const month = monthEnCurso();
  const registries = useQuery({ queryKey: QK_REGISTRIES, queryFn: listRegistriesIibb });
  const candidatos = useMemo(
    () => (registries.data ?? []).filter((p) => p.estado === "Vigente" && p.periodo === month),
    [registries.data, month],
  );
  const [registryId, setRegistryId] = useState("");
  const elegido = registryId || candidatos[0]?.id || "";

  const [run, setRun] = useState<RunNormalization | null>(null);
  const [items, setItems] = useState<ItemNormalization[]>([]);
  const [trabajando, setTrabajando] = useState<"preview" | "aplicar" | "descartar" | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const rows = useMemo(() => agruparByCuit(items), [items]);

  const generate = async () => {
    if (!elegido) return;
    setTrabajando("preview");
    setConfirmando(false);
    try {
      const c = await generatePreviewNormalization(elegido);
      setRun(c);
      setItems(c.operaciones > 0 ? await listItemsRun(c.id) : []);
      void qc.invalidateQueries({ queryKey: QK_NORMALIZATION });
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setTrabajando(null);
    }
  };

  const apply = async () => {
    if (!run) return;
    setTrabajando("aplicar");
    try {
      const r = await applyNormalization(run.id);
      toast.success(
        `Normalización aplicada: ${r.operaciones} operación(es), ajuste ${money(r.totalAjuste)}.` +
          (r.reportesRegenerados > 0
            ? ` ${r.reportesRegenerados} reporte(s) de tramo pasaron a una versión nueva.`
            : ""),
      );
      void qc.invalidateQueries({ queryKey: QK_NORMALIZATION });
      void qc.invalidateQueries({ queryKey: QK_FILINGS });
      onClose();
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setTrabajando(null);
    }
  };

  const descartar = async () => {
    if (run?.estado === "Preview") {
      setTrabajando("descartar");
      try {
        await descartarNormalization(run.id);
        void qc.invalidateQueries({ queryKey: QK_NORMALIZATION });
      } catch (e) {
        toast.error(userMessage(e));
      } finally {
        setTrabajando(null);
      }
    }
    onClose();
  };

  const columns: Column<RowCuit>[] = [
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
    <Modal open onClose={onClose} dismissible={!trabajando} size="custom" className="max-w-5xl">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div>
            <h3 className="font-display text-lg font-semibold">Normalización retroactiva</h3>
            <p className="text-sm text-muted-foreground">
              Recalcula con el padrón vigente lo ya retenido en {month}. Nada cambia hasta
              confirmar.
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
          {registries.isLoading ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Cargando padrones…
            </div>
          ) : candidatos.length === 0 ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              No hay un padrón vigente del mes en curso ({month}). Cargá y confirmá el padrón del
              mes para normalizar.
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
                    setRegistryId(e.target.value);
                    setRun(null);
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
              <BtnPrimary onClick={generate} disabled={!elegido || !!trabajando}>
                {trabajando === "preview" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Calculando…
                  </>
                ) : run ? (
                  "Recalcular preview"
                ) : (
                  "Generar preview"
                )}
              </BtnPrimary>
            </div>
          )}

          {run && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard
                  label="Operaciones a ajustar"
                  value={run.operaciones.toLocaleString("es-AR")}
                />
                <KpiCard label="Comercios" value={run.clientes.toLocaleString("es-AR")} />
                <KpiCard label="Monto bruto operado" value={money(run.totalBase)} />
                <KpiCard
                  label="Ajuste total"
                  value={`${run.totalAjuste > 0 ? "+" : ""}${money(run.totalAjuste)}`}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Operaciones del {date(run.desde)} al {date(run.hasta)}. Ajuste = monto bruto ×
                (alícuota nueva − alícuota aplicada). Positivo: se retuvo de menos.
              </p>

              {run.operaciones === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-3 text-sm">
                  <Badge tone="success">Sin diferencias</Badge>
                  Todo lo retenido en el período coincide con el padrón.
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={rows}
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
            {run?.estado === "Preview" ? "Descartar preview" : "Cerrar"}
          </BtnOutline>
          {run && run.operaciones > 0 && run.estado === "Preview" && (
            <BtnPrimary
              onClick={() => (confirmando ? apply() : setConfirmando(true))}
              disabled={!!trabajando}
            >
              {trabajando === "aplicar" ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Aplicando…
                </>
              ) : confirmando ? (
                `Sí, aplicar ${money(run.totalAjuste)}`
              ) : (
                "Confirmar y aplicar"
              )}
            </BtnPrimary>
          )}
        </div>
      </div>
    </Modal>
  );
}
