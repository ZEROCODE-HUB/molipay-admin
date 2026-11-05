import { createFileRoute } from "@tanstack/react-router";
import { ModulesPage } from "@/features/system/components/modules-page";

export const Route = createFileRoute("/admin/modulos")({
  component: ModulesPage,
  head: () => ({
    meta: [
      { title: "Salud de módulos — Admin — Moli" },
      { name: "description", content: "Estado operativo de todos los módulos de la plataforma." },
    ],
  }),
});
