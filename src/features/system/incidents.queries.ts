import { queryOptions } from "@tanstack/react-query";
import { STALE } from "@/app/query-client";
import { privateScope } from "@/shared/lib/query-scope";
import { listIncidentBroadcasts } from "./incidents.supabase";

export const incidentKeys = {
  all: (userId: string) => [...privateScope(userId), "incident-broadcasts"] as const,
};

export const incidentQueries = {
  list: (userId: string) =>
    queryOptions({
      queryKey: incidentKeys.all(userId),
      queryFn: listIncidentBroadcasts,
      staleTime: STALE.moderate,
    }),
};
