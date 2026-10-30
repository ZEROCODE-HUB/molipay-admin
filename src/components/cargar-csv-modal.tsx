import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ChevronDown, ChevronRight, Download } from "lucide-react";
import { FormDialog } from "@/components/form-dialog";
import { FileDropzone } from "@/components/file-dropzone";
import { Badge, Label } from "@/components/portal-shell";
import type { LoteAcreditacion } from "@/lib/api/types";
import { EJEMPLO_ARCHIVO, parseArchivoLiquidacion, type ResultadoParseo } from "@/lib/liquidaciones/parse";
import {
  confirmarLiquidacion,
  huellaArchivo,
  previsualizarLiquidacion,
  rangoDelEncabezado,
  type PreviewLiquidacion,
  type RenglonPreview,
} from "@/lib/api/acreditaciones";

// Carga del archivo de liquidacion de Payway.
//
// La validacion y la importacion las hace la base:
//   1. liquidacion_previsualizar: valida cada renglon (formato, cuadre
//      bruto + costo + impuestos = neto, marca, establecimiento -> comercio,
//      archivo repetido) sin escribir nada.
//   2. liquidacion_confirmar: cada renglon con importe crea un lote de
//      acreditacion Pendiente y vincula la proyeccion (lote Programado) del
//      comercio y la bandera. Lo que no se puede asignar va a Excepciones.
// El neto a acreditar se calcula despues, al conciliar, en la base.

export type ResultadoCargaCsv = {
  aplicados: number;
  sinMatch: number;
};

type Props = {
  open: boolean;
  /** Si viene, se muestra como contexto (el archivo puede traer otros lotes). */
  lote?: LoteAcreditacion | null;
  onClose: () => void;
  onCargado: (resultado: ResultadoCargaCsv) => void;
};

function fmt(n: number | null | undefined): string {
  return `$ ${Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const RESULTADO: Record<RenglonPreview["resultado"], { texto: string; tone: "success" | "neutral" | "warn" | "danger" }> = {
  importa: { texto: "Se importa", tone: "success" },
  ignora: { texto: "Se ignora", tone: "neutral" },
  excepcion: { texto: "Excepción", tone: "warn" },
  error: { texto: "Error", tone: "danger" },
};

export function CargarCsvModal({ open, lote, onClose, onCargado }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parseado, setParseado] = useState<ResultadoParseo | null>(null);
  const [hash, setHash] = useState("");
  const [preview, setPreview] = useState<PreviewLiquidacion | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [verColumnas, setVerColumnas] = useState(false);
  const [mostrarCeros, setMostrarCeros] = useState(false);
  const [revisado, setRevisado] = useState(false);
  const [guardando, setGuardando] = useState(false);
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
        const p = await parseArchivoLiquidacion(file);
        const h = await huellaArchivo(file);
        const pv = await previsualizarLiquidacion(p.renglones, h);
        if (cancelled) return;
        setParseado(p);
        setHash(h);
        setPreview(pv);
      } catch (e) {
        if (cancelled) return;
        setParseado(null);
        setPreview(null);
        setParseError(e instanceof Error ? e.message : String(e));
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
  const descargarCsvContracargoDemo = () => {
    const fecha = new Date();
    const periodo = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
    const lineas: string[] = [
      `MoliPay - Reporte de Alertas Tempranas de Contracargos;Periodo ${periodo};Generado ${fecha.toLocaleString("es-AR")}`,
      "ID_TRANSACCION;FECHA_DE_TRANS;MEDIO_DE_PAGO;NRO_DE_TARJETA;MONTO_DE_TRAM;CODIGO_DE_AUT;CCO_ORIGEN;CCO_MOTIVO",
      "PW-7894561;09/10/2026;Visa;****1234;1500,00;PW-TKT-88421;WEB;Desconocimiento de compra",
      "PW-7894562;08/10/2026;Mastercard;5234567890123456;2750,50;PW-TKT-88422;APP;Producto no recibido",
      "PW-7894563;07/10/2026;Amex;****0005;4200,00;PW-TKT-88423;WEB;Monto no reconocido",
      "PW-7894564;06/10/2026;Cabal;****9876;890,25;PW-TKT-88424;APP;Duplicado de cobro",
      "PW-7894565;05/10/2026;Visa;****4321;3300,00;PW-TKT-88425;WEB;Servicio no prestado",
    ];
    const csv = "﻿" + lineas.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contracargos_demo_${periodo}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("CSV de contracargos demo descargado");
  };

  const cerrar = useCallback(() => {
    setFile(null);
    setParseado(null);
    setPreview(null);
    setParseError(null);
    setVerColumnas(false);
    setRevisado(false);
    setErrorGuardado(null);
    setGuardando(false);
    onClose();
  }, [onClose]);

  const filas = useMemo(
    () => (preview?.renglones ?? []).filter((r) => mostrarCeros || r.resultado !== "ignora"),
    [preview, mostrarCeros],
  );

  const aplicar = async () => {
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
    setGuardando(true);
    setErrorGuardado(null);
    try {
      const rango = rangoDelEncabezado(parseado.encabezadoLineas);
      const r = await confirmarLiquidacion({
        renglones: parseado.renglones,
        archivoNombre: file.name,
        hash,
        desde: rango.desde,
        hasta: rango.hasta,
      });
      onCargado({ aplicados: r.lotes_creados, sinMatch: r.excepciones });
      cerrar();
    } catch (e) {
      setErrorGuardado(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  };

  const t = preview?.totales;

  return (
    <FormDialog
      open={open}
      onClose={cerrar}
      title={lote ? `Subir CSV de Payway - ${lote.codigo}` : "Subir CSV de Payway"}
      description="Archivo diario de liquidación de Payway. Cada renglón con importe crea un lote de acreditación Pendiente; lo que no se puede asignar a un comercio va a Excepciones."
      onSubmit={() => void aplicar()}
      submitLabel={t ? `Confirmar importación (${t.con_importe - t.excepciones} lote(s))` : "Confirmar importación"}
      size="xl"
      isSubmitting={guardando}
      cancelLabel="Cancelar"
    >
      <div className="space-y-5">
        {lote && (
          <div className="rounded-lg border bg-muted/30 p-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="min-w-0">
                <div className="text-muted-foreground">Comercio</div>
                <div className="font-semibold truncate">{lote.comercio?.nombreComercio ?? lote.comercio?.usuario ?? lote.comercioId}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Bandera</div>
                <div className="font-semibold">{lote.bandera}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Bruto estimado</div>
                <div className="font-mono font-semibold">{fmt(lote.importeBruto)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Fecha estimada</div>
                <div className="font-mono font-semibold">{fmtFecha(lote.fecha)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Paso 1: archivo */}
        <div>
          <Label>Adquirente de origen</Label>
          <select className="mt-1 w-full sm:w-64 h-9 rounded-md border bg-background px-2 text-sm" defaultValue="payway">
            <option value="payway">Payway / Decidir</option>
            <option value="qr" disabled>
              Proveedor QR (no habilitado)
            </option>
          </select>
        </div>
        <div>
          <Label>Archivo de liquidación de Payway</Label>
          <div className="mt-1.5">
            <FileDropzone onFile={setFile} accept=".csv,.txt,text/csv,text/plain" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <details className="flex-1">
              <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground">Ver formato esperado</summary>
              <pre className="mt-1.5 p-2.5 rounded-md bg-muted/50 text-[10px] leading-relaxed overflow-x-auto whitespace-pre">{EJEMPLO_ARCHIVO}</pre>
              <p className="text-[11px] text-muted-foreground mt-1">
                Delimitador punto y coma. Las columnas se buscan por nombre, así que el orden no importa. Bruto + costo + impuestos tiene
                que dar el neto. Las líneas antes del encabezado se ignoran, así que el título del periodo no molesta.
              </p>
            </details>
            <button
              type="button"
              onClick={descargarCsvContracargoDemo}
              className="h-8 px-3 rounded-md border bg-card text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-muted shrink-0"
              title="Descarga un CSV con 5 contracargos simulados para probar el importador"
            >
              <Download size={12} /> CSV de prueba (contracargos)
            </button>
          </div>
        </div>

        {parseError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {parsing && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
            Leyendo y validando el archivo...
          </p>
        )}

        {/* Lectura del archivo (mapeo de columnas) */}
        {parseado && (
          <div className="rounded-lg border p-3 space-y-2">
            <button
              type="button"
              onClick={() => setVerColumnas((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
            >
              {verColumnas ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Lectura del archivo
            </button>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span>
                Encabezado en la línea <span className="font-mono text-foreground">{parseado.lineaEncabezado}</span>
              </span>
              <span>
                <span className="font-mono text-foreground">{parseado.renglones.length}</span> renglones
              </span>
              {parseado.sinMovimiento > 0 && (
                <span>
                  <span className="font-mono text-foreground">{parseado.sinMovimiento}</span> sin movimiento (importes en 0)
                </span>
              )}
            </div>
            {parseado.encabezadoLineas.map((l, i) => (
              <p key={i} className="text-[11px] text-muted-foreground">
                <span className="font-mono text-foreground">Línea {i + 1} (ignorada):</span> {l}
              </p>
            ))}
            {verColumnas && (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1 font-medium">Se usa como</th>
                    <th className="py-1 font-medium text-right">Posición</th>
                  </tr>
                </thead>
                <tbody>
                  {parseado.mapeo.map((c) => (
                    <tr key={c.archivo} className="border-t">
                      <td className="py-1 font-mono">{c.archivo}</td>
                      <td className="py-1 text-right font-mono tabular-nums text-muted-foreground">{c.indice === null ? "-" : c.indice + 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Vista previa (la arma la base) */}
        {preview && t && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="rounded-lg border p-2">
                <div className="text-muted-foreground">Con importe</div>
                <div className="font-mono font-semibold">{t.con_importe}</div>
              </div>
              <div className="rounded-lg border p-2">
                <div className="text-muted-foreground">Excepciones</div>
                <div className={`font-mono font-semibold ${t.excepciones > 0 ? "text-amber-700" : ""}`}>{t.excepciones}</div>
              </div>
              <div className="rounded-lg border p-2">
                <div className="text-muted-foreground">Errores</div>
                <div className={`font-mono font-semibold ${t.errores > 0 ? "text-red-600" : ""}`}>{t.errores}</div>
              </div>
              <div className="rounded-lg border p-2">
                <div className="text-muted-foreground">Neto del archivo</div>
                <div className="font-mono font-semibold">{fmt(t.neto)}</div>
              </div>
            </div>

            {preview.archivo_duplicado && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                Este archivo ya fue importado. No se puede volver a importar.
              </div>
            )}

            {preview.por_fecha_marca.length > 0 && (
              <div className="text-[11px] text-muted-foreground">
                Neto por fecha y bandera (debe coincidir con lo que entró a la recaudadora):{" "}
                {preview.por_fecha_marca.map((x) => (
                  <span key={`${x.fecha}-${x.marca}`} className="mr-2 font-mono text-foreground">
                    {fmtFecha(x.fecha)} {x.marca} {fmt(x.neto)}
                  </span>
                ))}
              </div>
            )}

            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" checked={mostrarCeros} onChange={(e) => setMostrarCeros(e.target.checked)} />
              Mostrar renglones en cero
            </label>

            <div className="overflow-x-auto max-h-80 overflow-y-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/60 border-b">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-2.5 py-2 font-medium">Fila</th>
                    <th className="px-2.5 py-2 font-medium">Fecha</th>
                    <th className="px-2.5 py-2 font-medium">Marca</th>
                    <th className="px-2.5 py-2 font-medium">Establecimiento</th>
                    <th className="px-2.5 py-2 font-medium">Comercio</th>
                    <th className="px-2.5 py-2 font-medium text-right">Bruto CSV</th>
                    <th className="px-2.5 py-2 font-medium text-right">Neto CSV</th>
                    <th className="px-2.5 py-2 font-medium">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filas.map((r) => (
                    <tr key={r.nro}>
                      <td className="px-2.5 py-1.5 font-mono">{r.nro}</td>
                      <td className="px-2.5 py-1.5 font-mono">{fmtFecha(r.fecha)}</td>
                      <td className="px-2.5 py-1.5">{r.marca ?? "-"}</td>
                      <td className="px-2.5 py-1.5 font-mono">{r.establecimiento ?? "-"}</td>
                      <td className="px-2.5 py-1.5">{r.comercio ? `${r.comercio} · ${r.legajo}` : <span className="text-muted-foreground">Sin asignar</span>}</td>
                      <td className="px-2.5 py-1.5 text-right font-mono">{fmt(r.bruto)}</td>
                      <td className="px-2.5 py-1.5 text-right font-mono">{fmt(r.neto)}</td>
                      <td className="px-2.5 py-1.5">
                        <Badge tone={RESULTADO[r.resultado].tone}>{RESULTADO[r.resultado].texto}</Badge>
                        {r.motivo && <div className="text-[10px] text-muted-foreground mt-0.5">{r.motivo}</div>}
                        {r.advertencias.includes("posible_duplicado") && <div className="text-[10px] text-amber-700">Posible duplicado</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={revisado} onChange={(e) => setRevisado(e.target.checked)} disabled={!preview.puede_confirmar} />
              <span>Revisé la vista previa y los totales coinciden con la liquidación de Payway.</span>
            </label>
          </div>
        )}

        {errorGuardado && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{errorGuardado}</span>
          </div>
        )}
      </div>
    </FormDialog>
  );
}
