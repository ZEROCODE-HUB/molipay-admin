import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listApiRestricciones, type ApiRestriccionFilters } from "@/lib/api/api-restricciones";
import type { ApiRestriccion, Page } from "@/lib/api/types";

export function useApiRestricciones(filters: ApiRestriccionFilters) {
  const query = useQuery<Page<ApiRestriccion>>({
    queryKey: ["api_restricciones", filters],
    queryFn: () => listApiRestricciones(filters),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
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
