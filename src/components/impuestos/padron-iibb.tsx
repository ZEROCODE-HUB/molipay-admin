import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Download, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table";
import { Badge, BtnOutline, BtnPrimary, Input, Label } from "@/components/portal-shell";
import { FileDropzone } from "@/components/file-dropzone";
import { KpiCard } from "@/components/kpi-card";
import { useImpuestosForAsignacion } from "@/hooks/useImpuestos";
import { crearZip } from "@/lib/zip-store";
import { NormalizacionIibbDialog } from "@/components/impuestos/normalizacion-iibb";
import {
  ORGANISMOS,
  QK_PADRONES,
  buscarEnPadron,
  cargarPadronIibb,
  confirmarPadron,
  exportarPadronTxt,
  descartarPadron,
  generarPadronDemo,
  listErroresPadron,
  listPadronesIibb,
  type OrganismoPadron,
  type PadronIibb,
  type ProgresoCarga,
} from "@/lib/api/padron-iibb";
import type { EstadoPadron } from "@/lib/api/types";

const n = (v: number | null | undefined) => (v ?? 0).toLocaleString("es-AR");
const pct = (v: number | null | undefined) =>
  v == null
    ? "—"
    : `${Number(v).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`;
const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
const fecha = (iso: string | null | undefined) =>
  iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—";

function tonoEstado(e: EstadoPadron): "success" | "warn" | "danger" | "neutral" {
  if (e === "Vigente") return "success";
  if (e === "Borrador" || e === "Cargando" || e === "Procesando") return "warn";
  if (e === "Error") return "danger";
  return "neutral";
}

/** ISO-8859-1 (como los padrones oficiales); fuera de Latin-1 -> "?". */
function latin1(texto: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(texto.length));
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    out[i] = c < 256 ? c : 63;
  }
  return out;
}

function descargarBlob(nombre: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

function descargarCsv(nombre: string, filas: (string | number | null)[][]) {
  const csv = filas
    .map((f) => f.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

async function descargarErrores(p: PadronIibb) {
  try {
    const errs = await listErroresPadron(p.id);
    if (errs.length === 0) return toast.info("El padrón no tiene filas con error.");
    descargarCsv(`errores-${p.nombre.replace(/\s+/g, "-")}.csv`, [
      ["Línea", "Motivo", "Contenido"],
      ...errs.map((e) => [e.linea, e.motivo, e.contenido]),
    ]);
    if (p.filasError > errs.length)
      toast.info(
        `Se descargaron ${n(errs.length)} de ${n(p.filasError)} errores (el detalle se guarda hasta 5.000).`,
      );
  } catch (e) {
    toast.error((e as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Resumen del borrador (preview)
// ---------------------------------------------------------------------------

function ResumenPadron({ p }: { p: PadronIibb }) {
  const k = p.kpis;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Período"
          value={p.periodo ?? "—"}
          sub={`Vigencia ${fecha(p.vigenciaDesde)} – ${fecha(p.vigenciaHasta)}`}
        />
        <KpiCard
          label="CUITs válidos"
          value={n(p.filasValidas)}
          sub={`${n(p.filasLeidas)} filas leídas`}
        />
        <KpiCard
          label="Filas con error"
          value={n(p.filasError)}
          sub={`${n(p.filasDuplicadas)} duplicadas (gana la mayor alícuota)`}
        />
        <KpiCard
          label="Con alícuota > 0"
          value={n(k?.con_alicuota)}
          sub={`${n(k?.exentos)} marcados exentos`}
        />
      </div>
      {k && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="Clientes en el padrón"
            value={n(k.clientes_en_padron)}
            sub={`de ${n(k.clientes_con_cuit)} con CUIT válido`}
          />
          <KpiCard
            label="Clientes con retención"
            value={n(k.clientes_con_retencion)}
            sub="alícuota de retención > 0"
          />
          <KpiCard
            label="Fuera del padrón"
            value={n(k.clientes_fuera_padron)}
            sub="se les aplicará 0%"
          />
          <KpiCard
            label="Cambian de alícuota"
            value={k.padron_anterior_id ? n(k.clientes_con_cambio) : "—"}
            sub={
              k.padron_anterior_nombre
                ? `vs. ${k.padron_anterior_nombre}`
                : "sin padrón anterior para comparar"
            }
          />
        </div>
      )}
      {k && k.clientes_sin_cuit_valido > 0 && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 flex items-start gap-1.5">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {n(k.clientes_sin_cuit_valido)} clientes no tienen un CUIT de 11 dígitos cargado: no se
          pueden cruzar con el padrón.
        </p>
      )}
      {k && k.alicuotas.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Distribución de alícuotas de retención
          </h4>
          <div className="flex flex-wrap gap-2">
            {k.alicuotas.map((a) => (
              <span
                key={a.alicuota}
                className="rounded-md border bg-muted/40 px-2 py-1 text-xs font-mono"
              >
                {pct(a.alicuota)} · {n(a.cuits)}
              </span>
            ))}
          </div>
        </div>
      )}
      {k && k.cambios.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Clientes con cambio de alícuota ({n(k.clientes_con_cambio)}
            {k.clientes_con_cambio > k.cambios.length ? `, se muestran ${k.cambios.length}` : ""})
          </h4>
          <div className="max-h-56 overflow-y-auto border rounded-lg">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/60 border-b text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">CUIT</th>
                  <th className="px-3 py-2 font-medium text-right">Anterior</th>
                  <th className="px-3 py-2 font-medium text-right">Nueva</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {k.cambios.map((c) => (
                  <tr key={c.legajo}>
                    <td className="px-3 py-1.5">
                      <div className="font-medium truncate max-w-[220px]">{c.nombre}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{c.legajo}</div>
                    </td>
                    <td className="px-3 py-1.5 font-mono">{c.cuit}</td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {c.anterior == null ? "No figuraba" : pct(c.anterior)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {c.nueva == null ? "No figura" : pct(c.nueva)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 z-10 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold">{title}</h3>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted rounded-md"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="p-6">{children}</div>
        {footer && (
          <div className="sticky bottom-0 bg-card border-t px-6 py-3 flex flex-wrap justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Carga: formulario -> lectura con progreso -> resumen -> confirmar
// ---------------------------------------------------------------------------

export function CargarPadronDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { rows: impuestos } = useImpuestosForAsignacion();
  const [impuestoId, setImpuestoId] = useState("");
  const [organismo, setOrganismo] = useState<OrganismoPadron>("SIRTAC");
  const [nombre, setNombre] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [prueba, setPrueba] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [progreso, setProgreso] = useState<ProgresoCarga | null>(null);
  const [borrador, setBorrador] = useState<PadronIibb | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const abort = useRef<AbortController | null>(null);

  // Preseleccionar el impuesto de Ingresos Brutos si existe en el catalogo.
  useEffect(() => {
    if (impuestoId || impuestos.length === 0) return;
    const ib =
      impuestos.find((i) => i.fuenteAlicuota === "Padrón") ??
      impuestos.find((i) => /ingresos\s*brutos|iibb|\bib\b/i.test(`${i.codigo} ${i.nombre}`));
    if (ib) setImpuestoId(ib.id);
  }, [impuestos, impuestoId]);

  const refrescar = () => qc.invalidateQueries({ queryKey: QK_PADRONES });

  const iniciar = async () => {
    if (!nombre.trim() || !file)
      return setFormError("Completá el nombre del padrón y seleccioná el archivo.");
    if (!/\.(txt|csv|xlsx)$/i.test(file.name))
      return setFormError("El archivo debe ser .txt, .csv o .xlsx.");
    setFormError(null);
    abort.current = new AbortController();
    setProgreso({ etapa: "leyendo", progreso: 0, validas: 0, errores: 0 });
    try {
      const { padron } = await cargarPadronIibb(
        { impuestoId, nombre, organismo, file, prueba },
        setProgreso,
        abort.current.signal,
      );
      setBorrador(padron);
    } catch (e) {
      toast.error((e as Error).message);
      setProgreso(null);
    } finally {
      void refrescar();
    }
  };

  const confirmar = async () => {
    if (!borrador) return;
    setTrabajando(true);
    try {
      const r = await confirmarPadron(borrador.id);
      toast.success(
        r.reemplazado
          ? `Padrón ${borrador.periodo} vigente. El anterior quedó como Reemplazado.`
          : `Padrón ${borrador.periodo} vigente.`,
      );
      void refrescar();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTrabajando(false);
    }
  };

  const descartar = async () => {
    if (!borrador) return onClose();
    setTrabajando(true);
    try {
      await descartarPadron(borrador.id);
      toast.success("Borrador descartado.");
      void refrescar();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTrabajando(false);
    }
  };

  // Paso 3: resumen del borrador
  if (borrador) {
    return (
      <Modal
        title="Vista previa del padrón"
        subtitle={`${borrador.nombre} · ${borrador.organismo} · ${borrador.archivo}`}
        footer={
          <>
            <BtnOutline
              onClick={() => void descargarErrores(borrador)}
              disabled={borrador.filasError === 0}
            >
              <Download size={14} /> Errores
            </BtnOutline>
            <BtnOutline onClick={() => void descartar()} disabled={trabajando}>
              Descartar
            </BtnOutline>
            <BtnPrimary onClick={() => void confirmar()} disabled={trabajando}>
              <CheckCircle2 size={14} /> Confirmar carga
            </BtnPrimary>
          </>
        }
      >
        <p className="text-sm text-muted-foreground mb-4">
          El padrón quedó como <strong>borrador</strong>: todavía no es el vigente. Revisá el
          resumen y confirmá para que pase a ser el padrón activo de {borrador.periodo}
          {borrador.kpis?.padron_anterior_id
            ? " (si ya hay uno vigente para ese período, queda reemplazado)"
            : ""}
          .
        </p>
        <ResumenPadron p={borrador} />
      </Modal>
    );
  }

  // Paso 2: lectura en curso
  if (progreso) {
    return (
      <Modal title="Cargando padrón" subtitle={file?.name}>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 size={16} className="animate-spin" />
            {progreso.etapa === "leyendo"
              ? "Leyendo y validando el archivo…"
              : "Calculando el resumen contra los clientes de MoliPay…"}
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progreso.progreso}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground font-mono">
            <span>{progreso.progreso}%</span>
            <span>
              {n(progreso.validas)} filas enviadas · {n(progreso.errores)} con error
            </span>
          </div>
          {progreso.etapa === "leyendo" && (
            <div className="flex justify-end pt-2">
              <BtnOutline onClick={() => abort.current?.abort()}>Cancelar</BtnOutline>
            </div>
          )}
        </div>
      </Modal>
    );
  }

  // Paso 1: formulario
  return (
    <Modal
      title="Cargar padrón de Ingresos Brutos"
      subtitle="El archivo se valida y se muestra un resumen antes de dejarlo vigente."
      onClose={onClose}
      footer={
        <>
          <BtnOutline onClick={onClose}>Cancelar</BtnOutline>
          <BtnPrimary onClick={() => void iniciar()}>Procesar archivo</BtnPrimary>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="ib-organismo">Organismo</Label>
            <select
              id="ib-organismo"
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              value={organismo}
              onChange={(e) => setOrganismo(e.target.value as OrganismoPadron)}
            >
              {ORGANISMOS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="ib-impuesto">Impuesto</Label>
            <select
              id="ib-impuesto"
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              value={impuestoId}
              onChange={(e) => setImpuestoId(e.target.value)}
            >
              <option value="">Sin vincular</option>
              {impuestos.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.codigo} — {i.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="ib-nombre">Nombre del padrón</Label>
          <Input
            id="ib-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: SIRTAC agosto 2026"
          />
        </div>
        <div>
          <Label>Archivo (.txt, .csv o .xlsx)</Label>
          <FileDropzone
            onFile={(f) => {
              setFile(f);
              // El TXT de prueba se descarga como padron-prueba-...: se marca solo.
              if (f && /^padron-prueba-/i.test(f.name)) setPrueba(true);
            }}
            accept=".txt,.csv,.xlsx"
          />
          <label className="mt-2 flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={prueba}
              onChange={(e) => setPrueba(e.target.checked)}
            />
            <span>
              <span className="font-semibold">Archivo de prueba</span>: acepta CUIT de 11 dígitos aunque
              el dígito verificador no cierre (clientes de test). No usar con padrones reales.
            </span>
          </label>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Formato SIRTAC separado por “;”: emisión; vigencia desde; vigencia hasta; CUIT; régimen
            (D/C); sujeto (S/N); exento (S/N); alícuota percepción; alícuota retención; control 1;
            control 2; razón social. El período se toma de la vigencia del archivo.
          </p>
        </div>
        {formError && <p className="text-sm text-red-600">{formError}</p>}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Detalle de un padron: resumen + busqueda de CUIT
// ---------------------------------------------------------------------------

function PadronDetalle({
  p,
  onClose,
  acciones,
}: {
  p: PadronIibb;
  onClose: () => void;
  acciones?: ReactNode;
}) {
  const [texto, setTexto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const filas = useQuery({
    queryKey: ["taxpayer_registry_entries", p.id, busqueda],
    queryFn: () => buscarEnPadron(p.id, busqueda),
    enabled: p.filasValidas > 0,
  });

  return (
    <Modal
      title={p.nombre}
      subtitle={`${p.organismo ?? "—"} · ${p.archivo} · ${p.estado}`}
      onClose={onClose}
      footer={acciones}
    >
      <div className="space-y-5">
        {p.estado === "Error" && p.errorMensaje && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {p.errorMensaje}
          </p>
        )}
        <ResumenPadron p={p} />
        {p.filasValidas > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Buscar contribuyente
            </h4>
            <form
              className="flex gap-2 mb-3"
              onSubmit={(e) => {
                e.preventDefault();
                setBusqueda(texto);
              }}
            >
              <Input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="CUIT (o inicio) o razón social"
              />
              <BtnOutline type="submit">
                <Search size={14} /> Buscar
              </BtnOutline>
            </form>
            <div className="max-h-64 overflow-y-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/60 border-b text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">CUIT</th>
                    <th className="px-3 py-2 font-medium">Razón social</th>
                    <th className="px-3 py-2 font-medium">Rég.</th>
                    <th className="px-3 py-2 font-medium">Sujeto / Exento</th>
                    <th className="px-3 py-2 font-medium text-right">Percepción</th>
                    <th className="px-3 py-2 font-medium text-right">Retención</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filas.isLoading && (
                    <tr>
                      <td colSpan={6} className="px-3 py-3 text-muted-foreground">
                        Buscando…
                      </td>
                    </tr>
                  )}
                  {filas.data?.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-3 text-muted-foreground">
                        Sin coincidencias en este padrón (un CUIT ausente tributa 0%).
                      </td>
                    </tr>
                  )}
                  {filas.data?.map((f) => (
                    <tr key={f.cuit}>
                      <td className="px-3 py-1.5 font-mono">{f.cuit}</td>
                      <td className="px-3 py-1.5 truncate max-w-[220px]">
                        {f.razonSocial || <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-1.5">{f.tipoRegimen}</td>
                      <td className="px-3 py-1.5">
                        {f.sujeto ? "S" : "N"} / {f.exento ? "S" : "N"}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono">
                        {pct(f.alicuotaPercepcion)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono font-semibold">
                        {pct(f.alicuotaRetencion)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!busqueda && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Se muestran los primeros 50 CUITs; buscá para filtrar.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Lista de padrones
// ---------------------------------------------------------------------------

export function PadronesIibbTabla({
  puedeEditar,
  limite,
  vacio = "Todavía no hay padrones cargados.",
}: {
  puedeEditar: boolean;
  /** Muestra solo las ultimas N cargas, sin filtros ni paginado. */
  limite?: number;
  vacio?: string;
}) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: QK_PADRONES,
    queryFn: listPadronesIibb,
    // Mientras haya una carga en curso, refrescar el progreso.
    refetchInterval: (query) =>
      (query.state.data ?? []).some((p) => p.estado === "Cargando") ? 3000 : false,
  });
  const { rows: impuestos } = useImpuestosForAsignacion();
  const [detalle, setDetalle] = useState<PadronIibb | null>(null);
  const [revisar, setRevisar] = useState<PadronIibb | null>(null);

  const eliminar = async (p: PadronIibb) => {
    if (!window.confirm(`¿Eliminar "${p.nombre}"? Se borran sus ${n(p.filasValidas)} filas.`))
      return;
    try {
      await descartarPadron(p.id);
      toast.success("Padrón eliminado.");
      void qc.invalidateQueries({ queryKey: QK_PADRONES });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const confirmar = async (p: PadronIibb) => {
    try {
      const r = await confirmarPadron(p.id);
      toast.success(
        r.reemplazado
          ? `Padrón ${p.periodo} vigente. El anterior quedó como Reemplazado.`
          : `Padrón ${p.periodo} vigente.`,
      );
      setRevisar(null);
      void qc.invalidateQueries({ queryKey: QK_PADRONES });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // Version por organismo y periodo (v1, v2...), igual que los reportes.
  const versiones = useMemo(() => {
    const m = new Map<string, number>();
    const grupos = new Map<string, PadronIibb[]>();
    for (const p of q.data ?? []) {
      if (!["Borrador", "Vigente", "Reemplazado"].includes(p.estado)) continue;
      const k = `${p.organismo}|${p.periodo}`;
      grupos.set(k, [...(grupos.get(k) ?? []), p]);
    }
    for (const lista of grupos.values()) {
      lista
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .forEach((p, i) => m.set(p.id, i + 1));
    }
    return m;
  }, [q.data]);
  const codigoImpuesto = useMemo(
    () => new Map(impuestos.map((i) => [i.id, i.codigo])),
    [impuestos],
  );

  const versionCelda = (p: PadronIibb) => {
    const v = versiones.get(p.id);
    if (p.estado === "Cargando") return <Badge tone="warn">cargando {p.progreso}%</Badge>;
    if (p.estado === "Error") return <Badge tone="danger">error</Badge>;
    if (!v) return <span className="text-muted-foreground">—</span>;
    if (p.estado === "Vigente") return <Badge tone="success">v{v} vigente</Badge>;
    if (p.estado === "Reemplazado") return <Badge tone="neutral">v{v} reemplazada</Badge>;
    return <Badge tone="warn">v{v} borrador</Badge>;
  };
  const siNo = (v: boolean) =>
    v ? <Badge tone="success">Sí</Badge> : <Badge tone="neutral">No</Badge>;

  const columns: Column<PadronIibb>[] = [
    {
      key: "periodo",
      label: "Período",
      render: (p) => <span className="font-mono tabular-nums">{p.periodo ?? "—"}</span>,
    },
    {
      key: "impuesto",
      label: "Impuesto",
      render: (p) => (
        <span className="font-mono text-xs">
          {(p.impuestoId && codigoImpuesto.get(p.impuestoId)) || "IIBB"}
        </span>
      ),
    },
    {
      key: "archivo",
      label: "Archivo",
      render: (p) => (
        <div className="min-w-0">
          <div className="truncate">{p.archivo || "Sin archivo"}</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {p.organismo ?? "—"} · {p.nombre}
          </div>
        </div>
      ),
    },
    { key: "tramo", label: "Tramo", render: () => "Mensual" },
    { key: "version", label: "Versión", render: versionCelda },
    {
      key: "filasValidas",
      label: "Registros",
      render: (p) => <span className="font-mono tabular-nums">{n(p.filasValidas)}</span>,
    },
    {
      key: "createdAt",
      label: "Creación",
      render: (p) => <span className="text-xs whitespace-nowrap">{fechaHora(p.createdAt)}</span>,
    },
    {
      key: "confirmado",
      label: "Presentado",
      render: (p) => siNo(p.estado === "Vigente" || p.estado === "Reemplazado"),
    },
    {
      key: "pagado",
      label: "Pagado",
      render: () => <span className="text-muted-foreground">N/A</span>,
    },
  ];

  const txtDe = async (p: PadronIibb) => {
    const id = toast.loading("Armando el TXT del padrón…");
    try {
      const contenido = await exportarPadronTxt(p, (k) =>
        toast.loading(`Armando el TXT del padrón… ${n(k)} CUITs`, { id }),
      );
      toast.dismiss(id);
      return contenido;
    } catch (e) {
      toast.error((e as Error).message, { id });
      throw e;
    }
  };
  const nombreArchivo = (p: PadronIibb) =>
    `padron-${(p.organismo ?? "iibb").toLowerCase()}-${p.periodo ?? "sin-periodo"}-v${versiones.get(p.id) ?? 0}`;

  const descargarTxt = async (p: PadronIibb) => {
    if (p.filasValidas === 0) return toast.info("El padrón no tiene CUITs cargados.");
    const contenido = await txtDe(p).catch(() => null);
    if (contenido)
      descargarBlob(
        `${nombreArchivo(p)}.txt`,
        new Blob([contenido], { type: "text/plain;charset=utf-8" }),
      );
  };

  const descargarZip = async (p: PadronIibb) => {
    if (p.filasValidas === 0 && p.filasError === 0) return toast.info("El padrón no tiene datos.");
    try {
      const archivos: { nombre: string; contenido: string }[] = [];
      if (p.filasValidas > 0) {
        const contenido = await txtDe(p);
        archivos.push({ nombre: `${nombreArchivo(p)}.txt`, contenido });
      }
      if (p.filasError > 0) {
        const errs = await listErroresPadron(p.id);
        archivos.push({
          nombre: `${nombreArchivo(p)}-errores.csv`,
          contenido:
            "\ufeffLínea;Motivo;Contenido\n" +
            errs
              .map((e) =>
                [e.linea, e.motivo, e.contenido]
                  .map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`)
                  .join(";"),
              )
              .join("\n"),
        });
      }
      descargarBlob(`${nombreArchivo(p)}.zip`, crearZip(archivos));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const acciones = (p: PadronIibb) => (
    <div className="flex items-center gap-3 text-xs font-semibold text-primary">
      <button type="button" className="hover:underline" onClick={() => setDetalle(p)}>
        Ver
      </button>
      <button type="button" className="hover:underline" onClick={() => void descargarTxt(p)}>
        TXT
      </button>
      <button type="button" className="hover:underline" onClick={() => void descargarZip(p)}>
        ZIP
      </button>
    </div>
  );

  const accionesDetalle = (p: PadronIibb) => (
    <>
      {p.filasError > 0 && (
        <BtnOutline onClick={() => void descargarErrores(p)}>
          <Download size={14} /> Errores
        </BtnOutline>
      )}
      {puedeEditar && !["Vigente", "Reemplazado"].includes(p.estado) && (
        <BtnOutline
          className="text-red-600"
          onClick={() => {
            setDetalle(null);
            void eliminar(p);
          }}
        >
          Eliminar
        </BtnOutline>
      )}
      {p.estado === "Borrador" && puedeEditar && (
        <BtnPrimary
          onClick={() => {
            setDetalle(null);
            void confirmar(p);
          }}
        >
          <CheckCircle2 size={14} /> Confirmar carga
        </BtnPrimary>
      )}
    </>
  );

  return (
    <>
      {q.isError && <p className="mb-3 text-sm text-red-600">{(q.error as Error).message}</p>}
      <DataTable
        columns={columns}
        data={limite ? (q.data ?? []).slice(0, limite) : (q.data ?? [])}
        loading={q.isLoading}
        keyExtractor={(p) => p.id}
        pageSize={limite ?? 10}
        showDownloadButton={false}
        showGlobalFilter={!limite}
        dateFilterColumns={[]}
        emptyMessage={vacio}
        actions={acciones}
      />
      {detalle && (
        <PadronDetalle
          p={detalle}
          onClose={() => setDetalle(null)}
          acciones={accionesDetalle(detalle)}
        />
      )}
      {revisar && (
        <Modal
          title="Vista previa del padrón"
          subtitle={`${revisar.nombre} · ${revisar.organismo} · ${revisar.archivo}`}
          onClose={() => setRevisar(null)}
          footer={
            <>
              <BtnOutline onClick={() => setRevisar(null)}>Cerrar</BtnOutline>
              <BtnPrimary onClick={() => void confirmar(revisar)}>
                <CheckCircle2 size={14} /> Confirmar carga
              </BtnPrimary>
            </>
          }
        >
          <ResumenPadron p={revisar} />
        </Modal>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Gestion de padrones: tarjetas de accion + ejecuciones recientes
// ---------------------------------------------------------------------------

function TarjetaAccion({
  titulo,
  texto,
  children,
}: {
  titulo: string;
  texto: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-lg border bg-muted/20 p-5">
      <div>
        <h4 className="font-semibold">{titulo}</h4>
        <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

export function GestionPadrones({ puedeEditar }: { puedeEditar: boolean }) {
  const [cargar, setCargar] = useState(false);
  const [normalizar, setNormalizar] = useState(false);
  const [verTodos, setVerTodos] = useState(false);
  const [generandoDemo, setGenerandoDemo] = useState(false);

  // Padron de prueba con los clientes cargados: se descarga y se vuelve a subir.
  const descargarDemo = async () => {
    setGenerandoDemo(true);
    try {
      const d = await generarPadronDemo();
      if (d.incluidos === 0) {
        toast.error("Ningún cliente tiene un CUIT de 11 dígitos.");
        return;
      }
      descargarBlob(
        `padron-prueba-sirtac-${d.periodo}.txt`,
        new Blob([latin1(d.txt)], { type: "text/plain;charset=iso-8859-1" }),
      );
      toast.success(
        `Padrón de prueba ${d.periodo}: ${n(d.incluidos)} CUIT` +
          (d.sinVerificador > 0 ? ` (${n(d.sinVerificador)} sin dígito verificador válido)` : "") +
          "." +
          (d.omitidos > 0 ? ` ${n(d.omitidos)} cliente(s) sin CUIT de 11 dígitos quedaron afuera.` : "") +
          " Subilo con «Cargar padrón» como archivo de prueba.",
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGenerandoDemo(false);
    }
  };

  return (
    <>
      <div className="mb-4">
        <h3 className="font-display font-semibold text-base">Gestión de padrones</h3>
        <p className="text-sm text-muted-foreground">
          Carga del padrón y normalización de lo ya cobrado
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <TarjetaAccion
          titulo="Cargar padrón"
          texto="Subí el archivo de padrón de un impuesto (.txt, .csv o .xlsx, hasta 100 MB) y seguí el procesamiento en tiempo real."
        >
          <div className="flex flex-wrap items-center gap-2">
            <BtnPrimary onClick={() => setCargar(true)} disabled={!puedeEditar}>
              Cargar padrón
            </BtnPrimary>
            <BtnOutline
              onClick={descargarDemo}
              disabled={generandoDemo}
              title="Arma un padrón SIRTAC con los CUIT de los clientes cargados, vigente este mes, para probar la carga"
            >
              {generandoDemo ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Generando…
                </>
              ) : (
                <>
                  <Download size={14} /> TXT de prueba
                </>
              )}
            </BtnOutline>
            <Badge tone="neutral">Demo</Badge>
          </div>
        </TarjetaAccion>
        <TarjetaAccion
          titulo="Normalización retroactiva"
          texto="Generá un preview de los cambios retroactivos y confirmalo para aplicar la normalización sobre los registros históricos."
        >
          <BtnOutline onClick={() => setNormalizar(true)} disabled={!puedeEditar}>
            Ver preview y aplicar
          </BtnOutline>
        </TarjetaAccion>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm">
          {verTodos ? "Todos los padrones" : "Ejecuciones recientes"}
        </h4>
        <button
          type="button"
          className="text-xs font-semibold text-primary hover:underline"
          onClick={() => setVerTodos((v) => !v)}
        >
          {verTodos ? "Ver solo recientes" : "Ver todos"}
        </button>
      </div>
      {verTodos ? (
        <PadronesIibbTabla puedeEditar={puedeEditar} />
      ) : (
        <PadronesIibbTabla
          puedeEditar={puedeEditar}
          limite={5}
          vacio="Todavía no cargaste padrones. Al cargar uno, su ejecución aparece acá."
        />
      )}

      {cargar && <CargarPadronDialog onClose={() => setCargar(false)} />}
      {normalizar && <NormalizacionIibbDialog onClose={() => setNormalizar(false)} />}
    </>
  );
}
