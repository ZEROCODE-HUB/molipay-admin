import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TabLayout, type Tab } from "@/components/tab-layout";

export const Route = createFileRoute("/admin/general/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuarios — Admin Molly" },
      { name: "description", content: "Gestión de usuarios de la plataforma Molly Money Life." },
    ],
  }),
  component: UsuariosLayout,
});

const tabs: Tab[] = [
  { label: "Personas físicas", to: "/admin/general/usuarios" },
  { label: "Personas jurídicas", to: "/admin/general/usuarios/juridicas" },
  { label: "Usuarios con CVU", to: "/admin/general/usuarios/cvu" },
  { label: "Carga de comisiones", to: "/admin/general/usuarios/comisiones" },
];

function UsuariosLayout() {
  return (
    <TabLayout tabs={tabs}>
      <Outlet />
    </TabLayout>
  );
}
