import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TabLayout } from "@/components/tab-layout";

export const Route = createFileRoute("/admin/modulos")({
  component: ModulosLayout,
  head: () => ({
    meta: [
      { title: "Módulos — Admin — Molly Money Life" },
      { name: "description", content: "Gestión de módulos de la plataforma Molly." },
    ],
  }),
});

function ModulosLayout() {
  return (
    <TabLayout tabs={[
      { label: "Módulos", to: "/admin/modulos" },
      { label: "Pago con transferencia", to: "/admin/modulos/transferencia" },
      { label: "Link de pago", to: "/admin/modulos/link-pago" },
      { label: "Impuestos", to: "/admin/modulos/impuestos" },
      { label: "APIs externas", to: "/admin/modulos/apis" },
    ]}>
      <Outlet />
    </TabLayout>
  );
}
