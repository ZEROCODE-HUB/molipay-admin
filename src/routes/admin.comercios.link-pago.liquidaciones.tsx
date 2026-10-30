import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Download, FileUp, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { PageHeader, Card, Badge, BtnPrimary, BtnOutline } from "@/components/portal-shell";
import { PermissionGuard } from "@/components/permission-guard";
import { FileDropzone } from "@/components/file-dropzone";
import { DataTable, type Column } from "@/components/data-table";
import { Monto, fecha, fechaHora, errMsg } from "@/components/acreditaciones/comunes";
import { useCan } from "@/lib/permissions";
import { parseArchivoLiquidacion, type ResultadoParseo } from "@/lib/liquidaciones/parse";
import {
  QK_ACRED,
  confirmarLiquidacion,
  huellaArchivo,
  listImportaciones,
  previsualizarLiquidacion,
  rangoDelEncabezado,
  type PreviewLiquidacion,
  type RenglonPreview,
  type ResultadoImportacion,
} from "@/lib/api/acreditaciones";

export const Route = createFileRoute("/admin/comercios/link-pago/liquidaciones")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Carga de liquidaciones — Links de Pago — Admin — Moli" },
      { name: "description", content: "Importación del archivo diario de liquidaciones de Payway." },
    ],
  }),
});

const RESULTADO_LABEL: Record<RenglonPreview["resultado"], string> = {
  importa: "Se importa",
  ignora: "Se ignora",
  excepcion: "Excepción",
  error: "Error",
};
const RESULTADO_TONE: Record<RenglonPreview["resultado"], "success" | "neutral" | "warn" | "danger"> = {
  importa: "success",
  ignora: "neutral",
  excepcion: "warn",
  error: "danger",
};

type Paso = 1 | 2 | 3 | 4;

function Page() {
  const { can } = useCan();
  const puede = can("modificar", "comercios");
  const qc = useQueryClient();

  const [paso, setPaso] = useState<Paso>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parseo, setParseo] = useState<ResultadoParseo | null>(null);
  const [hash, setHash] = useState("");
  const [preview, setPreview] = useState<PreviewLiquidacion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mostrarCeros, setMostrarCeros] = useState(false);
  const [filtroResultado, setFiltroResultado] = useState<"" | RenglonPreview["resultado"]>("");
  const [revisado, setRevisado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);

  const historial = useQuery({ queryKey: [...QK_ACRED, "importaciones"], queryFn: () => listImportaciones(15) });

  const rango = useMemo(() => (parseo ? rangoDelEncabezado(parseo.encabezadoLineas) : { desde: null, hasta: null }), [parseo]);

  const reiniciar = () => {
    setPaso(1);
    setFile(null);
    setParseo(null);
    setHash("");
    setPreview(null);
    setRevisado(false);
    setResultado(null);
    setFiltroResultado("");
  };

  const validar = async () => {
    if (!file) {
      toast.error("Elegí el archivo de liquidaciones.");
      return;
    }
    setCargando(true);
    try {
      const p = await parseArchivoLiquidacion(file);
      const h = await huellaArchivo(file);
      const pv = await previsualizarLiquidacion(p.renglones, h);
      setParseo(p);
      setHash(h);
      setPreview(pv);
      setRevisado(false);
      setPaso(2);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setCargando(false);
    }
  };

  const confirmar = async () => {
    if (!parseo || !file || !preview?.puede_confirmar || !revisado) return;
    setConfirmando(true);
    try {
      const r = await confirmarLiquidacion({
        renglones: parseo.renglones,
        archivoNombre: file.name,
        hash,
        desde: rango.desde,
        hasta: rango.hasta,
      });
      setResultado(r);
      setPaso(4);
      qc.invalidateQueries({ queryKey: QK_ACRED });
      qc.invalidateQueries({ queryKey: ["lotes"] });
      toast.success(`Importación lista: ${r.lotes_creados} lote(s) creado(s).`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setConfirmando(false);
    }
  };

  const filas = useMemo(() => {
    const rs = preview?.renglones ?? [];
    return rs.filter((r) => (mostrarCeros || r.resultado !== "ignora") && (!filtroResultado || r.resultado === filtroResultado));
  }, [preview, mostrarCeros, filtroResultado]);

  const descargarErrores = () => {
    const errores = (preview?.renglones ?? []).filter((r) => r.resultado === "error" || r.resultado === "excepcion");
    const csv = ["FILA;FECHA;MARCA;ESTABLECIMIENTO;NETO;RESULTADO;MOTIVO"]
      .concat(
        errores.map((r) =>
          [r.nro, r.fecha ?? "", r.marca ?? "", r.establecimiento ?? "", r.neto ?? "", RESULTADO_LABEL[r.resultado], (r.motivo ?? "").replace(/;/g, ",")].join(";"),
        ),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `errores_${file?.name ?? "liquidacion"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const columnas: Column<RenglonPreview>[] = [
    { key: "nro", label: "Fila", minWidth: 60, hint: "Número de línea en el archivo de Payway.", render: (r) => <span className="font-mono text-xs">{r.nro}</span> },
    { key: "fecha", label: "Fecha", hint: "FECHA del archivo: fecha de pago de Payway [A-9].", render: (r) => <span className="font-mono text-xs">{fecha(r.fecha)}</span> },
    { key: "marca", label: "Bandera", render: (r) => r.marca ?? "—" },
    { key: "establecimiento", label: "Establecimiento", hint: "Número que Payway asigna por bandera. Es lo único que identifica al comercio en el archivo.", render: (r) => <span className="font-mono text-xs">{r.establecimiento ?? "—"}</span> },
    {
      key: "comercio",
      label: "Comercio",
      hint: "Comercio encontrado por el establecimiento (tabla de establecimientos). Si no hay, queda como excepción.",
      render: (r) =>
        r.comercio_id ? (
          <div className="leading-tight">
            <div className="text-xs font-semibold">{r.comercio ?? "—"}</div>
            <div className="text-[11px] font-mono text-muted-foreground">{r.legajo}</div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Sin asignar</span>
        ),
    },
    { key: "bruto", label: "Bruto", render: (r) => <Monto v={r.bruto} /> },
    { key: "costo", label: "Costo servicio", render: (r) => <Monto v={r.costo} /> },
    { key: "impuestos", label: "Impuestos", render: (r) => <Monto v={r.impuestos} /> },
    { key: "neto", label: "Neto", hint: "Neto de Payway: lo que entra a la recaudadora.", render: (r) => <Monto v={r.neto} strong /> },
    {
      key: "resultado",
      label: "Resultado",
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <Badge tone={RESULTADO_TONE[r.resultado]}>{RESULTADO_LABEL[r.resultado]}</Badge>
          {r.advertencias.map((a) => (
            <span key={a} className="text-[10px] text-amber-700">
              {a === "posible_duplicado" ? "Posible duplicado" : a}
            </span>
          ))}
        </div>
      ),
    },
    { key: "motivo", label: "Motivo", minWidth: 220, render: (r) => <span className="text-xs text-muted-foreground">{r.motivo ?? ""}</span> },
  ];

  const t = preview?.totales;

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Carga de liquidaciones"
        description="Importá el archivo diario de Payway. Cada renglón con importe crea un lote de acreditación Pendiente; lo que no se puede asignar va a Excepciones."
        action={
          <Link to="/admin/comercios/link-pago/excepciones" className="text-sm font-semibold text-primary hover:underline">
            Ver excepciones
          </Link>
        }
      />

      <Pasos paso={paso} />

      {paso === 1 && (
        <Card className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold mb-1.5 block">Adquirente de origen</label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" defaultValue="payway">
                <option value="payway">Payway / Decidir</option>
                <option value="qr" disabled>
                  Proveedor QR (no habilitado)
                </option>
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Define contra qué recaudadora se concilia y qué tabla de establecimientos se usa. Hoy solo Payway.
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block">Archivo (CSV separado por punto y coma)</label>
              <FileDropzone onFile={setFile} accept=".csv,.txt,text/csv,text/plain" />
            </div>
          </div>
          <div className="flex justify-end">
            <BtnPrimary onClick={() => void validar()} disabled={!file || cargando || !puede}>
              {cargando ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />} Validar archivo
            </BtnPrimary>
          </div>
        </Card>
      )}

      {(paso === 2 || paso === 3) && preview && t && (
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm">
                <span className="font-semibold">{file?.name}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · Desde {fecha(rango.desde ?? t.desde)} hasta {fecha(rango.hasta ?? t.hasta)}
                </span>
              </div>
              <EstadoImportacion estado={preview.estado} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
              <Dato label="Renglones" v={t.renglones} />
              <Dato label="Con importe" v={t.con_importe} />
              <Dato label="En cero" v={t.en_cero} />
              <Dato label="Excepciones" v={t.excepciones} tone={t.excepciones > 0 ? "warn" : undefined} />
              <Dato label="Errores" v={t.errores} tone={t.errores > 0 ? "danger" : undefined} />
              <Dato label="Bruto" v={<Monto v={t.bruto} />} />
              <Dato label="Costo + impuestos" v={<Monto v={t.costo + t.impuestos} />} />
              <Dato label="Neto" v={<Monto v={t.neto} strong />} />
            </div>
            {preview.por_fecha_marca.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                  Neto por fecha y bandera (debe coincidir con lo que entró a la recaudadora)
                </div>
                <div className="flex flex-wrap gap-2">
                  {preview.por_fecha_marca.map((x) => (
                    <span key={`${x.fecha}-${x.marca}`} className="rounded-md border px-2 py-1 text-xs">
                      {fecha(x.fecha)} · {x.marca}: <Monto v={x.neto} />
                    </span>
                  ))}
                </div>
              </div>
            )}
            {preview.archivo_duplicado && (
              <p className="flex items-center gap-1.5 text-sm text-red-700">
                <AlertTriangle size={14} /> Este archivo ya fue importado. No se puede volver a importar.
              </p>
            )}
          </Card>

          <DataTable
            columns={columnas}
            data={filas}
            keyExtractor={(r) => r.nro}
            pageSize={20}
            showDownloadButton={false}
            showGlobalFilter={false}
            extraFilters={
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={filtroResultado}
                  onChange={(e) => setFiltroResultado(e.target.value as typeof filtroResultado)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">Todos los resultados</option>
                  <option value="importa">Se importa</option>
                  <option value="excepcion">Excepción</option>
                  <option value="error">Error</option>
                  <option value="ignora">Se ignora</option>
                </select>
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={mostrarCeros} onChange={(e) => setMostrarCeros(e.target.checked)} />
                  Mostrar renglones en cero
                </label>
                <BtnOutline className="h-9 text-xs px-3" onClick={descargarErrores} disabled={t.errores + t.excepciones === 0}>
                  <Download size={14} /> Descargar errores
                </BtnOutline>
              </div>
            }
          />

          <Card className="space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={revisado}
                onChange={(e) => {
                  setRevisado(e.target.checked);
                  setPaso(e.target.checked ? 3 : 2);
                }}
                disabled={!preview.puede_confirmar}
              />
              <span>
                Revisé la vista previa y los totales coinciden con la liquidación de Payway.
                {!preview.puede_confirmar && (
                  <span className="block text-xs text-red-700 mt-0.5">
                    {preview.archivo_duplicado
                      ? "El archivo ya fue importado."
                      : t.errores > 0
                        ? "Corregí los errores del archivo antes de importarlo."
                        : "El archivo no tiene renglones con importe."}
                  </span>
                )}
              </span>
            </label>
            <div className="flex justify-between gap-2">
              <BtnOutline onClick={reiniciar}>
                <ArrowLeft size={16} /> Volver
              </BtnOutline>
              <div className="flex gap-2">
                <BtnOutline onClick={reiniciar}>Cancelar</BtnOutline>
                <BtnPrimary onClick={() => void confirmar()} disabled={!revisado || !preview.puede_confirmar || confirmando || !puede}>
                  {confirmando ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />} Confirmar importación
                </BtnPrimary>
              </div>
            </div>
          </Card>
        </div>
      )}

      {paso === 4 && resultado && (
        <Card className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-700 font-semibold">
            <CheckCircle2 size={18} />
            {resultado.estado === "importada" ? "Importada" : "Importada con excepciones"}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Dato label="Lotes creados (Pendiente)" v={resultado.lotes_creados} />
            <Dato label="Excepciones" v={resultado.excepciones} tone={resultado.excepciones > 0 ? "warn" : undefined} />
            <Dato label="Renglones en cero" v={resultado.en_cero} />
            <Dato label="Neto del archivo" v={<Monto v={resultado.totales?.neto} strong />} />
          </div>
          <p className="text-xs text-muted-foreground">
            Siguiente paso: conciliar lo que ingresó a la recaudadora por fecha y bandera. Sin conciliar no se puede acreditar.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/comercios/link-pago/acreditaciones" className="inline-flex items-center h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              Conciliar y acreditar
            </Link>
            <Link
              to="/admin/comercios/link-pago/lotes"
              search={{ importacion: resultado.importacion_id }}
              className="inline-flex items-center h-10 px-4 rounded-lg border text-sm font-semibold"
            >
              Ver lotes de esta importación
            </Link>
            {resultado.excepciones > 0 && (
              <Link to="/admin/comercios/link-pago/excepciones" className="inline-flex items-center h-10 px-4 rounded-lg border text-sm font-semibold">
                Resolver excepciones
              </Link>
            )}
            <BtnOutline onClick={reiniciar}>Cargar otro archivo</BtnOutline>
          </div>
        </Card>
      )}

      <Card className="mt-6">
        <h3 className="text-sm font-semibold mb-3">Últimas importaciones</h3>
        {historial.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : historial.isError ? (
          <p className="text-sm text-red-700">{errMsg(historial.error)}</p>
        ) : (historial.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no se importó ningún archivo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="text-left">
                  <th className="py-1.5 pr-3">Fecha de carga</th>
                  <th className="py-1.5 pr-3">Archivo</th>
                  <th className="py-1.5 pr-3">Rango</th>
                  <th className="py-1.5 pr-3 text-right">Lotes</th>
                  <th className="py-1.5 pr-3 text-right">Excepciones</th>
                  <th className="py-1.5 pr-3 text-right">Neto</th>
                  <th className="py-1.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(historial.data ?? []).map((i) => (
                  <tr key={i.id}>
                    <td className="py-1.5 pr-3 text-xs">{fechaHora(i.created_at)}</td>
                    <td className="py-1.5 pr-3 text-xs">
                      <Link to="/admin/comercios/link-pago/lotes" search={{ importacion: i.id }} className="text-primary hover:underline">
                        {i.archivo_nombre}
                      </Link>
                    </td>
                    <td className="py-1.5 pr-3 text-xs">
                      {fecha(i.rango_desde)} – {fecha(i.rango_hasta)}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-mono text-xs">{i.resumen?.lotes_creados ?? "—"}</td>
                    <td className="py-1.5 pr-3 text-right font-mono text-xs">{i.resumen?.excepciones ?? "—"}</td>
                    <td className="py-1.5 pr-3 text-right text-xs">
                      <Monto v={i.resumen?.totales?.neto ?? 0} />
                    </td>
                    <td className="py-1.5 text-xs">
                      <Badge tone={(i.resumen?.excepciones ?? 0) > 0 ? "warn" : "success"}>{i.observaciones ?? i.estado}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PermissionGuard>
  );
}

function Pasos({ paso }: { paso: Paso }) {
  const nombres = ["Archivo", "Vista previa", "Confirmación", "Resultado"];
  return (
    <ol className="flex flex-wrap items-center gap-2 mb-4 text-xs">
      {nombres.map((n, i) => {
        const k = (i + 1) as Paso;
        const activo = k === paso;
        const hecho = k < paso;
        return (
          <li key={n} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${
                activo ? "bg-primary text-primary-foreground border-primary" : hecho ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "text-muted-foreground"
              }`}
            >
              {k}
            </span>
            <span className={activo ? "font-semibold" : "text-muted-foreground"}>{n}</span>
            {k < 4 && <span className="text-muted-foreground">›</span>}
          </li>
        );
      })}
    </ol>
  );
}

function EstadoImportacion({ estado }: { estado: PreviewLiquidacion["estado"] }) {
  if (estado === "lista_para_confirmar") return <Badge tone="success">Lista para confirmar</Badge>;
  if (estado === "con_errores") return <Badge tone="danger">Con errores (no se puede confirmar)</Badge>;
  return <Badge tone="danger">Archivo ya importado</Badge>;
}

function Dato({ label, v, tone }: { label: string; v: ReactNode; tone?: "warn" | "danger" }) {
  return (
    <div className={`rounded-md border px-2 py-1.5 ${tone === "danger" ? "border-red-300" : tone === "warn" ? "border-amber-300" : ""}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums">{v}</div>
    </div>
  );
}
