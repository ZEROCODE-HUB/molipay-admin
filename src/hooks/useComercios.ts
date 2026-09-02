import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listComercios, listClientesForSelect, type ComercioFilters } from "@/lib/api/comercios";
import type { ClienteSelect, Comercio, Page } from "@/lib/api/types";

export function useComercios(filters: ComercioFilters) {
  const query = useQuery<Page<Comercio>>({
    queryKey: ["comercios", filters],
    queryFn: () => listComercios(filters),
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

export function useClientesForSelect(search?: string) {
  return useQuery<ClienteSelect[]>({
    queryKey: ["clientes", "select", search ?? ""],
    queryFn: () => listClientesForSelect(search),
    staleTime: 5 * 60_000,
  });
}
