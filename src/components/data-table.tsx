import { useState, useMemo, useRef, useEffect, type ReactNode } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Download, X } from "lucide-react";
import { BtnOutline } from "./portal-shell";

export type Column<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean | "date";
  render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  actions?: (row: T) => ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  selection?: {
    selected: Set<string | number>;
    onToggle: (id: string | number) => void;
    onToggleAll: () => void;
  };
  onDownloadCSV?: () => void;
};

const PAGE_SIZES = [10, 20, 50, 100];

function parseDateCell(text: string): Date | null {
  const dmy = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmy) return new Date(+dmy[3], +dmy[2] - 1, +dmy[1]);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  return null;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  actions,
  loading = false,
  emptyMessage = "Sin datos",
  pageSize: defaultPageSize = 10,
  selection,
  onDownloadCSV,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [textFilters, setTextFilters] = useState<Record<string, string>>({});
  const [dateRanges, setDateRanges] = useState<Record<string, { from: string; to: string }>>({});
  const [pendingText, setPendingText] = useState<Record<string, string>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filterableColumns = useMemo(
    () => columns.filter((c) => c.filterable),
    [columns],
  );

  const isDateColumn = (col: Column<T>) => col.filterable === "date";

  const commitTextFilter = (key: string, value: string) => {
    setTextFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (!value.trim()) delete next[key];
      return next;
    });
  };

  const setTextFilter = (key: string, value: string) => {
    setPendingText((prev) => ({ ...prev, [key]: value }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      commitTextFilter(key, value);
    }, 300);
  };

  const setDateFilter = (key: string, range: { from: string; to: string }) => {
    setDateRanges((prev) => ({ ...prev, [key]: range }));
    setPage(1);
  };

  const clearAllFilters = () => {
    setTextFilters({});
    setPendingText({});
    setDateRanges({});
    setPage(1);
  };

  const activeFilterCount =
    Object.values(textFilters).filter((v) => v.trim()).length +
    Object.values(dateRanges).filter((r) => r.from || r.to).length;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      for (const [key, value] of Object.entries(textFilters)) {
        if (!value.trim()) continue;
        const col = columns.find((c) => c.key === key);
        if (!col) continue;
        const text = String(col.render(row) ?? "");
        if (!text.toLowerCase().includes(value.toLowerCase())) return false;
      }
      for (const [key, range] of Object.entries(dateRanges)) {
        if (!range.from && !range.to) continue;
        const col = columns.find((c) => c.key === key);
        if (!col) continue;
        const text = String(col.render(row) ?? "");
        const date = parseDateCell(text);
        if (!date) continue;
        if (range.from) {
          const fromDate = new Date(range.from);
          if (date < fromDate) return false;
        }
        if (range.to) {
          const toDate = new Date(range.to);
          toDate.setDate(toDate.getDate() + 1);
          if (date >= toDate) return false;
        }
      }
      return true;
    });
  }, [data, textFilters, dateRanges, columns]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = String(col.render(a) ?? "");
      const bVal = String(col.render(b) ?? "");
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [filteredData, sortKey, sortDir, columns]);

  useEffect(() => {
    setPage(1);
  }, [textFilters, dateRanges, pageSize]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, safePage, pageSize]);

  const filteredKeys = useMemo(() => filteredData.map(keyExtractor), [filteredData, keyExtractor]);
  const allFilteredSelected =
    selection && filteredKeys.length > 0 && filteredKeys.every((k) => selection.selected.has(k));
  const someSelected = selection && filteredKeys.some((k) => selection.selected.has(k));

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortKey !== columnKey)
      return <ChevronsUpDown size={14} className="text-muted-foreground" />;
    return sortDir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  if (loading) {
    return (
      <div className="bg-card border rounded-lg overflow-hidden animate-pulse">
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  const colspan = columns.length + (selection ? 1 : 0) + (actions ? 1 : 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {sortedData.length} resultados
        </span>
        <div className="flex items-center gap-3">
          {onDownloadCSV && (
            <BtnOutline onClick={onDownloadCSV}>
              <Download size={16} /> CSV
            </BtnOutline>
          )}
        </div>
      </div>

      {filterableColumns.length > 0 && (
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Filtros
            </span>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                <X size={14} />
                Limpiar filtros ({activeFilterCount})
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filterableColumns.map((col) => {
              if (isDateColumn(col)) {
                const range = dateRanges[col.key] ?? { from: "", to: "" };
                return (
                  <div key={col.key} className="space-y-1 min-w-0">
                    <label className="text-xs font-medium text-muted-foreground truncate block">
                      {col.label}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={range.from}
                        onChange={(e) => setDateFilter(col.key, { ...range, from: e.target.value })}
                        className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs outline-none focus:ring-2 focus:ring-ring/40 [color-scheme:light] dark:[color-scheme:dark]"
                        placeholder="Desde"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">→</span>
                      <input
                        type="date"
                        value={range.to}
                        onChange={(e) => setDateFilter(col.key, { ...range, to: e.target.value })}
                        className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs outline-none focus:ring-2 focus:ring-ring/40 [color-scheme:light] dark:[color-scheme:dark]"
                        placeholder="Hasta"
                      />
                    </div>
                  </div>
                );
              }
              return (
                <div key={col.key} className="space-y-1 min-w-0">
                  <label className="text-xs font-medium text-muted-foreground truncate block">
                    {col.label}
                  </label>
                  <input
                    type="text"
                    placeholder={`Filtrar ${col.label.toLowerCase()}...`}
                    value={pendingText[col.key] ?? textFilters[col.key] ?? ""}
                    onChange={(e) => setTextFilter(col.key, e.target.value)}
                    className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs outline-none focus:ring-2 focus:ring-ring/40 placeholder:text-muted-foreground/50"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-card border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {selection && (
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={allFilteredSelected ?? false}
                    ref={(el) => {
                      if (el) el.indeterminate = !!(!allFilteredSelected && someSelected);
                    }}
                    onChange={selection.onToggleAll}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left whitespace-nowrap">
                  <button
                    type="button"
                    className={`font-semibold text-foreground flex items-center gap-1 ${
                      col.sortable ? "cursor-pointer hover:text-primary" : ""
                    }`}
                    onClick={() => col.sortable && handleSort(col.key)}
                    disabled={!col.sortable}
                  >
                    {col.label}
                    {col.sortable && <SortIcon columnKey={col.key} />}
                  </button>
                </th>
              ))}
              {actions && <th className="px-4 py-3 w-20 text-right whitespace-nowrap">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={colspan} className="px-4 py-12 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => {
                const key = keyExtractor(row);
                const checked = selection?.selected.has(key) ?? false;
                return (
                  <tr
                    key={key}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    {selection && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="accent-primary"
                          checked={checked}
                          onChange={() => selection.onToggle(key)}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        {col.render(row)}
                      </td>
                    ))}
                    {actions && <td className="px-4 py-3 text-right">{actions(row)}</td>}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground whitespace-nowrap">Filas por página:</span>
          <select
            className="h-8 px-2 rounded-md border border-input bg-card text-foreground text-xs outline-none focus:ring-2 focus:ring-ring/40"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-muted-foreground text-xs sm:text-sm">
            Pág. {safePage} de {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              className="h-8 px-2 sm:px-3 rounded-md border border-input bg-card text-foreground text-xs font-semibold hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <button
              type="button"
              className="h-8 px-2 sm:px-3 rounded-md border border-input bg-card text-foreground text-xs font-semibold hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
