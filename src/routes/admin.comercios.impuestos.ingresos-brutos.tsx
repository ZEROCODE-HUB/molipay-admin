import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/comercios/impuestos/ingresos-brutos")({
  component: Layout,
  head: () => ({
    meta: [{ title: "Ingresos Brutos — Admin — Moli" }],
  }),
});

function Layout() {
  return (
    <div className="space-y-4">
      <Outlet />
    </div>
  );
}
