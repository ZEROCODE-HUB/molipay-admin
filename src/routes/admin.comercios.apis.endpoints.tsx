import { createFileRoute } from "@tanstack/react-router";
import { EndpointsPage } from "@/features/external-apis/components/endpoints-page";

export const Route = createFileRoute("/admin/comercios/apis/endpoints")({
  component: EndpointsPage,
  head: () => ({
    meta: [{ title: "APIs externas — Endpoints — Admin — Moli" }],
  }),
});
