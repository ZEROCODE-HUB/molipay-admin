import { createFileRoute } from "@tanstack/react-router";
import { ResolversPage } from "@/features/external-apis/components/resolvers-page";

export const Route = createFileRoute("/admin/comercios/apis/resolvers")({
  component: ResolversPage,
  head: () => ({
    meta: [
      { title: "Resolvers — APIs externas — Admin — Moli" },
      { name: "description", content: "Gestión de resolvers PCT (pagos con transferencia)." },
    ],
  }),
});
