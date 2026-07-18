import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { TabLayout } from "@/components/tab-layout";
import { RouteSkeleton } from "@/components/route-skeleton";

const TABS = ["Listado de alertas", "Listado de bloqueos", "Parámetros de alertas", "Parámetros de bloqueos"];

const TAB_ROUTES: Record<string, string> = {
  "Listado de alertas": "/admin/general/alertas",
  "Listado de bloqueos": "/admin/general/alertas/bloqueos",
  "Parámetros de alertas": "/admin/general/alertas/parametros-alertas",
  "Parámetros de bloqueos": "/admin/general/alertas/parametros-bloqueos",
};

export const Route = createFileRoute("/admin/general/alertas")({
  component: AlertasLayout,
  pendingComponent: RouteSkeleton,
});

function AlertasLayout() {
  const navigate = useNavigate();
  const path = window.location.pathname;

  const activeTab = Object.entries(TAB_ROUTES).find(([, r]) => path === r || (r !== "/admin/general/alertas" && path.startsWith(r)))?.[0] ?? "Listado de alertas";

  return (
    <div>
      <PageHeader
        title="Alertas"
        description="Gestión de alertas y bloqueos del sistema."
      />
      <TabLayout
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(tab) => navigate({ to: TAB_ROUTES[tab] })}
      >
        <Outlet />
      </TabLayout>
    </div>
  );
}
