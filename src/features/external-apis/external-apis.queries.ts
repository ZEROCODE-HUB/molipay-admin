import { keepPreviousData,queryOptions } from "@tanstack/react-query";
import { STALE } from "@/app/query-client";
import { privateScope } from "@/shared/lib/query-scope";
import { getIntegrationDetail,listEndpoints,listIntegrations } from "./external-apis.supabase";
import type { ApiEndpointFilters } from "./external-apis.types";

export const externalApiKeys = {
  all: (userId: string) => [...privateScope(userId), "external-apis"] as const,
  integrations: (userId: string) => [...externalApiKeys.all(userId), "integrations"] as const,
  detail: (userId: string, id: string) =>
    [...externalApiKeys.all(userId), "integration", id] as const,
  endpoints: (userId: string, filters: ApiEndpointFilters) =>
    [...externalApiKeys.all(userId), "endpoints", filters] as const,
};

export const externalApiQueries = {
  integrations: (userId: string) =>
    queryOptions({
      queryKey: externalApiKeys.integrations(userId),
      queryFn: ({ signal }) => listIntegrations({ signal }),
      staleTime: STALE.short,
    }),
  detail: (userId: string, id: string) =>
    queryOptions({
      queryKey: externalApiKeys.detail(userId, id),
      queryFn: ({ signal }) => getIntegrationDetail(id, { signal }),
      staleTime: STALE.short,
    }),
  endpoints: (userId: string, filters: ApiEndpointFilters) =>
    queryOptions({
      queryKey: externalApiKeys.endpoints(userId, filters),
      queryFn: ({ signal }) => listEndpoints(filters, { signal }),
      placeholderData: keepPreviousData,
      staleTime: STALE.moderate,
    }),
};
