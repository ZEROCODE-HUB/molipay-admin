import { type BcraFile,type BcraFiling } from "@/features/regulatory-reports/bcra.supabase";
import { ActionsDropdown,type ActionItem } from "@/shared/ui/actions-dropdown";
import { AlertTriangle,Download,Eye,Loader2,Wand2 } from "lucide-react";
import { NAME_EN_PACKAGE } from "@/features/regulatory-reports/bcra/files";

export function FileCell({
  archivo: file,
  p,
  cargando: loading,
  generando: generating,
  descargando: downloading,
  onVer,
  onDescargar: onDownload,
  onGenerar: onGenerate,
  actions,
}: {
  archivo: BcraFile;
  p?: BcraFiling;
  cargando: boolean;
  generando: boolean;
  descargando: boolean;
  onVer: () => void;
  onDescargar: () => void;
  onGenerar: () => void;
  actions: ActionItem[];
}) {
  if (loading) return <span className="text-xs text-muted-foreground">…</span>;
  if (generating)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 size={12} className="animate-spin" /> Generando…
      </span>
    );
  if (!p)
    return (
      <div>
        <button
          type="button"
          onClick={onGenerate}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <Wand2 size={14} /> Generar
        </button>
        <div className="mt-0.5 text-[11px] text-muted-foreground">Sin generar</div>
      </div>
    );

  const link =
    "inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline disabled:opacity-50";
  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className={link}
          title={`Descargar ${NAME_EN_PACKAGE[file]}`}
        >
          {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}{" "}
          {file === "I" ? "TXT" : "XLS"}
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
        <span
          className={`h-1.5 w-1.5 rounded-full ${p.estado === "presentado" ? "bg-emerald-500" : "bg-amber-500"}`}
        />
        {p.estado === "presentado" ? "Presentado" : "Generado"}
        {p.version > 1 && <span>· v{p.version}</span>}
        {p.avisos.length > 0 && (
          <span
            className="inline-flex items-center gap-0.5 text-amber-700"
            title={p.avisos.join("\n")}
          >
            · <AlertTriangle size={11} /> {p.avisos.length}
          </span>
        )}
      </div>
    </div>
  );
}
