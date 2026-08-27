import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TabLayout } from "@/components/tab-layout";

export const Route = createFileRoute("/admin/comercios/transferencia")({
  component: TransferenciaLayout,
  head: () => ({
    meta: [
      { title: "Pagos con transferencia — Admin — Moli" },
      { name: "description", content: "Gestión de pagos con transferencia." },
    ],
  }),
});

function TransferenciaLayout() {
  return (
    <div className="space-y-4">
      <TabLayout
        tabs={[{ label: "Comercios", to: "/admin/comercios/transferencia" }]}
      >
        <Outlet />
      </TabLayout>
    </div>
  );
}
