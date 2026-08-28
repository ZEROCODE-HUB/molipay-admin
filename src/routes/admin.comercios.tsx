import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ComerciosProvider } from "@/contexts/comercios";

export const Route = createFileRoute("/admin/comercios")({
  component: ComerciosLayout,
  head: () => ({
    meta: [
      { title: "Comercios — Admin — Moli" },
      { name: "description", content: "Gestión de comercios de la plataforma Molly." },
    ],
  }),
});

function ComerciosLayout() {
  return (
    <ComerciosProvider>
      <Outlet />
    </ComerciosProvider>
  );
}
