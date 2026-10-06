import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getClienteByLegajo, listClientes, type ClienteFilters } from "@/lib/api/clientes";
import { requireSupabase } from "@/lib/supabase";
import type { Cliente, Page } from "@/lib/api/types";

export function useClientes(filters: ClienteFilters) {
  const queryClient = useQueryClient();
  const query = useQuery<Page<Cliente>>({
    queryKey: ["clientes", filters],
    queryFn: () => listClientes(filters),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const sb = requireSupabase();
    if (!sb) return;
    const tipoPart = filters.tipoPersona ?? "all";
    const channelName = `realtime-clientes-${tipoPart}`;
    const ch = sb
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "clientes" }, () => {
        queryClient.invalidateQueries({ queryKey: ["clientes"] });
      })
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [queryClient, filters.tipoPersona]);

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

export function useClienteByLegajo(legajo: string | null) {
  const query = useQuery<Cliente | null>({
    queryKey: ["clientes", "legajo", legajo],
    queryFn: () => getClienteByLegajo(legajo ?? ""),
    enabled: !!legajo,
    staleTime: 30_000,
  });
  return {
    cliente: (query.data ?? null) as Cliente | null | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
