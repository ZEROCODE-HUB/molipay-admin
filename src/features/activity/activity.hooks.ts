import { useInfiniteQuery,useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth.hooks";
import { activityQueries } from "./activity.queries";
import type { RbacAuditFilters,SecurityEventFilters } from "./activity.types";

/** Usuario de la sesion para las keys privadas; las consultas esperan a tenerlo. */
function useSessionUserId(): string {
  return useAuth().user?.id ?? "";
}

export function useSecurityEvents(filters: SecurityEventFilters) {
  const userId = useSessionUserId();
  return useInfiniteQuery({
    ...activityQueries.securityEvents(userId, filters),
    enabled: !!userId,
  });
}

export function useSecurityEventTypes() {
  const userId = useSessionUserId();
  return useQuery({ ...activityQueries.securityEventTypes(userId), enabled: !!userId });
}

export function useRbacAudit(filters: RbacAuditFilters) {
  const userId = useSessionUserId();
  return useInfiniteQuery({ ...activityQueries.rbacAudit(userId, filters), enabled: !!userId });
}
