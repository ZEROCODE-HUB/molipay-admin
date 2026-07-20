import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
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
  LogIn,
  MessageSquare,
  Send,
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
      { to: "/admin/soporte", label: "Soporte", icon: Headphones },
    ],
  },
  {
    label: "Comercios",
    icon: Store,
    items: [
      { to: "/admin/modulos/transferencia", label: "Pago con transferencia", icon: CreditCard },
      { to: "/admin/modulos/link-pago", label: "Link de pago", icon: Link2 },
      { to: "/admin/modulos/impuestos", label: "Impuestos", icon: Receipt },
      { to: "/admin/modulos/apis", label: "APIs externas", icon: Code2 },
    ],
  },
  {
    label: "Administración",
    icon: Shield,
    items: [
      { to: "/admin/administracion/usuarios", label: "Usuarios backoffice", icon: UserCog },
      { to: "/admin/administracion/reportes", label: "Reportes", icon: FileBarChart2 },
      { to: "/admin/administracion/registros", label: "Registros", icon: BookOpen },
    ],
  },
  {
    label: "Sistema",
    icon: Settings,
    items: [
      { to: "/admin/modulos", label: "Salud de módulos", icon: Puzzle },
      { to: "/admin/configuracion", label: "Gestor de Logins", icon: LogIn },
      { to: "/admin/configuracion/mensajes", label: "Mensajes de error", icon: MessageSquare },
      { to: "/admin/configuracion/telegram", label: "Telegram", icon: Send },
    ],
  },
  { to: "/admin/incidentes", label: "Comunicación", icon: Bell },
];

function AdminLayout() {
  const { role, setRole } = useDemoMode();
  useEffect(() => {
    if (role !== "admin") setRole("admin");
  }, [role, setRole]);
  return (
    <PortalShell nav={nav} title="Backoffice Molly">
      <Outlet />
      <AdminChatbot />
    </PortalShell>
  );
}
