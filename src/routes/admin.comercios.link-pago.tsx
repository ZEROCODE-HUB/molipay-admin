import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TabLayout, type Tab } from "@/components/tab-layout";

export const Route = createFileRoute("/admin/comercios/link-pago")({
  component: LinkPagoLayout,
  head: () => ({
    meta: [
      { title: "Link de pago — Admin — Moli" },
      { name: "description", content: "Gestión del módulo de link de pago." },
    ],
  }),
});

const tabs: Tab[] = [
  { label: "Comercios", to: "/admin/comercios/link-pago" },
  { label: "Métodos de pago", to: "/admin/comercios/link-pago/metodos-pago" },
];

function LinkPagoLayout() {
  return (
    <TabLayout tabs={tabs}>
      <Outlet />
    </TabLayout>
  );
}
