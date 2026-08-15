import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
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
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/admin" className="hover:text-foreground transition-colors">
          Admin
        </Link>
        <span aria-hidden>→</span>
        <Link to="/admin/comercios" className="hover:text-foreground transition-colors">
          Comercios
        </Link>
        <span aria-hidden>→</span>
        <span className="text-foreground font-medium">Transferencia</span>
      </nav>
      <TabLayout
        tabs={[
          { label: "Comercios", to: "/admin/comercios/transferencia" },
          { label: "Resolvers", to: "/admin/comercios/transferencia/resolvers" },
          { label: "Códigos de categoría", to: "/admin/comercios/transferencia/categorias" },
        ]}
      >
        <Outlet />
      </TabLayout>
    </div>
  );
}
