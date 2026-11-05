import { DOCUMENT_LABELS,type Document } from "@/features/customers/documents.supabase";
import { useState } from "react";
import { Download,Eye,ImageOff } from "lucide-react";
import { esUrlImagen } from "@/features/customers/customer-detail.rules";

export function DocumentCard({
  doc,
  legajo,
  resolvedUrl,
  thumbUrl,
}: {
  doc: Document;
  legajo: string;
  resolvedUrl: string | null;
  thumbUrl: string | null;
}) {
  const [error, setError] = useState(false);
  const resolved = resolvedUrl;
  const preview = thumbUrl ?? resolvedUrl;

  const download = async () => {
    if (!resolved) return;
    const name = `${DOCUMENT_LABELS[doc.tipo] ?? doc.label ?? "documento"}${
      doc.url ? "." + doc.url.split(".").pop() : ""
    }`;
    try {
      const res = await fetch(resolved);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(resolved, "_blank", "noreferrer");
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card p-0">
      <div className="h-32 w-full bg-muted">
        {!resolved ? (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            Sin archivo
          </div>
        ) : error ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center text-xs text-muted-foreground">
            <ImageOff size={18} />
            <span>No se pudo cargar</span>
            <a
              href={resolved}
              target="_blank"
              rel="noreferrer"
              className="break-all text-primary underline"
            >
              Abrir enlace
            </a>
          </div>
        ) : esUrlImagen(resolved) ? (
          <img
            src={preview ?? undefined}
            alt={doc.label}
            className="h-full w-full object-cover"
            onError={() => setError(true)}
          />
        ) : (
          <a
            href={resolved}
            target="_blank"
            rel="noreferrer"
            className="flex h-full w-full items-center justify-center gap-2 px-2 text-center text-sm font-medium text-primary"
          >
            <Download size={16} /> Ver / descargar
          </a>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-4 py-2">
        <p className="text-sm font-semibold">
          {DOCUMENT_LABELS[doc.tipo] ?? doc.label ?? "Documento"}
        </p>
        <div className="flex items-center gap-1">
          <a
            href={resolved ?? undefined}
            target="_blank"
            rel="noreferrer"
            title="Ver documento"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-input text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40"
            aria-disabled={!resolved}
            onClick={(e) => {
              if (!resolved) e.preventDefault();
            }}
          >
            <Eye size={14} />
          </a>
          <button
            type="button"
            title="Descargar documento"
            onClick={download}
            disabled={!resolved}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-input text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <Download size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
