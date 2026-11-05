import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth.hooks";
import { createIncidentBroadcast } from "./incidents.supabase";
import { incidentKeys, incidentQueries } from "./incidents.queries";

export function useIncidentBroadcasts() {
  const userId = useAuth().user?.id ?? "";
  return useQuery({ ...incidentQueries.list(userId), enabled: !!userId });
}

export function useCreateIncidentBroadcast() {
  const userId = useAuth().user?.id ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createIncidentBroadcast,
    onSuccess: () => qc.invalidateQueries({ queryKey: incidentKeys.all(userId) }),
  });
}
