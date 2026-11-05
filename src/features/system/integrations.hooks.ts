import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth.hooks";
import { integrationQueries } from "./integrations.queries";
import type { IntegrationFilters } from "./integrations.types";

export function useIntegrations(filters: IntegrationFilters) {
  const userId = useAuth().user?.id ?? "";
  const query = useQuery({ ...integrationQueries.list(userId, filters), enabled: !!userId });
  const rows = query.data?.rows ?? [];
  return {
    ...query,
    rows,
    total: query.data?.total ?? 0,
    isEmpty: !query.isPending && rows.length === 0,
  };
}
