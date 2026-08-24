import { usePermisos } from "@/lib/permissions";
import { useAuth } from "@/lib/auth";
import { Lock } from "lucide-react";

function SinPermiso() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
      <Lock size={28} />
      <p>No tenés permiso para acceder a esta sección.</p>
    </div>
  );
}

/**
 * Guard de ruta (UX / defense-in-depth). Si el rol no tiene `puede_leer`
 * sobre `recurso`, muestra "Sin permiso" en lugar de los children.
 * La validación real sigue estando en RLS + la RPC.
 */
export function PermissionGuard({
  recurso,
  children,
}: {
  recurso: string;
  children: React.ReactNode;
}) {
  const { admin } = useAuth();
  const { data, isLoading } = usePermisos();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
        Cargando permisos…
      </div>
    );
  }
  if (!admin) return <SinPermiso />;
  const p = data?.get(recurso);
  if (!p?.puedeLeer) return <SinPermiso />;
  return <>{children}</>;
}
