import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QK_ACRED, countAdvancesNeedingAction } from "@/features/payment-links/credits.supabase";
import { TabLayout, type Tab } from "@/shared/ui/tab-layout";

export const Route = createFileRoute("/admin/comercios/link-pago")({
  component: LinkPaymentLayout,
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
  { label: "Lotes de Venta", to: "/admin/comercios/link-pago/lotes-venta" },
  { label: "Calendario", to: "/admin/comercios/link-pago/calendario-acreditaciones" },
  { label: "Contracargos", to: "/admin/comercios/link-pago/contracargos" },
  { label: "Adelantos de Dinero", to: "/admin/comercios/link-pago/adelantos" },
  { label: "Resumen general", to: "/admin/comercios/link-pago/resumen" },
  { label: "Parámetros", to: "/admin/comercios/link-pago/parametros" },
];

function LinkPaymentLayout() {
  // Adelantos nuevos o aceptados: aviso en la pestaña. Se refresca con el resto de acreditaciones.
  const pendingAdvances = useQuery({
    queryKey: [...QK_ACRED, "adelantos-por-atender"],
    queryFn: countAdvancesNeedingAction,
    refetchInterval: 60_000,
  });
  const withBadges = tabs.map((t) =>
    t.to === "/admin/comercios/link-pago/adelantos" ? { ...t, badge: pendingAdvances.data } : t,
  );
  return (
    <TabLayout tabs={withBadges}>
      <Outlet />
    </TabLayout>
  );
}
