import { keepPreviousData,useQuery } from "@tanstack/react-query";
import {
listChannelsNotification,
type ChannelNotificationFilters,
} from "@/features/notifications/notification-channels.supabase";
import type { ChannelNotification,Page } from "@/infrastructure/supabase/legacy/types";

export function useChannelsNotification(filters: ChannelNotificationFilters) {
  const query = useQuery<Page<ChannelNotification>>({
    queryKey: ["canales_notificacion", filters],
    queryFn: () => listChannelsNotification(filters),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });

  const rows = query.data?.rows ?? [];
  return {
    rows,
    total: query.data?.total ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error as Error | null,
    isEmpty: !query.isLoading && rows.length === 0,
    refetch: query.refetch,
  };
}
