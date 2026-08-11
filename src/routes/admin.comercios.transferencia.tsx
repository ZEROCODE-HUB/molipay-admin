import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TabLayout } from "@/components/tab-layout";

export const Route = createFileRoute("/admin/comercios/transferencia")({
  component: TransferenciaLayout,
  head: () => ({
    meta: [
      { title: "Pago por referencia — Admin — Moli" },
      { name: "description", content: "Gestión de pagos por referencia (transferencia)." },
    ],
  }),
});

function TransferenciaLayout() {
  return (
    <TabLayout tabs={[
      { label: "Comercios", to: "/admin/comercios/transferencia" },
      { label: "Resolvers", to: "/admin/comercios/transferencia/resolvers" },
      { label: "Códigos de categoría", to: "/admin/comercios/transferencia/categorias" },
    ]}>
      <Outlet />
    </TabLayout>
  );
}
