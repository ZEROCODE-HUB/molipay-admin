import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TabLayout, type Tab } from "@/components/tab-layout";

export const Route = createFileRoute("/admin/modulos/impuestos")({
  component: Layout,
  head: () => ({
    meta: [
      { title: "Impuestos — Admin — Moli" },
      {
        name: "description",
        content: "Catálogo de impuestos, usuarios, ingresos brutos y excepciones de retención.",
      },
    ],
  }),
});

const tabs: Tab[] = [
  { label: "Impuestos", to: "/admin/modulos/impuestos" },
  { label: "Usuarios con Impuestos", to: "/admin/modulos/impuestos/usuarios" },
  { label: "Ingresos Brutos", to: "/admin/modulos/impuestos/ingresos-brutos" },
  { label: "Débitos y Créditos", to: "/admin/modulos/impuestos/debitos-creditos" },
];

function Layout() {
  return (
    <TabLayout tabs={tabs}>
      <Outlet />
    </TabLayout>
  );
}
