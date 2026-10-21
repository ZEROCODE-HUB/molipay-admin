import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Info, ShieldCheck, ShieldOff } from "lucide-react";
import { FormDialog } from "@/components/form-dialog";
import { FileDropzone } from "@/components/file-dropzone";
import { Badge, Input, Label } from "@/components/portal-shell";
import { useQuery } from "@tanstack/react-query";
import { useComercios } from "@/hooks/useComercios";
import { listEstablecimientos, getParametroNumerico } from "@/lib/api/liquidaciones";
import { updateLote, type LiquidacionAplicada } from "@/lib/api/lotes";
import type { LoteAcreditacion } from "@/lib/api/types";
import {
  calcularAcreditacion,
  marcaCoincide,
  PARAMETROS_DEFAULT,
  type ParametrosAcreditacion,
  type PreviewAcreditacion,
  type EstadoRenglon,
  type OverrideRenglon,
} from "@/lib/liquidaciones/acreditacion";
import {
  parseArchivoLiquidacion,
  EJEMPLO_ARCHIVO,
  type ResultadoParseo,
} from "@/lib/liquidaciones/parse";
import { calcularRetencionesLote, type ResultadoRetenciones } from "@/lib/api/retenciones-lote";

// Modal de acreditacion de un lote.
//
// Flujo: subir el archivo de liquidacion de Payway, ver que renglon del archivo
// corresponde a este lote, revisar el calculo y confirmar.
//
// Dos decisiones de diseno:
//
// 1. El archivo de Payway trae TODAS las banderas y comercios del dia. El modal
//    muestra todos los renglones, no solo los de este lote: los de otros lotes
//    aparecen como "Otro lote" para que el operador vea que el archivo se cargo
//    completo y no piense que algo se perdio.
//
// 2. El calculo se muestra antes de aplicar. Acreditar mueve plata real: que el
//    operador vea de donde sale cada numero antes de escribirlo es la
//    diferencia entre corregir un error y revertir un pago.

type Props = {
  lote: LoteAcreditacion | null;
  onClose: () => void;
  onAcreditado: () => void;
};

function fmt(n: number): string {
  return `$ ${Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtFecha(iso: string): string {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const ETIQUETA_ESTADO: Record<EstadoRenglon, { texto: string; tone: "success" | "warn" | "danger" | "neutral" }> = {
  aplicado: { texto: "Aplicar", tone: "success" },
  diferencia: { texto: "Diferencia", tone: "warn" },
  sin_establecimiento: { texto: "Sin mapear", tone: "warn" },
  sin_movimiento: { texto: "Sin movimiento", tone: "neutral" },
  error_formato: { texto: "Formato", tone: "danger" },
  otro_lote: { texto: "Otro lote", tone: "neutral" },
  excluido: { texto: "Excluido", tone: "neutral" },
};

function CalcRow({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "subtract" | "total";
  hint?: string;
}) {
  const color = tone === "total" ? "font-semibold text-foreground" : tone === "subtract" ? "text-red-600" : "";
  return (
    <div className="flex items-start justify-between gap-3 text-sm py-1">
      <span className="text-muted-foreground">
        {label}
        {hint && <span className="block text-[11px] opacity-80">{hint}</span>}
      </span>
      <span className={`font-mono tabular-nums whitespace-nowrap ${color}`}>{value}</span>
    </div>
  );
}

export function AcreditarLoteModal({ lote, onClose, onAcreditado }: Props) {
  const [file, setFile] = useState<File | null>(null);
  // Se guarda el resultado del parseo entero, no solo los renglones: el mapeo de
  // columnas y el titulo del periodo se muestran en la vista previa y son los
  // que explican de donde sale cada numero.
  const [parseado, setParseado] = useState<ResultadoParseo | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [comercioManual, setComercioManual] = useState("");
  const [parametros, setParametros] = useState<ParametrosAcreditacion>(PARAMETROS_DEFAULT);
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  // Correccion manual por numero de linea del archivo. Se guarda el nro y no
  // el indice para que sobre el archivo y no sobre esta lista.
  const [overrides, setOverrides] = useState<Record<number, OverrideRenglon>>({});
  const [verColumnas, setVerColumnas] = useState(false);

  // Los parametros de negocio son globales y no cambian mientras el operador
  // mira el modal, asi que se leen una vez por lote abierto. El snapshot del
  // lote gana sobre el parametro global: si el lote ya fue acreditado con un
  // 0.45, ese 0.45 es el historico y no lo que diga la tabla ahora.
  useEffect(() => {
    if (!lote) return;
    let cancelled = false;
    (async () => {
      const cierreGlobal = await getParametroNumerico(
        "comision_cierre_lote_pct",
        PARAMETROS_DEFAULT.comisionCierreLotePct,
      );
      const tolerancia = await getParametroNumerico(
        "liquidacion_tolerancia_bruto_pct",
        PARAMETROS_DEFAULT.toleranciaBrutoPct,
      );
      if (cancelled) return;
      setParametros((p) => ({
        ...p,
        comisionCierreLotePct: lote.comisionCierreLotePct ?? cierreGlobal,
        toleranciaBrutoPct: tolerancia,
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, [lote]);

  // El parseo corre apenas se elige el archivo: no hay paso intermedio de
  // "Parsear". Si el archivo esta bien, el preview aparece solo.
  useEffect(() => {
    if (!file) {
      setParseado(null);
      setParseError(null);
      return;
    }
    let cancelled = false;
    setParsing(true);
    setParseError(null);
    parseArchivoLiquidacion(file)
      .then((res) => {
        if (cancelled) return;
        setParseado(res);
        // El archivo es nuevo: las correcciones manuales del anterior no aplican
        setOverrides({});
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setParseado(null);
        setParseError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setParsing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  const renglones = parseado?.renglones ?? [];

  const estabQuery = useQuery({
    queryKey: ["liquidaciones", "establecimientos"],
    queryFn: listEstablecimientos,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const tablaDisponible = estabQuery.data?.tablaDisponible ?? true;

  // Motor de retenciones automáticas (Débito/Crédito + IVA).
  // Se dispara apenas se carga el modal (no depende del CSV) porque
  // solo necesita el id del lote, su comercio y el legajo del cliente.
  // staleTime corto: si el operador edita una asignación desde otra
  // pantalla, esto se refresca al volver a abrir.
  const retencionesQuery = useQuery<ResultadoRetenciones | null>({
    queryKey: ["retenciones-lote", lote?.id],
    queryFn: () => (lote ? calcularRetencionesLote(lote.id) : Promise.resolve(null)),
    enabled: !!lote,
    staleTime: 30_000,
    retry: false,
  });

  const retenciones = retencionesQuery.data ?? null;

  // Siempre se pide la lista: aunque el mapa resuelva todo, el operador puede
  // necesitar forzar el comercio cuando el CSV trae un establecimiento nuevo.
  const comercios = useComercios({ page: 0, pageSize: 200 });

  const preview: PreviewAcreditacion | null = useMemo(() => {
    if (!lote || renglones.length === 0) return null;
    return calcularAcreditacion({
      lote,
      renglones,
      establecimientos: (estabQuery.data?.rows ?? []).map((e) => ({
        establecimiento: e.establecimiento,
        marca: e.marca,
        comercioId: e.comercioId,
        comercioNombre: e.comercio?.nombreComercio ?? e.comercio?.usuario ?? "-",
        vigenteHasta: e.vigenteHasta,
      })),
      parametros,
      comercioManual: comercioManual || null,
      overrides,
    });
  }, [lote, renglones, estabQuery.data, parametros, comercioManual, overrides]);

  const setOverride = (nro: number, ov: OverrideRenglon | null) =>
    setOverrides((prev) => {
      const next = { ...prev };
      if (ov === null) delete next[nro];
      else next[nro] = ov;
      return next;
    });

  const limpiarOverrides = () => setOverrides({});

  const setParam = <K extends keyof ParametrosAcreditacion>(k: K, v: ParametrosAcreditacion[K]) =>
    setParametros((p) => ({ ...p, [k]: v }));

  // Importe neto a acreditar: usa el calculo del preview del CSV pero
  // reemplaza DC/IVA/IIBB con los del motor de retenciones automaticas.
  // Si el cliente NO tiene IIBB asignado, cae al input manual.
  const iibbMontoFinal = useMemo(() => {
    if (retenciones && retenciones.iibb.asignado) {
      return retenciones.iibb.monto;
    }
    return parametros.retencionIibbMonto;
  }, [retenciones, parametros.retencionIibbMonto]);

  const importeNetoFinal = useMemo(() => {
    if (!preview) return 0;
    const totales = preview.totales;
    if (retenciones) {
      // Neto CSV - Comision MoliPay - Comision Cierre - DC (motor) -
      // IVA (motor) - IIBB (motor o manual) - Adelantos (lo descuenta
      // acreditar_lote en el server, no aca).
      const neto =
        totales.netoCsv -
        totales.comisionMolipay -
        totales.comisionCierre -
        retenciones.debitoCredito.monto -
        retenciones.iva.monto -
        iibbMontoFinal;
      return Math.max(0, Math.round((neto + Number.EPSILON) * 100) / 100);
    }
    // Fallback: si la RPC fallo, usamos el calculo local (puede no
    // respetar exenciones, pero al menos acredita algo).
    return totales.importeNeto;
  }, [preview, retenciones, iibbMontoFinal]);

  const cerrar = useCallback(() => {
    // `parametros` NO se resetea: sus defaults vienen de `parametros_globales` y
    // borrarlos aqui haria que al reabrir el modal el 0.45 vuelva hardcodeado.
    setFile(null);
    setParseado(null);
    setParseError(null);
    setComercioManual("");
    setNotas("");
    setOverrides({});
    setVerColumnas(false);
    setErrorGuardado(null);
    onClose();
  }, [onClose]);

  const acreditar = async () => {
    if (!lote || !preview) return;
    if (preview.aplicables.length === 0) {
      setErrorGuardado("Ningun renglon del archivo corresponde a este lote.");
      return;
    }
    setGuardando(true);
    setErrorGuardado(null);

    // DC e IVA: si la RPC devolvio algo, usamos eso (respeta
    // exenciones y asignaciones). Si fallo, caemos al calculo local.
    const debitoCreditoMonto = retenciones
      ? retenciones.debitoCredito.monto
      : preview.totales.retencionDebitoCredito;
    const ivaMonto = retenciones
      ? retenciones.iva.monto
      : preview.totales.retencionIva;
    const iibbMonto = iibbMontoFinal;

    const liquidacion: LiquidacionAplicada = {
      comisionMolipayPct: lote.tasaMolipayPct,
      comisionMolipayMonto: preview.totales.comisionMolipay,
      comisionCierreLotePct: parametros.comisionCierreLotePct,
      comisionCierreLoteMonto: preview.totales.comisionCierre,
      debitoCreditoMonto,
      ivaMonto,
      iibbMonto,
      importeNeto: importeNetoFinal,
    };

    try {
      await updateLote(lote.id, {
        estado: "Acreditado",
        liquidacion,
        notasResolucion: notas.trim() || null,
      });
      onAcreditado();
      cerrar();
    } catch (e) {
      setErrorGuardado(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  };

  const hayPreview = !!preview && preview.aplicables.length > 0;

  return (
    <FormDialog
      open={!!lote}
      onClose={cerrar}
      title={`Acreditar lote${lote ? ` - ${lote.codigo}` : ""}`}
      description="Subi el archivo diario de liquidacion de Payway para confirmar los importes antes de acreditar."
      onSubmit={acreditar}
      submitLabel={preview ? `Acreditar ${fmt(importeNetoFinal)}` : "Acreditar"}
      size="xl"
      isSubmitting={guardando}
      cancelLabel="Cancelar"
    >
      {lote && (
        <div className="space-y-5">
          {/* Contexto: contra esto se compara el archivo */}
          <div className="rounded-lg border bg-muted/30 p-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="min-w-0">
                <div className="text-muted-foreground">Comercio</div>
                <div className="font-semibold truncate">
                  {lote.comercio?.nombreComercio ?? lote.comercio?.usuario ?? lote.comercioId}
                </div>
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
                <div className="text-muted-foreground">Neto estimado</div>
                <div className="font-mono font-semibold">{fmt(lote.importeNeto)}</div>
              </div>
            </div>
          </div>

          {/* Paso 1: archivo */}
          <div>
            <Label>Archivo de liquidacion de Payway</Label>
            <div className="mt-1.5">
              <FileDropzone onFile={setFile} accept=".csv,.txt,text/csv,text/plain" />
            </div>
            <details className="mt-2">
              <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground">
                Ver formato esperado
              </summary>
              <pre className="mt-1.5 p-2.5 rounded-md bg-muted/50 text-[10px] leading-relaxed overflow-x-auto whitespace-pre">
                {EJEMPLO_ARCHIVO}
              </pre>
              <p className="text-[11px] text-muted-foreground mt-1">
                Delimitador punto y coma. Las columnas se buscan por nombre, asi que el orden no
                importa. La base del calculo es <span className="font-mono">TOTAL_NETO</span>. Las
                lineas antes del encabezado se ignoran, asi que el titulo del periodo no molesta.
              </p>
            </details>
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
              Leyendo archivo...
            </p>
          )}

          {/* Paso 1b: que se leyo del archivo. Sin esto el operador ve numeros
              pero no de donde salen, y un mapeo mal hecho no se detecta. */}
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
                  Encabezado en la linea{" "}
                  <span className="font-mono text-foreground">{parseado.lineaEncabezado}</span>
                </span>
                <span>
                  <span className="font-mono text-foreground">{parseado.renglones.length}</span>{" "}
                  renglones
                </span>
                {parseado.sinMovimiento > 0 && (
                  <span>
                    <span className="font-mono text-foreground">{parseado.sinMovimiento}</span> sin
                    movimiento (importes en 0)
                  </span>
                )}
                {parseado.descartados.length > 0 && (
                  <span className="text-red-600">
                    <span className="font-mono">{parseado.descartados.length}</span> descartados
                  </span>
                )}
              </div>

              {parseado.encabezadoLineas.map((l, i) => (
                <p key={i} className="text-[11px] text-muted-foreground">
                  <span className="font-mono text-foreground">Linea {i + 1} (ignorada):</span> {l}
                </p>
              ))}

              {verColumnas && (
                <div className="pt-1">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-1 font-medium">Se usa como</th>
                        <th className="py-1 font-medium">Columna del archivo</th>
                        <th className="py-1 font-medium text-right">Posicion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parseado.mapeo.map((c) => (
                        <tr key={c.archivo} className="border-t">
                          <td className="py-1 font-mono text-muted-foreground">{c.archivo}</td>
                          <td className="py-1 font-mono">
                            {c.archivo}
                            <span className="ml-1.5 text-muted-foreground">
                              {c.indice === null ? "falta" : "ok"}
                            </span>
                          </td>
                          <td className="py-1 text-right font-mono tabular-nums text-muted-foreground">
                            {c.indice === null ? "-" : c.indice + 1}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <p className="text-[11px] text-muted-foreground mt-2">
                    Delimitador{" "}
                    <span className="font-mono">;</span>, sin salto de linea dentro del archivo.
                    El archivo trae{" "}
                    <span className="font-mono">{parseado.columnas.length}</span> columnas; se leen
                    las {parseado.mapeo.length} que hacen falta.
                  </p>
                </div>
              )}
            </div>
          )}

          {renglones.length > 0 && !tablaDisponible && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
              <Info size={15} className="mt-0.5 shrink-0" />
              <span>
                No se pudo leer el mapa de establecimientos de Payway. Elegi el comercio abajo para
                poder calcular.
              </span>
            </div>
          )}

          {/* Paso 2: renglones del archivo */}
          {preview && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label>Renglones del archivo</Label>
                <span className="text-[11px] text-muted-foreground">
                  {preview.aplicables.length} de {preview.renglones.length} aplican a este lote
                </span>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr className="text-left">
                        <th className="px-2.5 py-2 font-medium">Fecha</th>
                        <th className="px-2.5 py-2 font-medium">Marca</th>
                        <th className="px-2.5 py-2 font-medium">Estab.</th>
                        <th className="px-2.5 py-2 font-medium">Comercio</th>
                        <th className="px-2.5 py-2 font-medium text-right">Bruto CSV</th>
                        <th className="px-2.5 py-2 font-medium text-right">Neto CSV</th>
                        <th className="px-2.5 py-2 font-medium text-right">Dif.</th>
                        <th className="px-2.5 py-2 font-medium">Estado</th>
                        <th className="px-2.5 py-2 font-medium">Match</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {preview.renglones.map((m) => {
                        const et = ETIQUETA_ESTADO[m.estado];
                        const ov = overrides[m.renglon.nro] ?? "";
                        // Un renglon con error de formato no se puede forzar: sin
                        // fecha o sin establecimiento no hay forma de saber de
                        // que lote es, asi que el control aparece deshabilitado.
                        const forcible = !m.renglon.error;
                        return (
                          <tr key={m.renglon.nro} className={m.acreditable ? "" : "text-muted-foreground"}>
                            <td className="px-2.5 py-1.5 font-mono tabular-nums">{fmtFecha(m.renglon.fecha)}</td>
                            <td className="px-2.5 py-1.5">{m.renglon.marca || "-"}</td>
                            <td className="px-2.5 py-1.5 font-mono">{m.renglon.establecimiento || "-"}</td>
                            <td className="px-2.5 py-1.5 truncate max-w-[140px]">{m.comercioNombre ?? "-"}</td>
                            <td className="px-2.5 py-1.5 text-right font-mono tabular-nums">
                              {fmt(m.renglon.totalBruto)}
                            </td>
                            <td className="px-2.5 py-1.5 text-right font-mono tabular-nums">
                              {fmt(m.renglon.totalNeto)}
                            </td>
                            <td
                              className={`px-2.5 py-1.5 text-right font-mono tabular-nums ${
                                m.acreditable && m.diferencia > 0 ? "text-amber-600" : ""
                              }`}
                            >
                              {m.acreditable ? fmt(m.diferencia) : "-"}
                            </td>
                            <td className="px-2.5 py-1.5">
                              <Badge tone={et.tone}>{et.texto}</Badge>
                              {m.renglon.error && (
                                <span className="block text-[10px] text-red-600 mt-0.5">{m.renglon.error}</span>
                              )}
                              {m.estado === "sin_establecimiento" && lote && marcaCoincide(m.renglon.marca, lote.bandera) && (
                                <span className="block text-[10px] mt-0.5">puede ser de este lote</span>
                              )}
                            </td>
                            <td className="px-2.5 py-1.5">
                              <select
                                value={ov}
                                disabled={!forcible}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setOverride(
                                    m.renglon.nro,
                                    v === "aplicar" || v === "excluir" ? (v as OverrideRenglon) : null,
                                  );
                                }}
                                className="h-7 rounded border border-input bg-background px-1.5 text-[11px] outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
                              >
                                <option value="">Auto</option>
                                <option value="aplicar">Aplicar</option>
                                <option value="excluir">Excluir</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {Object.keys(overrides).length > 0 && (
                <div className="mt-2 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                  <span>
                    {Object.keys(overrides).length}{" "}
                    {Object.keys(overrides).length === 1 ? "renglon corregido a mano" : "renglones corregidos a mano"}. El
                    calculo de arriba ya los tiene en cuenta.
                  </span>
                  <button
                    type="button"
                    onClick={limpiarOverrides}
                    className="shrink-0 underline hover:no-underline font-medium"
                  >
                    Volver al match automatico
                  </button>
                </div>
              )}

              {preview.excedeTolerancia && (
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>
                    El bruto del CSV difiere del lote en {fmt(preview.diferenciaBruto)} (
                    {preview.diferenciaBrutoPct}%), mas alla de la tolerancia de{" "}
                    {parametros.toleranciaBrutoPct}%. Se acredita igual y queda anotado en el lote.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Selector manual de comercio */}
          {renglones.length > 0 && (
            <div className="rounded-lg border p-3 space-y-2">
              <Label htmlFor="acredit-comercio">Comercio del archivo</Label>
              {comercios.isLoading ? (
                <p className="text-xs text-muted-foreground">Cargando comercios...</p>
              ) : (
                <select
                  id="acredit-comercio"
                  value={comercioManual}
                  onChange={(e) => setComercioManual(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                >
                  <option value="">Usar el mapa de establecimientos</option>
                  {comercios.rows.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombreComercio ?? c.usuario} - {c.legajo}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[11px] text-muted-foreground">
                Solo aplica cuando el archivo trae un establecimiento que el mapa no conoce. Los
                renglones de ese establecimiento se cuentan para este lote.
              </p>
            </div>
          )}

          {/* Paso 3: calculo */}
          {preview && (
            <div className="rounded-lg border p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Calculo de acreditacion
              </h4>

              <CalcRow
                label="Neto liquidado por Payway"
                value={fmt(preview.totales.netoCsv)}
                hint="TOTAL_NETO del CSV"
              />
              <div className="border-t my-1" />
              <CalcRow
                label="Comision MoliPay"
                value={`- ${fmt(preview.totales.comisionMolipay)}`}
                tone="subtract"
                hint={`${lote.tasaMolipayPct}% sobre el neto`}
              />
              <CalcRow
                label="Comision de cierre de lote"
                value={`- ${fmt(preview.totales.comisionCierre)}`}
                tone="subtract"
                hint={`${parametros.comisionCierreLotePct}% - queda como snapshot en el lote`}
              />
              {retencionesQuery.isLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                  <span className="inline-block w-3 h-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                  Calculando retenciones automaticas...
                </div>
              ) : retencionesQuery.isError ? (
                <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                  No se pudieron calcular las retenciones automaticas. Se usan los valores del
                  calculo local (puede no respetar exenciones). Motivo:{" "}
                  <span className="font-mono">{(retencionesQuery.error as Error)?.message}</span>
                </div>
              ) : retenciones ? (
                <>
                  {/* Débito/Crédito: desde la RPC */}
                  <div className="flex items-start justify-between gap-3 text-sm py-1">
                    <span className="text-muted-foreground flex-1">
                      <div className="flex items-center gap-1.5">
                        Retencion debito y credito
                        {retenciones.debitoCredito.exento ? (
                          <Badge tone="success" className="inline-flex items-center gap-1 text-[10px]">
                            <ShieldCheck size={10} /> Exento
                          </Badge>
                        ) : retenciones.debitoCredito.asignado ? (
                          <Badge tone="neutral" className="inline-flex items-center gap-1 text-[10px]">
                            <ShieldCheck size={10} /> Asignado
                          </Badge>
                        ) : (
                          <Badge tone="warn" className="inline-flex items-center gap-1 text-[10px]">
                            <ShieldOff size={10} /> No asignado
                          </Badge>
                        )}
                      </div>
                      <span className="block text-[11px] opacity-80">
                        {retenciones.debitoCredito.motivo}
                      </span>
                    </span>
                    <span className="font-mono tabular-nums whitespace-nowrap text-red-600">
                      - {fmt(retenciones.debitoCredito.monto)}
                    </span>
                  </div>

                  {/* IVA: desde la RPC */}
                  <div className="flex items-start justify-between gap-3 text-sm py-1">
                    <span className="text-muted-foreground flex-1">
                      <div className="flex items-center gap-1.5">
                        Retencion IVA
                        {retenciones.iva.asignado ? (
                          <Badge tone="neutral" className="inline-flex items-center gap-1 text-[10px]">
                            <ShieldCheck size={10} /> Asignado
                          </Badge>
                        ) : (
                          <Badge tone="warn" className="inline-flex items-center gap-1 text-[10px]">
                            <ShieldOff size={10} /> No asignado
                          </Badge>
                        )}
                      </div>
                      <span className="block text-[11px] opacity-80">
                        {retenciones.iva.motivo}
                      </span>
                    </span>
                    <span className="font-mono tabular-nums whitespace-nowrap text-red-600">
                      - {fmt(retenciones.iva.monto)}
                    </span>
                  </div>

                  {/* IIBB: si está asignado al cliente, lo calcula el motor.
                      Si no, queda como input manual. */}
                  <div className="flex items-start justify-between gap-3 text-sm py-1">
                    <span className="text-muted-foreground flex-1">
                      <div className="flex items-center gap-1.5">
                        Retencion Ingresos Brutos
                        {retenciones.iibb.asignado ? (
                          <Badge tone="neutral" className="inline-flex items-center gap-1 text-[10px]">
                            <ShieldCheck size={10} /> Asignado
                          </Badge>
                        ) : (
                          <Badge tone="warn" className="inline-flex items-center gap-1 text-[10px]">
                            <ShieldOff size={10} /> Manual
                          </Badge>
                        )}
                      </div>
                      <span className="block text-[11px] opacity-80">
                        {retenciones.iibb.motivo}
                      </span>
                    </span>
                    <span className="font-mono tabular-nums whitespace-nowrap text-red-600">
                      - {fmt(iibbMontoFinal)}
                    </span>
                  </div>
                </>
              ) : null}
              <div className="border-t mt-1 pt-1" />
              <CalcRow
                label="Importe a acreditar"
                value={fmt(importeNetoFinal)}
                tone="total"
                hint="a depositar en la subcuenta Operativa"
              />

              <div className="mt-3 pt-3 border-t grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="p-cierre">% cierre lote</Label>
                  <Input
                    id="p-cierre"
                    value={String(parametros.comisionCierreLotePct)}
                    onChange={(e) => setParam("comisionCierreLotePct", Number(e.target.value.replace(",", ".")) || 0)}
                    inputMode="decimal"
                    className="mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="p-iibb">
                    $ IIBB{" "}
                    {retenciones?.iibb.asignado && (
                      <span className="text-[10px] text-muted-foreground">(calculado)</span>
                    )}
                  </Label>
                  {retenciones?.iibb.asignado ? (
                    <div className="mt-1 h-10 px-3 rounded-md border bg-muted/30 text-sm font-mono flex items-center">
                      {fmt(retenciones.iibb.monto)}
                    </div>
                  ) : (
                    <Input
                      id="p-iibb"
                      value={String(parametros.retencionIibbMonto)}
                      onChange={(e) => setParam("retencionIibbMonto", Number(e.target.value.replace(",", ".")) || 0)}
                      inputMode="decimal"
                      className="mt-1 font-mono"
                    />
                  )}
                </div>
                <div>
                  <Label>CUIT</Label>
                  <div className="mt-1 h-10 px-3 rounded-md border bg-muted/30 text-sm font-mono flex items-center">
                    {retenciones?.cuit ?? (lote.comercio?.legajo ?? "—")}
                  </div>
                </div>
              </div>

              {/* Asignaciones consultadas: auditoría */}
              {retenciones && retenciones.asignacionesConsultadas.length > 0 && (
                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Asignaciones del cliente ({retenciones.asignacionesConsultadas.length})
                  </summary>
                  <ul className="mt-2 space-y-1 pl-2 border-l-2 border-muted">
                    {retenciones.asignacionesConsultadas.map((a) => (
                      <li key={a.impuestoCodigo} className="font-mono text-[11px]">
                        <span className="font-semibold">{a.impuestoCodigo}</span> ·{" "}
                        {a.impuestoNombre} · {a.tipo}{" "}
                        {a.tipo === "Porcentaje" ? `${a.monto}%` : `$ ${a.monto}`}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <p className="text-[11px] text-muted-foreground mt-2">
                Débito/Crédito e IVA se calculan con el motor de retenciones (impuestos_asignaciones
                del legajo + dc_excepciones por CUIT). IIBB queda manual hasta Fase 2.
              </p>
            </div>
          )}

          {/* Paso 4: notas */}
          <div>
            <Label htmlFor="acredit-notas">Notas (opcional)</Label>
            <textarea
              id="acredit-notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Ticket de Payway, diferencia de bruto, motivo..."
              className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          {renglones.length > 0 && !hayPreview && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>
                Ningun renglon del archivo corresponde a este lote. Revisa el archivo o resuelve el
                comercio arriba.
              </span>
            </div>
          )}

          {errorGuardado && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{errorGuardado}</span>
            </div>
          )}
        </div>
      )}
    </FormDialog>
  );
}
