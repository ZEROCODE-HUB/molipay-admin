import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TabLayout, type Tab } from "@/components/tab-layout";

export const Route = createFileRoute("/admin/comercios/apis")({
  component: Layout,
  head: () => ({
    meta: [
      { title: "APIs externas — Admin — Moli" },
      { name: "description", content: "API de MoliPay para comercios: credenciales, permisos y catálogo de endpoints." },
    ],
  }),
});

const tabs: Tab[] = [
  { label: "Credenciales", to: "/admin/comercios/apis" },
  { label: "Endpoints", to: "/admin/comercios/apis/endpoints" },
  { label: "Permisos", to: "/admin/comercios/apis/restricciones" },
  { label: "Resolvers", to: "/admin/comercios/apis/resolvers" },
];

function Layout() {
  return (
    <TabLayout tabs={tabs}>
      <Outlet />
    </TabLayout>
  );
}
