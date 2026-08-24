import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listAdminUsers, type AdminUserFilters } from "@/lib/api/admin-users";
import type { AdminUser, Page } from "@/lib/api/types";

export function useAdminUsers(filters: AdminUserFilters) {
  const query = useQuery<Page<AdminUser>>({
    queryKey: ["admin-users", filters],
    queryFn: () => listAdminUsers(filters),
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
