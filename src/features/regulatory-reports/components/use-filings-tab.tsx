import { useQuery,useQueryClient } from "@tanstack/react-query";
import { useMemo,useState } from "react";
import {
BCRA_FILES,
BCRA_FILE_LABEL,
generateFile,
getRowsFiling,
listFilings,
readParametersBcra,
saveRegistry,
type BcraFile,
type BcraFiling,
} from "@/features/regulatory-reports/bcra.supabase";
import { generateRegistry } from "@/features/regulatory-reports/bcra/registry";
import { toast } from "sonner";
import {
NAME_EN_PACKAGE,
downloadFile,
downloadPackage,
namePackage,
} from "@/features/regulatory-reports/bcra/files";
import { type ActionItem } from "@/shared/ui/actions-dropdown";
import { Download,Eye,Pencil,RefreshCw,Send,Wand2 } from "lucide-react";
import { type Column } from "@/shared/ui/data-table";
import { Badge } from "@/shared/ui/badge";
import {
HELP_DATE,
HELP_FILE,
HELP_STATUS,
QK,
STATUSES_PERIOD,
cortoPeriod,
errMsg,
labelPeriod,
lastsPeriods,
} from "@/features/regulatory-reports/bcra-reports.rules";
import { type StatusPeriod } from "@/features/regulatory-reports/bcra-reports.types";
import { FileCell } from "./file-cell";
import { ControlCell } from "./bcra-reports-parts";

/** Estado y acciones de FilingsTab: el componente solo dibuja. */
export function useFilingsTab() {
  const queryClient = useQueryClient();
  const periods = useMemo(() => lastsPeriods(12), []);
  const from = periods[periods.length - 1];
  const to = periods[0];

  const [month, setMonth] = useState(periods[1].slice(0, 7));
  const [filter, setFilter] = useState<string | null>(null);
  const [qFrom, qTo] = filter ? [filter, filter] : [from, to];
  const presQ = useQuery({
    queryKey: [...QK, "presentaciones", qFrom, qTo],
    queryFn: () => listFilings(qFrom, qTo),
  });
  const paramsQ = useQuery({ queryKey: [...QK, "parametros"], queryFn: readParametersBcra });

  const byKey = useMemo(() => {
    const m = new Map<string, BcraFiling>();
    for (const p of presQ.data ?? []) m.set(`${p.periodo}|${p.archivo}`, p);
    return m;
  }, [presQ.data]);
  const search = (period: string, file: BcraFile) => byKey.get(`${period}|${file}`);

  const [busy, setBusy] = useState<string | null>(null);
  const [ver, setVer] = useState<BcraFiling | null>(null);
  const [corregir, setCorregir] = useState<BcraFiling | null>(null);
  const [presentar, setPresentar] = useState<BcraFiling | null>(null);
  const [rectificar, setRectificar] = useState<BcraFiling | null>(null);
  const [zipPeriod, setZipPeriod] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: QK });

  /** Genera un archivo; el padrón se arma en el admin y se guarda como foto. */
  const generateUno = async (period: string, file: BcraFile) => {
    if (file === "P") {
      const res = await generateRegistry();
      const notices: string[] = [];
      if (res.sinCodigoPostal > 0)
        notices.push(
          `${res.sinCodigoPostal} cliente(s) sin código postal: la celda queda en blanco. Completalo en la ficha antes de presentar.`,
        );
      for (const i of res.invalidos)
        notices.push(`Excluido ${i.cuit ?? "sin CUIT"} (${i.nombre ?? "—"}): ${i.motivo}`);
      if (res.filas.length === 0)
        notices.push("No hay clientes Persona Jurídica activos para informar.");
      await saveRegistry(period, res.filas, notices);
    } else {
      await generateFile(period, file);
    }
  };

  const generate = async (period: string, file: BcraFile) => {
    setBusy(`${period}|${file}`);
    try {
      await generateUno(period, file);
      toast.success(`${BCRA_FILE_LABEL[file]} de ${labelPeriod(period)} generado.`);
      await refresh();
    } catch (e) {
      toast.error(`No se pudo generar: ${errMsg(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const generateFaltantes = async (period: string) => {
    const faltan = BCRA_FILES.filter((a) => !search(period, a));
    if (faltan.length === 0) {
      toast.info(`${labelPeriod(period)} ya tiene los cuatro archivos generados.`);
      return;
    }
    setBusy("faltantes");
    const errors: string[] = [];
    for (const a of faltan) {
      try {
        await generateUno(period, a);
      } catch (e) {
        errors.push(`${BCRA_FILE_LABEL[a]}: ${errMsg(e)}`);
      }
    }
    setBusy(null);
    await refresh();
    if (errors.length) toast.error(`Algunos archivos no se generaron. ${errors.join(" · ")}`);
    else
      toast.success(
        `${labelPeriod(period)}: se generaron ${faltan.map((a) => BCRA_FILE_LABEL[a]).join(", ")}.`,
      );
  };

  const download = async (p: BcraFiling) => {
    setBusy(`${p.periodo}|${p.archivo}|dl`);
    try {
      downloadFile(p.periodo, p.archivo, await getRowsFiling(p.id));
    } catch (e) {
      toast.error(`No se pudo descargar: ${errMsg(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const cuit = paramsQ.data?.bcra_cuit_entidad ?? "";

  /** Valida y abre la confirmación del paquete. */
  const pedirPackage = (period: string) => {
    const faltan = BCRA_FILES.filter((a) => !search(period, a));
    if (faltan.length) {
      toast.error(`Faltan generar: ${faltan.map((a) => BCRA_FILE_LABEL[a]).join(", ")}.`);
      return;
    }
    if (!/^\d{11}$/.test(cuit)) {
      toast.error(
        "Cargá el CUIT de la entidad en Partidas y parámetros antes de armar el paquete.",
      );
      return;
    }
    setZipPeriod(period);
  };

  const bajarPackage = async (period: string) => {
    try {
      const files = await Promise.all(
        BCRA_FILES.map(async (a) => ({
          archivo: a,
          filas: await getRowsFiling(search(period, a)!.id),
        })),
      );
      downloadPackage(cuit, period, files);
      toast.success(`Paquete ${namePackage(cuit, period)} descargado.`);
      setZipPeriod(null);
    } catch (e) {
      toast.error(`No se pudo armar el paquete: ${errMsg(e)}`);
    }
  };

  const actions = (period: string, file: BcraFile, p: BcraFiling | undefined): ActionItem[] => {
    if (!p) return [{ label: "Generar", icon: Wand2, onClick: () => void generate(period, file) }];
    return [
      { label: "Vista previa", icon: Eye, onClick: () => setVer(p) },
      {
        label: `Descargar ${NAME_EN_PACKAGE[file]}`,
        icon: Download,
        onClick: () => void download(p),
      },
      {
        label: "Corregir",
        icon: Pencil,
        disabled: p.estado === "presentado",
        onClick: () => setCorregir(p),
      },
      {
        label: p.estado === "presentado" ? "Regenerar (rectificativa)" : "Regenerar",
        icon: RefreshCw,
        onClick: () =>
          p.estado === "presentado" || p.correcciones > 0
            ? setRectificar(p)
            : void generate(period, file),
      },
      {
        label: "Marcar presentado",
        icon: Send,
        disabled: p.estado === "presentado",
        onClick: () => setPresentar(p),
      },
    ];
  };

  const monthAnterior = periods[1];
  const faltantesAnterior = BCRA_FILES.filter((a) => !search(monthAnterior, a)).length;
  // Campos planos para que funcionen los filtros de la tabla (búsqueda, rango de fechas y estado).
  type RowPeriod = { periodo: string; fecha: string; mesNombre: string; estado: StatusPeriod };
  const rows: RowPeriod[] = (filter ? [filter] : periods).map((period) => {
    const ps = BCRA_FILES.map((a) => search(period, a));
    const generados = ps.filter(Boolean).length;
    const status: StatusPeriod =
      generados === 0
        ? "Sin generar"
        : generados < 4
          ? "Incompleto"
          : ps.every((x) => x?.estado === "presentado")
            ? "Presentado"
            : "Completo";
    return {
      periodo: period,
      fecha: `01/${cortoPeriod(period)}`,
      mesNombre: labelPeriod(period),
      estado: status,
    };
  });

  const applySearch = () => {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      toast.error("Elegí un mes.");
      return;
    }
    if (`${month}-01` > periods[0]) {
      toast.error("No se puede consultar un período futuro.");
      return;
    }
    setFilter(`${month}-01`);
  };

  const columns: Column<RowPeriod>[] = [
    {
      key: "mesNombre",
      label: "Período",
      hint: "Mes que se informa al BCRA. Podés buscarlo por nombre o número (ej. septiembre, 09/2026).",
      filterable: true,
      minWidth: 140,
      render: (r) => <span className="font-semibold">{r.mesNombre}</span>,
    },
    ...BCRA_FILES.map(
      (a): Column<RowPeriod> => ({
        key: a,
        label: BCRA_FILE_LABEL[a],
        hint: HELP_FILE[a],
        minWidth: 150,
        render: (r) => {
          const p = search(r.periodo, a);
          return (
            <FileCell
              archivo={a}
              p={p}
              cargando={presQ.isLoading}
              generando={busy === `${r.periodo}|${a}`}
              descargando={busy === `${r.periodo}|${a}|dl`}
              onVer={() => p && setVer(p)}
              onDescargar={() => p && void download(p)}
              onGenerar={() => void generate(r.periodo, a)}
              actions={actions(r.periodo, a, p).filter(
                (x) => x.icon !== Eye && x.icon !== Download,
              )}
            />
          );
        },
      }),
    ),
    {
      key: "fecha",
      label: "Fecha",
      hint: HELP_DATE,
      filterable: "date",
      minWidth: 130,
      render: (r) => (
        <div>
          <span className="font-mono text-xs tabular-nums">{r.fecha}</span>
          {r.periodo === periods[0] && (
            <span className="ml-1.5 text-[10px] text-muted-foreground">en curso</span>
          )}
          <div className="mt-0.5">
            <ControlCell control={search(r.periodo, "A")?.totales.control} />
          </div>
        </div>
      ),
    },
    {
      key: "estado",
      label: "Estado",
      hint: HELP_STATUS,
      filterable: "enum",
      filterOptions: STATUSES_PERIOD,
      minWidth: 120,
      render: (r) => (
        <Badge
          tone={
            r.estado === "Presentado" ? "success" : r.estado === "Completo" ? "neutral" : "warn"
          }
        >
          {r.estado}
        </Badge>
      ),
    },
  ];
  return {
    periods,
    from,
    month,
    setMonth,
    filter,
    setFilter,
    presQ,
    search,
    busy,
    ver,
    setVer,
    corregir,
    setCorregir,
    presentar,
    setPresentar,
    rectificar,
    setRectificar,
    zipPeriod,
    setZipPeriod,
    refresh,
    generate,
    generateFaltantes,
    download,
    cuit,
    pedirPackage,
    bajarPackage,
    actions,
    monthAnterior,
    faltantesAnterior,
    rows,
    applySearch,
    columns,
  };
}

export type FilingsTabVm = ReturnType<typeof useFilingsTab>;
