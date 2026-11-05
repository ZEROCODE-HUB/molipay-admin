import { useEffect,useState } from "react";
import { isSupabaseConfigured } from "@/infrastructure/supabase/client";
import {
createReconciliationFile,
listReconciliationsFiles,
} from "@/features/payment-links/reconciliations.supabase";
import { toast } from "sonner";
import { parseBankFile } from "@/features/payment-links/reconciliation/parse";
import { userMessage } from "@/shared/lib/errors";
import { DataTable,type Column } from "@/shared/ui/data-table";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { downloadXlsx } from "@/shared/lib/download";
import { Download,Plus } from "lucide-react";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Input,Label } from "@/shared/ui/form-controls";
import { FileDropzone } from "@/shared/ui/file-dropzone";
import { type Archivo } from "@/features/regulatory-reports/reports.types";
import { FILES_INITIALS } from "@/features/regulatory-reports/reports.rules";
import { AnalysisReconciliationModal } from "./analysis-reconciliation-modal";

export function Reconciliations() {
  const [files, setFiles] = useState<Archivo[]>(FILES_INITIALS);
  const [analysisTarget, setAnalysisTarget] = useState<Archivo | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    nombre: "",
    fecha: "",
    file: null as File | null,
  });

  // Carga inicial desde Supabase si está configurado - cada fila refleja DB
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    listReconciliationsFiles({ page: 0, pageSize: 50, tipo: "bancaria" })
      .then((res) => {
        if (res.rows.length > 0) {
          setFiles(
            res.rows.map((r) => ({
              archivo: r.nombreArchivo,
              fecha: r.fechaCarga,
              estado: (r.estado === "Analizado" ? "Analizado" : "Pendiente") as Archivo["estado"],
              downloadRows: [],
              storagePath: r.storagePath,
              bankRows: undefined,
              rawFile: null,
            })),
          );
        }
      })
      .catch(() => {
        // fallback a mocks si RLS/migración aún no aplicada
      });
  }, []);

  const saveFile = async () => {
    if (!uploadForm.nombre.trim() || !uploadForm.fecha || !uploadForm.file) {
      toast.error("Completá nombre, fecha y archivo");
      return;
    }
    const nameFile = uploadForm.file.name || uploadForm.nombre.trim();
    // Parsear localmente para tener bankRows listos para Analizar (mapeo real aunque falle Supabase)
    let parsed: import("@/features/payment-links/reconciliation/parse").BankRow[] = [];
    let downloadRows: Record<string, unknown>[] = [];
    try {
      parsed = await parseBankFile(uploadForm.file);
      downloadRows = parsed.map((b) => ({ ...b.raw, IMPORTE_COELSA: b.importeCoelsa })) as Record<
        string,
        unknown
      >[];
      toast.success(`Parseado: ${parsed.length} filas (mapeo ID_DEBIN→id_txn)`);
    } catch (e: unknown) {
      const msg = userMessage(e);
      toast.error(`Error parseando archivo: ${msg}`);
      return;
    }
    // Persistencia real si hay Supabase
    if (isSupabaseConfigured) {
      setSaving(true);
      try {
        const created = await createReconciliationFile({
          nombreArchivo: nameFile,
          fechaCarga: uploadForm.fecha,
          tipo: "bancaria",
          estado: "Pendiente",
          file: uploadForm.file,
        });
        setFiles((prev) => [
          {
            archivo: created.nombreArchivo,
            fecha: created.fechaCarga,
            estado: "Pendiente",
            downloadRows,
            bankRows: parsed,
            rawFile: uploadForm.file,
            storagePath: created.storagePath,
          },
          ...prev,
        ]);
        toast.success("Archivo guardado en base de datos");
      } catch (e: unknown) {
        const msg = userMessage(e);
        if (/Could not find the table|PGRST205|does not exist/i.test(msg)) {
          setFiles((prev) => [
            {
              archivo: nameFile,
              fecha: uploadForm.fecha,
              estado: "Pendiente",
              downloadRows,
              bankRows: parsed,
              rawFile: uploadForm.file,
            },
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
      setFiles((prev) => [
        {
          archivo: nameFile,
          fecha: uploadForm.fecha,
          estado: "Pendiente",
          downloadRows,
          bankRows: parsed,
          rawFile: uploadForm.file,
        },
        ...prev,
      ]);
      toast.success("Archivo cargado correctamente");
    }
    setUploadForm({ nombre: "", fecha: "", file: null });
    setLoading(false);
  };

  const columns: Column<Archivo>[] = [
    {
      key: "archivo",
      label: "Archivo",
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
      key: "analizar",
      label: "Acción",
      render: (r) => (
        <div className="flex items-center gap-1">
          <BtnOutline
            className="h-7 text-xs px-3"
            onClick={() => {
              downloadXlsx(r.archivo.replace(".csv", ".xlsx"), r.downloadRows);
              toast.success("Archivo descargado correctamente");
            }}
          >
            <Download size={14} /> Descargar
          </BtnOutline>
          <BtnOutline className="h-7 text-xs px-3" onClick={() => setAnalysisTarget(r)}>
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
          El banco sube diariamente (día anterior) todas las transacciones.
        </p>
        <BtnPrimary type="button" className="h-9 text-sm" onClick={() => setLoading(true)}>
          <Plus size={14} /> Cargar CSV
        </BtnPrimary>
      </div>
      <DataTable columns={columns} data={files} keyExtractor={(r) => r.archivo} />

      {analysisTarget && (
        <AnalysisReconciliationModal
          archivo={analysisTarget}
          allArchivos={files}
          onClose={() => setAnalysisTarget(null)}
        />
      )}

      {loading && (
        <FormDialog
          open
          onClose={() => (saving ? null : setLoading(false))}
          title="Cargar archivo de conciliación"
          description="Ingresá el nombre, la fecha de carga y el archivo CSV. Se guarda en la base de datos."
          onSubmit={saveFile}
          submitLabel={saving ? "Guardando..." : "Guardar"}
          cancelLabel="Cancelar"
          size="md"
        >
          <div>
            <Label htmlFor="conc-nombre">Nombre del archivo</Label>
            <Input
              id="conc-nombre"
              value={uploadForm.nombre}
              onChange={(e) => setUploadForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="conciliacion_20260801.csv"
            />
          </div>
          <div>
            <Label htmlFor="conc-fecha">Fecha de carga</Label>
            <input
              id="conc-fecha"
              type="date"
              value={uploadForm.fecha}
              onChange={(e) => setUploadForm((f) => ({ ...f, fecha: e.target.value }))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          <div>
            <Label>Archivo CSV</Label>
            <FileDropzone
              accept=".csv,.xlsx,.xls"
              onFile={(f) =>
                setUploadForm((fr) => ({ ...fr, file: f, nombre: f?.name ?? fr.nombre }))
              }
            />
          </div>
        </FormDialog>
      )}
    </div>
  );
}
