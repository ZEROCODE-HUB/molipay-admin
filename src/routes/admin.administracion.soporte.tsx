import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TabLayout, type Tab } from "@/components/tab-layout";

export const Route = createFileRoute("/admin/administracion/soporte")({
  component: Layout,
});

const tabs: Tab[] = [
  { label: "Consultas frecuentes", to: "/admin/administracion/soporte" },
  { label: "Bloqueo de funciones", to: "/admin/administracion/soporte/bloqueo" },
];

function Layout() {
  return (
    <TabLayout tabs={tabs}>
      <Outlet />
    </TabLayout>
  );
}
