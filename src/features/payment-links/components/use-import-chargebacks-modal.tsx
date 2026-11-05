import { userMessage } from "@/shared/lib/errors";
import { useState,useRef } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
parsePaywayFile,
type ParsedPaywayFile,
} from "@/features/payment-links/importers/payway-chargebacks";
import {
importChargebacksFromPayway,
type ImportRowResult,
} from "@/features/payment-links/chargebacks-import.supabase";
import {
generateCsvChargebackDemo,
downloadCsv,
} from "@/features/payment-links/importers/chargeback-real-csv";
import { type Phase } from "@/features/payment-links/import-chargebacks-modal.types";

/** Estado y acciones de ImportChargebacksModal: el componente solo dibuja. */
export function useImportChargebacksModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedPaywayFile | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [results, setResults] = useState<ImportRowResult[] | null>(null);
  const [downloadingDemo, setDownloadingDemo] = useState(false);
  const [errorDemo, setErrorDemo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  /**
   * Genera y descarga un CSV con los ultimos 5 TIDs reales de la base.
   * Pensado para probar el importador end-to-end: si subis este CSV,
   * las 5 filas matchearan con `cliente_links_pago_pagos` y quedaran
   * en estado `ok`. Si lo subis 2 veces, las 5 quedaran en `duplicate`.
   */
  const onDownloadDemo = async () => {
    setDownloadingDemo(true);
    setErrorDemo(null);
    try {
      const csv = await generateCsvChargebackDemo(5);
      downloadCsv(csv);
      toast.success(
        `CSV generado con ${csv.pagosUsados} TIDs reales. Subilo al importador para probar.`,
      );
    } catch (e) {
      setErrorDemo(userMessage(e));
      toast.error(userMessage(e));
    } finally {
      setDownloadingDemo(false);
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
      setParseError(userMessage(e));
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
      toast.error(`Error al importar: ${userMessage(e)}`);
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
  return {
    onClose,
    phase,
    setPhase,
    file,
    setFile,
    parsed,
    setParsed,
    parseError,
    results,
    downloadingDemo,
    errorDemo,
    inputRef,
    onDownloadDemo,
    onSelect,
    onImport,
    onDrop,
    summary,
  };
}

export type ImportChargebacksModalVm = ReturnType<typeof useImportChargebacksModal>;
