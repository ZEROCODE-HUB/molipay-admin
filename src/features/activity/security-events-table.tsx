import { Download,RefreshCw,Search,X } from "lucide-react";
import { BtnOutline } from "@/shared/ui/button";
import { Input } from "@/shared/ui/form-controls";
import type {
SecurityEventCategory,
SecurityEventOutcome,
SecurityEventSeverity,
} from "./activity.types";
import { FilterField } from "./activity-ui";
import { SELECT_CLASS } from "./activity-styles";
import {
CATEGORY_LABELS,
OUTCOME,
SEVERITY,
EMPTY_FILTERS,
exportToExcel,
} from "@/features/activity/security-events-tab.rules";
import type { SecurityEventsTabVm } from "./use-security-events-tab";

export function SecurityEventsTable({
  update,
  searchDraft,
  setSearchDraft,
  filters,
  actionOptions,
  hasFilters,
  setFilters,
  query,
  rows,
}: Pick<
  SecurityEventsTabVm,
  | "update"
  | "searchDraft"
  | "setSearchDraft"
  | "filters"
  | "actionOptions"
  | "hasFilters"
  | "setFilters"
  | "query"
  | "rows"
>) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <form
        className="flex min-w-64 flex-1 items-end gap-2"
        onSubmit={(ev) => {
          ev.preventDefault();
          update({ search: searchDraft.trim() || null });
        }}
      >
        <FilterField label="Buscar">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={searchDraft}
              onChange={(ev) => setSearchDraft(ev.target.value)}
              placeholder="Email, IP o request id (Enter)"
              className="pl-8"
            />
          </div>
        </FilterField>
      </form>
      <FilterField label="Categoría">
        <select
          className={SELECT_CLASS}
          value={filters.category ?? ""}
          onChange={(ev) =>
            update({
              category: (ev.target.value || null) as SecurityEventCategory | null,
              action: null,
            })
          }
        >
          <option value="">Todas</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </FilterField>
      <FilterField label="Evento">
        <select
          className={`${SELECT_CLASS} max-w-56`}
          value={filters.action ?? ""}
          onChange={(ev) => update({ action: ev.target.value || null })}
        >
          <option value="">Todos</option>
          {actionOptions.map((t) => (
            <option key={t.action} value={t.action}>
              {t.label}
            </option>
          ))}
        </select>
      </FilterField>
      <FilterField label="Resultado">
        <select
          className={SELECT_CLASS}
          value={filters.outcome ?? ""}
          onChange={(ev) =>
            update({ outcome: (ev.target.value || null) as SecurityEventOutcome | null })
          }
        >
          <option value="">Todos</option>
          {Object.entries(OUTCOME).map(([value, o]) => (
            <option key={value} value={value}>
              {o.label}
            </option>
          ))}
        </select>
      </FilterField>
      <FilterField label="Severidad">
        <select
          className={SELECT_CLASS}
          value={filters.severity ?? ""}
          onChange={(ev) =>
            update({ severity: (ev.target.value || null) as SecurityEventSeverity | null })
          }
        >
          <option value="">Todas</option>
          {Object.entries(SEVERITY).map(([value, s]) => (
            <option key={value} value={value}>
              {s.label}
            </option>
          ))}
        </select>
      </FilterField>
      <FilterField label="Desde">
        <Input
          type="date"
          value={filters.from ?? ""}
          onChange={(ev) => update({ from: ev.target.value || null })}
          className="w-40"
        />
      </FilterField>
      <FilterField label="Hasta">
        <Input
          type="date"
          value={filters.to ?? ""}
          onChange={(ev) => update({ to: ev.target.value || null })}
          className="w-40"
        />
      </FilterField>
      {hasFilters && (
        <BtnOutline
          onClick={() => {
            setFilters(EMPTY_FILTERS);
            setSearchDraft("");
          }}
        >
          <X size={14} /> Limpiar
        </BtnOutline>
      )}
      <BtnOutline onClick={() => query.refetch()} title="Actualizar" aria-label="Actualizar">
        <RefreshCw
          size={14}
          className={query.isFetching && !query.isFetchingNextPage ? "animate-spin" : ""}
        />
      </BtnOutline>
      <BtnOutline onClick={() => exportToExcel(rows)} disabled={rows.length === 0}>
        <Download size={14} /> Excel
      </BtnOutline>
    </div>
  );
}
