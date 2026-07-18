import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TabLayout, type Tab } from "@/components/tab-layout";

export const Route = createFileRoute("/admin/administracion/usuarios")({
  component: Layout,
});

const tabs: Tab[] = [
  { label: "Administración de personal", to: "/admin/administracion/usuarios" },
  { label: "Roles y permisos", to: "/admin/administracion/usuarios/roles" },
];

function Layout() {
  return <TabLayout tabs={tabs}><Outlet /></TabLayout>;
}
