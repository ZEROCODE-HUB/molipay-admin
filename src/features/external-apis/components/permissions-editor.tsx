import { useState } from "react";
import { Save,ShieldAlert } from "lucide-react";
import { userMessage } from "@/shared/lib/errors";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input,Label } from "@/shared/ui/form-controls";
import { useExternalApiActions } from "../external-apis.hooks";
import {
ENVIRONMENT_LABEL,
HTTP_METHOD_CLASS,
INTEGRATION_STATUS_LABEL,
changedPermissions,
groupByPath,
integrationStatusTone,
isPermissionLocked,
matrixFromServer,
parseIpList,
storedPermission,
type PermissionMatrix,
} from "../external-apis.rules";
import type { ApiEnvironment,EndpointPermission,IntegrationDetail } from "../external-apis.types";

const ENVIRONMENTS: ApiEnvironment[] = ["sandbox", "production"];

const clampRate = (value: string) => Math.max(1, Number(value) || 1);

function PermissionsMatrix({
  permissions,
  environment,
  matrix,
  canManage,
  onToggle,
}: {
  permissions: EndpointPermission[];
  environment: ApiEnvironment;
  matrix: PermissionMatrix;
  canManage: boolean;
  onToggle: (endpointId: string, allowed: boolean) => void;
}) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
        <tr className="text-left">
          <th className="px-4 py-2.5">Endpoint</th>
          <th className="px-4 py-2.5">Métodos habilitados en {ENVIRONMENT_LABEL[environment]}</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {groupByPath(permissions).map(([path, methods]) => (
          <tr key={path} className="align-top">
            <td className="px-4 py-3">
              <div className="font-mono text-xs">{path}</div>
              <div className="text-[11px] text-muted-foreground">{methods[0]?.category}</div>
            </td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-2">
                {methods.map((p) => {
                  const locked = isPermissionLocked(p, environment);
                  const allowed = !!matrix[p.endpointId];
                  return (
                    <label
                      key={p.endpointId}
                      className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${
                        allowed ? "border-primary/40 bg-primary/5" : "bg-card"
                      } ${locked ? "opacity-50" : "cursor-pointer"}`}
                      title={
                        locked ? "Endpoint deshabilitado en el catálogo para este ambiente" : p.name
                      }
                    >
                      <input
                        type="checkbox"
                        disabled={!canManage || locked}
                        checked={allowed}
                        onChange={(e) => onToggle(p.endpointId, e.target.checked)}
                      />
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${HTTP_METHOD_CLASS[p.method] ?? "bg-muted"}`}
                      >
                        {p.method}
                      </span>
                      <span>{p.name}</span>
                      {!p.enabledByDefaultInProduction && environment === "production" && (
                        <span className="text-[10px] font-semibold text-red-700">mueve fondos</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Edicion de permisos y limites de UNA integracion. Arranca con los valores del
 * servidor: quien lo usa le pone `key={integration.id}`, asi se reinicia al cambiar
 * de comercio. "Descartar" vuelve a los valores actuales del servidor.
 */
export function PermissionsEditor({
  detail,
  canManage,
}: {
  detail: IntegrationDetail;
  canManage: boolean;
}) {
  const { savePermissions, saveLimits } = useExternalApiActions();
  const { integration, permissions } = detail;
  const initial = () => ({
    matrices: {
      sandbox: matrixFromServer(permissions, "sandbox"),
      production: matrixFromServer(permissions, "production"),
    } as Record<ApiEnvironment, PermissionMatrix>,
    sandboxRate: integration.sandboxRateLimit,
    productionRate: integration.productionRateLimit,
    ips: integration.ipWhitelist.join("\n"),
  });

  const [environment, setEnvironment] = useState<ApiEnvironment>("production");
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const matrix = draft.matrices[environment];
  const unconfigured = permissions.filter((p) => storedPermission(p, environment) === null).length;
  const pendingCount = changedPermissions(permissions, environment, matrix).length;
  const productionNotApproved = environment === "production" && integration.status !== "production";

  const toggle = (endpointId: string, allowed: boolean) =>
    setDraft((d) => ({
      ...d,
      matrices: { ...d.matrices, [environment]: { ...matrix, [endpointId]: allowed } },
    }));

  const save = async () => {
    setSaving(true);
    setResult(null);
    try {
      await savePermissions(
        integration.id,
        environment,
        permissions.map((p) => ({ endpointId: p.endpointId, allowed: !!matrix[p.endpointId] })),
      );
      await saveLimits(
        integration.id,
        draft.sandboxRate,
        draft.productionRate,
        parseIpList(draft.ips),
      );
      setResult({
        ok: true,
        text: "Permisos y límites guardados. Rigen desde la próxima petición.",
      });
    } catch (e) {
      setResult({ ok: false, text: userMessage(e, "No se pudieron guardar los cambios.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {ENVIRONMENTS.map((env) => (
            <button
              key={env}
              type="button"
              onClick={() => setEnvironment(env)}
              className={`h-10 rounded-md border px-4 text-sm font-semibold ${
                environment === env
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted"
              }`}
            >
              {ENVIRONMENT_LABEL[env]}
            </button>
          ))}
        </div>
        <Badge tone={integrationStatusTone(integration.status)}>
          {INTEGRATION_STATUS_LABEL[integration.status]}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden p-0">
          {productionNotApproved && (
            <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
              <ShieldAlert size={14} /> Producción todavía no está aprobada para este comercio: los
              permisos que marques rigen recién cuando se apruebe el pase.
            </div>
          )}
          {unconfigured > 0 && (
            <div className="border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
              {unconfigured} endpoint(s) sin configurar en {ENVIRONMENT_LABEL[environment]}: hoy se
              rechazan. Guardá para fijarlos.
            </div>
          )}
          <PermissionsMatrix
            permissions={permissions}
            environment={environment}
            matrix={matrix}
            canManage={canManage}
            onToggle={toggle}
          />
        </Card>

        <div className="space-y-4">
          <Card className="space-y-3 p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Límite de peticiones
            </h4>
            <div>
              <Label htmlFor="r-sbx">Sandbox (por minuto)</Label>
              <Input
                id="r-sbx"
                type="number"
                min={1}
                max={100000}
                value={draft.sandboxRate}
                disabled={!canManage}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, sandboxRate: clampRate(e.target.value) }))
                }
              />
            </div>
            <div>
              <Label htmlFor="r-prod">Producción (por minuto)</Label>
              <Input
                id="r-prod"
                type="number"
                min={1}
                max={100000}
                value={draft.productionRate}
                disabled={!canManage}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, productionRate: clampRate(e.target.value) }))
                }
              />
            </div>
          </Card>
          <Card className="space-y-2 p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              IPs autorizadas
            </h4>
            <textarea
              className="min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
              value={draft.ips}
              disabled={!canManage}
              onChange={(e) => setDraft((d) => ({ ...d, ips: e.target.value }))}
              placeholder={"Vacío = cualquier IP\n203.0.113.10\n198.51.100.0/24"}
            />
            <p className="text-[11px] text-muted-foreground">
              Una por línea; acepta rangos CIDR. Las peticiones desde otras IPs se rechazan con 403
              IP_NOT_ALLOWED. El comercio también puede editarlas desde su portal.
            </p>
          </Card>
          {result && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                result.ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {result.text}
            </div>
          )}
          <div className="flex gap-2">
            <BtnOutline
              type="button"
              onClick={() => {
                setDraft(initial());
                setResult(null);
              }}
            >
              Descartar cambios
            </BtnOutline>
            <BtnPrimary type="button" disabled={!canManage || saving} onClick={() => void save()}>
              <Save size={14} />{" "}
              {saving ? "Guardando…" : `Guardar${pendingCount ? ` (${pendingCount})` : ""}`}
            </BtnPrimary>
          </div>
        </div>
      </div>
    </>
  );
}
