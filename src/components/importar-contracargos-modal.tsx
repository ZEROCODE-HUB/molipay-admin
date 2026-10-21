import { useState, useRef } from "react";
import {
  Upload,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Copy,
  Info,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  parsePaywayFile,
  type ParsedPaywayFile,
} from "@/lib/api/importers/payway-chargebacks";
import { importChargebacksFromPayway, type ImportRowResult } from "@/lib/api/contracargos-import";
import {
  generarCsvContracargoDemo,
  descargarCsv,
} from "@/lib/api/importers/generar-csv-contracargo-real";
import { BtnPrimary, BtnOutline } from "@/components/portal-shell";

type Phase = "idle" | "parsing" | "preview" | "importing" | "done";

function phaseLabel(p: Phase): string {
  if (p === "parsing") return "Parseando archivo…";
  if (p === "importing") return "Importando filas…";
  return "";
}

export function ImportarContracargosModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedPaywayFile | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [results, setResults] = useState<ImportRowResult[] | null>(null);
  const [descargandoDemo, setDescargandoDemo] = useState(false);
  const [errorDemo, setErrorDemo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  /**
   * Genera y descarga un CSV con los ultimos 5 TIDs reales de la base.
   * Pensado para probar el importador end-to-end: si subis este CSV,
   * las 5 filas matchearan con `cliente_links_pago_pagos` y quedaran
   * en estado `ok`. Si lo subis 2 veces, las 5 quedaran en `duplicate`.
   */
  const onDescargarDemo = async () => {
    setDescargandoDemo(true);
    setErrorDemo(null);
    try {
      const csv = await generarCsvContracargoDemo(5);
      descargarCsv(csv);
      toast.success(
        `CSV generado con ${csv.pagosUsados} TIDs reales. Subilo al importador para probar.`,
      );
    } catch (e) {
      setErrorDemo((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setDescargandoDemo(false);
    }
  };

  const onSelect = async (f: File | null) => {
    if (!f) return;
    setFile(f);
    setParseError(null);
    setResults(null);
    setPhase("parsing");
    try {
      const p = await parsePaywayFile(f);
      if (p.totalRows === 0) {
        setParseError("El archivo está vacío.");
        setPhase("idle");
        return;
      }
      setParsed(p);
      setPhase("preview");
    } catch (e) {
      setParseError((e as Error).message);
      setPhase("idle");
    }
  };

  const onImport = async () => {
    if (!parsed) return;
    setPhase("importing");
    try {
      const summary = await importChargebacksFromPayway(parsed.rows);
      setResults(summary.details);
      setPhase("done");
      qc.invalidateQueries({ queryKey: ["contracargos"] });
      if (summary.ok > 0) {
        toast.success(`${summary.ok} contracargo(s) importados correctamente.`);
      }
    } catch (e) {
      toast.error(`Error al importar: ${(e as Error).message}`);
      setPhase("preview");
    }
  };

  const onDrop = (ev: React.DragEvent) => {
    ev.preventDefault();
    const f = ev.dataTransfer.files?.[0];
    if (f) void onSelect(f);
  };

  const summary = results
    ? {
        ok: results.filter((r) => r.status === "ok").length,
        duplicate: results.filter((r) => r.status === "duplicate").length,
        unmatched: results.filter((r) => r.status === "unmatched").length,
        errors: results.filter((r) => r.status === "error").length,
      }
    : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div>
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <Upload size={18} /> Importar reporte de PayWay
            </h3>
            <p className="text-sm text-muted-foreground">
              Alertas Tempranas de Contracargos (.csv / .xlsx, máx 10MB).
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-md"
            disabled={phase === "importing"}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {phase === "idle" && (
            <>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-10 text-center cursor-pointer hover:bg-muted/30 transition"
              >
                <FileSpreadsheet size={36} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium">
                  Arrastrá el archivo acá o hacé click para seleccionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  CSV o XLSX — hasta 10MB
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt"
                  className="hidden"
                  onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
                />
                {parseError && (
                  <div className="mt-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 inline-flex items-center gap-2">
                    <AlertCircle size={14} /> {parseError}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={onDescargarDemo}
                disabled={descargandoDemo}
                className="w-full h-9 rounded-md border bg-card text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-muted disabled:opacity-50"
                title="Genera un CSV con los últimos 5 TIDs reales de la DB para probar el importador end-to-end"
              >
                {descargandoDemo ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <FileSpreadsheet size={12} />
                )}
                {descargandoDemo
                  ? "Generando CSV con TIDs reales..."
                  : "Descargar CSV de prueba con TIDs reales de la base"}
              </button>
              {errorDemo && (
                <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                  {errorDemo}
                </div>
              )}
            </>
          )}

          {(phase === "parsing" || phase === "importing") && (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
              {phaseLabel(phase)}
            </div>
          )}

          {phase === "preview" && parsed && (
            <Preview parsed={parsed} />
          )}

          {phase === "done" && results && summary && (
            <Results summary={summary} results={results} />
          )}
        </div>

        <div className="border-t px-6 py-4 flex justify-end gap-2">
          {phase === "preview" && (
            <>
              <BtnOutline
                onClick={() => {
                  setParsed(null);
                  setFile(null);
                  setPhase("idle");
                }}
              >
                Cambiar archivo
              </BtnOutline>
              <BtnPrimary
                onClick={onImport}
                disabled={(parsed?.rows.length ?? 0) === 0}
              >
                Importar {parsed?.rows.length} fila(s)
              </BtnPrimary>
            </>
          )}
          {phase === "done" && (
            <BtnPrimary onClick={onClose}>Cerrar</BtnPrimary>
          )}
          {phase === "idle" && (
            <BtnOutline onClick={onClose}>Cancelar</BtnOutline>
          )}
        </div>
      </div>
    </div>
  );
}

function Preview({ parsed }: { parsed: ParsedPaywayFile }) {
  const preview = parsed.rows.slice(0, 10);
  return (
    <div className="space-y-3">
      <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs flex items-start gap-2">
        <Info size={14} className="text-blue-600 mt-0.5 shrink-0" />
        <div>
          <strong>Vista previa</strong> ({parsed.totalRows} fila(s) en total). Se importarán sólo las que matcheen con un pago existente.
          {parsed.unresolvedHeaders.length > 0 && (
            <p className="mt-1 text-amber-700">
              ⚠ Headers no reconocidos: {parsed.unresolvedHeaders.join(", ")}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left px-2 py-1.5">#</th>
              <th className="text-left px-2 py-1.5">TID</th>
              <th className="text-left px-2 py-1.5">Fecha</th>
              <th className="text-left px-2 py-1.5">Tarjeta</th>
              <th className="text-right px-2 py-1.5">Monto</th>
              <th className="text-left px-2 py-1.5">Motivo</th>
              <th className="text-left px-2 py-1.5">Estado</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((r, i) => {
              const hasErr = r.errors.length > 0;
              return (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                  <td className="px-2 py-1.5 font-mono">{r.parsed.idTransaccion ?? "—"}</td>
                  <td className="px-2 py-1.5 font-mono">{r.parsed.fechaTransaccion ?? "—"}</td>
                  <td className="px-2 py-1.5 font-mono">{r.parsed.nroTarjeta ?? "—"}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{r.parsed.monto ?? "—"}</td>
                  <td className="px-2 py-1.5">{r.parsed.ccoMotivo ?? "—"}</td>
                  <td className="px-2 py-1.5">
                    {hasErr ? (
                      <span className="inline-flex items-center gap-1 text-red-600">
                        <AlertCircle size={12} /> error
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 size={12} /> ok
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {parsed.totalRows > preview.length && (
        <p className="text-xs text-muted-foreground text-center">
          …y {parsed.totalRows - preview.length} fila(s) más.
        </p>
      )}

      {parsed.rows.some((r) => r.errors.length > 0) && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          Hay {parsed.rows.filter((r) => r.errors.length > 0).length} fila(s) con errores de parseo. Se omitirán al importar.
        </div>
      )}
    </div>
  );
}

function Results({
  summary,
  results,
}: {
  summary: { ok: number; duplicate: number; unmatched: number; errors: number };
  results: ImportRowResult[];
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        <SummaryCard label="Importados" value={summary.ok} tone="success" />
        <SummaryCard label="Duplicados" value={summary.duplicate} tone="neutral" />
        <SummaryCard label="Sin match" value={summary.unmatched} tone="warn" />
        <SummaryCard label="Con error" value={summary.errors} tone="danger" />
      </div>

      <div className="rounded-lg border overflow-x-auto max-h-[40vh]">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 sticky top-0">
            <tr>
              <th className="text-left px-2 py-1.5">TID</th>
              <th className="text-left px-2 py-1.5">Comercio</th>
              <th className="text-left px-2 py-1.5">Estado</th>
              <th className="text-left px-2 py-1.5">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="px-2 py-1.5 font-mono">{r.parsed.idTransaccion ?? "—"}</td>
                <td className="px-2 py-1.5">{r.comercioNombre ?? "—"}</td>
                <td className="px-2 py-1.5">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-2 py-1.5 text-muted-foreground">
                  {r.message ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "neutral" | "warn" | "danger";
}) {
  const colors: Record<typeof tone, string> = {
    success: "text-emerald-700 bg-emerald-50 border-emerald-200",
    neutral: "text-slate-700 bg-slate-50 border-slate-200",
    warn: "text-amber-700 bg-amber-50 border-amber-200",
    danger: "text-red-700 bg-red-50 border-red-200",
  };
  return (
    <div className={`rounded-lg border px-3 py-2 ${colors[tone]}`}>
      <div className="text-xs">{label}</div>
      <div className="font-mono text-xl font-semibold">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: ImportRowResult["status"] }) {
  const map = {
    ok: { icon: CheckCircle2, color: "text-emerald-600", label: "ok" },
    duplicate: { icon: Copy, color: "text-slate-600", label: "duplicado" },
    unmatched: { icon: AlertTriangle, color: "text-amber-600", label: "sin match" },
    error: { icon: AlertCircle, color: "text-red-600", label: "error" },
  } as const;
  const s = map[status];
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 ${s.color}`}>
      <Icon size={12} /> {s.label}
    </span>
  );
}
