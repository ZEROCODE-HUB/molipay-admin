import { useEffect, useState } from "react";
import { Upload, X, FileText } from "lucide-react";
import { ModalDialog } from "./modal-dialog";
import { BtnOutline } from "./portal-shell";
import { useAuth } from "@/lib/auth";

export type GestionResultado = "Falso positivo" | "Operación justificada" | "ROS";

export type GestionAlerta = {
  motivo: string;
  analista: string;
  comentarios: string;
  documentos: string[];
  resultado: GestionResultado | "";
  fecha: string;
};

export function AlertaGestionModal({
  open,
  onClose,
  resumen,
  title = "Gestión de alerta",
  onGuardar,
}: {
  open: boolean;
  onClose: () => void;
  resumen: string;
  title?: string;
  onGuardar: (g: GestionAlerta) => void;
}) {
  const { admin } = useAuth();
  const [motivo, setMotivo] = useState("");
  const [comentarios, setComentarios] = useState("");
  const [documentos, setDocumentos] = useState<string[]>([]);
  const [resultado, setResultado] = useState<GestionResultado | "">("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMotivo("");
      setComentarios("");
      setDocumentos([]);
      setResultado("");
      setError(null);
    }
  }, [open]);

  const agregarDocumentos = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const nombres = Array.from(fileList).map((f) => f.name);
    setDocumentos((p) => [...p, ...nombres.filter((n) => !p.includes(n))]);
  };

  const guardar = () => {
    if (!resultado) {
      setError("Debés seleccionar un resultado de la gestión.");
      return;
    }
    onGuardar({
      motivo: motivo.trim(),
      analista: admin?.nombre ?? "",
      comentarios: comentarios.trim(),
      documentos,
      resultado,
      fecha: new Date().toISOString().slice(0, 10),
    });
    onClose();
  };

  const resultadoOptions: GestionResultado[] = ["Falso positivo", "Operación justificada", "ROS"];

  return (
    <ModalDialog open={open} onClose={onClose} title={title} description={resumen} size="lg">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Motivo</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            placeholder="Motivo de la gestión"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">
            Resultado de la gestión
          </label>
          <select
            value={resultado}
            onChange={(e) => setResultado(e.target.value as GestionResultado | "")}
            className="w-full h-9 rounded-md border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-ring/40"
          >
            <option value="">Seleccionar…</option>
            {resultadoOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Comentarios</label>
          <textarea
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            placeholder="Comentarios de la gestión"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">
            Documentos adjuntos
          </label>
          <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-input px-3 text-sm font-medium hover:bg-accent">
            <Upload size={14} /> Adjuntar documento
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                agregarDocumentos(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          {documentos.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {documentos.map((d, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                >
                  <FileText size={14} className="text-muted-foreground shrink-0" />
                  <span className="flex-1 break-all">{d}</span>
                  <button
                    type="button"
                    onClick={() => setDocumentos((p) => p.filter((_, idx) => idx !== i))}
                    className="p-1 rounded hover:bg-red-50 text-red-600 shrink-0"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <BtnOutline type="button" onClick={onClose}>
            Cancelar
          </BtnOutline>
          <button
            type="button"
            onClick={guardar}
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Guardar
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
