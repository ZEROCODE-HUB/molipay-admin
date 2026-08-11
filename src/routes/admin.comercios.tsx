import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/admin/comercios")({
  component: ComerciosLayout,
  head: () => ({
    meta: [
      { title: "Comercios — Admin — Moli" },
      { name: "description", content: "Gestión de comercios de la plataforma Molly." },
    ],
  }),
});

function matchesPath(path: string, to: string) {
  return path === to || path.startsWith(to + "/");
}

const crumbLabels: [string, string][] = [
  ["/admin/comercios/transferencia", "Transferencia"],
  ["/admin/comercios/link-pago", "Link de pago"],
  ["/admin/comercios/impuestos", "Impuestos"],
  ["/admin/comercios/apis", "APIs externas"],
];

function Breadcrumb({ path }: { path: string }) {
  const active = crumbLabels
    .filter(([to]) => matchesPath(path, to))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[0];
  const label = crumbLabels.find(([to]) => to === active)?.[1] ?? "Transferencia";
  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span>Admin</span>
      <ChevronRight size={12} />
      <span>Comercios</span>
      <ChevronRight size={12} />
      <span className="font-medium text-foreground">{label}</span>
    </nav>
  );
}

function ComerciosLayout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <div className="space-y-4">
      <Breadcrumb path={path} />
      <Outlet />
    </div>
  );
}
