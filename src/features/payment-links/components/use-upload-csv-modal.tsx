import { userMessage } from "@/shared/lib/errors";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { parseFileSettlement, type ResultParseo } from "@/features/payment-links/settlements-parse";
import {
  confirmSettlement,
  huellaFile,
  previsualizarSettlement,
  rangeDelHeader,
  type PreviewSettlement,
} from "@/features/payment-links/credits.supabase";
import { type Props } from "@/features/payment-links/upload-csv-modal.types";

/** Estado y acciones de UploadCsvModal: el componente solo dibuja. */
export function useUploadCsvModal({ open, lote: batch, onClose, onCargado }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parseado, setParseado] = useState<ResultParseo | null>(null);
  const [hash, setHash] = useState("");
  const [preview, setPreview] = useState<PreviewSettlement | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [verColumns, setVerColumns] = useState(false);
  const [showCeros, setShowCeros] = useState(false);
  const [revisado, setRevisado] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  // Al elegir archivo: se lee en el navegador y la vista previa la arma la base.
  useEffect(() => {
    if (!file) {
      setParseado(null);
      setPreview(null);
      setParseError(null);
      return;
    }
    let cancelled = false;
    setParsing(true);
    setParseError(null);
    setRevisado(false);
    (async () => {
      try {
        const p = await parseFileSettlement(file);
        const h = await huellaFile(file);
        const pv = await previsualizarSettlement(p.renglones, h);
        if (cancelled) return;
        setParseado(p);
        setHash(h);
        setPreview(pv);
      } catch (e) {
        if (cancelled) return;
        setParseado(null);
        setPreview(null);
        setParseError(userMessage(e));
      } finally {
        if (!cancelled) setParsing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  /**
   * Genera y descarga un CSV de ejemplo con 5 contracargos
   * simulados, en el mismo formato que envia PayWay. Pensado para
   * probar el importador (`admin.comercios.link-pago.contracargos` →
   * boton "Importar PayWay") sin necesidad de un reporte real.
   */
  const downloadCsvChargebackDemo = () => {
    const date = new Date();
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const lines: string[] = [
      `MoliPay - Reporte de Alertas Tempranas de Contracargos;Periodo ${period};Generado ${date.toLocaleString("es-AR")}`,
      "ID_TRANSACCION;FECHA_DE_TRANS;MEDIO_DE_PAGO;NRO_DE_TARJETA;MONTO_DE_TRAM;CODIGO_DE_AUT;CCO_ORIGEN;CCO_MOTIVO",
      "PW-7894561;09/10/2026;Visa;****1234;1500,00;PW-TKT-88421;WEB;Desconocimiento de compra",
      "PW-7894562;08/10/2026;Mastercard;5234567890123456;2750,50;PW-TKT-88422;APP;Producto no recibido",
      "PW-7894563;07/10/2026;Amex;****0005;4200,00;PW-TKT-88423;WEB;Monto no reconocido",
      "PW-7894564;06/10/2026;Cabal;****9876;890,25;PW-TKT-88424;APP;Duplicado de cobro",
      "PW-7894565;05/10/2026;Visa;****4321;3300,00;PW-TKT-88425;WEB;Servicio no prestado",
    ];
    const csv = "﻿" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contracargos_demo_${period}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("CSV de contracargos demo descargado");
  };

  const close = useCallback(() => {
    setFile(null);
    setParseado(null);
    setPreview(null);
    setParseError(null);
    setVerColumns(false);
    setRevisado(false);
    setErrorGuardado(null);
    setSaving(false);
    onClose();
  }, [onClose]);

  const rows = useMemo(
    () => (preview?.renglones ?? []).filter((r) => showCeros || r.resultado !== "ignora"),
    [preview, showCeros],
  );

  const apply = async () => {
    if (!file || !parseado || !preview) {
      setErrorGuardado("Elegí el archivo de liquidación de Payway.");
      return;
    }
    if (!preview.puede_confirmar) {
      setErrorGuardado(
        preview.archivo_duplicado
          ? "Este archivo ya fue importado."
          : "El archivo tiene errores o no tiene renglones con importe: corregilo antes de importar.",
      );
      return;
    }
    if (!revisado) {
      setErrorGuardado("Marcá que revisaste la vista previa y los totales.");
      return;
    }
    setSaving(true);
    setErrorGuardado(null);
    try {
      const range = rangeDelHeader(parseado.encabezadoLineas);
      const r = await confirmSettlement({
        renglones: parseado.renglones,
        archivoNombre: file.name,
        hash,
        desde: range.desde,
        hasta: range.hasta,
      });
      onCargado({ aplicados: r.lotes_creados, sinMatch: r.excepciones });
      close();
    } catch (e) {
      setErrorGuardado(userMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const t = preview?.totales;
  return {
    open,
    batch,
    onClose,
    file,
    setFile,
    parseado,
    preview,
    parseError,
    parsing,
    verColumns,
    setVerColumns,
    showCeros,
    setShowCeros,
    revisado,
    setRevisado,
    saving,
    errorGuardado,
    downloadCsvChargebackDemo,
    close,
    rows,
    apply,
    t,
  };
}

export type UploadCsvModalVm = ReturnType<typeof useUploadCsvModal>;
