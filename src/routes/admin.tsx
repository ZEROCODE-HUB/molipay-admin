import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

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
      { to: "/admin/comercios/gestion", label: "Gestión", icon: Store },
      { to: "/admin/comercios/transferencia", label: "Transferencia", icon: CreditCard },
      { to: "/admin/comercios/link-pago", label: "Link de Pago", icon: Link2 },
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
      { to: "/admin/notificaciones", label: "Notificaciones", icon: BellRing },
    ],
  },
  { to: "/admin/incidentes", label: "Comunicación", icon: Bell },
];

function AdminLayout() {
  const { role, setRole } = useDemoMode();
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (role !== "admin" && role !== "operador") setRole("admin");
  }, [role, setRole]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) setAuthChecked(true);
      else navigate({ to: "/" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session) setAuthChecked(true);
      else navigate({ to: "/" });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (!authChecked) return <RouteSkeleton />;

  return (
    <PortalShell nav={nav} title="Backoffice Molly">
      <Outlet />
      <AdminChatbot />
    </PortalShell>
  );
}
