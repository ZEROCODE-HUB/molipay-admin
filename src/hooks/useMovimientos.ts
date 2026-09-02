import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listMovimientos, type MovimientoFilters } from "@/lib/api/movimientos";
import type { Movimiento, Page } from "@/lib/api/types";

export function useMovimientos(filters: MovimientoFilters) {
  const query = useQuery<Page<Movimiento>>({
    queryKey: ["movimientos", filters],
    queryFn: () => listMovimientos(filters),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  const rows = query.data?.rows ?? [];
  const filtrosEstructuradosActivos = Boolean(
    filters.estadoCodigo ||
      filters.tipo ||
      filters.clienteId ||
      filters.legajo ||
      filters.fechaDesde ||
      filters.fechaHasta ||
      filters.conImpuesto ||
      filters.conComision,
  );
  const countModeEfectivo = filtrosEstructuradosActivos ? "exact" : (filters.countMode ?? "estimated");
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
