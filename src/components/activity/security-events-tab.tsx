import { useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Download, RefreshCw, Search, X } from "lucide-react";
import * as XLSX from "xlsx";
import { Badge, BtnOutline, Input } from "@/components/portal-shell";
import { ModalDialog } from "@/components/modal-dialog";
import {
  ACTIVITY_QUERY_KEYS,
  fetchSecurityEventTypes,
  fetchSecurityEvents,
  type SecurityActorType,
  type SecurityEvent,
  type SecurityEventCategory,
  type SecurityEventCursor,
  type SecurityEventFilters,
  type SecurityEventOutcome,
  type SecurityEventSeverity,
} from "@/lib/api/security-events";
import { DataAccessError } from "@/lib/api/errors";
import {
  ActivityTable,
  DetailRow,
  FilterField,
  JsonBlock,
  type ActivityColumn,
} from "./activity-ui";
import { SELECT_CLASS, formatDateTime } from "./activity-format";

const CATEGORY_LABELS: Record<SecurityEventCategory, string> = {
  authentication: "Autenticación",
  session: "Sesiones",
  api_key: "API keys",
  admin_user: "Usuarios backoffice",
  access: "Accesos",
  configuration: "Configuración",
};

const OUTCOME: Record<
  SecurityEventOutcome,
  { label: string; tone: "success" | "danger" | "warn" }
> = {
  success: { label: "Exitoso", tone: "success" },
  failure: { label: "Fallido", tone: "danger" },
  denied: { label: "Denegado", tone: "warn" },
};

const SEVERITY: Record<
  SecurityEventSeverity,
  { label: string; tone: "neutral" | "warn" | "danger" }
> = {
  info: { label: "Info", tone: "neutral" },
  low: { label: "Baja", tone: "neutral" },
  medium: { label: "Media", tone: "warn" },
  high: { label: "Alta", tone: "danger" },
  critical: { label: "Crítica", tone: "danger" },
};

const ACTOR_TYPE_LABELS: Record<SecurityActorType, string> = {
  user: "Usuario",
  staff: "Backoffice",
  service: "Servicio",
  anonymous: "Anónimo",
  system: "Sistema",
  unknown: "Desconocido",
};

function actorLabel(e: SecurityEvent): string {
  return e.actorEmail ?? ACTOR_TYPE_LABELS[e.actorType];
}

function targetLabel(e: SecurityEvent): string {
  if (e.targetEmail) return e.targetEmail;
  if (e.targetType && e.targetId) return `${e.targetType} ${e.targetId.slice(0, 8)}`;
  return "—";
}

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof DataAccessError && error.permission) {
    return "No tenés permiso para ver los eventos de seguridad.";
  }
  return "No se pudieron cargar los eventos. Probá de nuevo.";
}

function exportToExcel(rows: SecurityEvent[]) {
  const ws = XLSX.utils.json_to_sheet(
    rows.map((e) => ({
      Fecha: formatDateTime(e.occurredAt),
      Evento: e.label,
      Código: e.action,
      Categoría: CATEGORY_LABELS[e.category],
      Resultado: OUTCOME[e.outcome].label,
      Severidad: SEVERITY[e.severity].label,
      Actor: actorLabel(e),
      "Tipo de actor": ACTOR_TYPE_LABELS[e.actorType],
      Afectado: targetLabel(e),
      IP: e.ip ?? "",
      Origen: e.source,
    })),
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Eventos de seguridad");
  XLSX.writeFile(wb, `eventos_seguridad_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

const EMPTY_FILTERS: SecurityEventFilters = {};

export function SecurityEventsTab() {
  const [filters, setFilters] = useState<SecurityEventFilters>(EMPTY_FILTERS);
  const [searchDraft, setSearchDraft] = useState("");
  const [detail, setDetail] = useState<SecurityEvent | null>(null);

  const typesQuery = useQuery({
    queryKey: ACTIVITY_QUERY_KEYS.securityEventTypes,
    queryFn: fetchSecurityEventTypes,
    staleTime: 10 * 60_000,
  });

  const query = useInfiniteQuery({
    queryKey: ACTIVITY_QUERY_KEYS.securityEvents(filters),
    queryFn: ({ pageParam }) => fetchSecurityEvents(filters, pageParam),
    initialPageParam: null as SecurityEventCursor | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const rows = useMemo(() => query.data?.pages.flatMap((p) => p.rows) ?? [], [query.data]);

  const actionOptions = useMemo(
    () =>
      (typesQuery.data ?? []).filter(
        (t) => t.isEnabled && (!filters.category || t.category === filters.category),
      ),
    [typesQuery.data, filters.category],
  );

  const update = (patch: Partial<SecurityEventFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const hasFilters = Object.values(filters).some(Boolean);

  const columns: ActivityColumn<SecurityEvent>[] = [
    {
      key: "occurredAt",
      label: "Fecha y hora",
      className: "whitespace-nowrap",
      render: (e) => (
        <span className="font-mono text-xs tabular-nums">{formatDateTime(e.occurredAt)}</span>
      ),
    },
    {
      key: "event",
      label: "Evento",
      render: (e) => (
        <div>
          <div className="font-medium">{e.label}</div>
          <div className="font-mono text-[11px] text-muted-foreground">{e.action}</div>
        </div>
      ),
    },
    {
      key: "outcome",
      label: "Resultado",
      render: (e) => <Badge tone={OUTCOME[e.outcome].tone}>{OUTCOME[e.outcome].label}</Badge>,
    },
    {
      key: "severity",
      label: "Severidad",
      render: (e) => <Badge tone={SEVERITY[e.severity].tone}>{SEVERITY[e.severity].label}</Badge>,
    },
    {
      key: "actor",
      label: "Actor",
      render: (e) => (
        <div className="max-w-56">
          <div className="truncate">{actorLabel(e)}</div>
          {e.actorEmail && (
            <div className="text-[11px] text-muted-foreground">
              {ACTOR_TYPE_LABELS[e.actorType]}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "target",
      label: "Afectado",
      render: (e) => <div className="max-w-56 truncate">{targetLabel(e)}</div>,
    },
    {
      key: "ip",
      label: "IP",
      render: (e) => <span className="font-mono text-xs">{e.ip ?? "—"}</span>,
    },
    {
      key: "source",
      label: "Origen",
      render: (e) => (
        <span className="font-mono text-[11px] text-muted-foreground">{e.source}</span>
      ),
    },
  ];

  return (
    <div className="space-y-3">
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

      <ActivityTable
        columns={columns}
        rows={rows}
        rowKey={(e) => e.id}
        onRowClick={setDetail}
        loading={query.isPending}
        error={errorMessage(query.error)}
        emptyMessage={
          hasFilters ? "No hay eventos con esos filtros." : "Todavía no hay eventos de seguridad."
        }
        hasMore={!!query.hasNextPage}
        loadingMore={query.isFetchingNextPage}
        onLoadMore={() => query.fetchNextPage()}
      />

      {detail && (
        <ModalDialog
          open
          onClose={() => setDetail(null)}
          title={detail.label}
          description={`${detail.action} · #${detail.id}`}
          size="lg"
        >
          <DetailRow label="Fecha y hora">{formatDateTime(detail.occurredAt)}</DetailRow>
          <DetailRow label="Categoría">{CATEGORY_LABELS[detail.category]}</DetailRow>
          <DetailRow label="Resultado">
            <Badge tone={OUTCOME[detail.outcome].tone}>{OUTCOME[detail.outcome].label}</Badge>
          </DetailRow>
          <DetailRow label="Severidad">
            <Badge tone={SEVERITY[detail.severity].tone}>{SEVERITY[detail.severity].label}</Badge>
          </DetailRow>
          <DetailRow label="Actor">
            {actorLabel(detail)} · {ACTOR_TYPE_LABELS[detail.actorType]}
            {detail.actorId && (
              <div className="font-mono text-[11px] text-muted-foreground">{detail.actorId}</div>
            )}
          </DetailRow>
          <DetailRow label="Afectado">
            {detail.targetEmail ?? "—"}
            {detail.targetType && (
              <div className="font-mono text-[11px] text-muted-foreground">
                {detail.targetType} {detail.targetId}
              </div>
            )}
          </DetailRow>
          {detail.tenantId && (
            <DetailRow label="Comercio">
              <span className="font-mono text-xs">{detail.tenantId}</span>
            </DetailRow>
          )}
          <DetailRow label="IP">{detail.ip}</DetailRow>
          <DetailRow label="Navegador">
            {detail.userAgent && <span className="text-xs">{detail.userAgent}</span>}
          </DetailRow>
          <DetailRow label="Origen">
            <span className="font-mono text-xs">{detail.source}</span>
          </DetailRow>
          {detail.requestId && (
            <DetailRow label="Request id">
              <span className="font-mono text-xs">{detail.requestId}</span>
            </DetailRow>
          )}
          <div className="mt-4">
            <div className="mb-1.5 text-xs font-semibold text-muted-foreground">
              Datos adicionales
            </div>
            <JsonBlock value={detail.metadata} />
          </div>
        </ModalDialog>
      )}
    </div>
  );
}
