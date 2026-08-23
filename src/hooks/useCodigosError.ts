import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listCodigosError, type CodigoErrorFilters } from "@/lib/api/codigos-error";
import type { CodigoError, Page } from "@/lib/api/types";

export function useCodigosError(filters: CodigoErrorFilters) {
  const query = useQuery<Page<CodigoError>>({
    queryKey: ["codigos_error", filters],
    queryFn: () => listCodigosError(filters),
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
