import {
BCRA_FILE_LABEL,
getRowsFiling,
listCorrecciones,
type BcraFiling,
} from "@/features/regulatory-reports/bcra.supabase";
import { useQuery } from "@tanstack/react-query";
import { useMemo,useState } from "react";
import { AlertTriangle,Download,FileSpreadsheet,FileText,Loader2,Search } from "lucide-react";
import { NAME_EN_PACKAGE,nameFileIndividual } from "@/features/regulatory-reports/bcra/files";
import { formatDateTime } from "@/shared/lib/format";
import { HeaderHint } from "@/shared/ui/header-hint";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import {
MAX_ROWS_PREVIEW,
QK,
SECTIONS_A,
labelPeriod,
} from "@/features/regulatory-reports/bcra-reports.rules";
import {
Amount,
COLUMNS_PREVIEW,
Chip,
ControlCell,
Modal,
ModalHeader,
Stat,
StatusBadge,
} from "./bcra-reports-parts";

export function VistaPreviaModal({
  p,
  onClose,
  onDescargar: onDownload,
}: {
  p: BcraFiling;
  onClose: () => void;
  onDescargar: () => void;
}) {
  const rowsQ = useQuery({ queryKey: [...QK, "filas", p.id], queryFn: () => getRowsFiling(p.id) });
  const corrQ = useQuery({
    queryKey: [...QK, "correcciones", p.id],
    queryFn: () => listCorrecciones(p.id),
    enabled: p.correcciones > 0,
  });
  const [section, setSection] = useState("");
  const [q, setQ] = useState("");
  const columns = COLUMNS_PREVIEW[p.archivo];
  const c = p.totales.control;

  const rows = useMemo(() => {
    const all = ((rowsQ.data ?? []) as Record<string, unknown>[]).map((f, i) => ({ f, n: i + 1 }));
    const text = q.trim().toLowerCase();
    return all.filter(({ f }) => {
      if (section && !String(f.codigo ?? "").startsWith(section)) return false;
      if (!text) return true;
      return columns.some((col) =>
        String(f[col.key] ?? "")
          .toLowerCase()
          .includes(text),
      );
    });
  }, [rowsQ.data, section, q, columns]);
  const total = rowsQ.data?.length ?? 0;

  return (
    <Modal onClose={onClose} className="max-w-6xl">
      <ModalHeader
        icon={p.archivo === "I" ? <FileText size={18} /> : <FileSpreadsheet size={18} />}
        title={`${BCRA_FILE_LABEL[p.archivo]} · ${labelPeriod(p.periodo)}`}
        subtitle={nameFileIndividual(p.periodo, p.archivo)}
        extra={<StatusBadge p={p} />}
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Filas" value={String(p.cantidadFilas)} />
          <Stat
            label="Generado"
            value={formatDateTime(p.generadoAt)}
            hint={p.generadoByName ?? undefined}
          />
          <Stat
            label="Presentado"
            value={p.presentadoAt ? formatDateTime(p.presentadoAt) : "—"}
            hint={p.presentadoByName ?? undefined}
          />
          <Stat
            label="Versión"
            value={`v${p.version}${p.version > 1 ? " · rectificativa" : ""}`}
            hint={p.correcciones ? `${p.correcciones} corrección(es)` : undefined}
          />
        </div>
        {p.notas && <p className="text-xs text-muted-foreground">Notas: {p.notas}</p>}

        {p.avisos.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 space-y-1.5">
            {p.avisos.map((a, i) => (
              <div key={i} className="flex gap-2">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {a}
              </div>
            ))}
          </div>
        )}

        {c && (
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Control de saldos (en pesos)
              </div>
              <ControlCell control={c} />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm tabular-nums">
              <Amount label="Saldo inicial" v={c.saldo_inicial} />
              <span className="text-muted-foreground">+</span>
              <Amount label="Créditos" v={c.creditos} />
              <span className="text-muted-foreground">−</span>
              <Amount label="Débitos" v={c.debitos} />
              <span className="text-muted-foreground">vs</span>
              <Amount label="Saldo final" v={c.saldo_final} />
              <span className="text-muted-foreground">=</span>
              <Amount label="Diferencia" v={c.diferencia} tone={c.cuadra ? "ok" : "warn"} />
            </div>
            {c.operaciones_otras > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {c.operaciones_otras} operación(es) de otro tipo (ajustes, adelantos, lotes) no
                entran en créditos/débitos y pueden explicar la diferencia.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {p.archivo === "A" ? (
            <div className="flex flex-wrap gap-1.5">
              <Chip on={section === ""} onClick={() => setSection("")}>
                Todos
              </Chip>
              {Object.entries(SECTIONS_A).map(([d, l]) => (
                <Chip key={d} on={section === d} onClick={() => setSection(d)}>
                  <span className="font-mono">{d}0000dd</span> · {l}
                </Chip>
              ))}
            </div>
          ) : (
            <span />
          )}
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={p.archivo === "P" ? "Buscar CUIT o nombre…" : "Buscar código…"}
              className="h-8 w-56 rounded-md border border-input bg-card pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="max-h-[46vh] overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr className="text-left text-[11px] text-muted-foreground">
                  <th className="px-3 py-2 font-semibold w-12 text-right">
                    <span className="inline-flex items-center gap-1">
                      #{" "}
                      <HeaderHint
                        title="#"
                        text="Número de fila, solo para ubicarte en la vista previa. No va en el archivo."
                      />
                    </span>
                  </th>
                  {columns.map((col, i) => (
                    <th
                      key={`${col.key}${i}`}
                      className={`px-3 py-2 font-semibold whitespace-nowrap ${col.align === "right" ? "text-right" : ""}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label} <HeaderHint title={col.label} text={col.hint} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {rowsQ.isLoading ? (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="px-3 py-10 text-center font-sans text-muted-foreground"
                    >
                      <Loader2 size={14} className="inline animate-spin mr-1" /> Cargando filas…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="px-3 py-10 text-center font-sans text-muted-foreground"
                    >
                      {total === 0
                        ? "El archivo no tiene filas."
                        : "Ninguna fila coincide con el filtro."}
                    </td>
                  </tr>
                ) : (
                  rows.slice(0, MAX_ROWS_PREVIEW).map(({ f, n }) => (
                    <tr
                      key={n}
                      className="border-t border-border/60 odd:bg-muted/15 hover:bg-primary/5"
                    >
                      <td className="px-3 py-1.5 text-right text-muted-foreground">{n}</td>
                      {columns.map((col, i) => {
                        const v = f[col.key];
                        const empty = v === null || v === undefined || v === "";
                        return (
                          <td
                            key={`${col.key}${i}`}
                            className={`px-3 py-1.5 whitespace-nowrap ${col.align === "right" ? "text-right" : ""}`}
                          >
                            {col.render ? (
                              col.render(f)
                            ) : empty ? (
                              <span className="text-muted-foreground/40">·</span>
                            ) : (
                              String(v)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
            Mostrando {Math.min(rows.length, MAX_ROWS_PREVIEW)} de {total} fila(s)
            {rows.length > MAX_ROWS_PREVIEW && " · descargá el archivo para ver todas"}. El # es
            solo de referencia: no va en el archivo.
          </div>
        </div>

        {p.correcciones > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Correcciones manuales
            </div>
            <div className="space-y-1.5">
              {(corrQ.data ?? []).map((k) => (
                <div key={k.id} className="text-xs rounded-lg border border-border px-3 py-2">
                  <span className="font-mono">{k.codigo ?? `fila ${k.fila + 1}`}</span> · {k.campo}:{" "}
                  <span className="line-through text-muted-foreground">
                    {k.valorAnterior ?? "—"}
                  </span>{" "}
                  → <strong>{k.valorNuevo ?? "—"}</strong>
                  <div className="text-muted-foreground mt-0.5">
                    {formatDateTime(k.createdAt)} · {k.motivo}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-6 py-3">
        <p className="text-[11px] text-muted-foreground">
          Es la foto guardada: lo que ves es exactamente lo que se descarga.
        </p>
        <div className="flex gap-2">
          <BtnOutline onClick={onClose}>Cerrar</BtnOutline>
          <BtnPrimary onClick={onDownload}>
            <Download size={14} /> Descargar {NAME_EN_PACKAGE[p.archivo]}
          </BtnPrimary>
        </div>
      </div>
    </Modal>
  );
}
