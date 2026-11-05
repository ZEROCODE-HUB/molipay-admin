import { keepPreviousData,useQuery } from "@tanstack/react-query";
import { listMovements,type MovementFilters } from "@/features/movements/movements.supabase";
import type { Movement,Page } from "@/infrastructure/supabase/legacy/types";
import { useRealtimeInvalidation } from "@/infrastructure/supabase/use-realtime-invalidation";

export function useMovements(filters: MovementFilters) {
  const query = useQuery<Page<Movement>>({
    queryKey: ["movimientos", filters],
    queryFn: () => listMovements(filters),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  useRealtimeInvalidation([{ table: "transactions" }], [["movimientos"]]);

  const rows = query.data?.rows ?? [];
  const filtersEstructuradosActives = Boolean(
    filters.estadoCodigo ||
    filters.tipo ||
    filters.clienteId ||
    filters.legajo ||
    filters.fechaDesde ||
    filters.fechaHasta ||
    filters.conImpuesto ||
    filters.conComision,
  );
  const countModeEfectivo = filtersEstructuradosActives
    ? "exact"
    : (filters.countMode ?? "estimated");
  const isEstimated = countModeEfectivo !== "exact";

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
    isEstimated,
    countModeEfectivo,
  };
}
