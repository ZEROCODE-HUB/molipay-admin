import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ComerciosProvider } from "@/contexts/comercios";
import { TabLayout } from "@/components/tab-layout";

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
      <div className="space-y-4">
        <TabLayout
          tabs={[
            { label: "Comercios", to: "/admin/comercios" },
            { label: "Códigos de categoría", to: "/admin/comercios/categoria" },
          ]}
        >
          <Outlet />
        </TabLayout>
      </div>
    </ComerciosProvider>
  );
}
