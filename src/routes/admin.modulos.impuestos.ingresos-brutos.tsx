import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TabLayout, type Tab } from "@/components/tab-layout";

export const Route = createFileRoute("/admin/modulos/impuestos/ingresos-brutos")({
  component: Layout,
  head: () => ({
    meta: [{ title: "Ingresos Brutos — Admin — Moli" }],
  }),
});

const tabs: Tab[] = [
  { label: "Gestión de Padrones", to: "/admin/modulos/impuestos/ingresos-brutos" },
  {
    label: "Normalización Retroactiva",
    to: "/admin/modulos/impuestos/ingresos-brutos/normalizacion",
  },
  { label: "Reportes", to: "/admin/modulos/impuestos/ingresos-brutos/reportes" },
];

function Layout() {
  return (
    <TabLayout tabs={tabs}>
      <Outlet />
    </TabLayout>
  );
}
