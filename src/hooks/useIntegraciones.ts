import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listIntegraciones, type IntegracionFilters } from "@/lib/api/integraciones";
import type { Integracion, Page } from "@/lib/api/types";

export function useIntegraciones(filters: IntegracionFilters) {
  const query = useQuery<Page<Integracion>>({
    queryKey: ["integraciones", filters],
    queryFn: () => listIntegraciones(filters),
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

export function useIntegracion(id: string | null) {
  return useQuery({
    queryKey: ["integraciones", id],
    queryFn: () => import("@/lib/api/integraciones").then((m) => m.getIntegracion(id!)),
    enabled: !!id,
    staleTime: 30_000,
  });
}
