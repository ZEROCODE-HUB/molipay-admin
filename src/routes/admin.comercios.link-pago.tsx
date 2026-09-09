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
  { label: "Links de Pago", to: "/admin/comercios/link-pago" },
  { label: "Lotes de Acreditación", to: "/admin/comercios/link-pago/lotes" },
  { label: "Contracargos", to: "/admin/comercios/link-pago/contracargos" },
  { label: "Adelantos de Dinero", to: "/admin/comercios/link-pago/adelantos" },
  { label: "Resumen general", to: "/admin/comercios/link-pago/resumen" },
];

function LinkPagoLayout() {
  return (
    <TabLayout tabs={tabs}>
      <Outlet />
    </TabLayout>
  );
}
