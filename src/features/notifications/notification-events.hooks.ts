import { keepPreviousData,useQuery } from "@tanstack/react-query";
import {
listEventsNotification,
type EventNotificationFilters,
} from "@/features/notifications/notification-events.supabase";
import type { EventNotification,Page } from "@/infrastructure/supabase/legacy/types";

export function useEventsNotification(filters: EventNotificationFilters) {
  const query = useQuery<Page<EventNotification>>({
    queryKey: ["eventos_notificacion", filters],
    queryFn: () => listEventsNotification(filters),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
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
