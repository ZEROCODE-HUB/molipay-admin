import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  listDcExcepciones,
  listDcSyncRetroactivos,
  type DcExcepcionFilters,
  type DcSyncRetroactivoFilters,
} from "@/lib/api/dc-excepciones";
import type { DcExcepcion, DcSyncRetroactivo, Page } from "@/lib/api/types";

export function useDcExcepciones(filters: DcExcepcionFilters) {
  const query = useQuery<Page<DcExcepcion>>({
    queryKey: ["dc_excepciones", filters],
    queryFn: () => listDcExcepciones(filters),
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

export function useDcSyncRetroactivos(filters: DcSyncRetroactivoFilters) {
  const query = useQuery<Page<DcSyncRetroactivo>>({
    queryKey: ["dc_sync_retroactivo", filters],
    queryFn: () => listDcSyncRetroactivos(filters),
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
