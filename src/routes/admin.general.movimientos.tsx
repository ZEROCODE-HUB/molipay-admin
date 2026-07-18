import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TabLayout, type Tab } from "@/components/tab-layout";

export const Route = createFileRoute("/admin/general/movimientos")({
  head: () => ({
    meta: [
      { title: "Movimientos — Admin Molly" },
      { name: "description", content: "Historial de movimientos de la plataforma Molly Money Life." },
    ],
  }),
  component: MovimientosLayout,
});

const tabs: Tab[] = [
  { label: "Todos los movimientos", to: "/admin/general/movimientos" },
  { label: "Depósitos", to: "/admin/general/movimientos/depositos" },
  { label: "Retiros", to: "/admin/general/movimientos/retiros" },
  { label: "Cobro de comisiones", to: "/admin/general/movimientos/comisiones" },
  { label: "Impuestos cobrados", to: "/admin/general/movimientos/impuestos" },
  { label: "Pagos con tarjeta", to: "/admin/general/movimientos/pagos-tarjeta" },
  { label: "Pagos QR", to: "/admin/general/movimientos/pagos-qr" },
  { label: "Cobros QR", to: "/admin/general/movimientos/cobros-qr" },
];

function MovimientosLayout() {
  return (
    <TabLayout tabs={tabs}>
      <Outlet />
    </TabLayout>
  );
}
