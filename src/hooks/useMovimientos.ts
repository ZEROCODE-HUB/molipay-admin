import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { listMovimientos, type MovimientoFilters } from "@/lib/api/movimientos";
import { requireSupabase } from "@/lib/supabase";
import type { Movimiento, Page } from "@/lib/api/types";

export function useMovimientos(filters: MovimientoFilters) {
  const queryClient = useQueryClient();
  const query = useQuery<Page<Movimiento>>({
    queryKey: ["movimientos", filters],
    queryFn: () => listMovimientos(filters),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const sb = requireSupabase();
    if (!sb) return;
    const tipoPart = filters.tipo ?? "all";
    const channelName = `realtime-movimientos-${tipoPart}`;
    const ch = sb
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "movimientos" }, () => {
        queryClient.invalidateQueries({ queryKey: ["movimientos"] });
      })
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [queryClient, filters.tipo]);

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
