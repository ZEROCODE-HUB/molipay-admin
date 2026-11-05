import { useMemo } from "react";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth.hooks";
import { useCan } from "@/features/rbac/rbac.hooks";
import { externalApiKeys,externalApiQueries } from "./external-apis.queries";
import * as api from "./external-apis.supabase";
import type {
ApiEndpointFilters,
ApiEndpointInput,
ApiEnvironment,
EndpointStatus,
} from "./external-apis.types";

function useSessionUserId(): string {
  return useAuth().user?.id ?? "";
}

/** Puede aprobar, suspender, revocar y editar permisos / catalogo. */
export function useCanManageExternalApis(): boolean {
  return useCan().can("modificar", "apis_externas");
}

export function useApiIntegrations() {
  const userId = useSessionUserId();
  return useQuery({ ...externalApiQueries.integrations(userId), enabled: !!userId });
}

export function useApiIntegrationDetail(id: string | null | undefined) {
  const userId = useSessionUserId();
  return useQuery({ ...externalApiQueries.detail(userId, id ?? ""), enabled: !!userId && !!id });
}

export function useApiEndpoints(filters: ApiEndpointFilters) {
  const userId = useSessionUserId();
  return useQuery({ ...externalApiQueries.endpoints(userId, filters), enabled: !!userId });
}

/**
 * Escrituras de APIs externas. Cada una refresca todo el scope (listado, detalle y
 * catalogo): son pocas filas y el estado de una integracion afecta a todas las vistas.
 */
export function useExternalApiActions() {
  const userId = useSessionUserId();
  const queryClient = useQueryClient();
  return useMemo(() => {
    const after =
      <A extends unknown[]>(fn: (...args: A) => Promise<void>) =>
      async (...args: A) => {
        await fn(...args);
        await queryClient.invalidateQueries({ queryKey: externalApiKeys.all(userId) });
      };
    return {
      approveProduction: after((id: string) => api.approveProduction(id)),
      rejectProduction: after(api.rejectProduction),
      suspend: after(api.suspendIntegration),
      reactivate: after((id: string) => api.reactivateIntegration(id)),
      revoke: after(api.revokeIntegration),
      revokeKey: after(api.revokeKey),
      retryWebhook: after(api.retryWebhook),
      savePermissions: after(
        (
          id: string,
          environment: ApiEnvironment,
          permissions: { endpointId: string; allowed: boolean }[],
        ) => api.savePermissions(id, environment, permissions),
      ),
      saveLimits: after(api.saveLimits),
      createEndpoint: after((input: ApiEndpointInput) => api.createEndpoint(input)),
      updateEndpoint: after((id: string, input: ApiEndpointInput) => api.updateEndpoint(id, input)),
      setEndpointStatus: after((id: string, status: EndpointStatus) =>
        api.setEndpointStatus(id, status),
      ),
      deleteEndpoint: after(api.deleteEndpoint),
    };
  }, [queryClient, userId]);
}
