import { createFileRoute } from "@tanstack/react-router";
import { CategoriaComercioPage } from "@/components/categoria-comercio-page";

export const Route = createFileRoute("/admin/comercios/transferencia/categorias")({
  component: CategoriaComercioPage,
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
