import { useQuery,useQueryClient } from "@tanstack/react-query";
import {
QK_FILINGS,
generateFiling,
getFiling,
listFilings,
listItemsFiling,
listSircupaRows,
type Filing,
type ItemFiling,
} from "@/features/taxes/iibb-reports.supabase";
import { useMemo,useState } from "react";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { createZip } from "@/shared/lib/zip-store";
import { Badge } from "@/shared/ui/badge";
import { DataTable,type Column } from "@/shared/ui/data-table";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Download,FileText,Plus } from "lucide-react";
import { Input } from "@/shared/ui/form-controls";
import {
TIERS,
contentCsv,
contentTxt,
date,
download,
filedTxt,
fmtCreacion,
latin1,
monthEnCurso,
nameBase,
paidTxt,
selectCls,
sircupaMissing,
tierLabel,
todayAr,
versionTxt,
} from "@/features/taxes/tax-reports.rules";
import { DetailReport } from "./detail-report";
import { GenerateReportDialog } from "./generate-report-dialog";

// ---------------------------------------------------------------------------

export function ReportsTaxes({ puedeEditar: canEdit }: { puedeEditar: boolean }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: QK_FILINGS, queryFn: () => listFilings() });
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const [detail, setDetail] = useState<string | null>(null);
  const [generate, setGenerate] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [delivering, setDelivering] = useState(false);
  const [period, setPeriod] = useState(monthEnCurso);
  const [fFile, setFFile] = useState("");
  const [fTier, setFTier] = useState("");
  const [fVersion, setFVersion] = useState("");
  const [fFiled, setFFiled] = useState("");
  const [fPaid, setFPaid] = useState("");

  const refresh = () => void qc.invalidateQueries({ queryKey: QK_FILINGS });

  const visibles = useMemo(
    () =>
      rows
        .filter((r) => !period.trim() || r.periodo.includes(period.trim()))
        .filter((r) => !fFile || r.archivo === fFile)
        .filter((r) => !fTier || String(r.tramo) === fTier)
        .filter((r) => !fVersion || (fVersion === "vigente" ? r.vigente : !r.vigente))
        .filter((r) => !fFiled || filedTxt(r) === fFiled)
        .filter((r) => !fPaid || paidTxt(r) === fPaid),
    [rows, period, fFile, fTier, fVersion, fFiled, fPaid],
  );

  const whileDownloading = async (r: Filing, fn: () => Promise<void>) => {
    setDownloading(r.id);
    try {
      await fn();
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setDownloading(null);
    }
  };

  const txtBytes = async (r: Filing) => {
    const sircupaRows = r.registros > 0 ? await listSircupaRows(r.id) : [];
    const missing = sircupaMissing(sircupaRows);
    if (missing.length) toast.warning(`Revisá el archivo: ${missing.join(", ")}.`);
    return latin1(contentTxt(r, sircupaRows));
  };
  const items = (r: Filing) => (r.registros > 0 ? listItemsFiling(r.id) : Promise.resolve([]));

  const downloadTxt = async (r: Filing) =>
    download(
      `${nameBase(r)}.txt`,
      new Blob([await txtBytes(r)], { type: "text/plain;charset=iso-8859-1" }),
    );
  const downloadCsv = async (r: Filing) =>
    download(
      `${nameBase(r)}-detalle.csv`,
      new Blob([contentCsv(r, await items(r))], { type: "text/csv;charset=utf-8" }),
    );

  const txt = (r: Filing) => whileDownloading(r, () => downloadTxt(r));
  const zip = (r: Filing) =>
    whileDownloading(r, async () => {
      const [content, detail] = await Promise.all([txtBytes(r), items(r)]);
      download(
        `${nameBase(r)}.zip`,
        createZip([
          { nombre: `${nameBase(r)}.txt`, contenido: content },
          { nombre: `${nameBase(r)}-detalle.csv`, contenido: contentCsv(r, detail) },
        ]),
      );
    });

  // Con permiso se regenera: si no cambio nada devuelve la misma version.
  const filingOfSelection = async (): Promise<Filing | null> => {
    const tier = Number(fTier) as 1 | 2 | 3;
    const before = rows.find((r) => r.periodo === period && r.tramo === tier && r.vigente);
    if (!canEdit) {
      if (!before) toast.error("Todavía no hay un reporte de este tramo.");
      return before ?? null;
    }
    const filing = await getFiling(await generateFiling(period, tier));
    refresh();
    if (before && before.id !== filing.id) {
      toast.info(
        before.presentadoAt
          ? `El tramo cambió: se generó la v${filing.version} y reemplazó a la versión presentada.`
          : `El tramo cambió: se generó la v${filing.version}.`,
      );
    }
    return filing;
  };

  const deliver = async (fn: (r: Filing) => Promise<void>) => {
    setDelivering(true);
    try {
      const filing = await filingOfSelection();
      if (!filing) return;
      if (filing.archivo === "Sin archivo") {
        toast.info("El tramo no tiene operaciones: no hay archivo para descargar.");
        return;
      }
      await fn(filing);
      if (filing.hasta >= todayAr()) {
        toast.warning("El tramo todavía no cerró: el archivo puede cambiar.");
      }
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setDelivering(false);
    }
  };

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
    const lines = visibles.map((r) =>
      [
        r.periodo,
        r.impuestoCodigo,
        r.archivo,
        tierLabel(r.tramo),
        versionTxt(r),
        r.registros,
        r.totalRetenido.toFixed(2),
        date(r.vencimiento),
        fmtCreacion(r.generadoAt),
        filedTxt(r),
        paidTxt(r),
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(";"),
    );
    download(
      "reportes-iibb.csv",
      new Blob(["﻿" + [cab.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" }),
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

  const columns: Column<Filing>[] = [
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
    { key: "tramo", label: "Tramo", render: (r) => tierLabel(r.tramo) },
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
    { key: "presentado", label: "Presentado", render: (r) => siNo(filedTxt(r)) },
  ];

  const sel = rows.find((f) => f.id === detail) ?? null;
  const hayFilters = period || fFile || fTier || fVersion || fFiled || fPaid;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-display font-semibold text-base">Reportes de impuestos</h3>
          <p className="text-sm text-muted-foreground">
            Registro de presentaciones por período y tramo
          </p>
        </div>
        <BtnPrimary onClick={() => setGenerate(true)} disabled={!canEdit}>
          <Plus size={14} /> Generar reporte
        </BtnPrimary>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Ingresos Brutos se rinde en 3 tramos por mes (1-10, 11-20, 21-fin), con vencimiento al 3.er
        día hábil posterior al cierre. Lo retenido no es ingreso de MoliPay: se acumula para
        rendirlo al fisco.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Input
          type="month"
          className="w-44"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          aria-label="Período"
        />
        <select
          className={selectCls}
          value={fFile}
          onChange={(e) => setFFile(e.target.value)}
          aria-label="Archivo"
        >
          <option value="">Todos los archivos</option>
          <option value="Movimientos">Movimientos</option>
          <option value="Sin archivo">Sin archivo</option>
        </select>
        <select
          className={selectCls}
          value={fTier}
          onChange={(e) => setFTier(e.target.value)}
          aria-label="Tramo"
        >
          <option value="">Todos los tramos</option>
          {TIERS.map((t) => (
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
          value={fFiled}
          onChange={(e) => setFFiled(e.target.value)}
          aria-label="Presentado"
        >
          <option value="">Presentado: todos</option>
          <option value="Sí">Presentado: sí</option>
          <option value="No">Presentado: no</option>
        </select>
        <select
          className={selectCls}
          value={fPaid}
          onChange={(e) => setFPaid(e.target.value)}
          aria-label="Pagado"
        >
          <option value="">Pagado: todos</option>
          <option value="Sí">Pagado: sí</option>
          <option value="No">Pagado: no</option>
          <option value="N/A">Pagado: N/A</option>
        </select>
        <BtnPrimary
          onClick={() => void deliver(downloadTxt)}
          disabled={!period || !fTier || delivering}
          title={period && fTier ? undefined : "Elegí período y tramo"}
        >
          <FileText size={14} /> Descargar TXT
        </BtnPrimary>
        <BtnOutline
          onClick={() => void deliver(downloadCsv)}
          disabled={!period || !fTier || delivering}
          title={period && fTier ? undefined : "Elegí período y tramo"}
        >
          <Download size={14} /> Exportar Excel / CSV
        </BtnOutline>
        <BtnOutline onClick={exportar} disabled={visibles.length === 0}>
          <Download size={14} /> Exportar listado
        </BtnOutline>
        {hayFilters && (
          <button
            type="button"
            className="text-xs font-semibold text-primary hover:underline"
            onClick={() => {
              setPeriod("");
              setFFile("");
              setFTier("");
              setFVersion("");
              setFFiled("");
              setFPaid("");
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {query.isError ? (
        <p className="text-sm text-red-700 border border-red-200 bg-red-50 rounded px-3 py-2">
          {userMessage(query.error)}
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
              <button type="button" className="hover:underline" onClick={() => setDetail(r.id)}>
                Ver
              </button>
              <button
                type="button"
                className="hover:underline disabled:opacity-50"
                disabled={downloading === r.id || r.archivo === "Sin archivo"}
                onClick={() => txt(r)}
              >
                TXT
              </button>
              <button
                type="button"
                className="hover:underline disabled:opacity-50"
                disabled={downloading === r.id}
                onClick={() => zip(r)}
              >
                ZIP
              </button>
            </div>
          )}
        />
      )}
      {sel && (
        <DetailReport
          r={sel}
          puedeEditar={canEdit}
          onClose={() => setDetail(null)}
          onCambio={refresh}
        />
      )}
      {generate && <GenerateReportDialog onClose={() => setGenerate(false)} onGenerado={refresh} />}
    </>
  );
}
