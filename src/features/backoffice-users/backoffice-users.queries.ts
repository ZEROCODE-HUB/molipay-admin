import { keepPreviousData,queryOptions } from "@tanstack/react-query";
import { STALE } from "@/app/query-client";
import { privateScope } from "@/shared/lib/query-scope";
import type { BackofficeUsersRepository } from "./backoffice-users.repository";
import type { BackofficeUserFilters } from "./backoffice-users.types";

export const backofficeUserKeys = {
  all: (userId: string) => [...privateScope(userId), "backoffice-users"] as const,
  list: (userId: string, filters: BackofficeUserFilters) =>
    [...backofficeUserKeys.all(userId), "list", filters] as const,
  activeOptions: (userId: string) => [...backofficeUserKeys.all(userId), "active-options"] as const,
};

export const createBackofficeUserQueries = (repository: BackofficeUsersRepository) => ({
  list: (userId: string, filters: BackofficeUserFilters) =>
    queryOptions({
      queryKey: backofficeUserKeys.list(userId, filters),
      queryFn: ({ signal }) => repository.list(filters, { signal }),
      placeholderData: keepPreviousData,
      staleTime: STALE.moderate,
    }),
  activeOptions: (userId: string) =>
    queryOptions({
      queryKey: backofficeUserKeys.activeOptions(userId),
      queryFn: ({ signal }) => repository.listActiveOptions({ signal }),
      staleTime: STALE.long,
    }),
});
