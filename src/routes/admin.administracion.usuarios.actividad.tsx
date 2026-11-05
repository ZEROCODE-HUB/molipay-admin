import { createFileRoute } from "@tanstack/react-router";
import { ActivityPage,type ActivityTab } from "@/features/activity/activity-page";

export const Route = createFileRoute("/admin/administracion/usuarios/actividad")({
  validateSearch: (s: Record<string, unknown>): { tab?: ActivityTab } =>
    s.tab === "security" || s.tab === "rbac" ? { tab: s.tab } : {},
  head: () => ({ meta: [{ title: "Actividad en backoffice — Admin Panel" }] }),
  component: ActivityPage,
});
