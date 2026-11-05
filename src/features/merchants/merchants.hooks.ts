import { keepPreviousData,useQuery } from "@tanstack/react-query";
import {
listMerchants,
listCustomersForSelect,
type MerchantFilters,
} from "@/features/merchants/merchants.supabase";
import type { CustomerSelect,Merchant,Page } from "@/infrastructure/supabase/legacy/types";

export function useMerchants(filters: MerchantFilters) {
  const query = useQuery<Page<Merchant>>({
    queryKey: ["comercios", filters],
    queryFn: () => listMerchants(filters),
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

export function useCustomersForSelect(search?: string) {
  return useQuery<CustomerSelect[]>({
    queryKey: ["clientes", "select", search ?? ""],
    queryFn: () => listCustomersForSelect(search),
    staleTime: 5 * 60_000,
  });
}
