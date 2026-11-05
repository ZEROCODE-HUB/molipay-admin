import { createFileRoute } from "@tanstack/react-router";
import { MerchantsPage } from "@/features/merchants/components/merchants-page";

export const Route = createFileRoute("/admin/comercios/gestion/")({
  component: MerchantsPage,
  head: () => ({
    meta: [
      { title: "Gestión de comercios — Admin — Moli" },
      {
        name: "description",
        content:
          "Gestión centralizada de comercios y su asociación a los canales de la plataforma.",
      },
    ],
  }),
});
