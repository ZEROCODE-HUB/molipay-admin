import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listApiUsuarios, type ApiUsuarioFilters } from "@/lib/api/api-usuarios";
import type { ApiUsuario, Page } from "@/lib/api/types";

export function useApiUsuarios(filters: ApiUsuarioFilters) {
  const query = useQuery<Page<ApiUsuario>>({
    queryKey: ["api_usuarios", filters],
    queryFn: () => listApiUsuarios(filters),
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

export function useApiUsuario(id: string | null) {
  return useQuery({
    queryKey: ["api_usuarios", id],
    queryFn: () => import("@/lib/api/api-usuarios").then((m) => m.getApiUsuario(id!)),
    enabled: !!id,
    staleTime: 30_000,
  });
}
