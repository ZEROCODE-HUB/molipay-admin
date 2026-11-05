import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  getCustomerByLegajo,
  listCustomers,
  type CustomerFilters,
} from "@/features/customers/customers.supabase";
import type { Customer, Page } from "@/infrastructure/supabase/legacy/types";
import { useRealtimeInvalidation } from "@/infrastructure/supabase/use-realtime-invalidation";

export function useCustomers(filters: CustomerFilters) {
  const query = useQuery<Page<Customer>>({
    queryKey: ["clientes", filters],
    queryFn: () => listCustomers(filters),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  useRealtimeInvalidation([{ table: "clientes" }], [["clientes"]]);

  const rows = query.data?.rows ?? [];
  return {
    rows,
    total: query.data?.total ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    /** Datos del filtro anterior mientras llegan los nuevos. */
    isRefreshing: query.isPlaceholderData,
    isError: query.isError,
    error: query.error as Error | null,
    isEmpty: !query.isLoading && rows.length === 0,
    refetch: query.refetch,
  };
}

export function useCustomerByLegajo(legajo: string | null) {
  const query = useQuery<Customer | null>({
    queryKey: ["clientes", "legajo", legajo],
    queryFn: () => getCustomerByLegajo(legajo ?? ""),
    enabled: !!legajo,
    staleTime: 30_000,
  });
  return {
    cliente: (query.data ?? null) as Customer | null | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
