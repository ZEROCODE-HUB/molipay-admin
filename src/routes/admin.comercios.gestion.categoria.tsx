import { createFileRoute } from "@tanstack/react-router";
import { CategoryMerchantPage } from "@/features/merchants/components/merchant-category-page";

export const Route = createFileRoute("/admin/comercios/gestion/categoria")({
  component: CategoryMerchantPage,
  head: () => ({
    meta: [
      { title: "Códigos de categoría — Admin — Moli" },
      {
        name: "description",
        content: "Administración de códigos de categoría para comercios.",
      },
    ],
  }),
});
