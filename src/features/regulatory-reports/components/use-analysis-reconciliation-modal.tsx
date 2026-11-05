import { useEffect,useState } from "react";
import {
cruzarReconciliation,
type AnalysisSummary,
} from "@/features/payment-links/reconciliation/engine";
import { parseBankFile } from "@/features/payment-links/reconciliation/parse";
import { isSupabaseConfigured } from "@/infrastructure/supabase/client";
import { reconciliationFilesStorage } from "@/app/dependencies";
import { AppError,userMessage } from "@/shared/lib/errors";
import { listMovements } from "@/features/movements/movements.supabase";
import { type Archivo } from "@/features/regulatory-reports/reports.types";

/** Estado y acciones de AnalysisReconciliationModal: el componente solo dibuja. */
export function useAnalysisReconciliationModal({
  archivo,
  allArchivos: allFiles,
  onClose,
}: {
  archivo: Archivo;
  allArchivos: Archivo[];
  onClose: () => void;
}) {
  const [summary, setSummary] = useState<AnalysisSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rangeLabel, setRangeLabel] = useState<string>("");
  const [movCount, setMovCount] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        let bankRows = archivo.bankRows ?? null;
        // Si no hay bankRows en memoria, intentar obtener del storage o del downloadRows mock
        if (!bankRows || bankRows.length === 0) {
          if (archivo.rawFile) {
            bankRows = await parseBankFile(archivo.rawFile);
          } else if (archivo.storagePath && isSupabaseConfigured) {
            const data = await reconciliationFilesStorage.download(archivo.storagePath);
            const file = new File([data], archivo.archivo, {
              type: (data as Blob).type || "application/octet-stream",
            });
            bankRows = await parseBankFile(file);
          } else if (archivo.downloadRows.length > 0) {
            // fallback mock -> convertir downloadRows a BankRow shape mínimo
            const mapped = archivo.downloadRows.map((r) => ({
              fechaNegocio: String((r as Record<string, unknown>)["FECHA_NEGOCIO"] ?? ""),
              idDebin: String((r as Record<string, unknown>)["ID_DEBIN"] ?? ""),
              tipoMovCoelsa: String((r as Record<string, unknown>)["TIPO_MOV_COELSA"] ?? ""),
              cbu: String((r as Record<string, unknown>)["CBU"] ?? ""),
              ctaBtDelCbu: "",
              btSbo: "",
              btTop: "",
              denominacion: "",
              cuit: "",
              importeRaw: String((r as Record<string, unknown>)["IMPORTE_COELSA"] ?? "0"),
              importeCoelsa: Number((r as Record<string, unknown>)["IMPORTE_COELSA"] ?? 0),
              estadoCoelsa: String((r as Record<string, unknown>)["ESTADO_COELSA"] ?? "COMPLETADA"),
              astoEstado: String((r as Record<string, unknown>)["ASTO_ESTADO"] ?? ""),
              cvu: String((r as Record<string, unknown>)["CVU"] ?? ""),
              cuitVirtual: "",
              cvu2: "",
              cuitVirtual2: "",
              cbu2: "",
              cuit2: "",
              concepto: "",
              mismoTit: "",
              detalle: "",
              cvuCredito: "",
              fechaHoraCoelsa: String((r as Record<string, unknown>)["FECHA_HORA_COELSA"] ?? ""),
              raw: r as Record<string, string>,
            })) as import("@/features/payment-links/reconciliation/parse").BankRow[];
            bankRows = mapped;
          } else {
            throw new AppError(
              "validation",
              "No hay datos del archivo para analizar. Volvé a cargar el archivo.",
            );
          }
        }
        // Rango incremental: 1er reporte = todo hasta fecha carga, siguientes = (fecha último reporte, fecha actual]
        // (usuario confirmó: 20260903 full, siguiente delta desde último)
        let movements: import("@/infrastructure/supabase/legacy/types").Movement[] = [];
        let movCountDebug = 0;
        let rangeLabel = "";
        if (isSupabaseConfigured) {
          const sorted = [...allFiles].sort((a, b) => a.fecha.localeCompare(b.fecha));
          const idx = sorted.findIndex((a) => a.archivo === archivo.archivo);
          const prev = idx > 0 ? sorted[idx - 1] : null;
          let from: string | undefined;
          let to: string | undefined;
          if (prev) {
            const dPrev = new Date(prev.fecha + "T00:00:00");
            dPrev.setDate(dPrev.getDate() + 1);
            from = dPrev.toISOString();
            to = new Date(archivo.fecha + "T00:00:00").toISOString();
            // incluir todo el día hasta 23:59
            const h = new Date(to);
            h.setHours(23, 59, 59, 999);
            to = h.toISOString();
            rangeLabel = `${prev.fecha} → ${archivo.fecha} (delta)`;
          } else {
            // primer reporte: histórico hasta fecha carga
            to = new Date(archivo.fecha + "T00:00:00").toISOString();
            const h = new Date(to);
            h.setHours(23, 59, 59, 999);
            to = h.toISOString();
            from = undefined;
            rangeLabel = `histórico hasta ${archivo.fecha}`;
          }
          try {
            // Paginado para histórico grande (>5000)
            const all: import("@/infrastructure/supabase/legacy/types").Movement[] = [];
            let page = 0;
            const pageSize = 5000;
            while (true) {
              const resPage = await listMovements({
                page,
                pageSize,
                fechaDesde: from,
                fechaHasta: to,
              });
              all.push(...resPage.rows);
              movCountDebug = resPage.total ?? all.length;
              if (resPage.rows.length < pageSize) break;
              page++;
              if (page > 20) break; // safety cap 100k
            }
            movements = all;
          } catch {
            movements = [];
          }
          if (!cancelled) {
            setRangeLabel(rangeLabel);
            setMovCount(movCountDebug);
          }
        }
        const res = cruzarReconciliation(bankRows!, movements);
        if (!cancelled) setSummary(res);
      } catch (e: unknown) {
        if (!cancelled) setError(userMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [archivo, allFiles]);

  const porcentaje = summary
    ? summary.total > 0
      ? Math.round((summary.encontrados / summary.total) * 10000) / 100
      : 0
    : 0;
  const dateAnalysis = summary?.fechaAnalisis ?? "";

  const Kpi = ({
    label,
    value,
    accent,
  }: {
    label: string;
    value: string | number;
    accent?: boolean;
  }) => (
    <div
      className={`rounded-lg border px-2.5 py-2.5 text-center ${
        accent ? "bg-primary/[0.06] border-primary/20" : "bg-muted/30 border-border/50"
      }`}
    >
      <div className="font-display text-[18px] font-semibold leading-none tracking-tight tabular-nums text-foreground">
        {value}
      </div>
      <div className="text-[10.5px] font-medium uppercase tracking-widest text-muted-foreground mt-1.5 leading-none">
        {label}
      </div>
    </div>
  );
  return {
    archivo,
    onClose,
    summary,
    loading,
    error,
    rangeLabel,
    movCount,
    porcentaje,
    dateAnalysis,
    Kpi,
  };
}

export type AnalysisReconciliationModalVm = ReturnType<typeof useAnalysisReconciliationModal>;
