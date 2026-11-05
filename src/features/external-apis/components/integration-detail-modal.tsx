import { useState,type ReactNode } from "react";
import { toast } from "sonner";
import { formatDateTime } from "@/shared/lib/format";
import { userMessage } from "@/shared/lib/errors";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Modal,ModalBody,ModalFooter,ModalHeader,useModalTitleId } from "@/shared/ui/modal";
import { useApiIntegrationDetail,useExternalApiActions } from "../external-apis.hooks";
import {
DELIVERY_STATUS_LABEL,
ENVIRONMENT_LABEL,
INTEGRATION_STATUS_LABEL,
deliveryStatusTone,
historyStatusLabel,
httpStatusClass,
integrationStatusTone,
} from "../external-apis.rules";
import type { IntegrationDetail } from "../external-apis.types";
import { ReasonDialog } from "./reason-dialog";

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h4 className="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {children}
    </Card>
  );
}

function GeneralInfo({ integration: i }: { integration: IntegrationDetail["integration"] }) {
  return (
    <Section title="Información general">
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
        <Field
          label="Estado"
          value={
            <Badge tone={integrationStatusTone(i.status)}>
              {INTEGRATION_STATUS_LABEL[i.status]}
            </Badge>
          }
        />
        <Field label="Límite Sandbox" value={`${i.sandboxRateLimit} req/min`} />
        <Field label="Límite Producción" value={`${i.productionRateLimit} req/min`} />
        <Field
          label="IPs autorizadas"
          value={i.ipWhitelist.length ? i.ipWhitelist.join(", ") : "Cualquier IP"}
        />
        <Field label="Pase solicitado" value={formatDateTime(i.productionRequestedAt)} />
        <Field label="Aprobado" value={formatDateTime(i.approvedAt)} />
        {i.productionRequestNotes && (
          <Field label="Notas del comercio" value={i.productionRequestNotes} />
        )}
        {i.suspensionReason && (
          <Field
            label="Motivo de suspensión"
            value={<span className="text-red-700">{i.suspensionReason}</span>}
          />
        )}
        {i.revocationReason && (
          <Field
            label="Motivo de revocación"
            value={<span className="text-red-700">{i.revocationReason}</span>}
          />
        )}
      </div>
    </Section>
  );
}

function KeysSection({
  keys,
  canManage,
  onRevoke,
}: {
  keys: IntegrationDetail["keys"];
  canManage: boolean;
  onRevoke: (keyId: string) => void;
}) {
  return (
    <Section title="Llaves">
      {keys.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin llaves.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="text-left">
              <th className="py-1.5 pr-3">Ambiente</th>
              <th className="py-1.5 pr-3">API Key</th>
              <th className="py-1.5 pr-3">Secret</th>
              <th className="py-1.5 pr-3">Estado</th>
              <th className="py-1.5 pr-3">Creada</th>
              <th className="py-1.5 pr-3">Último uso</th>
              <th className="py-1.5" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {keys.map((k) => (
              <tr key={k.id} className={k.active ? "" : "opacity-60"}>
                <td className="py-1.5 pr-3">{ENVIRONMENT_LABEL[k.environment]}</td>
                <td className="py-1.5 pr-3 font-mono text-xs">{k.apiKey.slice(0, 16)}…</td>
                <td className="py-1.5 pr-3 font-mono text-xs">••••{k.secretLast4}</td>
                <td className="py-1.5 pr-3">
                  <Badge tone={k.active ? "success" : "neutral"}>
                    {k.active ? "Activa" : "Revocada"}
                  </Badge>
                  {k.revokedReason && (
                    <div className="text-[10px] text-muted-foreground">{k.revokedReason}</div>
                  )}
                </td>
                <td className="py-1.5 pr-3 text-xs">{formatDateTime(k.createdAt)}</td>
                <td className="py-1.5 pr-3 text-xs">{formatDateTime(k.lastUsedAt)}</td>
                <td className="py-1.5 text-right">
                  {k.active && canManage && (
                    <button
                      type="button"
                      className="text-xs text-red-700 hover:underline"
                      onClick={() => onRevoke(k.id)}
                    >
                      Revocar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}

function WebhooksSection({ detail, canManage }: { detail: IntegrationDetail; canManage: boolean }) {
  const { retryWebhook } = useExternalApiActions();
  const retry = async (id: string) => {
    try {
      await retryWebhook(id);
      toast.success("Reintento encolado");
    } catch (e) {
      toast.error(userMessage(e, "No se pudo reintentar el webhook."));
    }
  };

  return (
    <Section title="Webhooks">
      {detail.webhooks.length === 0 ? (
        <p className="text-sm text-muted-foreground">El comercio no configuró webhooks.</p>
      ) : (
        <div className="space-y-2 text-sm">
          {detail.webhooks.map((w) => (
            <div
              key={w.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate font-mono text-xs">{w.callbackUrl}</div>
                <div className="text-[11px] text-muted-foreground">{w.events.join(" · ")}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="neutral">{ENVIRONMENT_LABEL[w.environment]}</Badge>
                <Badge tone={w.active ? "success" : "neutral"}>
                  {w.active ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
      {detail.deliveries.length > 0 && (
        <table className="mt-4 w-full text-xs">
          <thead className="text-muted-foreground">
            <tr className="text-left">
              <th className="py-1 pr-3">Fecha</th>
              <th className="py-1 pr-3">Evento</th>
              <th className="py-1 pr-3">Ambiente</th>
              <th className="py-1 pr-3">Estado</th>
              <th className="py-1 pr-3">Intentos</th>
              <th className="py-1 pr-3">Respuesta</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {detail.deliveries.map((e) => (
              <tr key={e.id}>
                <td className="py-1 pr-3">{formatDateTime(e.createdAt)}</td>
                <td className="py-1 pr-3 font-mono">
                  {e.event}
                  {e.isTest ? " (prueba)" : ""}
                </td>
                <td className="py-1 pr-3">{ENVIRONMENT_LABEL[e.environment]}</td>
                <td className="py-1 pr-3">
                  <Badge tone={deliveryStatusTone(e.status)}>
                    {DELIVERY_STATUS_LABEL[e.status]}
                  </Badge>
                </td>
                <td className="py-1 pr-3">{e.attempt}</td>
                <td className="py-1 pr-3">{e.httpStatus ?? e.error ?? "—"}</td>
                <td className="py-1 text-right">
                  {e.status === "failed" && !e.isTest && canManage && (
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => void retry(e.id)}
                    >
                      Reintentar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}

function RequestLogsSection({ logs }: { logs: IntegrationDetail["logs"] }) {
  return (
    <Section title="Últimas peticiones">
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay peticiones.</p>
      ) : (
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card text-muted-foreground">
              <tr className="text-left">
                <th className="py-1 pr-3">Fecha</th>
                <th className="py-1 pr-3">Ambiente</th>
                <th className="py-1 pr-3">Método</th>
                <th className="py-1 pr-3">Endpoint</th>
                <th className="py-1 pr-3 text-right">Status</th>
                <th className="py-1 pr-3 text-right">Latencia</th>
                <th className="py-1 pr-3">IP</th>
                <th className="py-1">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((l, n) => (
                <tr key={l.requestId ?? n}>
                  <td className="whitespace-nowrap py-1 pr-3">{formatDateTime(l.createdAt)}</td>
                  <td className="py-1 pr-3">
                    {l.environment ? ENVIRONMENT_LABEL[l.environment] : "—"}
                  </td>
                  <td className="py-1 pr-3 font-bold">{l.method}</td>
                  <td className="py-1 pr-3 font-mono">{l.path}</td>
                  <td
                    className={`py-1 pr-3 text-right font-mono font-semibold ${httpStatusClass(l.status)}`}
                  >
                    {l.status}
                  </td>
                  <td className="py-1 pr-3 text-right font-mono">{l.latencyMs ?? "—"} ms</td>
                  <td className="py-1 pr-3 font-mono">{l.ip ?? "—"}</td>
                  <td className="py-1">{l.errorCode ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function HistorySection({ history }: { history: IntegrationDetail["integration"]["history"] }) {
  return (
    <Section title="Historial">
      <ul className="space-y-1.5 text-sm">
        {[...history].reverse().map((h, n) => (
          <li key={`${h.at}-${n}`} className="flex gap-3">
            <span className="w-32 whitespace-nowrap text-xs text-muted-foreground">
              {formatDateTime(h.at)}
            </span>
            <span>
              {h.from && h.from !== h.to ? `${historyStatusLabel(h.from)} → ` : ""}
              <b>{historyStatusLabel(h.to)}</b>
              {h.note ? <span className="text-muted-foreground"> · {h.note}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Detalle de una integracion: estado, llaves, webhooks, entregas, logs e historial. */
export function IntegrationDetailModal({
  integrationId,
  canManage,
  onClose,
}: {
  integrationId: string;
  canManage: boolean;
  onClose: () => void;
}) {
  const titleId = useModalTitleId();
  const query = useApiIntegrationDetail(integrationId);
  const { revokeKey } = useExternalApiActions();
  const [keyToRevoke, setKeyToRevoke] = useState<string | null>(null);
  const detail = query.data;
  const integration = detail?.integration;

  return (
    <Modal open onClose={onClose} size="xl" labelledBy={titleId}>
      <ModalHeader
        title="Detalle de la integración"
        description={
          integration ? `${integration.merchantName} · Legajo ${integration.legajo}` : "Cargando…"
        }
        titleId={titleId}
        onClose={onClose}
      />
      <ModalBody className="space-y-5">
        {query.isPending ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : query.isError || !detail ? (
          <p className="text-sm text-red-700">
            {userMessage(query.error, "No se pudo cargar el detalle.")}
          </p>
        ) : (
          <>
            <GeneralInfo integration={detail.integration} />
            <KeysSection keys={detail.keys} canManage={canManage} onRevoke={setKeyToRevoke} />
            <WebhooksSection detail={detail} canManage={canManage} />
            <RequestLogsSection logs={detail.logs} />
            <HistorySection history={detail.integration.history} />
          </>
        )}
      </ModalBody>
      <ModalFooter className="justify-end">
        <BtnOutline type="button" onClick={onClose}>
          Cerrar
        </BtnOutline>
      </ModalFooter>

      <ReasonDialog
        open={!!keyToRevoke}
        title="Revocar llave"
        description="La llave deja de funcionar al instante. El comercio puede generar una nueva."
        submitLabel="Revocar llave"
        onSubmit={async (reason) => {
          if (keyToRevoke) await revokeKey(keyToRevoke, reason);
          toast.success("Llave revocada");
        }}
        onClose={() => setKeyToRevoke(null)}
      />
    </Modal>
  );
}
