import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  listImpuestos,
  listAlicuotas,
  listImpuestosAsignaciones,
  listImpuestosForAsignacion,
  listIbPadrones,
  listIbNormalizacionPreviews,
  getLatestNormalizacionPreviewByPadron,
  type ImpuestoFilters,
  type AlicuotaFilters,
  type ImpuestoAsignacionFilters,
  type IbPadronFilters,
  type IbNormalizacionPreviewFilters,
} from "@/lib/api/impuestos";
import type {
  Alicuota,
  Impuesto,
  ImpuestoAsignacion,
  IbPadron,
  IbNormalizacionPreview,
  Page,
} from "@/lib/api/types";

export function useImpuestos(filters: ImpuestoFilters) {
  const query = useQuery<Page<Impuesto>>({
    queryKey: ["impuestos", filters],
    queryFn: () => listImpuestos(filters),
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

export function useAlicuotas(filters: AlicuotaFilters) {
  const query = useQuery<Page<Alicuota>>({
    queryKey: ["impuestos_alicuotas", filters],
    queryFn: () => listAlicuotas(filters),
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

export function useImpuestosAsignaciones(filters: ImpuestoAsignacionFilters) {
  const query = useQuery<Page<ImpuestoAsignacion>>({
    queryKey: ["impuestos_asignaciones", filters],
    queryFn: () => listImpuestosAsignaciones(filters),
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

export function useImpuestosForAsignacion() {
  const query = useQuery({
    queryKey: ["impuestos", "para-asignacion"],
    queryFn: listImpuestosForAsignacion,
    staleTime: 5 * 60_000,
  });
  return {
    rows: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
  };
}

export function useIbPadrones(filters: IbPadronFilters) {
  const query = useQuery<Page<IbPadron>>({
    queryKey: ["ib_padrones", filters],
    queryFn: () => listIbPadrones(filters),
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

export function useIbNormalizacionPreviews(filters: IbNormalizacionPreviewFilters) {
  const query = useQuery<Page<IbNormalizacionPreview>>({
    queryKey: ["ib_normalizacion_preview", filters],
    queryFn: () => listIbNormalizacionPreviews(filters),
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

export function useLatestNormalizacionPreview(padronId: string | null) {
  const query = useQuery({
    queryKey: ["ib_normalizacion_preview", "latest", padronId],
    queryFn: () => getLatestNormalizacionPreviewByPadron(padronId!),
    enabled: !!padronId,
    staleTime: 30_000,
  });
  return {
    preview: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
  };
}
