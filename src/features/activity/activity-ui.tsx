import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { BtnOutline } from "@/shared/ui/button";

/** Piezas compartidas de las pestañas de Actividad (tabla con cursor, filtros, detalle). */

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

export type ActivityColumn<T> = {
  key: string;
  label: string;
  className?: string;
  render: (row: T) => ReactNode;
};

/** Tabla de solo lectura con "Cargar más" (paginacion por cursor). */
export function ActivityTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  loading,
  error,
  emptyMessage,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  columns: ActivityColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  loading: boolean;
  error: string | null;
  emptyMessage: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="max-h-[calc(100vh-20rem)] min-h-64 overflow-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`sticky top-0 z-10 bg-muted px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)] ${c.className ?? ""}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td colSpan={columns.length} className="px-3 py-3">
                    <div className="h-4 animate-pulse rounded bg-muted" />
                  </td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-12 text-center text-destructive">
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-12 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-b last:border-0 ${onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}`}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`px-3 py-2.5 align-top ${c.className ?? ""}`}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 border-t px-3 py-2.5 text-xs text-muted-foreground">
        <span>
          {rows.length} {rows.length === 1 ? "registro" : "registros"}
          {hasMore ? " (hay más)" : ""}
        </span>
        {hasMore && (
          <BtnOutline onClick={onLoadMore} disabled={loadingMore} className="h-8 px-3 text-xs">
            {loadingMore && <Loader2 size={14} className="animate-spin" />}
            Cargar más
          </BtnOutline>
        )}
      </div>
    </div>
  );
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words font-medium">{children ?? "—"}</span>
    </div>
  );
}

export function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
