import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Send, UserCheck, Loader2, FileText, Info } from "lucide-react";
import { toast } from "sonner";
import {
  ALERT_ATTACHMENT_ACCEPT,
  ALERT_ATTACHMENT_MAX_BYTES,
  addAlertComment,
  assignAlert,
  getAlertAttachmentUrl,
  listAlertAttachments,
  listAlertComments,
  listAnalysts,
  uploadAlertAttachment,
  type AlertAttachment,
  type AlertItem,
} from "@/lib/api/compliance";

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const fmtTamano = (b: number | null) =>
  b == null ? "" : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

export const useAnalysts = () => useQuery({ queryKey: ["analysts"], queryFn: listAnalysts, staleTime: 5 * 60_000 });

/** Analista responsable + historial de análisis (comentarios, eventos y documentación). */
export function AlertaGestionPanel({ alert, onChanged }: { alert: AlertItem; onChanged: () => void }) {
  const queryClient = useQueryClient();
  const abierta = alert.status === "pending" || alert.status === "in_review";

  const analistas = useAnalysts();
  const comentarios = useQuery({ queryKey: ["alert_comments", alert.id], queryFn: () => listAlertComments(alert.id) });
  const adjuntos = useQuery({ queryKey: ["alert_attachments", alert.id], queryFn: () => listAlertAttachments(alert.id) });

  const [analista, setAnalista] = useState(alert.assignedTo ?? "");
  const [asignando, setAsignando] = useState(false);
  const [texto, setTexto] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refrescarHistorial = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["alert_comments", alert.id] }),
      queryClient.invalidateQueries({ queryKey: ["alert_attachments", alert.id] }),
    ]);

  const asignar = async () => {
    if (!analista || analista === alert.assignedTo) return;
    setAsignando(true);
    try {
      await assignAlert(alert.id, analista);
      toast.success("Analista asignado");
      await refrescarHistorial();
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAsignando(false);
    }
  };

  const elegirArchivos = (list: FileList | null) => {
    const nuevos = Array.from(list ?? []);
    const grandes = nuevos.filter((f) => f.size > ALERT_ATTACHMENT_MAX_BYTES);
    if (grandes.length) toast.error(`Superan los 10 MB: ${grandes.map((f) => f.name).join(", ")}`);
    setArchivos((prev) => [...prev, ...nuevos.filter((f) => f.size <= ALERT_ATTACHMENT_MAX_BYTES)]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const enviar = async () => {
    if (!texto.trim() && archivos.length === 0) return;
    setEnviando(true);
    try {
      const commentId = texto.trim() ? await addAlertComment(alert.id, texto.trim()) : null;
      const fallidos: string[] = [];
      for (const f of archivos) {
        try {
          await uploadAlertAttachment(alert.id, f, commentId);
        } catch (e) {
          fallidos.push(`${f.name} (${(e as Error).message})`);
        }
      }
      if (fallidos.length) toast.error(`No se pudieron adjuntar: ${fallidos.join("; ")}`);
      else toast.success(commentId ? "Comentario registrado" : "Documentación adjuntada");
      setTexto("");
      setArchivos([]);
      await refrescarHistorial();
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const descargar = async (a: AlertAttachment) => {
    try {
      window.open(await getAlertAttachmentUrl(a.path), "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(`No se pudo abrir el archivo: ${(e as Error).message}`);
    }
  };

  const adjuntosDe = (commentId: string | null) => (adjuntos.data ?? []).filter((a) => a.commentId === commentId);
  const sueltos = adjuntosDe(null);

  return (
    <div className="mt-4 space-y-4 border-t pt-4">
      <div>
        <div className="text-xs font-semibold text-foreground mb-1.5">Analista responsable</div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={analista}
            onChange={(e) => setAnalista(e.target.value)}
            disabled={!abierta || analistas.isLoading}
            className="h-9 min-w-[240px] rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60"
          >
            <option value="">{alert.assignedTo ? "Elegí un analista…" : "Sin asignar"}</option>
            {(analistas.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>{a.nombre} · {a.email}</option>
            ))}
          </select>
          {abierta && (
            <button
              type="button"
              onClick={() => void asignar()}
              disabled={asignando || !analista || analista === alert.assignedTo}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input text-sm hover:bg-accent disabled:opacity-50"
            >
              {asignando ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
              {alert.assignedTo ? "Reasignar" : "Asignar"}
            </button>
          )}
          {alert.assignedAt && <span className="text-[11px] text-muted-foreground">desde {fmtFecha(alert.assignedAt)}</span>}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-foreground mb-1.5">Análisis y documentación respaldatoria</div>
        {comentarios.isLoading || adjuntos.isLoading ? (
          <div className="flex items-center text-xs text-muted-foreground py-2"><Loader2 size={12} className="animate-spin mr-1.5" /> Cargando historial…</div>
        ) : comentarios.isError || adjuntos.isError ? (
          <p className="text-xs text-red-600">No se pudo cargar el historial.</p>
        ) : (comentarios.data ?? []).length === 0 && sueltos.length === 0 ? (
          <p className="text-xs text-muted-foreground">Todavía no hay comentarios ni documentos.</p>
        ) : (
          <ol className="space-y-2 max-h-64 overflow-auto pr-1">
            {(comentarios.data ?? []).map((c) =>
              c.kind === "system" ? (
                <li key={c.id} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <Info size={12} className="mt-0.5 shrink-0" />
                  <span>{c.body} <span className="opacity-70">· {c.authorName ?? "—"} · {fmtFecha(c.createdAt)}</span></span>
                </li>
              ) : (
                <li key={c.id} className="rounded-md border border-border bg-muted/30 px-3 py-2">
                  <div className="text-[11px] text-muted-foreground mb-1">{c.authorName ?? "—"} · {fmtFecha(c.createdAt)}</div>
                  <p className="text-sm whitespace-pre-wrap break-words">{c.body}</p>
                  <ListaAdjuntos items={adjuntosDe(c.id)} onOpen={descargar} />
                </li>
              ),
            )}
            {sueltos.length > 0 && (
              <li className="rounded-md border border-dashed border-border px-3 py-2">
                <div className="text-[11px] text-muted-foreground mb-1">Documentos sin comentario</div>
                <ListaAdjuntos items={sueltos} onOpen={descargar} />
              </li>
            )}
          </ol>
        )}

        <div className="mt-3 space-y-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={5000}
            placeholder="Escribí el análisis: documentación revisada, contacto con el cliente, conclusiones parciales…"
            className="w-full h-20 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
          />
          {archivos.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {archivos.map((f, i) => (
                <span key={`${f.name}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
                  <FileText size={12} /> {f.name}
                  <button type="button" aria-label={`Quitar ${f.name}`} onClick={() => setArchivos((p) => p.filter((_, j) => j !== i))} className="ml-0.5 hover:text-red-600">×</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <label className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input text-sm cursor-pointer hover:bg-accent">
              <Paperclip size={14} /> Adjuntar
              <input ref={fileRef} type="file" multiple accept={ALERT_ATTACHMENT_ACCEPT} className="hidden" onChange={(e) => elegirArchivos(e.target.files)} />
            </label>
            <button
              type="button"
              onClick={() => void enviar()}
              disabled={enviando || (!texto.trim() && archivos.length === 0)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {enviando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Registrar
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            PDF, imágenes, Word, Excel, CSV o texto, hasta 10 MB. Comentarios y documentos quedan en el historial y no se pueden borrar.
          </p>
        </div>
      </div>
    </div>
  );
}

function ListaAdjuntos({ items, onOpen }: { items: AlertAttachment[]; onOpen: (a: AlertAttachment) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {items.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onOpen(a)}
          title={`${a.uploadedByName ?? "—"} · ${fmtFecha(a.createdAt)}`}
          className="inline-flex items-center gap-1 rounded-md border border-input bg-card px-2 py-1 text-xs hover:bg-accent"
        >
          <Paperclip size={12} /> {a.fileName} <span className="text-muted-foreground">{fmtTamano(a.sizeBytes)}</span>
        </button>
      ))}
    </div>
  );
}
