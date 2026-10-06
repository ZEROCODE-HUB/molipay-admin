import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listComisiones, type ComisionFilters } from "@/lib/api/comisiones";
import type { ComisionCliente, Page } from "@/lib/api/types";

export function useComisiones(filters: ComisionFilters) {
  const query = useQuery<Page<ComisionCliente>>({
    queryKey: ["comisiones", filters],
    queryFn: () => listComisiones(filters),
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
