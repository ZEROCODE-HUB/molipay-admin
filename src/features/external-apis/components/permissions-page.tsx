import { ErrorNotice } from "@/shared/ui/error-notice";
import { getRouteApi,useNavigate } from "@tanstack/react-router";
import { Inbox } from "lucide-react";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { userMessage } from "@/shared/lib/errors";
import { Label,Select } from "@/shared/ui/form-controls";
import { PageHeader } from "@/shared/ui/page-header";
import {
useApiIntegrationDetail,
useApiIntegrations,
useCanManageExternalApis,
} from "../external-apis.hooks";
import { INTEGRATION_STATUS_LABEL } from "../external-apis.rules";
import { PermissionsEditor } from "./permissions-editor";

const route = getRouteApi("/admin/comercios/apis/restricciones");

export function PermissionsPage() {
  const { id: idFromUrl } = route.useSearch();
  const navigate = useNavigate();
  const canManage = useCanManageExternalApis();
  const integrations = useApiIntegrations();
  const id = idFromUrl ?? integrations.data?.[0]?.id;
  const detail = useApiIntegrationDetail(id);

  return (
    <PermissionGuard recurso="apis_externas">
      <PageHeader
        title="Permisos de API"
        description="Qué endpoints y métodos puede usar cada comercio en cada ambiente, cuántas peticiones por minuto y desde qué IPs. Lo que no está marcado se rechaza (403)."
      />

      {integrations.isPending ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : integrations.isError ? (
        <ErrorNotice>{userMessage(integrations.error)}</ErrorNotice>
      ) : integrations.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          <Inbox size={28} />
          <p>Ningún comercio generó llaves de API todavía.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 min-w-[260px] max-w-md">
            <Label htmlFor="p-comercio">Comercio</Label>
            <Select
              id="p-comercio"
              value={id ?? ""}
              onChange={(e) =>
                void navigate({
                  to: "/admin/comercios/apis/restricciones",
                  search: { id: e.target.value },
                })
              }
            >
              {integrations.data.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.merchantName} · {INTEGRATION_STATUS_LABEL[r.status]}
                </option>
              ))}
            </Select>
          </div>

          {detail.isPending ? (
            <p className="text-sm text-muted-foreground">Cargando permisos…</p>
          ) : detail.isError ? (
            <p className="text-sm text-red-700">{userMessage(detail.error)}</p>
          ) : (
            <PermissionsEditor
              key={detail.data.integration.id}
              detail={detail.data}
              canManage={canManage}
            />
          )}
        </>
      )}
    </PermissionGuard>
  );
}
