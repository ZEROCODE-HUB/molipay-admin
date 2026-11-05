import { useNavigate,useSearch } from "@tanstack/react-router";
import { KeyRound,ShieldCheck } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { RouteSkeleton } from "@/shared/ui/route-skeleton";
import { SecurityEventsTab } from "./security-events-tab";
import { RbacAuditTab } from "./rbac-audit-tab";
import type { PermissionCode } from "@/features/rbac/permission-codes";
import { usePermissions } from "@/features/rbac/rbac.hooks";
import { NoAccess } from "@/features/rbac/access-gate";

/**
 * Actividad del backoffice:
 *  - Seguridad: security_events (autenticacion, API keys, usuarios, accesos denegados).
 *  - Roles y permisos: rbac_audit_log (cambios al sistema de autorizacion).
 * Cada pestaña exige su permiso; la base lo vuelve a validar en la RPC.
 */

export type ActivityTab = "security" | "rbac";

const TABS: {
  key: ActivityTab;
  label: string;
  icon: typeof ShieldCheck;
  permission: PermissionCode;
}[] = [
  {
    key: "security",
    label: "Eventos de seguridad",
    icon: ShieldCheck,
    permission: "backoffice.security_events.read",
  },
  { key: "rbac", label: "Roles y permisos", icon: KeyRound, permission: "backoffice.audit.read" },
];

export function ActivityPage() {
  const { status, has } = usePermissions();
  const { tab } = useSearch({ from: "/admin/administracion/usuarios/actividad" });
  const navigate = useNavigate({ from: "/admin/administracion/usuarios/actividad" });

  if (status === "loading") return <RouteSkeleton />;

  const available = TABS.filter((t) => has(t.permission));
  if (available.length === 0) return <NoAccess />;
  const active = available.find((t) => t.key === tab) ?? available[0];

  return (
    <>
      <PageHeader
        title="Actividad en backoffice"
        description="Eventos de seguridad y cambios de roles y permisos. Los registros no se pueden modificar ni borrar."
      />
      <div className="mb-3 flex flex-wrap gap-1 border-b border-border">
        {available.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => navigate({ search: { tab: t.key }, replace: true })}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium ${
              active.key === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>
      {active.key === "security" ? <SecurityEventsTab /> : <RbacAuditTab />}
    </>
  );
}
