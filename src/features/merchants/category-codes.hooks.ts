import { keepPreviousData,useQuery } from "@tanstack/react-query";
import {
listCodesCategory,
type CodeCategoryFilters,
} from "@/features/merchants/category-codes.supabase";
import type { CodeCategory,Page } from "@/infrastructure/supabase/legacy/types";

export function useCodesCategory(filters: CodeCategoryFilters) {
  const query = useQuery<Page<CodeCategory>>({
    queryKey: ["codigos_categoria", filters],
    queryFn: () => listCodesCategory(filters),
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
