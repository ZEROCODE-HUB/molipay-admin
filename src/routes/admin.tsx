import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  Users,
  Activity,
  Bell,
  Headphones,
  Shield,
  FileBarChart2,
  BookOpen,
  Puzzle,
  CreditCard,
  Link2,
  Receipt,
  Code2,
  Settings,
  Cable,
  BellRing,
  Bot,
  ChevronDown,
  UserCog,
  Store,
  type LucideIcon,
} from "lucide-react";
import { PortalShell, type NavItem } from "@/components/portal-shell";
import { useDemoMode } from "@/contexts/demo-mode";
import { RouteSkeleton } from "@/components/route-skeleton";
import { AdminChatbot } from "@/components/admin-chatbot";
import { AlertasHeader } from "@/components/alertas/alertas-header";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/lib/permissions";
import { routePermissions } from "@/lib/route-permissions";
import { NoAccess } from "@/components/permission-guard";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  pendingComponent: RouteSkeleton,
});

const nav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  {
    label: "General",
    icon: Activity,
    items: [
      { to: "/admin/general/usuarios", label: "Usuarios", icon: Users },
      { to: "/admin/general/movimientos", label: "Movimientos", icon: Activity },
      { to: "/admin/general/alertas", label: "Alertas", icon: Bell },
    ],
  },
  {
    label: "Comercios",
    icon: Store,
    items: [
      { to: "/admin/comercios/gestion", label: "Gestión de comercios", icon: Store },
      // { to: "/admin/comercios/transferencia", label: "Pagos con QR", icon: CreditCard },
      { to: "/admin/comercios/link-pago", label: "Enlaces de pago", icon: Link2 },
      { to: "/admin/comercios/impuestos", label: "Impuestos", icon: Receipt },
      { to: "/admin/comercios/apis", label: "APIs externas", icon: Code2 },
    ],
  },
  {
    label: "Administración",
    icon: Shield,
    items: [
      { to: "/admin/administracion/usuarios", label: "Usuarios backoffice", icon: UserCog },
      { to: "/admin/administracion/reportes", label: "Reportes", icon: FileBarChart2 },
      { to: "/admin/administracion/registros", label: "Registros", icon: BookOpen },
      { to: "/admin/administracion/soporte", label: "Soporte", icon: Headphones },
    ],
  },
  {
    label: "Sistema",
    icon: Settings,
    items: [
      { to: "/admin/modulos", label: "Salud de módulos", icon: Puzzle },
      { to: "/admin/configuracion", label: "Integraciones", icon: Cable },
      { to: "/admin/centro-alertas", label: "Centro de alertas", icon: Bell },
      { to: "/admin/notificaciones", label: "Notificaciones", icon: BellRing },
    ],
  },
  { to: "/admin/incidentes", label: "Comunicación", icon: Bell },
];

/** Menu visible: solo lo que el rol puede ver (grupos vacios se ocultan). */
function useVisibleNav(): NavItem[] {
  const { session, hasAny } = usePermissions();
  return useMemo(() => {
    const canSee = (to: string) => {
      const required = routePermissions(to);
      return required === null ? !!session?.isSuperadmin : hasAny(required);
    };
    return nav.flatMap((item): NavItem[] => {
      if ("items" in item && item.items) {
        const items = item.items.filter((leaf) => canSee(leaf.to));
        return items.length > 0 ? [{ ...item, items }] : [];
      }
      return canSee((item as { to: string }).to) ? [item] : [];
    });
  }, [session, hasAny]);
}

function NotStaff({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-3">
        <h1 className="font-display text-xl font-semibold">Sin acceso al backoffice</h1>
        <p className="text-sm text-muted-foreground">
          Tu usuario no está habilitado en el backoffice o fue desactivado. Si creés que es un
          error, contactá a un administrador.
        </p>
        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex h-9 items-center rounded-md border border-input bg-card px-4 text-sm font-medium hover:bg-accent"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

function AdminLayout() {
  const { role, setRole } = useDemoMode();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { loading: authLoading, user, signOut } = useAuth();
  const { status, session, hasAny } = usePermissions();
  const visibleNav = useVisibleNav();

  useEffect(() => {
    if (role !== "admin" && role !== "operador") setRole("admin");
  }, [role, setRole]);

  // Sin sesion -> login. Clave pendiente (invitacion o reset) -> definir clave.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!authLoading && !user) navigate({ to: "/" });
    else if (session?.mustChangePassword) navigate({ to: "/definir-clave" });
  }, [authLoading, user, session?.mustChangePassword, navigate]);

  if (isSupabaseConfigured) {
    if (status === "loading" || (authLoading && status !== "ready")) return <RouteSkeleton />;
    if (status === "anonymous" || session?.mustChangePassword) return <RouteSkeleton />;
    if (status === "not_staff" || (session && !session.isActive)) {
      return <NotStaff onSignOut={() => void signOut().then(() => navigate({ to: "/" }))} />;
    }
  }

  const required = routePermissions(pathname);
  const allowed =
    !isSupabaseConfigured || (required === null ? !!session?.isSuperadmin : hasAny(required));

  return (
    <PortalShell
      nav={isSupabaseConfigured ? visibleNav : nav}
      title="Backoffice Molly"
      headerActions={<AlertasHeader />}
      account={
        session
          ? {
              name: session.fullName || session.email,
              email: session.email,
              role: session.roleName,
            }
          : null
      }
    >
      {allowed ? <Outlet /> : <NoAccess />}
      <AdminChatbot />
    </PortalShell>
  );
}
