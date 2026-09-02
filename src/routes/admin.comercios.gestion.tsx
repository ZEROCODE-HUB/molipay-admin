import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TabLayout, type Tab } from "@/components/tab-layout";

export const Route = createFileRoute("/admin/comercios/gestion")({
  component: GestionLayout,
  head: () => ({
    meta: [
      { title: "Gestión — Admin — Moli" },
      { name: "description", content: "Gestión de comercios de la plataforma Moli." },
    ],
  }),
});

const tabs: Tab[] = [
  { label: "Comercios", to: "/admin/comercios/gestion" },
  { label: "Código de categoría", to: "/admin/comercios/gestion/categoria" },
];

function GestionLayout() {
  return (
    <div className="space-y-4">
      <TabLayout tabs={tabs}>
        <Outlet />
      </TabLayout>
    </div>
  );
}
