import { keepPreviousData,useQuery } from "@tanstack/react-query";
import {
listTaxes,
listRates,
listTaxesAssignments,
listTaxesForAssignment,
type TaxFilters,
type RateFilters,
type ImpuestoAsignacionFilters,
} from "@/features/taxes/taxes.supabase";
import type { Rate,Tax,TaxAssignment,Page } from "@/infrastructure/supabase/legacy/types";

export function useTaxes(filters: TaxFilters) {
  const query = useQuery<Page<Tax>>({
    queryKey: ["impuestos", filters],
    queryFn: () => listTaxes(filters),
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

export function useRates(filters: RateFilters) {
  const query = useQuery<Page<Rate>>({
    queryKey: ["tax_rates", filters],
    queryFn: () => listRates(filters),
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

export function useTaxesAssignments(filters: ImpuestoAsignacionFilters) {
  const query = useQuery<Page<TaxAssignment>>({
    queryKey: ["tax_assignments", filters],
    queryFn: () => listTaxesAssignments(filters),
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

export function useTaxesForAssignment() {
  const query = useQuery({
    queryKey: ["impuestos", "para-asignacion"],
    queryFn: listTaxesForAssignment,
    staleTime: 5 * 60_000,
  });
  return {
    rows: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
  };
}
