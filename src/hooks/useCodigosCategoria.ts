import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listCodigosCategoria, type CodigoCategoriaFilters } from "@/lib/api/codigos-categoria";
import type { CodigoCategoria, Page } from "@/lib/api/types";

export function useCodigosCategoria(filters: CodigoCategoriaFilters) {
  const query = useQuery<Page<CodigoCategoria>>({
    queryKey: ["codigos_categoria", filters],
    queryFn: () => listCodigosCategoria(filters),
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
