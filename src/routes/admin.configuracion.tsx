import { createFileRoute,Outlet } from "@tanstack/react-router";
import { TabLayout,type Tab } from "@/shared/ui/tab-layout";
import { PageHeader } from "@/shared/ui/page-header";
import { DeveloperModeToggle } from "@/app/developer-mode-toggle";

export const Route = createFileRoute("/admin/configuracion")({
  component: ConfiguracionLayout,
  head: () => ({
    meta: [
      { title: "Configuración — Admin — Moli" },
      { name: "description", content: "Configuración del sistema administrativo Molly." },
    ],
  }),
});

const tabs: Tab[] = [
  { label: "Resumen", to: "/admin/configuracion" },
  { label: "Logins configurados", to: "/admin/configuracion/logins" },
  { label: "Configuraciones de login", to: "/admin/configuracion/configuraciones" },
];

function ConfiguracionLayout() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Gestor de Integraciones"
        description="Seguimiento del estado de las integraciones que alimentan a la plataforma."
        action={<DeveloperModeToggle />}
      />
      <TabLayout tabs={tabs}>
        <Outlet />
      </TabLayout>
    </div>
  );
}
