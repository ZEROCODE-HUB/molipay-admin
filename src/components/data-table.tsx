import { useState, useMemo, useRef, useEffect, type ReactNode } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Download, X, Search } from "lucide-react";
import { BtnOutline } from "./portal-shell";

export type FilterType = "text" | "date" | "enum";

export type Column<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean | FilterType;
  filterOptions?: string[];
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

function isTextFilterable(col: Column<any>): boolean {
  return col.filterable === true || col.filterable === "text";
}

function isBoolOrText(val: Column<any>["filterable"]): val is boolean | "text" {
  return val === true || val === "text";
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
  const [globalQuery, setGlobalQuery] = useState("");
  const [enumFilters, setEnumFilters] = useState<Record<string, string>>({});
  const [dateRanges, setDateRanges] = useState<Record<string, { from: string; to: string }>>({});

  const textSearchableCols = useMemo(
    () => columns.filter((c) => isTextFilterable(c)),
    [columns],
  );

  const dateCols = useMemo(
    () => columns.filter((c) => c.filterable === "date"),
    [columns],
  );

  const enumCols = useMemo(
    () => columns.filter((c) => c.filterable === "enum"),
    [columns],
  );

  const specificFilterCount =
    Object.values(enumFilters).filter((v) => v).length +
    Object.values(dateRanges).filter((r) => r.from || r.to).length;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(globalQuery);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [globalQuery]);

  const searchPlaceholder =
    textSearchableCols.length > 0
      ? `Buscar por ${textSearchableCols
          .slice(0, 4)
          .map((c) => c.label.toLowerCase())
          .join(", ")}${textSearchableCols.length > 4 ? ` +${textSearchableCols.length - 4} más` : ""}...`
      : "Buscar...";

  const clearAllFilters = () => {
    setGlobalQuery("");
    setDebouncedQuery("");
    setEnumFilters({});
    setDateRanges({});
    setPage(1);
  };

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
      if (debouncedQuery.trim()) {
        const q = debouncedQuery.toLowerCase();
        const matched = textSearchableCols.some((col) => {
          const text = String(col.render(row) ?? "");
          return text.toLowerCase().includes(q);
        });
        if (!matched) return false;
      }
      for (const [key, value] of Object.entries(enumFilters)) {
        if (!value) continue;
        const col = columns.find((c) => c.key === key);
        if (!col) continue;
        const text = String(col.render(row) ?? "");
        if (text !== value) return false;
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
  }, [data, debouncedQuery, textSearchableCols, enumFilters, dateRanges, columns]);

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
  }, [debouncedQuery, enumFilters, dateRanges, pageSize]);

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
  const showSpecificFilters = dateCols.length > 0 || enumCols.length > 0;

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

      {(textSearchableCols.length > 0 || showSpecificFilters) && (
        <div className="bg-card border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            {textSearchableCols.length > 0 && (
              <div className="relative flex-1 max-w-md">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={globalQuery}
                  onChange={(e) => setGlobalQuery(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 rounded-md border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring/40 placeholder:text-muted-foreground/50"
                />
                {globalQuery && (
                  <button
                    type="button"
                    onClick={() => { setGlobalQuery(""); setDebouncedQuery(""); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}
            {specificFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors shrink-0"
              >
                <X size={14} />
                Limpiar filtros ({specificFilterCount + (debouncedQuery ? 1 : 0)})
              </button>
            )}
          </div>

          {showSpecificFilters && (
            <div className="flex flex-wrap items-end gap-3">
              {dateCols.map((col) => {
                const range = dateRanges[col.key] ?? { from: "", to: "" };
                return (
                  <div key={col.key} className="space-y-1 min-w-0">
                    <label className="text-xs font-medium text-muted-foreground">{col.label}</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={range.from}
                        onChange={(e) =>
                          setDateRanges((prev) => ({
                            ...prev,
                            [col.key]: { ...range, from: e.target.value },
                          }))
                        }
                        className="h-8 px-2 rounded-md border border-input bg-background text-xs outline-none focus:ring-2 focus:ring-ring/40 [color-scheme:light] dark:[color-scheme:dark]"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">→</span>
                      <input
                        type="date"
                        value={range.to}
                        onChange={(e) =>
                          setDateRanges((prev) => ({
                            ...prev,
                            [col.key]: { ...range, to: e.target.value },
                          }))
                        }
                        className="h-8 px-2 rounded-md border border-input bg-background text-xs outline-none focus:ring-2 focus:ring-ring/40 [color-scheme:light] dark:[color-scheme:dark]"
                      />
                    </div>
                  </div>
                );
              })}
              {enumCols.map((col) => (
                <div key={col.key} className="space-y-1 min-w-0">
                  <label className="text-xs font-medium text-muted-foreground">{col.label}</label>
                  <select
                    value={enumFilters[col.key] ?? ""}
                    onChange={(e) =>
                      setEnumFilters((prev) => {
                        const next = { ...prev, [col.key]: e.target.value };
                        if (!e.target.value) delete next[col.key];
                        return next;
                      })
                    }
                    className="h-8 min-w-[130px] px-2 rounded-md border border-input bg-background text-xs outline-none focus:ring-2 focus:ring-ring/40"
                  >
                    <option value="">Todos</option>
                    {(col.filterOptions ?? []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
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
