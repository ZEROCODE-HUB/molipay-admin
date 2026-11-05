import { memo, useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { FILTER_STATUSES_OPTIONS } from "@/features/customers/customer-status.rules";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

/**
 * Filtros de las listas de clientes. Viven fuera de la tabla y guardan lo que se escribe
 * en su propio estado: tipear no vuelve a dibujar la tabla ni pierde el foco. La pagina
 * recibe la busqueda recien cuando el usuario deja de escribir.
 */
export const CustomerListFilters = memo(function CustomerListFilters({
  placeholder,
  status,
  onSearchChange,
  onStatusChange,
}: {
  placeholder: string;
  status: string;
  onSearchChange: (search: string) => void;
  onStatusChange: (status: string) => void;
}) {
  const [text, setText] = useState("");
  const debounced = useDebouncedValue(text.trim(), 350);

  useEffect(() => {
    onSearchChange(debounced);
  }, [debounced, onSearchChange]);

  const hasFilters = !!text || !!status;

  return (
    <div className="mb-3 flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          aria-label="Buscar"
          className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        aria-label="Estado"
        className="h-9 rounded-md border border-input bg-background px-2 text-sm sm:w-56"
      >
        <option value="">Todos los estados</option>
        {FILTER_STATUSES_OPTIONS.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setText("");
            onStatusChange("");
          }}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-md px-2 text-xs font-semibold text-primary hover:underline"
        >
          <X size={14} aria-hidden /> Limpiar
        </button>
      )}
    </div>
  );
});
