import { useEffect,useState } from "react";
import { isSupabaseConfigured } from "@/infrastructure/supabase/client";
import {
createReconciliationFile,
listReconciliationsFiles,
} from "@/features/payment-links/reconciliations.supabase";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { DataTable,type Column } from "@/shared/ui/data-table";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { downloadText } from "@/shared/lib/download";
import { Download,Plus } from "lucide-react";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Input,Label } from "@/shared/ui/form-controls";
import { FileDropzone } from "@/shared/ui/file-dropzone";
import { type BlpFile } from "@/features/regulatory-reports/reports.types";
import { blpData } from "@/features/regulatory-reports/reports.rules";
import { BlpNoRequiereModal } from "./reports-parts";
import { BlpAnalysisModal } from "./blp-analysis-modal";

export function ReconciliationsBLP() {
  const [data, setData] = useState<BlpFile[]>(blpData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analysisTarget, setAnalysisTarget] = useState<BlpFile | null>(null);
  const [noRequiere, setNoRequiere] = useState<string | null>(null);
  const [loadForm, setLoadForm] = useState({
    nombre: "",
    fecha: "",
    file: null as File | null,
  });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    listReconciliationsFiles({ page: 0, pageSize: 50, tipo: "blp" })
      .then((res) => {
        if (res.rows.length > 0) {
          setData(
            res.rows.map((r) => ({
              archivo: r.nombreArchivo,
              fecha: r.fechaCarga,
              estado: r.estado as BlpFile["estado"],
            })),
          );
        }
      })
      .catch(() => {});
  }, []);

  const saveFile = async () => {
    if (!loadForm.nombre.trim() || !loadForm.fecha || !loadForm.file) {
      toast.error("Completá nombre, fecha y archivo");
      return;
    }
    const nameFile = loadForm.file.name || loadForm.nombre.trim();
    if (isSupabaseConfigured) {
      setSaving(true);
      try {
        const created = await createReconciliationFile({
          nombreArchivo: nameFile,
          fechaCarga: loadForm.fecha,
          tipo: "blp",
          estado: "Pendiente",
          file: loadForm.file,
        });
        setData((prev) => [
          { archivo: created.nombreArchivo, fecha: created.fechaCarga, estado: "Pendiente" },
          ...prev,
        ]);
        toast.success("Archivo BLP guardado en base de datos");
      } catch (e: unknown) {
        const msg = userMessage(e);
        if (/Could not find the table|PGRST205|does not exist/i.test(msg)) {
          setData((prev) => [
            { archivo: nameFile, fecha: loadForm.fecha, estado: "Pendiente" },
            ...prev,
          ]);
          toast.success("Archivo cargado (modo local: aplicá migración 0016)");
        } else {
          toast.error(`Error al guardar: ${msg}`);
          setSaving(false);
          return;
        }
      } finally {
        setSaving(false);
      }
    } else {
      setData((prev) => [
        { archivo: nameFile, fecha: loadForm.fecha, estado: "Pendiente" },
        ...prev,
      ]);
      toast.success("Archivo cargado correctamente");
    }
    setLoadForm({ nombre: "", fecha: "", file: null });
    setLoading(false);
  };

  const openAnalysis = (r: BlpFile) => {
    if (r.estado === "Presentada" || r.estado === "Liquidada") {
      setAnalysisTarget(r);
    } else {
      setNoRequiere(r.archivo);
    }
  };

  const columns: Column<BlpFile>[] = [
    {
      key: "archivo",
      label: "Nombre del archivo",
      filterable: true,
      render: (r) => <span className="font-mono text-xs">{r.archivo}</span>,
    },
    {
      key: "fecha",
      label: "Fecha",
      filterable: "date",
      render: (r) => <span className="font-mono tabular-nums">{r.fecha}</span>,
    },
    {
      key: "accion",
      label: "Acción",
      render: (r) => (
        <div className="flex items-center gap-1">
          <BtnOutline
            className="h-7 text-xs px-3"
            onClick={() =>
              downloadText(
                r.archivo,
                `Archivo de conciliación BLP: ${r.archivo}\nFecha: ${r.fecha}\nEstado: ${r.estado}`,
              )
            }
          >
            <Download size={14} /> Descargar
          </BtnOutline>
          <BtnOutline className="h-7 text-xs px-3" onClick={() => openAnalysis(r)}>
            Analizar
          </BtnOutline>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <p className="text-sm text-muted-foreground">
          Conciliación de archivos Payway (pagos y liquidaciones) por Link de Pago.
        </p>
        <BtnPrimary type="button" className="h-9 text-sm" onClick={() => setLoading(true)}>
          <Plus size={14} /> Cargar nuevo archivo
        </BtnPrimary>
      </div>

      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.archivo}
        pageSize={10}
        showDownloadButton={false}
      />

      {loading && (
        <FormDialog
          open
          onClose={() => (saving ? null : setLoading(false))}
          title="Cargar nuevo archivo"
          description="Se guarda en la base de datos (tipo BLP)."
          onSubmit={saveFile}
          submitLabel={saving ? "Guardando..." : "Guardar"}
          size="md"
        >
          <div>
            <Label htmlFor="blp-nombre">Nombre del archivo</Label>
            <Input
              id="blp-nombre"
              value={loadForm.nombre}
              onChange={(e) => setLoadForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Liquidada Payway 2026-08.csv"
            />
          </div>
          <div>
            <Label htmlFor="blp-fecha">Fecha</Label>
            <input
              id="blp-fecha"
              type="date"
              value={loadForm.fecha}
              onChange={(e) => setLoadForm((f) => ({ ...f, fecha: e.target.value }))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          <div>
            <Label>Archivo de conciliación BLP</Label>
            <FileDropzone
              accept=".csv,.xlsx,.xls"
              onFile={(f) =>
                setLoadForm((fr) => ({ ...fr, file: f, nombre: f?.name ?? fr.nombre }))
              }
            />
          </div>
        </FormDialog>
      )}

      {noRequiere && (
        <BlpNoRequiereModal archivo={noRequiere} onClose={() => setNoRequiere(null)} />
      )}
      {analysisTarget && (
        <BlpAnalysisModal archivo={analysisTarget} onClose={() => setAnalysisTarget(null)} />
      )}
    </div>
  );
}
