import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TabLayout, type Tab } from "@/components/tab-layout";

export const Route = createFileRoute("/admin/comercios/impuestos")({
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
  { label: "Impuestos", to: "/admin/comercios/impuestos" },
  { label: "Usuarios con impuestos", to: "/admin/comercios/impuestos/usuarios" },
  { label: "Ingresos brutos", to: "/admin/comercios/impuestos/ingresos-brutos" },
  { label: "Débitos y créditos", to: "/admin/comercios/impuestos/debitos-creditos" },
];

function Layout() {
  return (
    <TabLayout tabs={tabs}>
      <Outlet />
    </TabLayout>
  );
}
