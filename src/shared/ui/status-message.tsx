import { AlertTriangle,Inbox } from "lucide-react";

/**
 * Estado de una lista o pantalla cuando no hay datos para mostrar: sin permiso,
 * error al cargar (con reintento) o vacia. Los textos los decide quien la usa.
 */
export function StatusMessage({
  kind,
  message,
  errorTitle = "Ocurrió un error al cargar los datos",
  onRetry,
}: {
  kind: "permission" | "error" | "empty";
  message: string;
  errorTitle?: string;
  onRetry?: () => void;
}) {
  if (kind === "permission") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-6 py-12 text-center text-sm text-amber-800">
        <AlertTriangle size={28} />
        <div>
          <p className="font-semibold">No tenés permiso para ver esto</p>
          <p className="mt-1">{message}</p>
        </div>
      </div>
    );
  }
  if (kind === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
        <AlertTriangle size={28} />
        <div>
          <p className="font-semibold">{errorTitle}</p>
          <p className="mt-1">{message}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Reintentar
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
      <Inbox size={28} />
      <p>{message}</p>
    </div>
  );
}
