import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  listCanalesNotificacion,
  type CanalNotificacionFilters,
} from "@/lib/api/canales-notificacion";
import type { CanalNotificacion, Page } from "@/lib/api/types";

export function useCanalesNotificacion(filters: CanalNotificacionFilters) {
  const query = useQuery<Page<CanalNotificacion>>({
    queryKey: ["canales_notificacion", filters],
    queryFn: () => listCanalesNotificacion(filters),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
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
