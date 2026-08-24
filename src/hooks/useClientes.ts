import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getClienteByLegajo, listClientes, type ClienteFilters } from "@/lib/api/clientes";
import type { Cliente, Page } from "@/lib/api/types";

export function useClientes(filters: ClienteFilters) {
  const query = useQuery<Page<Cliente>>({
    queryKey: ["clientes", filters],
    queryFn: () => listClientes(filters),
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

export function useClienteByLegajo(legajo: string | null) {
  const query = useQuery<Cliente | null>({
    queryKey: ["clientes", "legajo", legajo],
    queryFn: () => getClienteByLegajo(legajo ?? ""),
    enabled: !!legajo,
    staleTime: 30_000,
  });
  return {
    cliente: (query.data ?? null) as Cliente | null | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
