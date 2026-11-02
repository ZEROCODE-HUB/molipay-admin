import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { usePermissions } from "@/lib/permissions";
import { LEGACY_PERMISSION_MAP, type PermissionCode } from "@/lib/permission-codes";
import { RouteSkeleton } from "@/components/route-skeleton";

export function NoAccess({
  message = "No tenés permiso para acceder a esta sección.",
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
      <Lock size={28} />
      <p>{message}</p>
      <p className="text-xs">Si lo necesitás, pedile a un administrador que te dé el permiso.</p>
    </div>
  );
}

/**
 * Guard de una seccion (UX). Mientras no hay permisos todavia muestra un
 * esqueleto (nunca "sin permiso" por un instante). La validacion real la hace
 * la base (RLS / RPC). El layout /admin ya protege todas las rutas; este guard
 * sirve para secciones internas con un permiso mas especifico.
 *
 *  - permission / anyOf: codigos nuevos.
 *  - recurso: compatibilidad con el esquema viejo (= lectura de ese recurso).
 */
export function PermissionGuard({
  permission,
  anyOf,
  recurso,
  children,
}: {
  permission?: PermissionCode;
  anyOf?: readonly PermissionCode[];
  recurso?: string;
  children: ReactNode;
}) {
  const { status, has, hasAny } = usePermissions();

  if (status === "loading") return <RouteSkeleton />;
  if (status !== "ready") return <NoAccess />;

  const codes: readonly PermissionCode[] = permission
    ? [permission]
    : (anyOf ?? (recurso ? (LEGACY_PERMISSION_MAP[`${recurso}:leer`] ?? []) : []));
  const allowed = codes.length > 0 ? (codes.length === 1 ? has(codes[0]) : hasAny(codes)) : false;
  return allowed ? <>{children}</> : <NoAccess />;
}
