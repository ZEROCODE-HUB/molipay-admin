import { useCallback } from "react";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { backofficeUsersRepository } from "@/app/dependencies";
import { useAuth } from "@/features/auth/auth.hooks";
import { backofficeUserKeys,createBackofficeUserQueries } from "./backoffice-users.queries";
import type { BackofficeUserFilters,InviteBackofficeUserInput } from "./backoffice-users.types";

const queries = createBackofficeUserQueries(backofficeUsersRepository);

function useSessionUserId(): string {
  return useAuth().user?.id ?? "";
}

export function useBackofficeUsers(filters: BackofficeUserFilters) {
  const userId = useSessionUserId();
  return useQuery({ ...queries.list(userId, filters), enabled: !!userId });
}

/** Usuarios activos para selectores (p. ej. ejecutivo responsable de un comercio). */
export function useActiveBackofficeUsers() {
  const userId = useSessionUserId();
  return useQuery({ ...queries.activeOptions(userId), enabled: !!userId });
}

/** Escrituras; despues de cada una se refresca el listado de usuarios. */
export function useBackofficeUserActions() {
  const userId = useSessionUserId();
  const queryClient = useQueryClient();
  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: backofficeUserKeys.all(userId) }),
    [queryClient, userId],
  );

  return {
    refresh,
    invite: (input: InviteBackofficeUserInput) => backofficeUsersRepository.invite(input),
    update: (id: string, fullName: string, roleId: string) =>
      backofficeUsersRepository.update(id, fullName, roleId),
    sendPasswordLink: (id: string) => backofficeUsersRepository.sendPasswordLink(id),
    setActive: (id: string, active: boolean) => backofficeUsersRepository.setActive(id, active),
  };
}
