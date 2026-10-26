import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { listLineasMovimiento, type LineaFilters, type LineaMovimiento } from "@/lib/api/lineas-movimiento";
import { requireSupabase } from "@/lib/supabase";
import type { Page } from "@/lib/api/types";

export function useLineasMovimiento(filters: LineaFilters) {
  const queryClient = useQueryClient();
  const query = useQuery<Page<LineaMovimiento>>({
    queryKey: ["lineas-movimiento", filters],
    queryFn: () => listLineasMovimiento(filters),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  // Un asiento nuevo o un cambio de estado de la operacion cambia la tabla.
  useEffect(() => {
    const sb = requireSupabase();
    if (!sb) return;
    const invalidar = () => queryClient.invalidateQueries({ queryKey: ["lineas-movimiento"] });
    const ch = sb
      .channel("realtime-lineas-movimiento")
      .on("postgres_changes", { event: "*", schema: "public", table: "ledger_entries" }, invalidar)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, invalidar)
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [queryClient]);

  const rows = query.data?.rows ?? [];
  return {
    rows,
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error as Error | null,
    isEmpty: !query.isLoading && rows.length === 0,
    refetch: query.refetch,
  };
}
