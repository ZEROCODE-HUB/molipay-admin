import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TabLayout } from "@/components/tab-layout";

export const Route = createFileRoute("/admin/comercios/codigos")({
  component: CodigosLayout,
  head: () => ({
    meta: [
      { title: "Códigos de comercio — Admin — Moli" },
      { name: "description", content: "Gestión de códigos de comercio." },
    ],
  }),
});

function CodigosLayout() {
  return (
    <div className="space-y-4">
      <TabLayout
        tabs={[
          { label: "Códigos de categoría", to: "/admin/comercios/codigos/categoria" },
        ]}
      >
        <Outlet />
      </TabLayout>
    </div>
  );
}
