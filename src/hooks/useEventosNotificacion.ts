import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  listEventosNotificacion,
  type EventoNotificacionFilters,
} from "@/lib/api/eventos-notificacion";
import type { EventoNotificacion, Page } from "@/lib/api/types";

export function useEventosNotificacion(filters: EventoNotificacionFilters) {
  const query = useQuery<Page<EventoNotificacion>>({
    queryKey: ["eventos_notificacion", filters],
    queryFn: () => listEventosNotificacion(filters),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  const rows = query.data?.rows ?? [];
  return {
    rows,
    total: query.data?.total ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error as Error | null,
    isEmpty: !query.isLoading && rows.length === 0,
    refetch: query.refetch,
  };
}
