import { infiniteQueryOptions,queryOptions } from "@tanstack/react-query";
import { STALE } from "@/app/query-client";
import { privateScope } from "@/shared/lib/query-scope";
import { listRbacAudit,listSecurityEventTypes,listSecurityEvents } from "./activity.supabase";
import type {
RbacAuditCursor,
RbacAuditFilters,
SecurityEventCursor,
SecurityEventFilters,
} from "./activity.types";

export const activityKeys = {
  all: (userId: string) => [...privateScope(userId), "activity"] as const,
  securityEvents: (userId: string, filters: SecurityEventFilters) =>
    [...activityKeys.all(userId), "security-events", filters] as const,
  securityEventTypes: (userId: string) =>
    [...activityKeys.all(userId), "security-event-types"] as const,
  rbacAudit: (userId: string, filters: RbacAuditFilters) =>
    [...activityKeys.all(userId), "rbac-audit", filters] as const,
};

export const activityQueries = {
  securityEvents: (userId: string, filters: SecurityEventFilters) =>
    infiniteQueryOptions({
      queryKey: activityKeys.securityEvents(userId, filters),
      queryFn: ({ pageParam, signal }) => listSecurityEvents(filters, pageParam, { signal }),
      initialPageParam: null as SecurityEventCursor | null,
      getNextPageParam: (last) => last.nextCursor,
      staleTime: STALE.short,
    }),
  securityEventTypes: (userId: string) =>
    queryOptions({
      queryKey: activityKeys.securityEventTypes(userId),
      queryFn: ({ signal }) => listSecurityEventTypes({ signal }),
      staleTime: STALE.long,
    }),
  rbacAudit: (userId: string, filters: RbacAuditFilters) =>
    infiniteQueryOptions({
      queryKey: activityKeys.rbacAudit(userId, filters),
      queryFn: ({ pageParam, signal }) => listRbacAudit(filters, pageParam, { signal }),
      initialPageParam: null as RbacAuditCursor | null,
      getNextPageParam: (last) => last.nextCursor,
      staleTime: STALE.short,
    }),
};
