import { createFileRoute, Outlet } from "@tanstack/react-router";

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
    <div className="space-y-4">
      <Outlet />
    </div>
  );
}
