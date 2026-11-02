import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table";
import { Badge, BtnOutline, BtnPrimary, Input, Label } from "@/components/portal-shell";
import { KpiCard } from "@/components/kpi-card";
import { crearZip } from "@/lib/zip-store";
import {
  QK_PRESENTACIONES,
  generarPresentacion,
  listItemsPresentacion,
  listPresentaciones,
  marcarPagado,
  marcarPresentado,
  type ItemPresentacion,
  type Presentacion,
} from "@/lib/api/iibb-reportes";

/**
 * Reportes de IIBB: registro de presentaciones por periodo y tramo.
 *
 * - Tramos: 1 (dias 1-10), 2 (11-20), 3 (21-fin). Vencen al 3er dia habil
 *   posterior al cierre.
 * - Cada generacion es una version: la ultima queda vigente y las anteriores
 *   reemplazadas. Si el contenido no cambio, no se crea version nueva.
 * - Un tramo sin operaciones queda "Sin archivo" (no tiene pago: N/A).
 * - Presentado y pagado se registran en la version vigente; el pago requiere
 *   que este presentada.
 */

const TRAMOS: { n: 1 | 2 | 3; label: string }[] = [
  { n: 1, label: "Tramo 1 (1-10)" },
  { n: 2, label: "Tramo 2 (11-20)" },
  { n: 3, label: "Tramo 3 (21-fin)" },
];
const tramoLabel = (n: number) => TRAMOS.find((t) => t.n === n)?.label ?? `Tramo ${n}`;

const fmtCreacion = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
const fecha = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
const money = (v: number) =>
  `$ ${v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (v: number) =>
  `${v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`;

const mesEnCurso = () =>
  new Date()
    .toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
    .slice(0, 7);

const versionTxt = (r: Presentacion) => `v${r.version} ${r.vigente ? "vigente" : "reemplazada"}`;
const presentadoTxt = (r: Presentacion) => (r.presentadoAt ? "Sí" : "No");
const pagadoTxt = (r: Presentacion) =>
  r.archivo === "Sin archivo" ? "N/A" : r.pagadoAt ? "Sí" : "No";

const nombreBase = (r: Presentacion) =>
  `${r.impuestoCodigo.toLowerCase()}-${r.periodo}-tramo-${r.tramo}-v${r.version}`;

// ---------------------------------------------------------------------------
// TXT de posicion fija (ISO-8859-1)
// ---------------------------------------------------------------------------
// Diseno propio y documentado mientras no esten los disenos oficiales de cada
// organismo (SIRTAC / ARBA / AGIP). Una linea por registro, CRLF:
//   1-11   CUIT                       11  numerico
//   12-19  Fecha de la operacion      8   DDMMAAAA
//   20     Tipo                       1   R = retencion, A = ajuste
//   21-35  Base imponible             15  centavos, con signo, ceros a la izquierda
//   36-42  Alicuota                   7   diezmilesimos de % (2,5000% = 0025000)
//   43-57  Monto                      15  centavos, con signo, ceros a la izquierda
//   58-77  Legajo                     20  alfanumerico, espacios a la derecha
//   78-137 Razon social               60  alfanumerico, espacios a la derecha

const numFijo = (v: number, largo: number) => {
  const cent = Math.round(Math.abs(v) * 100);
  const cuerpo = String(cent)
    .padStart(largo - 1, "0")
    .slice(-(largo - 1));
  return (v < 0 ? "-" : "0") + cuerpo;
};
const alfa = (v: string | null, largo: number) =>
  (v ?? "")
    .normalize("NFC")
    .replace(/[\r\n]/g, " ")
    .slice(0, largo)
    .padEnd(largo, " ");

function lineaTxt(i: ItemPresentacion): string {
  return [
    i.cuit.replace(/\D/g, "").padStart(11, "0").slice(-11),
    i.fecha.slice(0, 10).split("-").reverse().join(""),
    i.tipo === "Ajuste" ? "A" : "R",
    numFijo(i.base, 15),
    String(Math.round(i.alicuota * 10000))
      .padStart(7, "0")
      .slice(-7),
    numFijo(i.monto, 15),
    alfa(i.legajo, 20),
    alfa(i.razonSocial, 60),
  ].join("");
}

/** ISO-8859-1: los caracteres fuera de Latin-1 se reemplazan por "?". */
function latin1(texto: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(texto.length));
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    out[i] = c < 256 ? c : 63;
  }
  return out;
}

const contenidoTxt = (items: ItemPresentacion[]) =>
  items.map(lineaTxt).join("\r\n") + (items.length ? "\r\n" : "");

function contenidoCsv(r: Presentacion, items: ItemPresentacion[]) {
  const cab = [
    "Tipo",
    "Fecha",
    "CUIT",
    "Razón social",
    "Legajo",
    "Base",
    "Alícuota %",
    "Monto",
    "TXID interno",
  ];
  const filas = items.map((i) =>
    [
      i.tipo,
      fecha(i.fecha),
      i.cuit,
      i.razonSocial ?? "",
      i.legajo,
      i.base.toFixed(2),
      i.alicuota.toString(),
      i.monto.toFixed(2),
      i.transactionId,
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(";"),
  );
  const resumen = `"${r.impuestoCodigo} ${r.periodo} ${tramoLabel(r.tramo)} ${versionTxt(r)}";"Registros: ${r.registros}";"Total: ${r.totalRetenido.toFixed(2)}"`;
  return "﻿" + [resumen, cab.join(";"), ...filas].join("\n") + "\n";
}

function descargar(nombre: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

const selectCls =
  "h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

// ---------------------------------------------------------------------------

function DetalleReporte({
  r,
  puedeEditar,
  onClose,
  onCambio,
}: {
  r: Presentacion;
  puedeEditar: boolean;
  onClose: () => void;
  onCambio: () => void;
}) {
  const items = useQuery({
    queryKey: ["tax_filing_items", r.id],
    queryFn: () => listItemsPresentacion(r.id),
    enabled: r.registros > 0,
  });
  const [referencia, setReferencia] = useState(r.referenciaPago ?? "");
  const [guardando, setGuardando] = useState(false);

  const ejecutar = async (fn: () => Promise<void>, ok: string) => {
    setGuardando(true);
    try {
      await fn();
      toast.success(ok);
      onCambio();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  const columns: Column<ItemPresentacion>[] = [
    {
      key: "fecha",
      label: "Fecha",
      render: (i) => <span className="font-mono tabular-nums">{fecha(i.fecha)}</span>,
    },
    {
      key: "tipo",
      label: "Tipo",
      render: (i) => <Badge tone={i.tipo === "Ajuste" ? "warn" : "neutral"}>{i.tipo}</Badge>,
    },
    {
      key: "cuit",
      label: "CUIT",
      render: (i) => (
        <div className="leading-tight">
          <div className="font-mono tabular-nums">{i.cuit}</div>
          <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
            {i.razonSocial ?? i.legajo}
          </div>
        </div>
      ),
    },
    {
      key: "base",
      label: "Base",
      render: (i) => <span className="font-mono tabular-nums">{money(i.base)}</span>,
    },
    {
      key: "alicuota",
      label: "Alícuota",
      render: (i) => <span className="font-mono tabular-nums">{pct(i.alicuota)}</span>,
    },
    {
      key: "monto",
      label: "Monto",
      render: (i) => (
        <span
          className={`font-mono tabular-nums font-semibold ${i.monto < 0 ? "text-emerald-700" : ""}`}
        >
          {money(i.monto)}
        </span>
      ),
    },
  ];

  const editable = puedeEditar && r.vigente;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 z-10 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div>
            <h3 className="font-display text-lg font-semibold">
              {r.impuestoCodigo} · {r.periodo} · {tramoLabel(r.tramo)}
            </h3>
            <p className="text-sm text-muted-foreground">
              {r.archivo} · {versionTxt(r)} · generado {fmtCreacion(r.generadoAt)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Registros" value={r.registros.toLocaleString("es-AR")} />
            <KpiCard label="Monto bruto gravado" value={money(r.totalBase)} />
            <KpiCard label="Total a rendir" value={money(r.totalRetenido)} />
            <KpiCard label="Vencimiento" value={fecha(r.vencimiento)} />
          </div>
          <p className="text-xs text-muted-foreground">
            Operaciones del {fecha(r.desde)} al {fecha(r.hasta)}. Los ajustes vienen de
            normalizaciones aplicadas sobre operaciones del tramo.
          </p>
          {!r.vigente && (
            <p className="text-xs border border-amber-300 bg-amber-50 text-amber-800 rounded px-3 py-2">
              Esta versión fue reemplazada: presentado y pagado se registran en la vigente.
            </p>
          )}

          {r.registros === 0 ? (
            <p className="text-xs text-muted-foreground border rounded px-3 py-2">
              El tramo no tuvo retenciones: se presenta sin archivo y no lleva pago.
            </p>
          ) : items.isLoading ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Cargando registros…
            </div>
          ) : items.isError ? (
            <p className="text-sm text-red-700">{(items.error as Error).message}</p>
          ) : (
            <DataTable
              columns={columns}
              data={items.data ?? []}
              keyExtractor={(i) => String(i.id)}
              pageSize={10}
              showGlobalFilter={false}
              showDownloadButton={false}
            />
          )}

          <div className="grid gap-4 md:grid-cols-2 border-t pt-4">
            <div className="space-y-2">
              <Label>Presentado</Label>
              <div className="flex items-center gap-2">
                <Badge tone={r.presentadoAt ? "success" : "neutral"}>{presentadoTxt(r)}</Badge>
                {r.presentadoAt && (
                  <span className="text-xs text-muted-foreground">
                    {fmtCreacion(r.presentadoAt)}
                  </span>
                )}
              </div>
              {editable && (
                <BtnOutline
                  disabled={guardando || (!!r.presentadoAt && !!r.pagadoAt)}
                  onClick={() =>
                    ejecutar(
                      () => marcarPresentado(r.id, !r.presentadoAt),
                      r.presentadoAt ? "Presentación desmarcada" : "Marcado como presentado",
                    )
                  }
                >
                  {r.presentadoAt ? "Desmarcar presentado" : "Marcar como presentado"}
                </BtnOutline>
              )}
            </div>
            <div className="space-y-2">
              <Label>Pagado</Label>
              {r.archivo === "Sin archivo" ? (
                <p className="text-sm text-muted-foreground">N/A · tramo sin retenciones.</p>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Badge tone={r.pagadoAt ? "success" : "neutral"}>{pagadoTxt(r)}</Badge>
                    {r.pagadoAt && (
                      <span className="text-xs text-muted-foreground">
                        {fmtCreacion(r.pagadoAt)}
                        {r.referenciaPago ? ` · ref. ${r.referenciaPago}` : ""}
                      </span>
                    )}
                  </div>
                  {editable && !r.pagadoAt && (
                    <div className="flex gap-2">
                      <Input
                        value={referencia}
                        onChange={(e) => setReferencia(e.target.value)}
                        placeholder="Referencia de la transferencia (opcional)"
                        disabled={!r.presentadoAt || guardando}
                      />
                      <BtnPrimary
                        disabled={!r.presentadoAt || guardando}
                        title={!r.presentadoAt ? "Primero marcalo como presentado" : undefined}
                        onClick={() =>
                          ejecutar(() => marcarPagado(r.id, true, referencia), "Pago registrado")
                        }
                      >
                        Registrar pago
                      </BtnPrimary>
                    </div>
                  )}
                  {editable && r.pagadoAt && (
                    <BtnOutline
                      disabled={guardando}
                      onClick={() => ejecutar(() => marcarPagado(r.id, false), "Pago desmarcado")}
                    >
                      Desmarcar pago
                    </BtnOutline>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="border-t px-6 py-3 flex justify-end">
          <BtnOutline onClick={onClose}>Cerrar</BtnOutline>
        </div>
      </div>
    </div>
  );
}

function GenerarReporteDialog({
  onClose,
  onGenerado,
}: {
  onClose: () => void;
  onGenerado: () => void;
}) {
  const hoy = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
  const dia = Number(hoy.slice(8, 10));
  const [periodo, setPeriodo] = useState(mesEnCurso());
  const [tramo, setTramo] = useState<1 | 2 | 3>(dia <= 10 ? 1 : dia <= 20 ? 2 : 3);
  const [generando, setGenerando] = useState(false);

  const generar = async () => {
    if (!/^\d{4}-\d{2}$/.test(periodo)) return toast.error("Elegí un período válido.");
    setGenerando(true);
    try {
      await generarPresentacion(periodo, tramo);
      toast.success(`Reporte IIBB ${periodo} ${tramoLabel(tramo)} generado.`);
      onGenerado();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={generando ? undefined : onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-md shadow-xl">
        <div className="border-b px-6 py-4">
          <h3 className="font-display text-lg font-semibold">Generar reporte</h3>
          <p className="text-sm text-muted-foreground">
            Toma las retenciones de IIBB del tramo y los ajustes aplicados. Si el tramo ya tenía
            reporte y cambió, se crea una versión nueva y la anterior queda reemplazada.
          </p>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div>
            <Label>Período</Label>
            <Input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
          </div>
          <div>
            <Label>Tramo</Label>
            <select
              className={`w-full ${selectCls}`}
              value={tramo}
              onChange={(e) => setTramo(Number(e.target.value) as 1 | 2 | 3)}
            >
              {TRAMOS.map((t) => (
                <option key={t.n} value={t.n}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="border-t px-6 py-3 flex justify-end gap-2">
          <BtnOutline onClick={onClose} disabled={generando}>
            Cancelar
          </BtnOutline>
          <BtnPrimary onClick={generar} disabled={generando}>
            {generando ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Generando…
              </>
            ) : (
              "Generar"
            )}
          </BtnPrimary>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function ReportesImpuestos({ puedeEditar }: { puedeEditar: boolean }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: QK_PRESENTACIONES, queryFn: () => listPresentaciones() });
  const filas = useMemo(() => query.data ?? [], [query.data]);
  const [detalle, setDetalle] = useState<string | null>(null);
  const [generar, setGenerar] = useState(false);
  const [descargando, setDescargando] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState("");
  const [fArchivo, setFArchivo] = useState("");
  const [fTramo, setFTramo] = useState("");
  const [fVersion, setFVersion] = useState("");
  const [fPresentado, setFPresentado] = useState("");
  const [fPagado, setFPagado] = useState("");

  const refrescar = () => void qc.invalidateQueries({ queryKey: QK_PRESENTACIONES });

  const visibles = useMemo(
    () =>
      filas
        .filter((r) => !periodo.trim() || r.periodo.includes(periodo.trim()))
        .filter((r) => !fArchivo || r.archivo === fArchivo)
        .filter((r) => !fTramo || String(r.tramo) === fTramo)
        .filter((r) => !fVersion || (fVersion === "vigente" ? r.vigente : !r.vigente))
        .filter((r) => !fPresentado || presentadoTxt(r) === fPresentado)
        .filter((r) => !fPagado || pagadoTxt(r) === fPagado),
    [filas, periodo, fArchivo, fTramo, fVersion, fPresentado, fPagado],
  );

  const conItems = async (r: Presentacion, fn: (items: ItemPresentacion[]) => void) => {
    setDescargando(r.id);
    try {
      fn(r.registros > 0 ? await listItemsPresentacion(r.id) : []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDescargando(null);
    }
  };

  const txt = (r: Presentacion) =>
    conItems(r, (items) =>
      descargar(
        `${nombreBase(r)}.txt`,
        new Blob([latin1(contenidoTxt(items))], { type: "text/plain;charset=iso-8859-1" }),
      ),
    );
  const zip = (r: Presentacion) =>
    conItems(r, (items) =>
      descargar(
        `${nombreBase(r)}.zip`,
        crearZip([
          { nombre: `${nombreBase(r)}.txt`, contenido: latin1(contenidoTxt(items)) },
          { nombre: `${nombreBase(r)}-detalle.csv`, contenido: contenidoCsv(r, items) },
        ]),
      ),
    );

  const exportar = () => {
    const cab = [
      "Período",
      "Impuesto",
      "Archivo",
      "Tramo",
      "Versión",
      "Registros",
      "Total",
      "Vencimiento",
      "Creación",
      "Presentado",
      "Pagado",
    ];
    const lineas = visibles.map((r) =>
      [
        r.periodo,
        r.impuestoCodigo,
        r.archivo,
        tramoLabel(r.tramo),
        versionTxt(r),
        r.registros,
        r.totalRetenido.toFixed(2),
        fecha(r.vencimiento),
        fmtCreacion(r.generadoAt),
        presentadoTxt(r),
        pagadoTxt(r),
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(";"),
    );
    descargar(
      "reportes-iibb.csv",
      new Blob(["﻿" + [cab.join(";"), ...lineas].join("\n")], { type: "text/csv;charset=utf-8" }),
    );
  };

  const siNo = (v: string) =>
    v === "Sí" ? (
      <Badge tone="success">Sí</Badge>
    ) : v === "No" ? (
      <Badge tone="neutral">No</Badge>
    ) : (
      <span className="text-muted-foreground">N/A</span>
    );

  const columns: Column<Presentacion>[] = [
    {
      key: "periodo",
      label: "Período",
      render: (r) => <span className="font-mono tabular-nums">{r.periodo}</span>,
    },
    {
      key: "impuesto",
      label: "Impuesto",
      render: (r) => <span className="font-mono text-xs">{r.impuestoCodigo}</span>,
    },
    {
      key: "archivo",
      label: "Archivo",
      render: (r) =>
        r.archivo === "Sin archivo" ? (
          <span className="text-muted-foreground">Sin archivo</span>
        ) : (
          r.archivo
        ),
    },
    { key: "tramo", label: "Tramo", render: (r) => tramoLabel(r.tramo) },
    {
      key: "version",
      label: "Versión",
      render: (r) => <Badge tone={r.vigente ? "success" : "neutral"}>{versionTxt(r)}</Badge>,
    },
    {
      key: "registros",
      label: "Registros",
      render: (r) => (
        <span className="font-mono tabular-nums">{r.registros.toLocaleString("es-AR")}</span>
      ),
    },
    {
      key: "creacion",
      label: "Creación",
      render: (r) => <span className="text-xs whitespace-nowrap">{fmtCreacion(r.generadoAt)}</span>,
    },
    { key: "presentado", label: "Presentado", render: (r) => siNo(presentadoTxt(r)) },
    { key: "pagado", label: "Pagado", render: (r) => siNo(pagadoTxt(r)) },
  ];

  const sel = filas.find((f) => f.id === detalle) ?? null;
  const hayFiltros = periodo || fArchivo || fTramo || fVersion || fPresentado || fPagado;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-display font-semibold text-base">Reportes de impuestos</h3>
          <p className="text-sm text-muted-foreground">
            Registro de presentaciones por período y tramo
          </p>
        </div>
        <BtnPrimary onClick={() => setGenerar(true)} disabled={!puedeEditar}>
          <Plus size={14} /> Generar reporte
        </BtnPrimary>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Ingresos Brutos se rinde en 3 tramos por mes (1-10, 11-20, 21-fin), con vencimiento al 3.er
        día hábil posterior al cierre. Lo retenido no es ingreso de MoliPay: se acumula para
        rendirlo al fisco.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="pl-8"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            placeholder="Buscar por período (ej. 2026-11)…"
          />
        </div>
        <select
          className={selectCls}
          value={fArchivo}
          onChange={(e) => setFArchivo(e.target.value)}
          aria-label="Archivo"
        >
          <option value="">Todos los archivos</option>
          <option value="Movimientos">Movimientos</option>
          <option value="Sin archivo">Sin archivo</option>
        </select>
        <select
          className={selectCls}
          value={fTramo}
          onChange={(e) => setFTramo(e.target.value)}
          aria-label="Tramo"
        >
          <option value="">Todos los tramos</option>
          {TRAMOS.map((t) => (
            <option key={t.n} value={t.n}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          className={selectCls}
          value={fVersion}
          onChange={(e) => setFVersion(e.target.value)}
          aria-label="Versión"
        >
          <option value="">Todas las versiones</option>
          <option value="vigente">Vigentes</option>
          <option value="reemplazada">Reemplazadas</option>
        </select>
        <select
          className={selectCls}
          value={fPresentado}
          onChange={(e) => setFPresentado(e.target.value)}
          aria-label="Presentado"
        >
          <option value="">Presentado: todos</option>
          <option value="Sí">Presentado: sí</option>
          <option value="No">Presentado: no</option>
        </select>
        <select
          className={selectCls}
          value={fPagado}
          onChange={(e) => setFPagado(e.target.value)}
          aria-label="Pagado"
        >
          <option value="">Pagado: todos</option>
          <option value="Sí">Pagado: sí</option>
          <option value="No">Pagado: no</option>
          <option value="N/A">Pagado: N/A</option>
        </select>
        <BtnOutline onClick={exportar} disabled={visibles.length === 0}>
          <Download size={14} /> Exportar
        </BtnOutline>
        {hayFiltros && (
          <button
            type="button"
            className="text-xs font-semibold text-primary hover:underline"
            onClick={() => {
              setPeriodo("");
              setFArchivo("");
              setFTramo("");
              setFVersion("");
              setFPresentado("");
              setFPagado("");
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {query.isError ? (
        <p className="text-sm text-red-700 border border-red-200 bg-red-50 rounded px-3 py-2">
          {(query.error as Error).message}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={visibles}
          keyExtractor={(r) => r.id}
          pageSize={10}
          showGlobalFilter={false}
          showDownloadButton={false}
          emptyMessage={
            query.isLoading ? "Cargando reportes…" : "No hay reportes con esos filtros."
          }
          actions={(r) => (
            <div className="flex items-center gap-3 text-xs font-semibold text-primary">
              <button type="button" className="hover:underline" onClick={() => setDetalle(r.id)}>
                Ver
              </button>
              <button
                type="button"
                className="hover:underline disabled:opacity-50"
                disabled={descargando === r.id || r.archivo === "Sin archivo"}
                onClick={() => txt(r)}
              >
                TXT
              </button>
              <button
                type="button"
                className="hover:underline disabled:opacity-50"
                disabled={descargando === r.id}
                onClick={() => zip(r)}
              >
                ZIP
              </button>
            </div>
          )}
        />
      )}
      {sel && (
        <DetalleReporte
          r={sel}
          puedeEditar={puedeEditar}
          onClose={() => setDetalle(null)}
          onCambio={refrescar}
        />
      )}
      {generar && <GenerarReporteDialog onClose={() => setGenerar(false)} onGenerado={refrescar} />}
    </>
  );
}
