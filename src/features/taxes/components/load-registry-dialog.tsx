import { useQueryClient } from "@tanstack/react-query";
import { useRef,useState } from "react";
import {
QK_REGISTRIES,
confirmRegistry,
descartarRegistry,
loadRegistryIibb,
type ProgressCarga,
type RegistryIibb,
} from "@/features/taxes/iibb-registry.supabase";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { CheckCircle2,Download,Loader2 } from "lucide-react";
import { Input,Label } from "@/shared/ui/form-controls";
import { FileDropzone } from "@/shared/ui/file-dropzone";
import { TaxModal } from "./tax-modal";
import { downloadErrors,n } from "@/features/taxes/iibb-registry.rules";
import { SummaryRegistry } from "./summary-registry";

// ---------------------------------------------------------------------------
// Carga: formulario -> lectura con progreso -> resumen -> confirmar
// ---------------------------------------------------------------------------

export function LoadRegistryDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [prueba, setPrueba] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressCarga | null>(null);
  const [borrador, setBorrador] = useState<RegistryIibb | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: QK_REGISTRIES });

  const start = async () => {
    if (!name.trim() || !file)
      return setFormError("Completá el nombre del padrón y seleccioná el archivo.");
    if (!/\.txt$/i.test(file.name)) return setFormError("El archivo debe ser .txt.");
    setFormError(null);
    abort.current = new AbortController();
    setProgress({ etapa: "leyendo", progreso: 0, validas: 0, errores: 0 });
    try {
      const { padron: registry } = await loadRegistryIibb(
        { nombre: name, file, prueba },
        setProgress,
        abort.current.signal,
      );
      setBorrador(registry);
    } catch (e) {
      toast.error(userMessage(e));
      setProgress(null);
    } finally {
      void refresh();
    }
  };

  const confirm = async () => {
    if (!borrador) return;
    setTrabajando(true);
    try {
      const r = await confirmRegistry(borrador.id);
      toast.success(
        r.reemplazado
          ? `Padrón ${borrador.periodo} vigente. El anterior quedó como Reemplazado.`
          : `Padrón ${borrador.periodo} vigente.`,
      );
      void refresh();
      onClose();
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setTrabajando(false);
    }
  };

  const descartar = async () => {
    if (!borrador) return onClose();
    setTrabajando(true);
    try {
      await descartarRegistry(borrador.id);
      toast.success("Borrador descartado.");
      void refresh();
      onClose();
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setTrabajando(false);
    }
  };

  // Paso 3: resumen del borrador
  if (borrador) {
    return (
      <TaxModal
        title="Vista previa del padrón"
        subtitle={`${borrador.nombre} · ${borrador.organismo} · ${borrador.archivo}`}
        footer={
          <>
            <BtnOutline
              onClick={() => void downloadErrors(borrador)}
              disabled={borrador.filasError === 0}
            >
              <Download size={14} /> Errores
            </BtnOutline>
            <BtnOutline onClick={() => void descartar()} disabled={trabajando}>
              Descartar
            </BtnOutline>
            <BtnPrimary onClick={() => void confirm()} disabled={trabajando}>
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
        <SummaryRegistry p={borrador} />
      </TaxModal>
    );
  }

  // Paso 2: lectura en curso
  if (progress) {
    return (
      <TaxModal title="Cargando padrón" subtitle={file?.name}>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 size={16} className="animate-spin" />
            {progress.etapa === "leyendo"
              ? "Leyendo y validando el archivo…"
              : "Calculando el resumen contra los clientes de MoliPay…"}
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress.progreso}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground font-mono">
            <span>{progress.progreso}%</span>
            <span>
              {n(progress.validas)} filas enviadas · {n(progress.errores)} con error
            </span>
          </div>
          {progress.etapa === "leyendo" && (
            <div className="flex justify-end pt-2">
              <BtnOutline onClick={() => abort.current?.abort()}>Cancelar</BtnOutline>
            </div>
          )}
        </div>
      </TaxModal>
    );
  }

  // Paso 1: formulario
  return (
    <TaxModal
      title="Cargar padrón de Ingresos Brutos"
      subtitle="El archivo se valida y se muestra un resumen antes de dejarlo vigente."
      onClose={onClose}
      footer={
        <>
          <BtnOutline onClick={onClose}>Cancelar</BtnOutline>
          <BtnPrimary onClick={() => void start()}>Procesar archivo</BtnPrimary>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="ib-nombre">Nombre del padrón</Label>
          <Input
            id="ib-nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: SIRCUPA agosto 2026"
          />
        </div>
        <div>
          <Label>Archivo (.txt)</Label>
          <FileDropzone
            onFile={(f) => {
              setFile(f);
              // El TXT de prueba se descarga como padron-prueba-...: se marca solo.
              if (f && /^padron-prueba-/i.test(f.name)) setPrueba(true);
            }}
            accept=".txt"
          />
          <label className="mt-2 flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={prueba}
              onChange={(e) => setPrueba(e.target.checked)}
            />
            <span>
              <span className="font-semibold">Archivo de prueba</span>: acepta CUIT de 11 dígitos
              aunque el dígito verificador no cierre (clientes de test). No usar con padrones
              reales.
            </span>
          </label>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Formato SIRCUPA separado por “;”: CUIT; razón social; jurisdicción; período (AAAAMM);
            CRC; letra de alícuota. Ejemplo: 20000033481;PERROTTA CAYETANO;908;202209;89;Q
          </p>
        </div>
        {formError && <p className="text-sm text-red-600">{formError}</p>}
      </div>
    </TaxModal>
  );
}
