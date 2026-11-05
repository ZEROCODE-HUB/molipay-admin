import type { PermissionCode } from "./permission-codes";

/**
 * Permiso de lectura que exige cada seccion del backoffice. El layout /admin lo
 * aplica a TODAS las rutas (aunque una pagina no tenga su propio guard) y el
 * menu lo usa para ocultar lo que el rol no puede ver.
 *
 * Gana el prefijo mas largo. Una ruta de /admin que no figure aca queda solo
 * para el rol Admin (por defecto, cerrado).
 */
const ROUTE_PERMISSIONS: [prefix: string, anyOf: PermissionCode[]][] = [
  ["/admin/general/usuarios/juridicas", ["customers.legal_entities.read"]],
  ["/admin/general/usuarios/comisiones", ["customers.commissions.read"]],
  ["/admin/general/usuarios/cvu", ["customers.cvu.read"]],
  ["/admin/general/usuarios", ["customers.read"]],
  ["/admin/general/movimientos", ["movements.read"]],
  ["/admin/general/alertas/bloqueos", ["alerts.blocks.read"]],
  ["/admin/general/alertas/parametros-alertas", ["alerts.rules.manage"]],
  ["/admin/general/alertas/parametros-bloqueos", ["alerts.rules.manage"]],
  ["/admin/general/alertas", ["alerts.read"]],

  ["/admin/comercios/gestion", ["merchants.read"]],
  ["/admin/comercios/link-pago/acreditaciones", ["payment_links.settlements.read"]],
  ["/admin/comercios/link-pago/calendario-acreditaciones", ["payment_links.settlements.read"]],
  ["/admin/comercios/link-pago/ejecucion", ["payment_links.settlements.read"]],
  ["/admin/comercios/link-pago/adelantos", ["payment_links.advances.read"]],
  ["/admin/comercios/link-pago/contracargos", ["payment_links.chargebacks.read"]],
  ["/admin/comercios/link-pago/liquidaciones", ["payment_links.liquidations.read"]],
  ["/admin/comercios/link-pago/lotes-venta", ["payment_links.lots.read"]],
  ["/admin/comercios/link-pago/lotes", ["payment_links.lots.read"]],
  ["/admin/comercios/link-pago/parametros", ["payment_links.parameters.manage"]],
  ["/admin/comercios/link-pago/excepciones", ["payment_links.exceptions.manage"]],
  ["/admin/comercios/link-pago", ["payment_links.read"]],
  ["/admin/comercios/impuestos/usuarios", ["taxes.assignments.read"]],
  [
    "/admin/comercios/impuestos/ingresos-brutos",
    ["taxes.registry.read", "taxes.filings.read", "taxes.normalization.read"],
  ],
  ["/admin/comercios/impuestos/debitos-creditos", ["taxes.exemptions.read"]],
  ["/admin/comercios/impuestos", ["taxes.catalog.read"]],
  ["/admin/comercios/apis", ["apis.read"]],
  ["/admin/comercios", ["merchants.read", "payment_links.read", "taxes.catalog.read", "apis.read"]],

  ["/admin/administracion/usuarios/roles", ["backoffice.roles.read"]],
  [
    "/admin/administracion/usuarios/actividad",
    ["backoffice.security_events.read", "backoffice.audit.read"],
  ],
  ["/admin/administracion/usuarios", ["backoffice.users.read"]],
  ["/admin/administracion/reportes", ["reports.read"]],
  ["/admin/administracion/registros", ["records.read"]],
  ["/admin/administracion/soporte", ["support.read"]],

  ["/admin/modulos", ["system.modules.read"]],
  ["/admin/configuracion/logins", ["system.logins.read"]],
  ["/admin/configuracion", ["system.integrations.read"]],
  ["/admin/centro-alertas", ["system.alert_center.read"]],
  ["/admin/notificaciones", ["system.notifications.read"]],
  ["/admin/incidentes", ["system.incidents.read"]],
];

const SORTED = [...ROUTE_PERMISSIONS].sort((a, b) => b[0].length - a[0].length);

/**
 * Permisos (cualquiera de) que exige una ruta.
 * null = ruta sin mapear: solo el rol Admin.
 */
export function routePermissions(pathname: string): PermissionCode[] | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/admin") return ["dashboard.view"];
  const match = SORTED.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`));
  return match ? match[1] : null;
}
