import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TabLayout, type Tab } from "@/components/tab-layout";

const tabs: Tab[] = [
  { label: "Listado de alertas", to: "/admin/general/alertas" },
  { label: "Listado de bloqueos", to: "/admin/general/alertas/bloqueos" },
  { label: "Parámetros de alertas", to: "/admin/general/alertas/parametros-alertas" },
  { label: "Parámetros de bloqueos", to: "/admin/general/alertas/parametros-bloqueos" },
];

export const Route = createFileRoute("/admin/general/alertas")({
  head: () => ({
    meta: [
      { title: "Alertas — Admin Molly" },
      { name: "description", content: "Gestión de alertas y bloqueos del sistema." },
    ],
  }),
  component: AlertasLayout,
});

function AlertasLayout() {
  return (
    <TabLayout tabs={tabs}>
      <Outlet />
    </TabLayout>
  );
}
