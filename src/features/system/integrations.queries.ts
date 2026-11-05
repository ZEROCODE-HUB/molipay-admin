import { keepPreviousData,queryOptions } from "@tanstack/react-query";
import { STALE } from "@/app/query-client";
import { privateScope } from "@/shared/lib/query-scope";
import { listIntegrations } from "./integrations.supabase";
import type { IntegrationFilters } from "./integrations.types";

export const integrationKeys = {
  all: (userId: string) => [...privateScope(userId), "integrations"] as const,
  list: (userId: string, filters: IntegrationFilters) =>
    [...integrationKeys.all(userId), "list", filters] as const,
};

export const integrationQueries = {
  list: (userId: string, filters: IntegrationFilters) =>
    queryOptions({
      queryKey: integrationKeys.list(userId, filters),
      queryFn: ({ signal }) => listIntegrations(filters, { signal }),
      placeholderData: keepPreviousData,
      staleTime: STALE.moderate,
    }),
};
