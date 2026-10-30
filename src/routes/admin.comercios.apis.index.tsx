import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Eye,
  Inbox,
  KeyRound,
  PauseCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PageHeader, Badge, BtnOutline, Input, Label, Card } from "@/components/portal-shell";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import { DataAccessError } from "@/lib/api/errors";
import {
  AMBIENTE_LABEL,
  ESTADO_INTEGRACION_LABEL,
  QK_APIS,
  aprobarPase,
  detalleIntegracion,
  fechaHoraCorta,
  listarIntegraciones,
  reactivarIntegracion,
  rechazarPase,
  reintentarWebhook,
  revocarIntegracion,
  revocarLlave,
  suspenderIntegracion,
  tonoEstadoIntegracion,
  type EstadoIntegracion,
  type IntegracionFila,
} from "@/lib/api/apis-externas";

export const Route = createFileRoute("/admin/comercios/apis/")({
  component: Page,
  head: () => ({
    meta: [{ title: "APIs externas — Credenciales — Admin — Moli" }],
  }),
});

const PAGE_SIZE = 10;
const ESTADOS: EstadoIntegracion[] = [
  "Pendiente_Pase_Produccion",
  "Homologacion",
  "Produccion",
  "Suspendido",
  "Revocado",
  "Pendiente_Validacion",
];

function MensajeEstado({ tipo, mensaje, onRetry }: { tipo: "error" | "vacio" | "permiso"; mensaje: string; onRetry?: () => void }) {
  if (tipo === "permiso") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-6 py-12 text-center text-sm text-amber-800">
        <AlertTriangle size={28} />
        <div>
          <p className="font-semibold">No tenés permiso para ver esto</p>
          <p className="mt-1">{mensaje}</p>
        </div>
      </div>
    );
  }
  if (tipo === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
        <AlertTriangle size={28} />
        <div>
          <p className="font-semibold">Ocurrió un error al cargar las credenciales</p>
          <p className="mt-1">{mensaje}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Reintentar
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
      <Inbox size={28} />
      <p>{mensaje || "Ningún comercio generó llaves de API todavía."}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );
}

function tonoStatus(s: number): string {
  return s < 300 ? "text-emerald-700" : s < 500 ? "text-amber-700" : "text-red-700";
}

/** Detalle de una integración: estado, historial, llaves, webhooks, entregas y logs. */
function DetalleModal({
  id,
  puedeModificar,
  onClose,
  onError,
}: {
  id: string;
  puedeModificar: boolean;
  onClose: () => void;
  onError: (m: string) => void;
}) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: [...QK_APIS, "detalle", id], queryFn: () => detalleIntegracion(id) });
  const [revocar, setRevocar] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const d = q.data;
  const i = d?.integracion;
  const recargar = () => qc.invalidateQueries({ queryKey: QK_APIS });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex justify-between items-start z-10">
          <div>
            <h3 className="font-display text-lg font-semibold">Detalle de la integración</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {i ? `${i.comercio} · Legajo ${i.legajo}` : "Cargando…"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <X size={18} />
          </button>
        </div>

        {q.isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Cargando…</p>
        ) : q.isError || !d || !i ? (
          <p className="p-6 text-sm text-red-700">{(q.error as Error)?.message ?? "No se pudo cargar"}</p>
        ) : (
          <div className="p-6 space-y-5">
            <Card className="p-5">
              <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                Información general
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                <Field label="Estado" value={<Badge tone={tonoEstadoIntegracion(i.estado)}>{ESTADO_INTEGRACION_LABEL[i.estado]}</Badge>} />
                <Field label="Límite Sandbox" value={`${i.rate_limit_sandbox} req/min`} />
                <Field label="Límite Producción" value={`${i.rate_limit_produccion} req/min`} />
                <Field label="IPs autorizadas" value={i.ip_whitelist.length ? i.ip_whitelist.join(", ") : "Cualquier IP"} />
                <Field label="Pase solicitado" value={fechaHoraCorta(i.pase_solicitado_at)} />
                <Field label="Aprobado" value={fechaHoraCorta(i.aprobado_at)} />
                {i.pase_notas && <Field label="Notas del comercio" value={i.pase_notas} />}
                {i.motivo_suspension && <Field label="Motivo de suspensión" value={<span className="text-red-700">{i.motivo_suspension}</span>} />}
                {i.motivo_revocacion && <Field label="Motivo de revocación" value={<span className="text-red-700">{i.motivo_revocacion}</span>} />}
              </div>
            </Card>

            <Card className="p-5">
              <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Llaves</h4>
              {d.llaves.length === 0 ? (
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
                    {d.llaves.map((k) => (
                      <tr key={k.id} className={k.estado === "Revocada" ? "opacity-60" : ""}>
                        <td className="py-1.5 pr-3">{AMBIENTE_LABEL[k.ambiente]}</td>
                        <td className="py-1.5 pr-3 font-mono text-xs">{k.api_key.slice(0, 16)}…</td>
                        <td className="py-1.5 pr-3 font-mono text-xs">••••{k.secret_ultimos4}</td>
                        <td className="py-1.5 pr-3">
                          <Badge tone={k.estado === "Activa" ? "success" : "neutral"}>{k.estado}</Badge>
                          {k.revocada_motivo && <div className="text-[10px] text-muted-foreground">{k.revocada_motivo}</div>}
                        </td>
                        <td className="py-1.5 pr-3 text-xs">{fechaHoraCorta(k.created_at)}</td>
                        <td className="py-1.5 pr-3 text-xs">{fechaHoraCorta(k.ultimo_uso_at)}</td>
                        <td className="py-1.5 text-right">
                          {k.estado === "Activa" && puedeModificar && (
                            <button type="button" className="text-xs text-red-700 hover:underline" onClick={() => setRevocar(k.id)}>
                              Revocar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card className="p-5">
              <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Webhooks</h4>
              {d.webhooks.length === 0 ? (
                <p className="text-sm text-muted-foreground">El comercio no configuró webhooks.</p>
              ) : (
                <div className="space-y-2 text-sm">
                  {d.webhooks.map((w) => (
                    <div key={w.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
                      <div className="min-w-0">
                        <div className="font-mono text-xs truncate">{w.url_callback}</div>
                        <div className="text-[11px] text-muted-foreground">{w.eventos_suscritos.join(" · ")}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone="neutral">{AMBIENTE_LABEL[w.ambiente]}</Badge>
                        <Badge tone={w.activo ? "success" : "neutral"}>{w.activo ? "Activo" : "Inactivo"}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {d.entregas.length > 0 && (
                <table className="w-full text-xs mt-4">
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
                    {d.entregas.map((e) => (
                      <tr key={e.id}>
                        <td className="py-1 pr-3">{fechaHoraCorta(e.created_at)}</td>
                        <td className="py-1 pr-3 font-mono">
                          {e.evento}
                          {e.es_prueba ? " (prueba)" : ""}
                        </td>
                        <td className="py-1 pr-3">{AMBIENTE_LABEL[e.ambiente]}</td>
                        <td className="py-1 pr-3">
                          <Badge tone={e.estado === "Exitoso" ? "success" : e.estado === "Fallido" ? "danger" : "warn"}>{e.estado}</Badge>
                        </td>
                        <td className="py-1 pr-3">{e.intento}</td>
                        <td className="py-1 pr-3">{e.http ?? e.error ?? "—"}</td>
                        <td className="py-1 text-right">
                          {e.estado === "Fallido" && !e.es_prueba && puedeModificar && (
                            <button
                              type="button"
                              className="text-primary hover:underline"
                              onClick={async () => {
                                try {
                                  await reintentarWebhook(e.id);
                                  void recargar();
                                } catch (er) {
                                  onError((er as Error).message);
                                }
                              }}
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
            </Card>

            <Card className="p-5">
              <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Últimas peticiones
              </h4>
              {d.logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todavía no hay peticiones.</p>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground sticky top-0 bg-card">
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
                      {d.logs.map((l, n) => (
                        <tr key={n}>
                          <td className="py-1 pr-3 whitespace-nowrap">{fechaHoraCorta(l.created_at)}</td>
                          <td className="py-1 pr-3">{l.ambiente ? AMBIENTE_LABEL[l.ambiente] : "—"}</td>
                          <td className="py-1 pr-3 font-bold">{l.metodo}</td>
                          <td className="py-1 pr-3 font-mono">{l.ruta}</td>
                          <td className={`py-1 pr-3 text-right font-mono font-semibold ${tonoStatus(l.status)}`}>{l.status}</td>
                          <td className="py-1 pr-3 text-right font-mono">{l.latencia_ms ?? "—"} ms</td>
                          <td className="py-1 pr-3 font-mono">{l.ip ?? "—"}</td>
                          <td className="py-1">{l.codigo_error ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Historial</h4>
              <ul className="space-y-1.5 text-sm">
                {[...i.historial].reverse().map((h, n) => (
                  <li key={n} className="flex gap-3">
                    <span className="text-xs text-muted-foreground whitespace-nowrap w-32">{fechaHoraCorta(h.fecha)}</span>
                    <span>
                      {h.de && h.de !== h.a ? `${ESTADO_INTEGRACION_LABEL[h.de as EstadoIntegracion] ?? h.de} → ` : ""}
                      <b>{ESTADO_INTEGRACION_LABEL[h.a as EstadoIntegracion] ?? h.a}</b>
                      {h.nota ? <span className="text-muted-foreground"> · {h.nota}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}

        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex justify-end">
          <BtnOutline type="button" onClick={onClose}>
            Cerrar
          </BtnOutline>
        </div>
      </div>

      <FormDialog
        open={!!revocar}
        onClose={() => setRevocar(null)}
        title="Revocar llave"
        description="La llave deja de funcionar al instante. El comercio puede generar una nueva."
        submitLabel="Revocar llave"
        onSubmit={async () => {
          if (!revocar || !motivo.trim()) return;
          try {
            await revocarLlave(revocar, motivo.trim());
            setRevocar(null);
            setMotivo("");
            void recargar();
          } catch (e) {
            onError((e as Error).message);
          }
        }}
      >
        <Label htmlFor="rv-motivo">Motivo (obligatorio)</Label>
        <textarea
          id="rv-motivo"
          className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
      </FormDialog>
    </div>
  );
}

type AccionMotivo = { tipo: "suspender" | "revocar" | "rechazar"; fila: IntegracionFila };

function Page() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 250);
  const [estadoFilter, setEstadoFilter] = useState<EstadoIntegracion | "">("");
  const [detalle, setDetalle] = useState<string | null>(null);
  const [motivoAccion, setMotivoAccion] = useState<AccionMotivo | null>(null);
  const [motivo, setMotivo] = useState("");
  const [confirmar, setConfirmar] = useState<{ title: string; message: string; label: string; onConfirm: () => Promise<void> } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const { can } = useCan();
  const puedeModificar = can("modificar", "apis_externas");

  const q = useQuery({ queryKey: [...QK_APIS, "lista"], queryFn: listarIntegraciones });
  const err = q.error instanceof DataAccessError ? q.error : null;
  const todas = q.data ?? [];
  const pendientes = todas.filter((r) => r.estado === "Pendiente_Pase_Produccion");
  const filas = useMemo(() => {
    const s = search.trim().toLowerCase();
    return todas.filter(
      (r) => (!estadoFilter || r.estado === estadoFilter) && (!s || `${r.comercio} ${r.legajo}`.toLowerCase().includes(s)),
    );
  }, [todas, estadoFilter, search]);

  const recargar = () => qc.invalidateQueries({ queryKey: QK_APIS });
  const ejecutar = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      void recargar();
    } catch (e) {
      setAviso((e as Error).message);
    }
  };

  const getActions = (r: IntegracionFila): ActionItem[] => {
    const items: ActionItem[] = [
      { label: "Ver detalle", icon: Eye, onClick: () => setDetalle(r.id) },
      {
        label: "Permisos y límites",
        icon: KeyRound,
        onClick: () => void navigate({ to: "/admin/comercios/apis/restricciones", search: { id: r.id } as never }),
      },
    ];
    if (r.estado === "Pendiente_Pase_Produccion") {
      items.push(
        {
          label: "Aprobar pase a producción",
          icon: CheckCircle2,
          disabled: !puedeModificar,
          onClick: () =>
            setConfirmar({
              title: "Aprobar pase a producción",
              message: `${r.comercio} va a poder operar con dinero real con su llave mp_live_. Se habilitan todos los endpoints salvo Transferencia saliente, que se habilita aparte en Permisos.`,
              label: "Aprobar",
              onConfirm: () => ejecutar(() => aprobarPase(r.id)),
            }),
        },
        { label: "Rechazar pase", icon: XCircle, variant: "danger", disabled: !puedeModificar, onClick: () => setMotivoAccion({ tipo: "rechazar", fila: r }) },
      );
    }
    if (r.estado === "Suspendido") {
      items.push({
        label: "Reactivar",
        icon: Play,
        disabled: !puedeModificar,
        onClick: () =>
          setConfirmar({
            title: "Reactivar integración",
            message: `Vuelve al estado anterior a la suspensión y las llaves de ${r.comercio} funcionan de nuevo.`,
            label: "Reactivar",
            onConfirm: () => ejecutar(() => reactivarIntegracion(r.id)),
          }),
      });
    } else if (r.estado !== "Revocado") {
      items.push({ label: "Suspender", icon: PauseCircle, variant: "danger", disabled: !puedeModificar, onClick: () => setMotivoAccion({ tipo: "suspender", fila: r }) });
    }
    if (r.estado !== "Revocado") {
      items.push({ label: "Revocar definitivamente", icon: Ban, variant: "danger", disabled: !puedeModificar, onClick: () => setMotivoAccion({ tipo: "revocar", fila: r }) });
    }
    return items;
  };

  const columns: Column<IntegracionFila>[] = [
    {
      key: "comercio",
      label: "Comercio",
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium">{r.comercio}</div>
          <div className="text-xs text-muted-foreground font-mono">{r.legajo}</div>
        </div>
      ),
    },
    {
      key: "estado",
      label: "Estado de la integración",
      sortable: true,
      render: (r) => (
        <div>
          <Badge tone={tonoEstadoIntegracion(r.estado)}>{ESTADO_INTEGRACION_LABEL[r.estado]}</Badge>
          {r.estado === "Suspendido" && r.motivo_suspension && (
            <div className="text-[10px] text-red-700 mt-0.5 max-w-[200px] truncate" title={r.motivo_suspension}>
              {r.motivo_suspension}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "llaves",
      label: "Llaves activas",
      render: (r) =>
        r.llaves.length === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <div className="space-y-0.5">
            {r.llaves.map((k) => (
              <div key={k.ambiente} className="text-xs">
                <span className={k.ambiente === "Produccion" ? "text-emerald-700 font-semibold" : "text-muted-foreground"}>
                  {AMBIENTE_LABEL[k.ambiente]}
                </span>{" "}
                <span className="font-mono">{k.api_key}</span>
              </div>
            ))}
          </div>
        ),
    },
    {
      key: "requests_24h",
      label: "Uso 24 h",
      sortable: true,
      render: (r) => (
        <span className="font-mono tabular-nums text-xs">
          {r.requests_24h} req{r.errores_24h > 0 && <span className="text-red-700"> · {r.errores_24h} err</span>}
          {r.webhooks_fallidos > 0 && <div className="text-amber-700">{r.webhooks_fallidos} webhook(s) fallido(s)</div>}
        </span>
      ),
    },
    {
      key: "ultimo_uso_at",
      label: "Último uso",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums text-xs">{fechaHoraCorta(r.ultimo_uso_at)}</span>,
    },
    {
      key: "pase_solicitado_at",
      label: "Pase solicitado",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums text-xs">{fechaHoraCorta(r.pase_solicitado_at)}</span>,
    },
  ];

  const tituloMotivo = motivoAccion
    ? { suspender: "Suspender integración", revocar: "Revocar integración", rechazar: "Rechazar pase a producción" }[motivoAccion.tipo]
    : "";

  return (
    <PermissionGuard recurso="apis_externas">
      <PageHeader
        title="Credenciales de API"
        description="Integraciones de los comercios con la API de MoliPay: Sandbox, pase a producción, suspensión y revocación."
      />

      {pendientes.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="flex items-center gap-2">
            <ShieldCheck size={16} /> {pendientes.length} comercio(s) esperan la aprobación del pase a producción:{" "}
            <b>{pendientes.map((p) => p.comercio).join(", ")}</b>
          </span>
          <button type="button" className="text-xs font-semibold underline" onClick={() => setEstadoFilter("Pendiente_Pase_Produccion")}>
            Ver solicitudes
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="buscar">Buscar</Label>
          <Input id="buscar" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Comercio o legajo…" />
        </div>
        <div>
          <Label htmlFor="f-estado">Estado</Label>
          <select
            id="f-estado"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value as EstadoIntegracion | "")}
          >
            <option value="">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ESTADO_INTEGRACION_LABEL[e]}
              </option>
            ))}
          </select>
        </div>
        <BtnOutline type="button" onClick={() => void q.refetch()} disabled={q.isFetching}>
          <RotateCcw size={14} className={q.isFetching ? "animate-spin" : ""} /> Actualizar
        </BtnOutline>
      </div>

      {q.isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando credenciales…
        </div>
      ) : q.isError ? (
        <MensajeEstado
          tipo={err?.permission ? "permiso" : "error"}
          mensaje={`${err?.message ?? (q.error as Error).message} (¿se aplicó la migración 20261031100000?)`}
          onRetry={() => void q.refetch()}
        />
      ) : filas.length === 0 ? (
        <MensajeEstado tipo="vacio" mensaje={todas.length ? "No hay integraciones con ese filtro." : ""} />
      ) : (
        <DataTable
          columns={columns}
          data={filas}
          keyExtractor={(r) => r.id}
          pageSize={PAGE_SIZE}
          showDownloadButton={false}
          actions={(r) => <ActionsDropdown actions={getActions(r)} />}
        />
      )}

      {detalle && <DetalleModal id={detalle} puedeModificar={puedeModificar} onClose={() => setDetalle(null)} onError={setAviso} />}

      <FormDialog
        open={!!motivoAccion}
        onClose={() => {
          setMotivoAccion(null);
          setMotivo("");
        }}
        title={tituloMotivo}
        description={
          motivoAccion?.tipo === "suspender"
            ? `Corta al instante todo el tráfico de API de ${motivoAccion.fila.comercio} (403). Se puede reactivar.`
            : motivoAccion?.tipo === "revocar"
              ? `Anula las llaves y desactiva los webhooks de ${motivoAccion.fila.comercio}. No se puede reactivar: el comercio tiene que empezar de nuevo con un Sandbox.`
              : `La integración de ${motivoAccion?.fila.comercio ?? ""} vuelve a Sandbox. El comercio ve el motivo.`
        }
        submitLabel={motivoAccion?.tipo === "suspender" ? "Suspender" : motivoAccion?.tipo === "revocar" ? "Revocar" : "Rechazar"}
        onSubmit={async () => {
          if (!motivoAccion || !motivo.trim()) return;
          const { tipo, fila } = motivoAccion;
          await ejecutar(() =>
            tipo === "suspender"
              ? suspenderIntegracion(fila.id, motivo.trim())
              : tipo === "revocar"
                ? revocarIntegracion(fila.id, motivo.trim())
                : rechazarPase(fila.id, motivo.trim()),
          );
          setMotivoAccion(null);
          setMotivo("");
        }}
      >
        <Label htmlFor="mt-motivo">Motivo (obligatorio)</Label>
        <textarea
          id="mt-motivo"
          className="w-full min-h-[90px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder={motivoAccion?.tipo === "suspender" ? "Ej.: revisión de compliance por operaciones inusuales" : ""}
        />
      </FormDialog>

      {confirmar && (
        <ConfirmDialog
          open
          onClose={() => setConfirmar(null)}
          title={confirmar.title}
          message={confirmar.message}
          confirmLabel={confirmar.label}
          onConfirm={async () => {
            await confirmar.onConfirm();
            setConfirmar(null);
          }}
        />
      )}
      {aviso && (
        <ConfirmDialog
          open
          onClose={() => setAviso(null)}
          title="No se pudo completar la acción"
          message={aviso}
          confirmLabel="Cerrar"
          variant="danger"
          onConfirm={() => setAviso(null)}
        />
      )}
    </PermissionGuard>
  );
}
