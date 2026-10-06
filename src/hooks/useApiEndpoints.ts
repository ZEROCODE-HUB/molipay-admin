import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listApiEndpoints, type ApiEndpointFilters } from "@/lib/api/api-endpoints";
import type { ApiEndpoint, Page } from "@/lib/api/types";

export function useApiEndpoints(filters: ApiEndpointFilters) {
  const query = useQuery<Page<ApiEndpoint>>({
    queryKey: ["api_endpoints", filters],
    queryFn: () => listApiEndpoints(filters),
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
