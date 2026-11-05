import { StatusMessage } from "@/shared/ui/status-message";
import { Inbox } from "lucide-react";
import { isAppError } from "@/shared/lib/errors";

export function CustomerSection({
  titulo: title,
  loading,
  error,
  onRetry,
  vacio: empty,
  children,
}: {
  titulo: string;
  loading: boolean;
  error: Error | null;
  onRetry?: () => void;
  vacio: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="font-display text-base font-semibold text-foreground mb-3">{title}</h2>
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-10 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando…
        </div>
      ) : error ? (
        <StatusMessage
          kind="error"
          message={isAppError(error) ? error.message : "Error al cargar los datos."}
          onRetry={onRetry}
        />
      ) : empty ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-8 text-sm text-muted-foreground">
          <Inbox size={22} />
          <p>Sin registros.</p>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
