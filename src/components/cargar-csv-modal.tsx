import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Info, FileUp } from "lucide-react";
import { FormDialog } from "@/components/form-dialog";
import { FileDropzone } from "@/components/file-dropzone";
import { Badge, Input, Label } from "@/components/portal-shell";
import { useQuery } from "@tanstack/react-query";
import { useComercios } from "@/hooks/useComercios";
import { listEstablecimientos, getParametroNumerico } from "@/lib/api/liquidaciones";
import { listLotes, aplicarLiquidacionLote, type LiquidacionAplicada } from "@/lib/api/lotes";
import type { LoteAcreditacion } from "@/lib/api/types";
import {
  calcularAcreditacion,
  marcaCoincide,
  PARAMETROS_DEFAULT,
  type ParametrosAcreditacion,
  type PreviewAcreditacion,
  type EstadoRenglon,
  type OverrideRenglon,
  type SitioLookup,
} from "@/lib/liquidaciones/acreditacion";
import {
  parseArchivoLiquidacion,
  EJEMPLO_ARCHIVO,
  type ResultadoParseo,
  type RenglonLiquidacion,
} from "@/lib/liquidaciones/parse";
import {
  calcularMatchGeneral,
  type LoteMatcheado,
  type EstablecimientoEntrada,
} from "@/lib/liquidaciones/match-general";

// Carga del archivo de liquidación de Payway para uno o varios lotes
// Programado a la vez. El modal separa dos modos:
//
//   1. Per-lote (lote prop): un único lote objetivo. Reusa la lógica del
//      antiguo `AcreditarLoteModal` — match con overrides, selector
//      manual de comercio cuando el mapa falla, parámetros editables —
//      pero al confirmar llama `aplicarLiquidacionLote` y deja el lote
//      en Pendiente (no Acreditado).
//
//   2. General (sin lote prop): match contra TODOS los lotes Programado.
//      Cada renglón se asigna a un único lote (cercanía de fecha y
//      diferencia de bruto). El modal muestra una tabla con los lotes
//      que matchean y su preview de cálculo; confirmar pasa cada uno a
//      Pendiente y deja los que no matchearon tal como estaban.

export type ResultadoCargaCsv = {
  aplicados: number;
  sinMatch: number;
};

type Props = {
  open: boolean;
  /** Si viene, el modal trabaja en modo per-lote para este lote. */
  lote?: LoteAcreditacion | null;
  onClose: () => void;
  onCargado: (resultado: ResultadoCargaCsv) => void;
};

function fmt(n: number): string {
  return `$ ${Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
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
  const color =
    tone === "total"
      ? "font-semibold text-foreground"
      : tone === "subtract"
        ? "text-red-600"
        : "";
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

export function CargarCsvModal({ open, lote, onClose, onCargado }: Props) {
  const modoPerLote = !!lote;
  const [file, setFile] = useState<File | null>(null);
  const [parseado, setParseado] = useState<ResultadoParseo | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parametros, setParametros] = useState<ParametrosAcreditacion>(PARAMETROS_DEFAULT);
  const [comercioManual, setComercioManual] = useState("");
  const [overrides, setOverrides] = useState<Record<number, OverrideRenglon>>({});
  const [verColumnas, setVerColumnas] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  // Lotes Programado en modo general. Se levantan vía una llamada
  // dedicada (no reutilizamos el hook de la página para no entrar en
  // bucle con su estado).
  const [programados, setProgramados] = useState<LoteAcreditacion[] | null>(null);
  const [cargandoProgramados, setCargandoProgramados] = useState(false);
  useEffect(() => {
    if (!open || modoPerLote) return;
    let cancelled = false;
    setCargandoProgramados(true);
    (async () => {
      try {
        const all: LoteAcreditacion[] = [];
        let page = 0;
        let total = Infinity;
        while (all.length < total) {
          const r = await listLotes({
            page,
            pageSize: 1000,
            estado: "Programado",
          });
          all.push(...r.rows);
          total = r.total;
          page += 1;
          if (r.rows.length === 0) break;
        }
        if (!cancelled) setProgramados(all);
      } catch (e) {
        if (!cancelled) setErrorGuardado((e as Error).message);
      } finally {
        if (!cancelled) setCargandoProgramados(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, modoPerLote]);

  // Los parámetros se leen una vez al abrir, no en cada cambio. Mismo
  // patrón que el modal viejo: el snapshot del lote gana sobre el
  // global si ya está grabado.
  useEffect(() => {
    if (!open) return;
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
        // El snapshot del lote (Programado/Pendiente) suele tener
        // comisionCierreLotePct=0 porque el 0,45% se calcula al
        // confirmar y no antes. Para no mostrar 0% en el modal
        // (que confunde al operador), caemos al parámetro global
        // y, si no está, al default de 0,45. Solo respetamos el
        // valor del lote si es > 0 (lote ya cerrado).
        comisionCierreLotePct:
          (lote?.comisionCierreLotePct ?? 0) > 0
            ? (lote?.comisionCierreLotePct as number)
            : cierreGlobal,
        toleranciaBrutoPct: tolerancia,
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, [open, lote]);

  // Parseo del CSV. Se dispara automáticamente al elegir un archivo; no
  // hay paso intermedio. Si se reabre el modal, el file nuevo reemplaza
  // todo.
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

  const renglones: RenglonLiquidacion[] = parseado?.renglones ?? [];

  // Mapa de establecimientos. Se carga una vez por modal abierto; sin
  // tablaDisponible=true el modal muestra un warning y permite usar
  // el selector manual (solo per-lote).
  const estabQuery = useQuery({
    queryKey: ["liquidaciones", "establecimientos"],
    queryFn: listEstablecimientos,
    staleTime: 5 * 60_000,
    retry: false,
    enabled: open,
  });
  const tablaDisponible = estabQuery.data?.tablaDisponible ?? true;
  // El shape de `calcularAcreditacion` exige `comercioNombre: string` por
  // entrada, así que resolvemos el nombre acá desde el join que ya
  // devuelve `listEstablecimientos` (comercio por FK).
  const establecimientos: EstablecimientoEntrada[] = (estabQuery.data?.rows ?? []).map((e) => ({
    establecimiento: e.establecimiento,
    marca: e.marca,
    comercioId: e.comercioId,
    vigenteHasta: e.vigenteHasta,
    comercioNombre: e.comercio?.nombreComercio ?? e.comercio?.usuario ?? "",
  }));
  // Variante con `comercioNombre` garantizado como string para `calcularAcreditacion`
  // (cuyo contrato lo exige non-optional).
  const establecimientosConNombre = useMemo(
    () => establecimientos.map((e) => ({ ...e, comercioNombre: e.comercioNombre ?? "" })),
    [establecimientos],
  );

  // Fallback por `site_id`: cuando el mapa de establecimientos no
  // está cargado (o el `ESTABLECIMIENTO` del CSV no matchea contra
  // él), el resolver puede encontrar el comercio por
  // `comercios.site_id = renglon.establecimiento`. Lo armamos a partir
  // del lote (per-lote) o de los lotes Programado cargados (general).
  const sitios: SitioLookup[] = useMemo(() => {
    const out: SitioLookup[] = [];
    if (modoPerLote && lote?.comercio?.siteId) {
      out.push({
        sitioId: lote.comercio.siteId,
        comercioId: lote.comercioId,
        comercioNombre: lote.comercio.nombreComercio ?? lote.comercio.usuario ?? "",
      });
    }
    if (!modoPerLote) {
      for (const l of programados ?? []) {
        if (l.comercio?.siteId) {
          out.push({
            sitioId: l.comercio.siteId,
            comercioId: l.comercioId,
            comercioNombre: l.comercio.nombreComercio ?? l.comercio.usuario ?? "",
          });
        }
      }
    }
    return out;
  }, [modoPerLote, lote, programados]);

  const comercios = useComercios({ page: 0, pageSize: 200 });

  // ============================================================
  // Cómputo del preview
  // ============================================================

  // Per-lote: usar el resolver completo (con overrides y comercio manual)
  // para mantener la potencia del modal viejo.
  const previewPerLote: PreviewAcreditacion | null = useMemo(() => {
    if (!modoPerLote || !lote || renglones.length === 0) return null;
    return calcularAcreditacion({
      lote,
      renglones,
      establecimientos: establecimientosConNombre,
      parametros,
      comercioManual: comercioManual || null,
      overrides,
      sitios,
    });
  }, [modoPerLote, lote, renglones, establecimientosConNombre, parametros, comercioManual, overrides, sitios]);

  // General: calcular match contra todos los Programado y, por cada
  // uno, totales con calcularAcreditacion.
  type MatchConPreview = LoteMatcheado & { preview: PreviewAcreditacion };
  const previewGeneral: {
    matches: MatchConPreview[];
    sinMatch: RenglonLiquidacion[];
  } | null = useMemo(() => {
    if (modoPerLote || !parseado || renglones.length === 0) return null;
    if (!programados || programados.length === 0) return null;

    const match = calcularMatchGeneral({
      renglones,
      lotes: programados,
      establecimientos,
      sitios,
    });

    const matches: MatchConPreview[] = match.conMatch.map((m) => {
      const preview = calcularAcreditacion({
        lote: m.lote,
        renglones: m.renglones,
        establecimientos: establecimientosConNombre,
        parametros,
        comercioManual: null,
        overrides: {},
        sitios,
      });
      return { ...m, preview };
    });

    return { matches, sinMatch: match.sinMatch };
  }, [modoPerLote, parseado, renglones, programados, establecimientos, establecimientosConNombre, parametros, sitios]);

  // ============================================================
  // Confirmar
  // ============================================================

  const setOverride = (nro: number, ov: OverrideRenglon | null) =>
    setOverrides((prev) => {
      const next = { ...prev };
      if (ov === null) delete next[nro];
      else next[nro] = ov;
      return next;
    });

  const setParam = <K extends keyof ParametrosAcreditacion>(
    k: K,
    v: ParametrosAcreditacion[K],
  ) => setParametros((p) => ({ ...p, [k]: v }));

  const cerrar = useCallback(() => {
    setFile(null);
    setParseado(null);
    setParseError(null);
    setComercioManual("");
    setOverrides({});
    setVerColumnas(false);
    setErrorGuardado(null);
    setGuardando(false);
    setProgramados(null);
    onClose();
  }, [onClose]);

  // Pre-flight checks antes de mandar a la RPC
  const validar = (): { ok: true } | { ok: false; msg: string } => {
    if (modoPerLote) {
      if (!lote) return { ok: false, msg: "Sin lote objetivo." };
      if (!previewPerLote || previewPerLote.aplicables.length === 0) {
        return { ok: false, msg: "Ningun renglon del archivo corresponde a este lote." };
      }
    } else {
      if (!previewGeneral || previewGeneral.matches.length === 0) {
        return { ok: false, msg: "El archivo no hizo match con ningun lote Programado." };
      }
    }
    return { ok: true };
  };

  const liquidacionDePreview = (
    p: PreviewAcreditacion,
    tasaMolipayPct: number,
    comisionCierrePct: number,
  ): LiquidacionAplicada => ({
    comisionMolipayPct: tasaMolipayPct,
    comisionMolipayMonto: p.totales.comisionMolipay,
    comisionCierreLotePct: comisionCierrePct,
    comisionCierreLoteMonto: p.totales.comisionCierre,
    debitoCreditoMonto: p.totales.retencionDebitoCredito,
    ivaMonto: p.totales.retencionIva,
    iibbMonto: p.totales.retencionIibb,
    importeNeto: p.totales.importeNeto,
  });

  // fecha_cobro_real: la fecha del CSV que se aplicó al lote. Para
  // archivos diarios es la misma para todos los renglones; cuando un lote
  // tiene asignados renglones de varios días (raro pero posible), usamos
  // la fecha del primer renglón del lote (en el orden que devolvió el
  // parser), que es la más antigua.
  const fechaCobroRealPara = (rs: RenglonLiquidacion[]): string | null => {
    const fechas = rs.map((r) => r.fecha).filter(Boolean).sort();
    if (fechas.length === 0) return null;
    return fechas[0] ?? null;
  };

  const aplicar = async () => {
    const v = validar();
    if (!v.ok) {
      setErrorGuardado(v.msg);
      return;
    }
    setGuardando(true);
    setErrorGuardado(null);
    try {
      let aplicados = 0;
      let sinMatch = 0;
      if (modoPerLote && lote && previewPerLote) {
        const liq = liquidacionDePreview(previewPerLote, lote.tasaMolipayPct, parametros.comisionCierreLotePct);
        const fechaCobro = fechaCobroRealPara(previewPerLote.aplicables.map((m) => m.renglon));
        await aplicarLiquidacionLote(lote.id, liq, fechaCobro);
        aplicados = 1;
        sinMatch = previewPerLote.renglones.length - previewPerLote.aplicables.length;
      } else if (previewGeneral) {
        for (const m of previewGeneral.matches) {
          const liq = liquidacionDePreview(
            m.preview,
            m.lote.tasaMolipayPct,
            parametros.comisionCierreLotePct,
          );
          const fechaCobro = fechaCobroRealPara(m.renglones);
          await aplicarLiquidacionLote(m.lote.id, liq, fechaCobro);
          aplicados += 1;
        }
        sinMatch = previewGeneral.sinMatch.length;
      }
      onCargado({ aplicados, sinMatch });
      cerrar();
    } catch (e) {
      setErrorGuardado(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  };

  // ============================================================
  // Render
  // ============================================================

  const titulo = modoPerLote && lote
    ? `Cargar liquidación — ${lote.codigo}`
    : "Cargar liquidación de Payway";
  const descripcion = modoPerLote
    ? "Subí el archivo de liquidación para confirmar los importes. Quedará en Pendiente listo para acreditar."
    : "Subí el archivo de liquidación: los renglones que matcheen contra lotes Programado pasarán a Pendiente, el resto se queda donde está.";

  const sinCargaCsv = renglones.length === 0;

  const hayPreviewPerLote = !!previewPerLote && previewPerLote.aplicables.length > 0;
  const hayPreviewGeneral = !!previewGeneral && previewGeneral.matches.length > 0;

  const submitLabel = (() => {
    if (modoPerLote) {
      return hayPreviewPerLote
        ? `Pasar a Pendiente (${fmt(previewPerLote!.totales.importeNeto)})`
        : "Pasar a Pendiente";
    }
    if (hayPreviewGeneral) {
      return `Pasar a Pendiente (${previewGeneral!.matches.length} lote${previewGeneral!.matches.length === 1 ? "" : "s"})`;
    }
    return "Pasar a Pendiente";
  })();

  return (
    <FormDialog
      open={open}
      onClose={cerrar}
      title={titulo}
      description={descripcion}
      onSubmit={aplicar}
      submitLabel={submitLabel}
      size="xl"
      isSubmitting={guardando}
      cancelLabel="Cancelar"
    >
      <div className="space-y-5">
        {/* Contexto: contra esto se compara el archivo (solo per-lote) */}
        {modoPerLote && lote && (
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
        )}

        {/* Paso 1: archivo */}
        <div>
          <Label>Archivo de liquidación de Payway</Label>
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
              Delimitador punto y coma. Las columnas se buscan por nombre, así que el orden no
              importa. La base del cálculo es <span className="font-mono">TOTAL_NETO</span>. Las
              líneas antes del encabezado se ignoran, así que el título del periodo no molesta.
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

        {/* Resumen de lectura del archivo (mapeo de columnas) */}
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
                Encabezado en la línea{" "}
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
                <span className="font-mono text-foreground">Línea {i + 1} (ignorada):</span> {l}
              </p>
            ))}

            {verColumnas && (
              <div className="pt-1">
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
                        <td className="py-1 text-right font-mono tabular-nums text-muted-foreground">
                          {c.indice === null ? "-" : c.indice + 1}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!tablaDisponible && !sinCargaCsv && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            <Info size={15} className="mt-0.5 shrink-0" />
            <span>
              No se pudo leer el mapa de establecimientos de Payway. En modo por lote podés
              resolver el comercio abajo a mano.
            </span>
          </div>
        )}

        {/* ========== MODO PER-LOTE: tabla de renglones con overrides ========== */}
        {modoPerLote && lote && previewPerLote && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Renglones del archivo</Label>
              <span className="text-[11px] text-muted-foreground">
                {previewPerLote.aplicables.length} de {previewPerLote.renglones.length} aplican a
                este lote
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
                    {previewPerLote.renglones.map((m) => {
                      const et = ETIQUETA_ESTADO[m.estado];
                      const ov = overrides[m.renglon.nro] ?? "";
                      const forcible = !m.renglon.error;
                      return (
                        <tr
                          key={m.renglon.nro}
                          className={m.acreditable ? "" : "text-muted-foreground"}
                        >
                          <td className="px-2.5 py-1.5 font-mono tabular-nums">
                            {fmtFecha(m.renglon.fecha)}
                          </td>
                          <td className="px-2.5 py-1.5">{m.renglon.marca || "-"}</td>
                          <td className="px-2.5 py-1.5 font-mono">
                            {m.renglon.establecimiento || "-"}
                          </td>
                          <td className="px-2.5 py-1.5 truncate max-w-[140px]">
                            {m.comercioNombre ?? "-"}
                          </td>
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
                              <span className="block text-[10px] text-red-600 mt-0.5">
                                {m.renglon.error}
                              </span>
                            )}
                            {m.estado === "sin_establecimiento" &&
                              marcaCoincide(m.renglon.marca, lote.bandera) && (
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
                                  v === "aplicar" || v === "excluir"
                                    ? (v as OverrideRenglon)
                                    : null,
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
              <p className="mt-2 text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded px-3 py-2">
                {Object.keys(overrides).length} renglón(es) corregido(s) a mano. El cálculo de
                arriba ya los tiene en cuenta.
              </p>
            )}

            {previewPerLote.excedeTolerancia && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>
                  El bruto del CSV difiere del lote en {fmt(previewPerLote.diferenciaBruto)} (
                  {previewPerLote.diferenciaBrutoPct}%), más allá de la tolerancia de{" "}
                  {parametros.toleranciaBrutoPct}%. Se aplica igual.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Selector manual de comercio (solo per-lote) */}
        {modoPerLote && !sinCargaCsv && (
          <div className="rounded-lg border p-3 space-y-2">
            <Label htmlFor="cargarcsv-comercio">Comercio del archivo</Label>
            {comercios.isLoading ? (
              <p className="text-xs text-muted-foreground">Cargando comercios...</p>
            ) : (
              <select
                id="cargarcsv-comercio"
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

        {/* ========== MODO GENERAL: tabla de matches y sin match ========== */}
        {!modoPerLote && previewGeneral && programados && programados.length > 0 && (
          <>
            <div className="rounded-lg border p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <FileUp size={14} /> Lotes que van a pasar a Pendiente ({previewGeneral.matches.length})
              </h4>
              {previewGeneral.matches.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ningún lote Programado matcheó con este archivo. Revisá que las fechas y
                  comercios estén bien.
                </p>
              ) : (
                <div className="overflow-x-auto max-h-72 overflow-y-auto -mx-3">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr className="text-left text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Lote</th>
                        <th className="px-3 py-2 font-medium">Comercio</th>
                        <th className="px-3 py-2 font-medium">Bandera</th>
                        <th className="px-3 py-2 font-medium">Fecha</th>
                        <th className="px-3 py-2 font-medium text-right">Bruto CSV</th>
                        <th className="px-3 py-2 font-medium text-right">Bruto est.</th>
                        <th className="px-3 py-2 font-medium text-right">Dif.</th>
                        <th className="px-3 py-2 font-medium text-right">Neto a acreditar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {previewGeneral.matches.map((m) => (
                        <tr key={m.lote.id}>
                          <td className="px-3 py-1.5 font-mono text-xs">{m.lote.codigo}</td>
                          <td className="px-3 py-1.5 truncate max-w-[160px]">
                            {m.lote.comercio?.nombreComercio ?? m.lote.comercio?.usuario ?? m.lote.comercioId}
                          </td>
                          <td className="px-3 py-1.5">{m.lote.bandera}</td>
                          <td className="px-3 py-1.5 font-mono tabular-nums">
                            {fmtFecha(m.lote.fecha)}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                            {fmt(m.preview.totales.brutoCsv)}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                            {fmt(m.lote.importeBruto)}
                          </td>
                          <td
                            className={`px-3 py-1.5 text-right font-mono tabular-nums ${
                              m.preview.diferenciaBruto > 0 ? "text-amber-600" : "text-muted-foreground"
                            }`}
                          >
                            {fmt(m.preview.diferenciaBruto)}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono font-semibold text-emerald-700">
                            {fmt(m.preview.totales.importeNeto)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {previewGeneral.sinMatch.length > 0 && (
              <details className="rounded-lg border p-3 text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Renglones sin match ({previewGeneral.sinMatch.length}). El archivo los
                  trae pero ningún lote Programado los recibió — siguen en Programado.
                </summary>
                <div className="overflow-x-auto max-h-48 overflow-y-auto mt-2">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr className="text-left text-muted-foreground">
                        <th className="px-2.5 py-1.5 font-medium">Fecha</th>
                        <th className="px-2.5 py-1.5 font-medium">Marca</th>
                        <th className="px-2.5 py-1.5 font-medium">Estab.</th>
                        <th className="px-2.5 py-1.5 font-medium text-right">Bruto</th>
                        <th className="px-2.5 py-1.5 font-medium text-right">Neto</th>
                        <th className="px-2.5 py-1.5 font-medium">Motivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {previewGeneral.sinMatch.map((r) => (
                        <tr key={r.nro} className="text-muted-foreground">
                          <td className="px-2.5 py-1.5 font-mono tabular-nums">{fmtFecha(r.fecha)}</td>
                          <td className="px-2.5 py-1.5">{r.marca || "-"}</td>
                          <td className="px-2.5 py-1.5 font-mono">{r.establecimiento || "-"}</td>
                          <td className="px-2.5 py-1.5 text-right font-mono tabular-nums">
                            {fmt(r.totalBruto)}
                          </td>
                          <td className="px-2.5 py-1.5 text-right font-mono tabular-nums">
                            {fmt(r.totalNeto)}
                          </td>
                          <td className="px-2.5 py-1.5 text-amber-700">
                            {r.error ? r.error : "sin lote Programado"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </>
        )}

        {!modoPerLote && parseado && !cargandoProgramados && programados && programados.length === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            <AlertTriangle size={14} className="inline mr-1.5 -mt-0.5" />
            No hay lotes en estado Programado en la base. Generá lotes desde el módulo de
            cobros antes de cargar liquidaciones.
          </div>
        )}

        {/* ========== Cálculo de descuento (per-lote) ========== */}
        {modoPerLote && previewPerLote && (
          <div className="rounded-lg border p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Cálculo del lote (vista previa)
            </h4>
            <CalcRow
              label="Neto liquidado por Payway"
              value={fmt(previewPerLote.totales.netoCsv)}
              hint="TOTAL_NETO del CSV"
            />
            <div className="border-t my-1" />
            <CalcRow
              label="Comisión MoliPay"
              value={`- ${fmt(previewPerLote.totales.comisionMolipay)}`}
              tone="subtract"
              hint={`${lote!.tasaMolipayPct}% sobre el neto`}
            />
            <CalcRow
              label="Comisión de cierre de lote"
              value={`- ${fmt(previewPerLote.totales.comisionCierre)}`}
              tone="subtract"
              hint={`${parametros.comisionCierreLotePct}% — se guarda como snapshot`}
            />
            <CalcRow
              label="Retención débito y crédito"
              value={`- ${fmt(previewPerLote.totales.retencionDebitoCredito)}`}
              tone="subtract"
              hint={`${parametros.retencionDebitoCreditoPct}% (RG 2111/4172)`}
            />
            <CalcRow
              label="Retención IVA"
              value={`- ${fmt(previewPerLote.totales.retencionIva)}`}
              tone="subtract"
              hint={`${parametros.retencionIvaPct}% sobre la comisión MoliPay`}
            />
            <CalcRow
              label="Retención Ingresos Brutos"
              value={`- ${fmt(previewPerLote.totales.retencionIibb)}`}
              tone="subtract"
              hint="a completar por el operador"
            />
            <div className="border-t mt-1 pt-1" />
            <CalcRow
              label="Importe a acreditar (Pendiente)"
              value={fmt(previewPerLote.totales.importeNeto)}
              tone="total"
              hint="se deposita al confirmar Acreditar"
            />

            <div className="mt-3 pt-3 border-t grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <Label htmlFor="p-cierre">% cierre lote</Label>
                <Input
                  id="p-cierre"
                  value={String(parametros.comisionCierreLotePct)}
                  onChange={(e) =>
                    setParam("comisionCierreLotePct", Number(e.target.value.replace(",", ".")) || 0)
                  }
                  inputMode="decimal"
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label htmlFor="p-dc">% débito/crédito</Label>
                <Input
                  id="p-dc"
                  value={String(parametros.retencionDebitoCreditoPct)}
                  onChange={(e) =>
                    setParam("retencionDebitoCreditoPct", Number(e.target.value.replace(",", ".")) || 0)
                  }
                  inputMode="decimal"
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label htmlFor="p-iva">% IVA</Label>
                <Input
                  id="p-iva"
                  value={String(parametros.retencionIvaPct)}
                  onChange={(e) =>
                    setParam("retencionIvaPct", Number(e.target.value.replace(",", ".")) || 0)
                  }
                  inputMode="decimal"
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label htmlFor="p-iibb">$ IIBB</Label>
                <Input
                  id="p-iibb"
                  value={String(parametros.retencionIibbMonto)}
                  onChange={(e) =>
                    setParam("retencionIibbMonto", Number(e.target.value.replace(",", ".")) || 0)
                  }
                  inputMode="decimal"
                  className="mt-1 font-mono"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Editables porque el motor de retenciones no está implementado. Lo que dejes
              precargado es lo que se guarda.
            </p>
          </div>
        )}

        {!hayPreviewPerLote && modoPerLote && !sinCargaCsv && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>
              Ningún renglón del archivo corresponde a este lote. Revisá el archivo o resolvé el
              comercio arriba a mano.
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
    </FormDialog>
  );
}
