import { keepPreviousData,useQuery } from "@tanstack/react-query";
import {
listLinesMovement,
type LineFilters,
type LineMovement,
} from "@/features/movements/movement-lines.supabase";
import type { Page } from "@/infrastructure/supabase/legacy/types";
import { useRealtimeInvalidation } from "@/infrastructure/supabase/use-realtime-invalidation";

export function useLinesMovement(filters: LineFilters) {
  const query = useQuery<Page<LineMovement>>({
    queryKey: ["lineas-movimiento", filters],
    queryFn: () => listLinesMovement(filters),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  // Un asiento nuevo o un cambio de estado de la operacion cambia la tabla.
  useRealtimeInvalidation(
    [{ table: "ledger_entries" }, { table: "transactions" }],
    [["lineas-movimiento"]],
  );

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
