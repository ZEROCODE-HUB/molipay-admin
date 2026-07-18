import { useState, useMemo, useRef, useEffect, type ReactNode } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Download, Search } from "lucide-react";
import { BtnOutline } from "./portal-shell";

export type Column<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
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
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setActiveFilter(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleFilter = (key: string) => {
    setActiveFilter((prev) => (prev === key ? null : key));
  };

  const filteredData = useMemo(() => {
    const activeFilters = Object.entries(filters).filter(([, v]) => v.trim());
    if (activeFilters.length === 0) return data;
    return data.filter((row) =>
      activeFilters.every(([key, value]) => {
        const col = columns.find((c) => c.key === key);
        if (!col) return true;
        const text = String(col.render(row) ?? "");
        return text.toLowerCase().includes(value.toLowerCase());
      })
    );
  }, [data, filters, columns]);

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
  }, [filters, pageSize]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, safePage, pageSize]);

  const filteredKeys = useMemo(() => filteredData.map(keyExtractor), [filteredData, keyExtractor]);
  const allFilteredSelected = selection && filteredKeys.length > 0 && filteredKeys.every((k) => selection.selected.has(k));
  const someSelected = selection && filteredKeys.some((k) => selection.selected.has(k));

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortKey !== columnKey) return <ChevronsUpDown size={14} className="text-muted-foreground" />;
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
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{sortedData.length} resultados</span>
        {onDownloadCSV && (
          <BtnOutline onClick={onDownloadCSV}>
            <Download size={16} /> CSV
          </BtnOutline>
        )}
      </div>

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
                <th key={col.key} className="px-4 py-3 text-left relative">
                  <div className="flex items-center gap-1.5">
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
                    {col.filterable && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFilter(col.key);
                        }}
                        className={`p-0.5 rounded ${
                          activeFilter === col.key || filters[col.key]
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Search size={13} />
                      </button>
                    )}
                  </div>
                  {activeFilter === col.key && (
                    <div
                      ref={filterRef}
                      className="absolute top-full left-0 mt-1 z-20 min-w-[200px] bg-card border rounded-lg shadow-lg p-2"
                    >
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          className="w-full h-8 pl-8 pr-2 rounded-md border border-input bg-background text-xs outline-none focus:ring-2 focus:ring-ring/40"
                          placeholder={`Filtrar ${col.label}...`}
                          value={filters[col.key] ?? ""}
                          onChange={(e) => setFilters((f) => ({ ...f, [col.key]: e.target.value }))}
                          autoFocus
                        />
                      </div>
                    </div>
                  )}
                </th>
              ))}
              {actions && <th className="px-4 py-3 w-20 text-right">Acciones</th>}
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
                  <tr key={key} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
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

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Filas por página:</span>
          <select
            className="h-8 px-2 rounded-md border border-input bg-card text-foreground text-xs outline-none focus:ring-2 focus:ring-ring/40"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">
            Página {safePage} de {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              className="h-8 px-3 rounded-md border border-input bg-card text-foreground text-xs font-semibold hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <button
              type="button"
              className="h-8 px-3 rounded-md border border-input bg-card text-foreground text-xs font-semibold hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition"
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
