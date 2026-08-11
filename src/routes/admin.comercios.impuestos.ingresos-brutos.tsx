import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TabLayout, type Tab } from "@/components/tab-layout";

export const Route = createFileRoute("/admin/comercios/impuestos/ingresos-brutos")({
  component: Layout,
  head: () => ({
    meta: [{ title: "Ingresos Brutos — Admin — Moli" }],
  }),
});

const tabs: Tab[] = [
  { label: "Padrones y Normalización", to: "/admin/comercios/impuestos/ingresos-brutos" },
  { label: "Reportes", to: "/admin/comercios/impuestos/ingresos-brutos/reportes" },
];

function Layout() {
  return (
    <TabLayout tabs={tabs}>
      <Outlet />
    </TabLayout>
  );
}
