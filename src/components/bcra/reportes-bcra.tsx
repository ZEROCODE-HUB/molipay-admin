import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Send,
  Settings2,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge, BtnOutline, BtnPrimary, Card } from "@/components/portal-shell";
import { DataTable, type Column } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { HeaderHint } from "@/components/header-hint";
import { fmtARS } from "@/lib/aranceles";
import { isSupabaseConfigured } from "@/lib/supabase";
import { generarPadron } from "@/lib/bcra/padron";
import { NOMBRE_EN_PAQUETE, descargarArchivo, descargarPaquete, nombreArchivoIndividual, nombrePaquete } from "@/lib/bcra/archivos";
import {
  BCRA_ARCHIVOS,
  BCRA_ARCHIVO_LABEL,
  corregirFila,
  generarArchivo,
  getFilasPresentacion,
  guardarParametroBcra,
  guardarPadron,
  guardarPartida,
  leerParametrosBcra,
  listCorrecciones,
  listPartidas,
  listPresentaciones,
  marcarPresentado,
  type BcraArchivo,
  type BcraControl,
  type BcraPartida,
  type BcraPartidaParams,
  type BcraPresentacion,
  type BcraRegla,
} from "@/lib/api/bcra";

const QK = ["bcra"] as const;

/** Explicación de cada columna de la tabla principal (popup del encabezado). */
const AYUDA_ARCHIVO: Record<BcraArchivo, string> = {
  A: "Información para Supervisión: los saldos de cada día del mes.\nSe arma en bloques de 31 filas (una por día). 10000dd = saldo de las cuentas de los clientes y cuántas tenían saldo; 20000dd = fondos depositados en la cuenta a la vista del banco; 50000dd = cuentas activas; 60000dd = cobros con tarjeta pendientes de liquidar.\nSe descarga como XLS.",
  B: "Información estadística mensual (Sistema Nacional de Pagos).\nPor cada concepto (CVU a CBU, CBU a CVU, CVU a CVU, pagos con QR) informa la cantidad de operaciones del mes y el monto total en miles de pesos. Las partidas 60xxxxx cuentan clientes y cuentas.\nSe descarga como XLS.",
  P: "Padrón de clientes Persona Jurídica (empresas) activos en MoliPay.\nVa sin encabezado y con columnas de ancho fijo: la razón social a 80 caracteres y el código postal a 8.\nSe descarga como XLS.",
  I: "Transferencias intraentidades: las que se hicieron entre cuentas de MoliPay (entre subcuentas o hacia otro cliente de MoliPay).\nUna línea por tipo de titular (persona humana o jurídica) con cantidad y monto en miles.\nSe descarga como TXT separado por punto y coma.",
};

const AYUDA_FECHA =
  "Mes informado (se muestra su primer día).\nDebajo está el control de saldos: el saldo final del mes tiene que ser igual al saldo inicial + créditos − débitos. Si no cuadra se muestra la diferencia, que suele venir de ajustes, adelantos o reversos.";

const AYUDA_ESTADO =
  "Cómo está el mes en conjunto.\nSin generar: no hay ningún archivo. Incompleto: falta generar alguno de los 4. Completo: están los 4 y se puede bajar el paquete ZIP. Presentado: los 4 están marcados como presentados en SISCEN.";

type EstadoPeriodo = "Sin generar" | "Incompleto" | "Completo" | "Presentado";
const ESTADOS_PERIODO: EstadoPeriodo[] = ["Sin generar", "Incompleto", "Completo", "Presentado"];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

/** Últimos `n` períodos (AAAA-MM-01), del actual hacia atrás. */
function ultimosPeriodos(n: number): string[] {
  const hoy = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
}

const labelPeriodo = (p: string) => `${MESES[Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}`;
const cortoPeriodo = (p: string) => `${p.slice(5, 7)}/${p.slice(0, 4)}`;

function fmtFechaHora(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function ReportesBCRA() {
  const [tab, setTab] = useState<"presentaciones" | "partidas">("presentaciones");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground max-w-3xl">
          Régimen Informativo de Proveedores de Servicios de Pago — Com. "A" 8207 (BCRA), presentado vía SISCEN. Los apartados
          se calculan desde el ledger de MoliPay; cada generación queda guardada como foto auditable.
        </p>
        <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
          {(
            [
              ["presentaciones", "Presentaciones"],
              ["partidas", "Partidas y parámetros"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`px-3 h-8 rounded-md text-xs font-semibold transition-colors ${
                tab === k ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {!isSupabaseConfigured ? (
        <Card className="p-5 text-sm text-muted-foreground">Supabase no está configurado: no se pueden generar los reportes.</Card>
      ) : tab === "presentaciones" ? (
        <PresentacionesTab />
      ) : (
        <PartidasTab />
      )}
    </div>
  );
}

/* ============================================================================
 * Presentaciones por período
 * ========================================================================== */

function PresentacionesTab() {
  const queryClient = useQueryClient();
  const periodos = useMemo(() => ultimosPeriodos(12), []);
  const desde = periodos[periodos.length - 1];
  const hasta = periodos[0];

  const [mes, setMes] = useState(periodos[1].slice(0, 7));
  const [filtro, setFiltro] = useState<string | null>(null);
  const [qDesde, qHasta] = filtro ? [filtro, filtro] : [desde, hasta];
  const presQ = useQuery({ queryKey: [...QK, "presentaciones", qDesde, qHasta], queryFn: () => listPresentaciones(qDesde, qHasta) });
  const paramsQ = useQuery({ queryKey: [...QK, "parametros"], queryFn: leerParametrosBcra });

  const porClave = useMemo(() => {
    const m = new Map<string, BcraPresentacion>();
    for (const p of presQ.data ?? []) m.set(`${p.periodo}|${p.archivo}`, p);
    return m;
  }, [presQ.data]);
  const buscar = (periodo: string, archivo: BcraArchivo) => porClave.get(`${periodo}|${archivo}`);

  const [busy, setBusy] = useState<string | null>(null);
  const [ver, setVer] = useState<BcraPresentacion | null>(null);
  const [corregir, setCorregir] = useState<BcraPresentacion | null>(null);
  const [presentar, setPresentar] = useState<BcraPresentacion | null>(null);
  const [rectificar, setRectificar] = useState<BcraPresentacion | null>(null);
  const [zipPeriodo, setZipPeriodo] = useState<string | null>(null);

  const refrescar = () => queryClient.invalidateQueries({ queryKey: QK });

  /** Genera un archivo; el padrón se arma en el admin y se guarda como foto. */
  const generarUno = async (periodo: string, archivo: BcraArchivo) => {
    if (archivo === "P") {
      const res = await generarPadron();
      const avisos: string[] = [];
      if (res.sinCodigoPostal > 0)
        avisos.push(`${res.sinCodigoPostal} cliente(s) sin código postal: la celda queda en blanco. Completalo en la ficha antes de presentar.`);
      for (const i of res.invalidos) avisos.push(`Excluido ${i.cuit ?? "sin CUIT"} (${i.nombre ?? "—"}): ${i.motivo}`);
      if (res.filas.length === 0) avisos.push("No hay clientes Persona Jurídica activos para informar.");
      await guardarPadron(periodo, res.filas, avisos);
    } else {
      await generarArchivo(periodo, archivo);
    }
  };

  const generar = async (periodo: string, archivo: BcraArchivo) => {
    setBusy(`${periodo}|${archivo}`);
    try {
      await generarUno(periodo, archivo);
      toast.success(`${BCRA_ARCHIVO_LABEL[archivo]} de ${labelPeriodo(periodo)} generado.`);
      await refrescar();
    } catch (e) {
      toast.error(`No se pudo generar: ${errMsg(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const generarFaltantes = async (periodo: string) => {
    const faltan = BCRA_ARCHIVOS.filter((a) => !buscar(periodo, a));
    if (faltan.length === 0) {
      toast.info(`${labelPeriodo(periodo)} ya tiene los cuatro archivos generados.`);
      return;
    }
    setBusy("faltantes");
    const errores: string[] = [];
    for (const a of faltan) {
      try {
        await generarUno(periodo, a);
      } catch (e) {
        errores.push(`${BCRA_ARCHIVO_LABEL[a]}: ${errMsg(e)}`);
      }
    }
    setBusy(null);
    await refrescar();
    if (errores.length) toast.error(`Algunos archivos no se generaron. ${errores.join(" · ")}`);
    else toast.success(`${labelPeriodo(periodo)}: se generaron ${faltan.map((a) => BCRA_ARCHIVO_LABEL[a]).join(", ")}.`);
  };

  const descargar = async (p: BcraPresentacion) => {
    setBusy(`${p.periodo}|${p.archivo}|dl`);
    try {
      descargarArchivo(p.periodo, p.archivo, await getFilasPresentacion(p.id));
    } catch (e) {
      toast.error(`No se pudo descargar: ${errMsg(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const cuit = paramsQ.data?.bcra_cuit_entidad ?? "";

  /** Valida y abre la confirmación del paquete. */
  const pedirPaquete = (periodo: string) => {
    const faltan = BCRA_ARCHIVOS.filter((a) => !buscar(periodo, a));
    if (faltan.length) {
      toast.error(`Faltan generar: ${faltan.map((a) => BCRA_ARCHIVO_LABEL[a]).join(", ")}.`);
      return;
    }
    if (!/^\d{11}$/.test(cuit)) {
      toast.error("Cargá el CUIT de la entidad en Partidas y parámetros antes de armar el paquete.");
      return;
    }
    setZipPeriodo(periodo);
  };

  const bajarPaquete = async (periodo: string) => {
    try {
      const archivos = await Promise.all(
        BCRA_ARCHIVOS.map(async (a) => ({ archivo: a, filas: await getFilasPresentacion(buscar(periodo, a)!.id) })),
      );
      descargarPaquete(cuit, periodo, archivos);
      toast.success(`Paquete ${nombrePaquete(cuit, periodo)} descargado.`);
      setZipPeriodo(null);
    } catch (e) {
      toast.error(`No se pudo armar el paquete: ${errMsg(e)}`);
    }
  };

  const acciones = (periodo: string, archivo: BcraArchivo, p: BcraPresentacion | undefined): ActionItem[] => {
    if (!p) return [{ label: "Generar", icon: Wand2, onClick: () => void generar(periodo, archivo) }];
    return [
      { label: "Vista previa", icon: Eye, onClick: () => setVer(p) },
      { label: `Descargar ${NOMBRE_EN_PAQUETE[archivo]}`, icon: Download, onClick: () => void descargar(p) },
      { label: "Corregir", icon: Pencil, disabled: p.estado === "presentado", onClick: () => setCorregir(p) },
      {
        label: p.estado === "presentado" ? "Regenerar (rectificativa)" : "Regenerar",
        icon: RefreshCw,
        onClick: () => (p.estado === "presentado" || p.correcciones > 0 ? setRectificar(p) : void generar(periodo, archivo)),
      },
      { label: "Marcar presentado", icon: Send, disabled: p.estado === "presentado", onClick: () => setPresentar(p) },
    ];
  };

  const mesAnterior = periodos[1];
  const faltantesAnterior = BCRA_ARCHIVOS.filter((a) => !buscar(mesAnterior, a)).length;
  // Campos planos para que funcionen los filtros de la tabla (búsqueda, rango de fechas y estado).
  type FilaPeriodo = { periodo: string; fecha: string; mesNombre: string; estado: EstadoPeriodo };
  const filas: FilaPeriodo[] = (filtro ? [filtro] : periodos).map((periodo) => {
    const ps = BCRA_ARCHIVOS.map((a) => buscar(periodo, a));
    const generados = ps.filter(Boolean).length;
    const estado: EstadoPeriodo =
      generados === 0 ? "Sin generar" : generados < 4 ? "Incompleto" : ps.every((x) => x?.estado === "presentado") ? "Presentado" : "Completo";
    return { periodo, fecha: `01/${cortoPeriodo(periodo)}`, mesNombre: labelPeriodo(periodo), estado };
  });

  const aplicarBusqueda = () => {
    if (!/^\d{4}-\d{2}$/.test(mes)) {
      toast.error("Elegí un mes.");
      return;
    }
    if (`${mes}-01` > periodos[0]) {
      toast.error("No se puede consultar un período futuro.");
      return;
    }
    setFiltro(`${mes}-01`);
  };

  const columnas: Column<FilaPeriodo>[] = [
    {
      key: "mesNombre",
      label: "Período",
      hint: "Mes que se informa al BCRA. Podés buscarlo por nombre o número (ej. septiembre, 09/2026).",
      filterable: true,
      minWidth: 140,
      render: (r) => <span className="font-semibold">{r.mesNombre}</span>,
    },
    ...BCRA_ARCHIVOS.map(
      (a): Column<FilaPeriodo> => ({
        key: a,
        label: BCRA_ARCHIVO_LABEL[a],
        hint: AYUDA_ARCHIVO[a],
        minWidth: 150,
        render: (r) => {
          const p = buscar(r.periodo, a);
          return (
            <ArchivoCell
              archivo={a}
              p={p}
              cargando={presQ.isLoading}
              generando={busy === `${r.periodo}|${a}`}
              descargando={busy === `${r.periodo}|${a}|dl`}
              onVer={() => p && setVer(p)}
              onDescargar={() => p && void descargar(p)}
              onGenerar={() => void generar(r.periodo, a)}
              actions={acciones(r.periodo, a, p).filter((x) => x.icon !== Eye && x.icon !== Download)}
            />
          );
        },
      }),
    ),
    {
      key: "fecha",
      label: "Fecha",
      hint: AYUDA_FECHA,
      filterable: "date",
      minWidth: 130,
      render: (r) => (
        <div>
          <span className="font-mono text-xs tabular-nums">{r.fecha}</span>
          {r.periodo === periodos[0] && <span className="ml-1.5 text-[10px] text-muted-foreground">en curso</span>}
          <div className="mt-0.5">
            <ControlCell control={buscar(r.periodo, "A")?.totales.control} />
          </div>
        </div>
      ),
    },
    {
      key: "estado",
      label: "Estado",
      hint: AYUDA_ESTADO,
      filterable: "enum",
      filterOptions: ESTADOS_PERIODO,
      minWidth: 120,
      render: (r) => (
        <Badge tone={r.estado === "Presentado" ? "success" : r.estado === "Completo" ? "neutral" : "warn"}>{r.estado}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="bsra-fecha" className="text-xs font-semibold mb-1.5 block">
              Fecha
            </label>
            <input
              id="bsra-fecha"
              type="month"
              value={mes}
              max={periodos[0].slice(0, 7)}
              onChange={(e) => setMes(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && aplicarBusqueda()}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          <BtnOutline className="h-9 text-xs px-3" onClick={aplicarBusqueda}>
            <Search size={14} /> Buscar
          </BtnOutline>
          {filtro && (
            <button type="button" onClick={() => setFiltro(null)} className="h-9 text-xs font-semibold text-primary underline underline-offset-2">
              Ver últimos 12 meses
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <BtnOutline
            className="h-9 text-xs px-3"
            onClick={() => void generarFaltantes(mesAnterior)}
            disabled={busy !== null || presQ.isLoading || filtro !== null || faltantesAnterior === 0}
            title={`Genera lo que falte de ${labelPeriodo(mesAnterior)}`}
          >
            {busy === "faltantes" ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Generar faltantes del mes anterior
          </BtnOutline>
          <BtnPrimary
            className="h-9 text-xs px-3"
            onClick={() => pedirPaquete(filtro ?? mesAnterior)}
            disabled={busy !== null || presQ.isLoading}
            title={`Paquete ZIP de ${labelPeriodo(filtro ?? mesAnterior)}`}
          >
            <FileArchive size={14} /> Descargar paquete {cortoPeriodo(filtro ?? mesAnterior)}
          </BtnPrimary>
        </div>
      </div>

      {presQ.isError ? (
        <Card className="p-5 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={16} /> {errMsg(presQ.error)} (¿se aplicó la migración 20261028110000_bcra_reportes?)
        </Card>
      ) : (
        <DataTable
          columns={columnas}
          data={filas}
          keyExtractor={(r) => r.periodo}
          pageSize={12}
          showDownloadButton={false}
          actions={(r) => {
            const completos = BCRA_ARCHIVOS.every((a) => buscar(r.periodo, a));
            const faltan = BCRA_ARCHIVOS.filter((a) => !buscar(r.periodo, a)).length;
            return (
              <ActionsDropdown
                actions={[
                  { label: "Descargar paquete ZIP", icon: FileArchive, disabled: !completos || busy !== null, onClick: () => pedirPaquete(r.periodo) },
                  { label: `Generar faltantes (${faltan})`, icon: Wand2, disabled: faltan === 0 || busy !== null, onClick: () => void generarFaltantes(r.periodo) },
                ]}
              />
            );
          }}
        />
      )}

      <p className="text-[11px] text-muted-foreground">
        Com. "A" 8207 (BCRA) · SISCEN. Cada archivo se calcula desde el ledger y queda guardado como foto: la vista previa muestra
        exactamente lo que se descarga.
      </p>

      {ver && <VistaPreviaModal p={ver} onClose={() => setVer(null)} onDescargar={() => void descargar(ver)} />}
      {zipPeriodo && (
        <PaqueteModal
          periodo={zipPeriodo}
          cuit={cuit}
          presentaciones={BCRA_ARCHIVOS.map((a) => buscar(zipPeriodo, a)).filter((x): x is BcraPresentacion => !!x)}
          onClose={() => setZipPeriodo(null)}
          onConfirm={() => bajarPaquete(zipPeriodo)}
        />
      )}
      {corregir && <CorregirDialog p={corregir} onClose={() => setCorregir(null)} onDone={refrescar} />}
      {presentar && <MarcarPresentadoDialog p={presentar} onClose={() => setPresentar(null)} onDone={refrescar} />}
      <ConfirmDialog
        open={rectificar !== null}
        onClose={() => setRectificar(null)}
        title={rectificar?.estado === "presentado" ? "Generar rectificativa" : "Regenerar archivo"}
        message={
          rectificar?.estado === "presentado"
            ? `La versión ${rectificar.version} ya fue presentada y queda guardada sin cambios. Se va a crear la versión ${rectificar.version + 1} (rectificativa) recalculada desde la base.`
            : `Se recalcula desde la base y se descartan las ${rectificar?.correcciones ?? 0} corrección(es) manual(es) aplicadas (quedan en el historial).`
        }
        confirmLabel="Regenerar"
        onConfirm={async () => {
          if (rectificar) await generar(rectificar.periodo, rectificar.archivo);
          setRectificar(null);
        }}
      />
    </div>
  );
}

function EstadoBadge({ p }: { p: BcraPresentacion }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Badge tone={p.estado === "presentado" ? "success" : "warn"}>{p.estado === "presentado" ? "Presentado" : "Generado"}</Badge>
      {p.version > 1 && <Badge>v{p.version}</Badge>}
    </span>
  );
}

function ArchivoCell({
  archivo,
  p,
  cargando,
  generando,
  descargando,
  onVer,
  onDescargar,
  onGenerar,
  actions,
}: {
  archivo: BcraArchivo;
  p?: BcraPresentacion;
  cargando: boolean;
  generando: boolean;
  descargando: boolean;
  onVer: () => void;
  onDescargar: () => void;
  onGenerar: () => void;
  actions: ActionItem[];
}) {
  if (cargando) return <span className="text-xs text-muted-foreground">…</span>;
  if (generando)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 size={12} className="animate-spin" /> Generando…
      </span>
    );
  if (!p)
    return (
      <div>
        <button type="button" onClick={onGenerar} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          <Wand2 size={14} /> Generar
        </button>
        <div className="mt-0.5 text-[11px] text-muted-foreground">Sin generar</div>
      </div>
    );

  const link = "inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline disabled:opacity-50";
  return (
    <div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onDescargar} disabled={descargando} className={link} title={`Descargar ${NOMBRE_EN_PAQUETE[archivo]}`}>
          {descargando ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} {archivo === "I" ? "TXT" : "XLS"}
        </button>
        <button
          type="button"
          onClick={onVer}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
          title="Vista previa"
        >
          <Eye size={13} /> Ver
        </button>
        <ActionsDropdown actions={actions} />
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className={`h-1.5 w-1.5 rounded-full ${p.estado === "presentado" ? "bg-emerald-500" : "bg-amber-500"}`} />
        {p.estado === "presentado" ? "Presentado" : "Generado"}
        {p.version > 1 && <span>· v{p.version}</span>}
        {p.avisos.length > 0 && (
          <span className="inline-flex items-center gap-0.5 text-amber-700" title={p.avisos.join("\n")}>
            · <AlertTriangle size={11} /> {p.avisos.length}
          </span>
        )}
      </div>
    </div>
  );
}

function ControlCell({ control }: { control?: BcraControl }) {
  if (!control) return <span className="text-xs text-muted-foreground">Generá el Apartado A</span>;
  if (control.cuadra)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2 size={13} /> Cuadra
      </span>
    );
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700"
      title="Saldo final − (inicial + créditos − débitos). Puede venir de ajustes, adelantos o reversos."
    >
      <AlertTriangle size={13} /> Dif. {fmtARS(control.diferencia)}
    </span>
  );
}

/* ---------- Modal base ---------- */

function Modal({ onClose, children, className = "max-w-5xl" }: { onClose: () => void; children: ReactNode; className?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        className={`w-full ${className} max-h-[90vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden`}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ icon, title, subtitle, extra, onClose }: { icon: ReactNode; title: string; subtitle: string; extra?: ReactNode; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{title}</h3>
            {extra}
          </div>
          <p className="text-xs text-muted-foreground font-mono truncate">{subtitle}</p>
        </div>
      </div>
      <button type="button" onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted" aria-label="Cerrar">
        <X size={16} />
      </button>
    </div>
  );
}

/* ---------- Vista previa ---------- */

type ColPreview = { key: string; label: string; hint: string; align?: "right"; render?: (r: Record<string, unknown>) => ReactNode };

/** Columnas en el orden del archivo, con los nombres que usa Compliance. */
const COLUMNAS_PREVIEW: Record<BcraArchivo, ColPreview[]> = {
  A: [
    { key: "codigo", label: "Código (partida+día)", hint: "Código de 7 dígitos: el número de bloque (1 a 6) seguido del día del mes.\nEj.: 1000005 = bloque 1, día 5. Los meses con menos de 31 días completan hasta el día 31 con ceros." },
    { key: "monto", label: "Campo 1", align: "right", hint: "MONTO: saldo al cierre de ese día, en miles de pesos y sin decimales.\nBloque 1: plata de los clientes en sus cuentas. Bloque 2: plata depositada en la cuenta a la vista del banco. Bloque 6: cobros con tarjeta pendientes de liquidar. Bloques 3 y 4 (fondos de inversión): siempre 0." },
    { key: "cantidad", label: "Campo 2", align: "right", hint: "CANTIDAD de cuentas.\nBloque 1: cuentas de pago que ese día tenían saldo mayor a 0. Bloque 5: total de cuentas activas, tengan o no saldo. En los demás bloques va vacío." },
    { key: "aux", label: "Campo 3", hint: "Dato auxiliar (COL_AUX).\nBloque 2: CBU o identificador de la cuenta a la vista donde están depositados los fondos de los clientes. Se carga en Partidas y parámetros. En el resto va vacío." },
  ],
  B: [
    { key: "codigo", label: "Código", hint: "Partida (concepto) que se informa.\n5001000: transferencias de CVU a CBU (enviadas a bancos). 5002000: de CBU a CVU (recibidas desde bancos). 5003000: de CVU a CVU acreditadas. 5004000: de CVU a CVU debitadas. 2020220: pagos con transferencia / QR. 60xxxxx: cantidad de clientes y cuentas." },
    { key: "medio", label: "(sin uso)", hint: "Medio de pago (Tabla 1 del BCRA).\n6 = transferencia inmediata push · 7 = pull · 8 = pago con transferencia (QR) · 1 / 2 = tarjeta de crédito / débito. Vacío en las partidas que solo cuentan clientes o cuentas." },
    { key: "esquema", label: "(sin uso)", hint: "Esquema de pago (Tabla 2 del BCRA).\n00007 = CBU · 00008 = CVU · 00009 = esquema propio de MoliPay. Vacío en las partidas que solo cuentan clientes o cuentas." },
    { key: "cantidad", label: "Cantidad", align: "right", hint: "Cantidad de operaciones del mes en esa partida.\nEn las partidas 60xxxxx es la cantidad de clientes o de cuentas." },
    { key: "monto", label: "Monto (en miles)", align: "right", hint: "Importe total del mes en miles de pesos, sin decimales (0,5 o más redondea para arriba). Ej.: 1.635.371 = $ 1.635.371.000.\nIngresos: netos de comisión e impuesto. Egresos: total que salió de la cuenta. Vacío en las partidas que solo cuentan." },
  ],
  P: [
    { key: "tipoDocumento", label: "Tipo", hint: "Tipo de documento. Siempre 11, que significa CUIT." },
    { key: "cuit", label: "CUIT", hint: "CUIT de la empresa: 11 dígitos sin guiones." },
    { key: "sufijo", label: "Código", hint: "Sufijo de la cuenta. Siempre 00." },
    { key: "vacio", label: "DNI", hint: "No aplica a empresas: siempre va vacío." },
    { key: "razonSocial", label: "Nombre", hint: "Razón social de la empresa. En el archivo se completa con espacios hasta 80 caracteres.", render: (r) => <span className="font-sans">{String(r.razonSocial ?? "").trimEnd()}</span> },
    { key: "flag", label: "(cero)", hint: "Campo de control fijo. Siempre 0." },
    {
      key: "codigoPostal",
      label: "Cód. Postal",
      hint: "Código postal del domicilio legal (ej. C1425BXG), completado a 8 caracteres.\nSi dice \"sin dato\", hay que cargarlo en la ficha del cliente antes de presentar.",
      render: (r) => (String(r.codigoPostal ?? "").trim() ? String(r.codigoPostal).trim() : <Badge tone="warn">sin dato</Badge>),
    },
    { key: "tipoPersonaSocietaria", label: "Alta(10)/Baja(20)", hint: "Código del tipo de sociedad, tomado del tipo de sociedad de la ficha del cliente.\nHoy: 10 = S.A., 20 = S.R.L., 11 = S.A.S. Si la ficha no lo tiene, se usa 20." },
  ],
  I: [
    { key: "codigo", label: "Partida", hint: "Concepto informado. 2010100 = débitos en cuentas de pago por transferencias entre cuentas de MoliPay." },
    { key: "medio", label: "Medio de pago", hint: "6 = transferencia inmediata push (envío instantáneo de fondos)." },
    { key: "moneda", label: "Moneda", hint: "ARS = pesos argentinos." },
    { key: "titular", label: "Tipo titular", hint: "1 = Persona Humana · 2 = Persona Jurídica (empresa).", render: (r) => (r.titular === "2" ? "2 · Jurídica" : "1 · Humana") },
    { key: "cantidad", label: "Cantidad", align: "right", hint: "Cantidad de transferencias del mes de ese tipo de titular." },
    { key: "monto", label: "Monto (en miles)", align: "right", hint: "Total transferido en el mes, en miles de pesos y sin decimales. Ej.: 1.635.371 = $ 1.635.371.000." },
  ],
};

const BLOQUES_A: Record<string, string> = {
  "1": "Saldos de clientes",
  "2": "Cuenta a la vista",
  "3": "FCI",
  "4": "FCI",
  "5": "Cantidad de cuentas",
  "6": "Saldos a liquidar",
};

const MAX_FILAS_PREVIEW = 500;

function VistaPreviaModal({ p, onClose, onDescargar }: { p: BcraPresentacion; onClose: () => void; onDescargar: () => void }) {
  const filasQ = useQuery({ queryKey: [...QK, "filas", p.id], queryFn: () => getFilasPresentacion(p.id) });
  const corrQ = useQuery({ queryKey: [...QK, "correcciones", p.id], queryFn: () => listCorrecciones(p.id), enabled: p.correcciones > 0 });
  const [bloque, setBloque] = useState("");
  const [q, setQ] = useState("");
  const columnas = COLUMNAS_PREVIEW[p.archivo];
  const c = p.totales.control;

  const filas = useMemo(() => {
    const todas = ((filasQ.data ?? []) as Record<string, unknown>[]).map((f, i) => ({ f, n: i + 1 }));
    const texto = q.trim().toLowerCase();
    return todas.filter(({ f }) => {
      if (bloque && !String(f.codigo ?? "").startsWith(bloque)) return false;
      if (!texto) return true;
      return columnas.some((col) => String(f[col.key] ?? "").toLowerCase().includes(texto));
    });
  }, [filasQ.data, bloque, q, columnas]);
  const total = filasQ.data?.length ?? 0;

  return (
    <Modal onClose={onClose} className="max-w-6xl">
      <ModalHeader
        icon={p.archivo === "I" ? <FileText size={18} /> : <FileSpreadsheet size={18} />}
        title={`${BCRA_ARCHIVO_LABEL[p.archivo]} · ${labelPeriodo(p.periodo)}`}
        subtitle={nombreArchivoIndividual(p.periodo, p.archivo)}
        extra={<EstadoBadge p={p} />}
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Filas" value={String(p.cantidadFilas)} />
          <Stat label="Generado" value={fmtFechaHora(p.generadoAt)} hint={p.generadoByName ?? undefined} />
          <Stat label="Presentado" value={p.presentadoAt ? fmtFechaHora(p.presentadoAt) : "—"} hint={p.presentadoByName ?? undefined} />
          <Stat label="Versión" value={`v${p.version}${p.version > 1 ? " · rectificativa" : ""}`} hint={p.correcciones ? `${p.correcciones} corrección(es)` : undefined} />
        </div>
        {p.notas && <p className="text-xs text-muted-foreground">Notas: {p.notas}</p>}

        {p.avisos.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 space-y-1.5">
            {p.avisos.map((a, i) => (
              <div key={i} className="flex gap-2">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {a}
              </div>
            ))}
          </div>
        )}

        {c && (
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Control de saldos (en pesos)</div>
              <ControlCell control={c} />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm tabular-nums">
              <Monto label="Saldo inicial" v={c.saldo_inicial} />
              <span className="text-muted-foreground">+</span>
              <Monto label="Créditos" v={c.creditos} />
              <span className="text-muted-foreground">−</span>
              <Monto label="Débitos" v={c.debitos} />
              <span className="text-muted-foreground">vs</span>
              <Monto label="Saldo final" v={c.saldo_final} />
              <span className="text-muted-foreground">=</span>
              <Monto label="Diferencia" v={c.diferencia} tone={c.cuadra ? "ok" : "warn"} />
            </div>
            {c.operaciones_otras > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {c.operaciones_otras} operación(es) de otro tipo (ajustes, adelantos, lotes) no entran en créditos/débitos y pueden explicar la diferencia.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {p.archivo === "A" ? (
            <div className="flex flex-wrap gap-1.5">
              <Chip on={bloque === ""} onClick={() => setBloque("")}>
                Todos
              </Chip>
              {Object.entries(BLOQUES_A).map(([d, l]) => (
                <Chip key={d} on={bloque === d} onClick={() => setBloque(d)}>
                  <span className="font-mono">{d}0000dd</span> · {l}
                </Chip>
              ))}
            </div>
          ) : (
            <span />
          )}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={p.archivo === "P" ? "Buscar CUIT o nombre…" : "Buscar código…"}
              className="h-8 w-56 rounded-md border border-input bg-card pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="max-h-[46vh] overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr className="text-left text-[11px] text-muted-foreground">
                  <th className="px-3 py-2 font-semibold w-12 text-right">
                    <span className="inline-flex items-center gap-1">
                      # <HeaderHint title="#" text="Número de fila, solo para ubicarte en la vista previa. No va en el archivo." />
                    </span>
                  </th>
                  {columnas.map((col, i) => (
                    <th key={`${col.key}${i}`} className={`px-3 py-2 font-semibold whitespace-nowrap ${col.align === "right" ? "text-right" : ""}`}>
                      <span className="inline-flex items-center gap-1">
                        {col.label} <HeaderHint title={col.label} text={col.hint} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {filasQ.isLoading ? (
                  <tr>
                    <td colSpan={columnas.length + 1} className="px-3 py-10 text-center font-sans text-muted-foreground">
                      <Loader2 size={14} className="inline animate-spin mr-1" /> Cargando filas…
                    </td>
                  </tr>
                ) : filas.length === 0 ? (
                  <tr>
                    <td colSpan={columnas.length + 1} className="px-3 py-10 text-center font-sans text-muted-foreground">
                      {total === 0 ? "El archivo no tiene filas." : "Ninguna fila coincide con el filtro."}
                    </td>
                  </tr>
                ) : (
                  filas.slice(0, MAX_FILAS_PREVIEW).map(({ f, n }) => (
                    <tr key={n} className="border-t border-border/60 odd:bg-muted/15 hover:bg-primary/5">
                      <td className="px-3 py-1.5 text-right text-muted-foreground">{n}</td>
                      {columnas.map((col, i) => {
                        const v = f[col.key];
                        const vacio = v === null || v === undefined || v === "";
                        return (
                          <td key={`${col.key}${i}`} className={`px-3 py-1.5 whitespace-nowrap ${col.align === "right" ? "text-right" : ""}`}>
                            {col.render ? col.render(f) : vacio ? <span className="text-muted-foreground/40">·</span> : String(v)}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
            Mostrando {Math.min(filas.length, MAX_FILAS_PREVIEW)} de {total} fila(s)
            {filas.length > MAX_FILAS_PREVIEW && " · descargá el archivo para ver todas"}. El # es solo de referencia: no va en el archivo.
          </div>
        </div>

        {p.correcciones > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Correcciones manuales</div>
            <div className="space-y-1.5">
              {(corrQ.data ?? []).map((k) => (
                <div key={k.id} className="text-xs rounded-lg border border-border px-3 py-2">
                  <span className="font-mono">{k.codigo ?? `fila ${k.fila + 1}`}</span> · {k.campo}:{" "}
                  <span className="line-through text-muted-foreground">{k.valorAnterior ?? "—"}</span> → <strong>{k.valorNuevo ?? "—"}</strong>
                  <div className="text-muted-foreground mt-0.5">
                    {fmtFechaHora(k.createdAt)} · {k.motivo}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-6 py-3">
        <p className="text-[11px] text-muted-foreground">Es la foto guardada: lo que ves es exactamente lo que se descarga.</p>
        <div className="flex gap-2">
          <BtnOutline onClick={onClose}>Cerrar</BtnOutline>
          <BtnPrimary onClick={onDescargar}>
            <Download size={14} /> Descargar {NOMBRE_EN_PAQUETE[p.archivo]}
          </BtnPrimary>
        </div>
      </div>
    </Modal>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground truncate">{hint}</div>}
    </div>
  );
}

function Monto({ label, v, tone }: { label: string; v: number; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-lg bg-muted/40 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-sans">{label}</div>
      <div className={`font-semibold ${tone === "ok" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : ""}`}>{fmtARS(v)}</div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-7 px-2.5 rounded-full border text-[11px] font-semibold ${
        on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------- Confirmación del paquete ---------- */

function PaqueteModal({
  periodo,
  cuit,
  presentaciones,
  onClose,
  onConfirm,
}: {
  periodo: string;
  cuit: string;
  presentaciones: BcraPresentacion[];
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [bajando, setBajando] = useState(false);
  const conAvisos = presentaciones.filter((p) => p.avisos.length > 0);
  const sinPresentar = presentaciones.filter((p) => p.estado !== "presentado").length;

  return (
    <Modal onClose={onClose} className="max-w-2xl">
      <ModalHeader
        icon={<FileArchive size={18} />}
        title={`Paquete BCRA · ${labelPeriodo(periodo)}`}
        subtitle={nombrePaquete(cuit, periodo)}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        <p className="text-sm text-muted-foreground">Se van a incluir estos {presentaciones.length} archivos (la última versión de cada uno):</p>
        <ul className="rounded-xl border border-border divide-y divide-border">
          {presentaciones.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 shrink-0 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                  {p.archivo === "I" ? <FileText size={16} /> : <FileSpreadsheet size={16} />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold font-mono truncate">{NOMBRE_EN_PAQUETE[p.archivo]}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {BCRA_ARCHIVO_LABEL[p.archivo]} · {p.cantidadFilas} fila(s) · generado {fmtFechaHora(p.generadoAt)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {p.avisos.length > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-700" title={p.avisos.join("\n")}>
                    <AlertTriangle size={12} /> {p.avisos.length}
                  </span>
                )}
                <EstadoBadge p={p} />
              </div>
            </li>
          ))}
        </ul>

        {conAvisos.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <div className="flex items-center gap-1.5 font-semibold mb-1">
              <AlertTriangle size={13} /> Revisá los avisos antes de presentar
            </div>
            <ul className="list-disc pl-5 space-y-0.5">
              {conAvisos.flatMap((p) => p.avisos.map((a, i) => <li key={`${p.id}${i}`}>{`${BCRA_ARCHIVO_LABEL[p.archivo]}: ${a}`}</li>))}
            </ul>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          {sinPresentar > 0
            ? `${sinPresentar} archivo(s) todavía no están marcados como presentados. Después de subir el paquete a SISCEN, marcalos desde el menú ⋯.`
            : "Todos los archivos ya figuran como presentados."}
        </p>
      </div>
      <div className="flex justify-end gap-2 border-t border-border bg-muted/20 px-6 py-3">
        <BtnOutline onClick={onClose} disabled={bajando}>
          Cancelar
        </BtnOutline>
        <BtnPrimary
          disabled={bajando}
          onClick={async () => {
            setBajando(true);
            await onConfirm();
            setBajando(false);
          }}
        >
          {bajando ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Descargar ZIP ({presentaciones.length} archivos)
        </BtnPrimary>
      </div>
    </Modal>
  );
}

/* ---------- Corregir ---------- */

const CAMPOS_EDITABLES: Record<BcraArchivo, { key: string; label: string }[]> = {
  A: [
    { key: "monto", label: "Monto" },
    { key: "cantidad", label: "Cantidad" },
    { key: "aux", label: "Aux / CBU" },
  ],
  B: [
    { key: "medio", label: "Medio de pago" },
    { key: "esquema", label: "Esquema" },
    { key: "cantidad", label: "Cantidad" },
    { key: "monto", label: "Monto (miles)" },
  ],
  I: [
    { key: "medio", label: "Medio de pago" },
    { key: "titular", label: "Tipo de titular" },
    { key: "cantidad", label: "Cantidad" },
    { key: "monto", label: "Monto (miles)" },
  ],
  P: [
    { key: "razonSocial", label: "Razón social" },
    { key: "codigoPostal", label: "Código postal" },
    { key: "tipoPersonaSocietaria", label: "Tipo societario" },
  ],
};

function CorregirDialog({ p, onClose, onDone }: { p: BcraPresentacion; onClose: () => void; onDone: () => void }) {
  const queryClient = useQueryClient();
  const filasQ = useQuery({ queryKey: [...QK, "filas", p.id], queryFn: () => getFilasPresentacion(p.id) });
  const filas = (filasQ.data ?? []) as Record<string, unknown>[];
  const campos = CAMPOS_EDITABLES[p.archivo];
  const [fila, setFila] = useState(0);
  const [campo, setCampo] = useState(campos[0].key);
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const actual = filas[fila]?.[campo];
  const inputCls = "w-full h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";
  const etiqueta = (f: Record<string, unknown>) =>
    p.archivo === "P" ? `${f.cuit} — ${String(f.razonSocial ?? "").trim()}` : `${f.codigo}${p.archivo === "I" ? ` · titular ${f.titular}` : ""}`;

  const enviar = async () => {
    if (motivo.trim().length < 5) {
      toast.error("Indicá el motivo de la corrección (por ejemplo, la observación del BCRA).");
      return;
    }
    if (["monto", "cantidad"].includes(campo) && valor.trim() !== "" && !/^-?\d+(\.\d+)?$/.test(valor.trim())) {
      toast.error("El valor debe ser numérico.");
      return;
    }
    setEnviando(true);
    try {
      await corregirFila(p.id, fila, campo, valor.trim(), motivo.trim());
      toast.success("Corrección aplicada y registrada en el historial.");
      void queryClient.invalidateQueries({ queryKey: [...QK, "filas", p.id] });
      onDone();
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title={`Corregir ${BCRA_ARCHIVO_LABEL[p.archivo]} · ${labelPeriodo(p.periodo)}`}
      description="Para observaciones del BCRA o rectificaciones puntuales. Queda registrado el valor anterior, el nuevo, quién y por qué."
      onSubmit={() => void enviar()}
      submitLabel={enviando ? "Guardando…" : "Aplicar corrección"}
      isSubmitting={enviando}
    >
      {filasQ.isLoading ? (
        <div className="py-6 text-center text-sm text-muted-foreground">Cargando filas…</div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold mb-1.5 block">Fila</label>
            <select className={inputCls} value={fila} onChange={(e) => setFila(Number(e.target.value))}>
              {filas.map((f, i) => (
                <option key={i} value={i}>
                  {etiqueta(f)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1.5 block">Campo</label>
              <select className={inputCls} value={campo} onChange={(e) => setCampo(e.target.value)}>
                {campos.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block">Valor actual</label>
              <div className="h-9 flex items-center rounded-md border border-dashed border-border px-3 font-mono text-sm text-muted-foreground">
                {actual === null || actual === undefined || actual === "" ? "—" : String(actual)}
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block">Nuevo valor</label>
            <input className={`${inputCls} font-mono`} value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block">Motivo</label>
            <textarea
              className="w-full min-h-[70px] rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej.: Observación SISCEN del 05/10, saldo del día 12 informado sin retenidos."
            />
          </div>
        </div>
      )}
    </FormDialog>
  );
}

/* ---------- Marcar presentado ---------- */

function MarcarPresentadoDialog({ p, onClose, onDone }: { p: BcraPresentacion; onClose: () => void; onDone: () => void }) {
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const enviar = async () => {
    setEnviando(true);
    try {
      await marcarPresentado(p.id, notas.trim());
      toast.success(`${BCRA_ARCHIVO_LABEL[p.archivo]} de ${labelPeriodo(p.periodo)} marcado como presentado.`);
      onDone();
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setEnviando(false);
    }
  };
  return (
    <FormDialog
      open
      onClose={onClose}
      title="Marcar como presentado"
      description={`${BCRA_ARCHIVO_LABEL[p.archivo]} · ${labelPeriodo(p.periodo)} · versión ${p.version}. Una vez presentado no se puede modificar: cualquier cambio posterior genera una rectificativa.`}
      onSubmit={() => void enviar()}
      submitLabel={enviando ? "Guardando…" : "Marcar presentado"}
      isSubmitting={enviando}
    >
      <label className="text-xs font-semibold mb-1.5 block">Notas (opcional)</label>
      <textarea
        className="w-full min-h-[70px] rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        placeholder="Ej.: número de presentación SISCEN, fecha de envío."
      />
    </FormDialog>
  );
}

/* ============================================================================
 * Partidas y parámetros
 * ========================================================================== */

const REGLAS: Record<BcraRegla, { label: string; apartado: "A" | "B" | "I" }> = {
  a_saldo_clientes: { label: "Saldo de clientes al cierre + cuentas con saldo", apartado: "A" },
  a_saldo_cuenta: { label: "Saldo de una cuenta contable al cierre", apartado: "A" },
  a_cantidad_cuentas: { label: "Cantidad de cuentas activas", apartado: "A" },
  a_cero: { label: "Siempre en cero", apartado: "A" },
  b_operaciones: { label: "Operaciones: cantidad y monto", apartado: "B" },
  b_clientes: { label: "Clientes involucrados (cantidad)", apartado: "B" },
  b_cuentas: { label: "Cuentas involucradas (cantidad)", apartado: "B" },
  b_clientes_registrados: { label: "Clientes registrados (cantidad)", apartado: "B" },
  b_cuentas_activas: { label: "Cuentas activas (cantidad)", apartado: "B" },
  manual: { label: "Valor fijo manual", apartado: "B" },
  i_internas: { label: "Transferencias internas por tipo de titular", apartado: "I" },
};

const TIPOS_OPERACION = [
  ["deposito", "Depósito"],
  ["transferencia", "Transferencia"],
  ["retiro", "Retiro"],
  ["tarjeta", "Pago con tarjeta"],
  ["pago_pct", "Pago PCT"],
  ["cobro_pct", "Cobro PCT"],
  ["liquidacion_lote", "Liquidación de lote"],
  ["acreditacion_lote", "Acreditación de lote"],
  ["adelanto", "Adelanto"],
  ["ajuste_manual", "Ajuste de saldo"],
] as const;
const TIPO_LABEL = new Map<string, string>(TIPOS_OPERACION);

function resumenParams(p: BcraPartida): string {
  const x = p.params;
  const partes: string[] = [];
  if (x.tipos?.length) partes.push(x.tipos.map((t) => TIPO_LABEL.get(t) ?? t).join(" + "));
  if (x.sentido && x.sentido !== "todos") partes.push(x.sentido === "credito" ? "créditos" : "débitos");
  if (x.contraparte && x.contraparte !== "todas") partes.push(`contraparte ${x.contraparte.toUpperCase()}`);
  if (x.tipo_persona) partes.push(x.tipo_persona === "juridica" ? "P. Jurídica" : "P. Humana");
  if (x.account_code) partes.push(x.account_code);
  if (x.buckets?.length) partes.push(x.buckets.join(" + "));
  if (x.unidad) partes.push(`en ${x.unidad}`);
  return partes.join(" · ");
}

function PartidasTab() {
  const queryClient = useQueryClient();
  const partidasQ = useQuery({ queryKey: [...QK, "partidas"], queryFn: listPartidas });
  const [apartado, setApartado] = useState<"" | "A" | "B" | "I">("");
  const [editar, setEditar] = useState<BcraPartida | null>(null);
  const data = (partidasQ.data ?? []).filter((p) => !apartado || p.apartado === apartado);
  const aConfirmar = (partidasQ.data ?? []).filter((p) => p.activa && !p.confirmada).length;

  const columns: Column<BcraPartida>[] = [
    { key: "apartado", label: "Apartado", minWidth: 90, render: (p) => <Badge>{p.apartado === "I" ? "Intra" : p.apartado}</Badge> },
    {
      key: "codigo",
      label: "Código",
      minWidth: 110,
      render: (p) => <span className="font-mono tabular-nums">{p.apartado === "A" ? `${p.codigo.slice(0, 5)}dd` : p.codigo}</span>,
    },
    {
      key: "descripcion",
      label: "Descripción",
      minWidth: 280,
      maxWidth: 420,
      tooltip: (p) => p.descripcion,
      render: (p) => (
        <div>
          <div className="truncate">{p.descripcion}</div>
          <div className="text-[11px] text-muted-foreground truncate">{resumenParams(p) || REGLAS[p.regla]?.label}</div>
        </div>
      ),
    },
    { key: "regla", label: "Regla", minWidth: 200, render: (p) => <span className="text-xs">{REGLAS[p.regla]?.label ?? p.regla}</span> },
    {
      key: "medio",
      label: "Medio / Esquema",
      minWidth: 120,
      render: (p) => <span className="font-mono text-xs">{p.medioPago || p.esquema ? `${p.medioPago ?? "—"} / ${p.esquema ?? "—"}` : "—"}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      minWidth: 130,
      render: (p) =>
        !p.activa ? <Badge>Inactiva</Badge> : !p.confirmada ? <Badge tone="warn">A confirmar</Badge> : <Badge tone="success">Confirmada</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      <ParametrosEntidadCard />

      {aConfirmar > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>
            {aConfirmar} partida(s) activas tienen la definición <strong>a confirmar</strong> por Compliance. Se calculan igual, pero los archivos
            que las incluyen muestran un aviso hasta que se confirmen.
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["", "Todas"],
            ["A", "Apartado A"],
            ["B", "Apartado B"],
            ["I", "Intraentidades"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setApartado(k)}
            className={`h-8 px-3 rounded-full border text-xs font-semibold ${
              apartado === k ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {partidasQ.isError ? (
        <Card className="p-5 text-sm text-red-700">{errMsg(partidasQ.error)}</Card>
      ) : (
        <DataTable
          columns={columns}
          data={data}
          keyExtractor={(p) => p.id}
          loading={partidasQ.isLoading}
          pageSize={20}
          showDownloadButton={false}
          actions={(p) => <ActionsDropdown actions={[{ label: "Editar", icon: Settings2, onClick: () => setEditar(p) }]} />}
        />
      )}

      {editar && (
        <PartidaDialog
          partida={editar}
          onClose={() => setEditar(null)}
          onDone={() => void queryClient.invalidateQueries({ queryKey: [...QK, "partidas"] })}
        />
      )}
    </div>
  );
}

function ParametrosEntidadCard() {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: [...QK, "parametros"], queryFn: leerParametrosBcra });
  const [cuit, setCuit] = useState<string | null>(null);
  const [cbu, setCbu] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const vCuit = cuit ?? q.data?.bcra_cuit_entidad ?? "";
  const vCbu = cbu ?? q.data?.bcra_cbu_cuenta_vista ?? "";
  const cambios = (cuit !== null && cuit !== (q.data?.bcra_cuit_entidad ?? "")) || (cbu !== null && cbu !== (q.data?.bcra_cbu_cuenta_vista ?? ""));
  const inputCls = "w-full h-9 rounded-md border border-input bg-card px-3 text-sm font-mono outline-none focus:ring-2 focus:ring-ring/40";

  const guardar = async () => {
    if (!/^\d{11}$/.test(vCuit)) {
      toast.error("El CUIT debe tener 11 dígitos, sin guiones.");
      return;
    }
    setGuardando(true);
    try {
      if (cuit !== null) await guardarParametroBcra("bcra_cuit_entidad", vCuit);
      if (cbu !== null) await guardarParametroBcra("bcra_cbu_cuenta_vista", vCbu.trim());
      toast.success("Parámetros guardados.");
      setCuit(null);
      setCbu(null);
      await queryClient.invalidateQueries({ queryKey: [...QK, "parametros"] });
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">Datos de la entidad</div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_auto] gap-3 items-end">
        <div>
          <label className="text-xs font-semibold mb-1.5 block">CUIT de la entidad (nombre del paquete)</label>
          <input className={inputCls} value={vCuit} onChange={(e) => setCuit(e.target.value.replace(/\D/g, ""))} maxLength={11} />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1.5 block">CBU de la cuenta a la vista (Apartado A, bloque 20000dd)</label>
          <input className={inputCls} value={vCbu} onChange={(e) => setCbu(e.target.value)} placeholder="Sin cargar" />
        </div>
        <BtnPrimary onClick={() => void guardar()} disabled={!cambios || guardando}>
          {guardando ? "Guardando…" : "Guardar"}
        </BtnPrimary>
      </div>
    </Card>
  );
}

function PartidaDialog({ partida, onClose, onDone }: { partida: BcraPartida; onClose: () => void; onDone: () => void }) {
  const [descripcion, setDescripcion] = useState(partida.descripcion);
  const [regla, setRegla] = useState<BcraRegla>(partida.regla);
  const [params, setParams] = useState<BcraPartidaParams>(partida.params);
  const [medio, setMedio] = useState(partida.medioPago ?? "");
  const [esquema, setEsquema] = useState(partida.esquema ?? "");
  const [activa, setActiva] = useState(partida.activa);
  const [confirmada, setConfirmada] = useState(partida.confirmada);
  const [enviando, setEnviando] = useState(false);
  const inputCls = "w-full h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";
  const set = (patch: Partial<BcraPartidaParams>) => setParams((p) => ({ ...p, ...patch }));
  const toggleLista = (key: "tipos" | "buckets", v: string) =>
    setParams((p) => {
      const actual = p[key] ?? [];
      return { ...p, [key]: actual.includes(v) ? actual.filter((x) => x !== v) : [...actual, v] };
    });

  const usaTipos = ["b_operaciones", "b_clientes", "b_cuentas", "i_internas"].includes(regla);
  const usaFiltros = ["b_operaciones", "b_clientes", "b_cuentas"].includes(regla);
  const usaPersona = ["b_operaciones", "b_clientes", "b_cuentas", "b_clientes_registrados", "b_cuentas_activas"].includes(regla);
  const usaUnidad = ["a_saldo_clientes", "a_saldo_cuenta", "b_operaciones", "i_internas"].includes(regla);

  const enviar = async () => {
    setEnviando(true);
    try {
      // Solo se guardan los parámetros que usa la regla elegida.
      const limpio: BcraPartidaParams = {};
      if (usaTipos && params.tipos?.length) limpio.tipos = params.tipos;
      if (usaFiltros) {
        if (params.sentido) limpio.sentido = params.sentido;
        if (params.contraparte) limpio.contraparte = params.contraparte;
      }
      if ((regla === "b_operaciones" || regla === "i_internas") && params.monto) limpio.monto = params.monto;
      if (usaPersona && params.tipo_persona) limpio.tipo_persona = params.tipo_persona;
      if (usaUnidad) limpio.unidad = params.unidad ?? "miles";
      if (regla === "a_saldo_clientes") limpio.buckets = params.buckets?.length ? params.buckets : ["disponible", "retenido"];
      if (regla === "a_saldo_cuenta") {
        if (!params.account_code?.trim()) throw new Error("Indicá el código de la cuenta contable.");
        limpio.account_code = params.account_code.trim();
        if (params.aux_param?.trim()) limpio.aux_param = params.aux_param.trim();
      }
      if (regla === "manual") {
        limpio.cantidad = Number(params.cantidad ?? 0);
        if (params.monto_fijo !== undefined && String(params.monto_fijo) !== "") limpio.monto_fijo = Number(params.monto_fijo);
      }
      await guardarPartida({ id: partida.id, descripcion, regla, params: limpio, medioPago: medio, esquema, activa, confirmada });
      toast.success("Partida guardada. Regenerá los archivos para aplicar el cambio.");
      onDone();
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title={`Partida ${partida.apartado === "A" ? `${partida.codigo.slice(0, 5)}dd` : partida.codigo}`}
      description={`${partida.apartado === "I" ? "Intraentidades" : `Apartado ${partida.apartado}`}. Los cambios aplican a los archivos que se generen después.`}
      onSubmit={() => void enviar()}
      submitLabel={enviando ? "Guardando…" : "Guardar"}
      isSubmitting={enviando}
      size="lg"
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold mb-1.5 block">Descripción</label>
          <input className={inputCls} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-3">
            <label className="text-xs font-semibold mb-1.5 block">Regla de cálculo</label>
            <select className={inputCls} value={regla} onChange={(e) => setRegla(e.target.value as BcraRegla)}>
              {(Object.keys(REGLAS) as BcraRegla[])
                .filter((r) => REGLAS[r].apartado === partida.apartado)
                .map((r) => (
                  <option key={r} value={r}>
                    {REGLAS[r].label}
                  </option>
                ))}
            </select>
          </div>
          {partida.apartado !== "A" && (
            <>
              <div>
                <label className="text-xs font-semibold mb-1.5 block">Medio de pago (Tabla 1)</label>
                <input className={`${inputCls} font-mono`} value={medio} onChange={(e) => setMedio(e.target.value)} placeholder="6" />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block">Esquema (Tabla 2)</label>
                <input className={`${inputCls} font-mono`} value={esquema} onChange={(e) => setEsquema(e.target.value)} placeholder="00007" />
              </div>
            </>
          )}
          {usaUnidad && (
            <div>
              <label className="text-xs font-semibold mb-1.5 block">Unidad del monto</label>
              <select className={inputCls} value={params.unidad ?? "miles"} onChange={(e) => set({ unidad: e.target.value as "miles" | "pesos" })}>
                <option value="miles">Miles de pesos (redondeado)</option>
                <option value="pesos">Pesos (redondeado)</option>
              </select>
            </div>
          )}
        </div>

        {usaTipos && (
          <div>
            <label className="text-xs font-semibold mb-1.5 block">Tipos de operación</label>
            <div className="flex flex-wrap gap-1.5">
              {TIPOS_OPERACION.map(([code, label]) => {
                const on = params.tipos?.includes(code) ?? false;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleLista("tipos", code)}
                    className={`h-7 px-2.5 rounded-full border text-[11px] font-semibold ${
                      on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Sin ninguno seleccionado se cuentan todos los tipos.</p>
          </div>
        )}

        {(usaFiltros || usaPersona || regla === "i_internas") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {usaFiltros && (
              <>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block">Sentido</label>
                  <select className={inputCls} value={params.sentido ?? "todos"} onChange={(e) => set({ sentido: e.target.value as BcraPartidaParams["sentido"] })}>
                    <option value="todos">Créditos y débitos</option>
                    <option value="credito">Solo créditos (ingresos)</option>
                    <option value="debito">Solo débitos (egresos)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block">Contraparte</label>
                  <select
                    className={inputCls}
                    value={params.contraparte ?? "externa"}
                    onChange={(e) => set({ contraparte: e.target.value as BcraPartidaParams["contraparte"] })}
                  >
                    <option value="externa">Externa (CBU o CVU de otra entidad)</option>
                    <option value="cbu">Solo CBU (bancos)</option>
                    <option value="cvu">Solo CVU de otra entidad</option>
                    <option value="interna">Solo cuentas de MoliPay</option>
                    <option value="todas">Todas</option>
                  </select>
                </div>
              </>
            )}
            {(regla === "b_operaciones" || regla === "i_internas") && (
              <div>
                <label className="text-xs font-semibold mb-1.5 block">Monto a informar</label>
                <select className={inputCls} value={params.monto ?? ""} onChange={(e) => set({ monto: (e.target.value || undefined) as BcraPartidaParams["monto"] })}>
                  <option value="">{regla === "i_internas" ? "Bruto (monto de la operación)" : "Según sentido (créditos netos, débitos totales)"}</option>
                  <option value="neto">Neto de comisión e impuesto</option>
                  <option value="debitado">Total debitado (con comisión e impuesto)</option>
                  <option value="bruto">Bruto (monto de la operación)</option>
                </select>
              </div>
            )}
            {usaPersona && (
              <div>
                <label className="text-xs font-semibold mb-1.5 block">Tipo de persona</label>
                <select
                  className={inputCls}
                  value={params.tipo_persona ?? ""}
                  onChange={(e) => set({ tipo_persona: (e.target.value || undefined) as BcraPartidaParams["tipo_persona"] })}
                >
                  <option value="">Todas</option>
                  <option value="fisica">Persona Humana</option>
                  <option value="juridica">Persona Jurídica</option>
                </select>
              </div>
            )}
          </div>
        )}

        {regla === "a_saldo_clientes" && (
          <div>
            <label className="text-xs font-semibold mb-1.5 block">Saldos que se suman</label>
            <div className="flex gap-4 text-sm">
              {["disponible", "retenido"].map((b) => (
                <label key={b} className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={(params.buckets ?? ["disponible", "retenido"]).includes(b)} onChange={() => toggleLista("buckets", b)} />
                  {b === "disponible" ? "Disponible" : "Retenido (bloqueos)"}
                </label>
              ))}
            </div>
          </div>
        )}

        {regla === "a_saldo_cuenta" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1.5 block">Cuenta contable</label>
              <input
                className={`${inputCls} font-mono`}
                list="bcra-cuentas"
                value={params.account_code ?? ""}
                onChange={(e) => set({ account_code: e.target.value })}
              />
              <datalist id="bcra-cuentas">
                <option value="BANCO_BDC">Cuenta recaudadora</option>
                <option value="PAYWAY_A_COBRAR">Liquidaciones pendientes de Payway</option>
              </datalist>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block">Columna aux (parámetro)</label>
              <input className={`${inputCls} font-mono`} value={params.aux_param ?? ""} onChange={(e) => set({ aux_param: e.target.value })} placeholder="bcra_cbu_cuenta_vista" />
            </div>
          </div>
        )}

        {regla === "manual" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1.5 block">Cantidad</label>
              <input className={inputCls} type="number" value={params.cantidad ?? 0} onChange={(e) => set({ cantidad: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block">Monto (vacío = sin monto)</label>
              <input
                className={inputCls}
                type="number"
                value={params.monto_fijo ?? ""}
                onChange={(e) => set({ monto_fijo: e.target.value === "" ? undefined : Number(e.target.value) })}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-5 pt-1 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={activa} onChange={(e) => setActiva(e.target.checked)} /> Activa (se incluye en el archivo)
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={confirmada} onChange={(e) => setConfirmada(e.target.checked)} /> Definición confirmada por Compliance
          </label>
        </div>
      </div>
    </FormDialog>
  );
}
