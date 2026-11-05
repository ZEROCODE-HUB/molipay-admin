import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  FileWarning,
  X,
  ZoomIn,
} from "lucide-react";
import { esUrlImagen } from "@/features/customers/customer-detail.rules";
import { DOCUMENT_STATUS, type DocumentSlot } from "@/features/customers/onboarding-review.rules";
import type { ReviewDocument } from "@/features/customers/onboarding-review.supabase";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline, BtnPrimary } from "@/shared/ui/button";
import { Modal } from "@/shared/ui/modal";

export type ViewerDocument = { document: ReviewDocument; label: string; owner: string };

const isPdf = (path: string | null) => !!path && /\.pdf(\?|$)/i.test(path);

export function DocumentStatusBadge({ status }: { status: string }) {
  const s = DOCUMENT_STATUS[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

/** Miniaturas de los documentos, incluidos los exigidos que todavia no se cargaron. */
export function DocumentGrid({
  slots,
  urls,
  thumbs,
  onOpen,
}: {
  slots: DocumentSlot[];
  urls: Record<string, string | null>;
  thumbs: Record<string, string | null>;
  onOpen: (document: ReviewDocument) => void;
}) {
  if (slots.length === 0) {
    return <p className="text-xs text-muted-foreground">No hay documentos para mostrar.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {slots.map(({ tipo, label, document }) =>
        document ? (
          <button
            key={tipo}
            type="button"
            onClick={() => onOpen(document)}
            className="group overflow-hidden rounded-lg border bg-card text-left transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="relative flex h-28 items-center justify-center bg-muted">
              {esUrlImagen(document.url) && (thumbs[document.id] || urls[document.id]) ? (
                <img
                  src={thumbs[document.id] ?? urls[document.id] ?? ""}
                  alt={label}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <FileText size={28} className="text-muted-foreground" aria-hidden />
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                <ZoomIn size={20} aria-hidden />
              </span>
            </div>
            <div className="space-y-1 p-2">
              <p className="truncate text-xs font-medium">{label}</p>
              <DocumentStatusBadge status={document.status} />
            </div>
          </button>
        ) : (
          <div
            key={tipo}
            className="flex h-full min-h-[10rem] flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-2 text-center"
          >
            <FileWarning size={22} className="text-amber-600" aria-hidden />
            <p className="text-xs font-medium">{label}</p>
            <p className="text-[11px] text-muted-foreground">Sin cargar</p>
          </div>
        ),
      )}
    </div>
  );
}

/** Visor con la imagen o el PDF en grande y la decision al lado de lo que se mira. */
export function DocumentViewer({
  items,
  currentId,
  urls,
  pending,
  onMove,
  onClose,
  onApprove,
  onReject,
}: {
  items: ViewerDocument[];
  currentId: string;
  urls: Record<string, string | null>;
  pending: boolean;
  onMove: (id: string) => void;
  onClose: () => void;
  onApprove: (document: ReviewDocument) => void;
  onReject: (document: ReviewDocument) => void;
}) {
  const index = items.findIndex((i) => i.document.id === currentId);
  const current = items[index];
  const [zoomed, setZoomed] = useState(false);
  useEffect(() => setZoomed(false), [currentId]);
  if (!current) return null;
  const { document, label, owner } = current;
  const url = urls[document.id];

  return (
    <Modal open onClose={onClose} size="custom" className="max-w-5xl">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3 border-b p-4">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{label}</h3>
            <p className="truncate text-xs text-muted-foreground">
              {owner} · versión {document.version} ·{" "}
              {new Date(document.created_at).toLocaleDateString("es-AR")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DocumentStatusBadge status={document.status} />
            <button
              type="button"
              aria-label="Cerrar"
              className="rounded p-1 hover:bg-muted"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex min-h-[20rem] flex-1 items-center justify-center overflow-auto bg-muted p-3">
          {!url ? (
            <p className="text-sm text-muted-foreground">Cargando el documento…</p>
          ) : esUrlImagen(document.url) ? (
            <button
              type="button"
              className={zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}
              onClick={() => setZoomed((z) => !z)}
              aria-label={zoomed ? "Reducir imagen" : "Ampliar imagen"}
            >
              <img
                src={url}
                alt={label}
                className={zoomed ? "max-w-none" : "max-h-[65vh] max-w-full object-contain"}
              />
            </button>
          ) : isPdf(document.url) ? (
            <iframe title={label} src={url} className="h-[65vh] w-full rounded bg-white" />
          ) : (
            <p className="text-sm text-muted-foreground">
              Este formato no se puede previsualizar. Abrilo en otra pestaña.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t p-3">
          <div className="flex items-center gap-1">
            <BtnOutline
              aria-label="Documento anterior"
              className="h-9 px-2"
              disabled={index <= 0}
              onClick={() => onMove(items[index - 1].document.id)}
            >
              <ChevronLeft size={16} />
            </BtnOutline>
            <span className="px-2 text-xs text-muted-foreground">
              {index + 1} de {items.length}
            </span>
            <BtnOutline
              aria-label="Documento siguiente"
              className="h-9 px-2"
              disabled={index >= items.length - 1}
              onClick={() => onMove(items[index + 1].document.id)}
            >
              <ChevronRight size={16} />
            </BtnOutline>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <ExternalLink size={14} aria-hidden /> Abrir en otra pestaña
              </a>
            )}
          </div>
          <div className="flex gap-2">
            <BtnOutline disabled={pending} onClick={() => onReject(document)}>
              Rechazar
            </BtnOutline>
            <BtnPrimary
              disabled={pending || document.status === "approved"}
              onClick={() => onApprove(document)}
            >
              {document.status === "approved" ? "Aprobado" : "Aprobar documento"}
            </BtnPrimary>
          </div>
        </div>
      </div>
    </Modal>
  );
}
