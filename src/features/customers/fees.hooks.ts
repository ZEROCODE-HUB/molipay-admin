import { keepPreviousData,useQuery } from "@tanstack/react-query";
import { listFees,type FeeFilters } from "@/features/customers/fees.supabase";
import type { FeeCustomer,Page } from "@/infrastructure/supabase/legacy/types";

export function useFees(filters: FeeFilters) {
  const query = useQuery<Page<FeeCustomer>>({
    queryKey: ["comisiones", filters],
    queryFn: () => listFees(filters),
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
