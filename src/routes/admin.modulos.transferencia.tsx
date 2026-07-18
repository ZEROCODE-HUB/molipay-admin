import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TabLayout } from "@/components/tab-layout";

export const Route = createFileRoute("/admin/modulos/transferencia")({
  component: TransferenciaLayout,
  head: () => ({
    meta: [
      { title: "Pago con transferencia — Admin — Molly Money Life" },
      { name: "description", content: "Gestión del módulo de pago con transferencia." },
    ],
  }),
});

function TransferenciaLayout() {
  return (
    <TabLayout tabs={[
      { label: "Comercios", to: "/admin/modulos/transferencia" },
      { label: "Resolvers", to: "/admin/modulos/transferencia/resolvers" },
      { label: "Códigos de categoría", to: "/admin/modulos/transferencia/categorias" },
    ]}>
      <Outlet />
    </TabLayout>
  );
}
