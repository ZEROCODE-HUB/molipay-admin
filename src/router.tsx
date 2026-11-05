import { createQueryClient } from "./app/query-client";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { bindQueryCacheToSession } from "./app/session-cache";

export const getRouter = () => {
  const queryClient = createQueryClient();
  bindQueryCacheToSession(queryClient);

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 5 * 60 * 1000,
    defaultPendingMs: 0,
    defaultPendingMinMs: 200,
  });

  return router;
};
