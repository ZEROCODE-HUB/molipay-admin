import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listResolvers, type ResolverFilters } from "@/lib/api/resolvers";
import type { Page, Resolver } from "@/lib/api/types";

export function useResolvers(filters: ResolverFilters) {
  const query = useQuery<Page<Resolver>>({
    queryKey: ["resolvers", filters],
    queryFn: () => listResolvers(filters),
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
