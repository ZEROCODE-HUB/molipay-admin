import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Inbox, Save, ShieldAlert } from "lucide-react";
import { PageHeader, Badge, BtnPrimary, BtnOutline, Input, Label, Card } from "@/components/portal-shell";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import {
  AMBIENTE_LABEL,
  ESTADO_INTEGRACION_LABEL,
  QK_APIS,
  detalleIntegracion,
  guardarLimites,
  guardarPermisos,
  listarIntegraciones,
  tonoEstadoIntegracion,
  type AmbienteApi,
  type PermisoFila,
} from "@/lib/api/apis-externas";

export const Route = createFileRoute("/admin/comercios/apis/restricciones")({
  component: Page,
  validateSearch: (s: Record<string, unknown>): { id?: string } => (typeof s.id === "string" ? { id: s.id } : {}),
  head: () => ({
    meta: [
      { title: "Permisos — APIs externas — Admin — Moli" },
      { name: "description", content: "Endpoints y métodos habilitados por comercio y ambiente, límites y IPs." },
    ],
  }),
});

const METODO_TONO: Record<string, string> = {
  GET: "bg-blue-100 text-blue-700",
  POST: "bg-emerald-100 text-emerald-700",
  DELETE: "bg-red-100 text-red-700",
  PUT: "bg-amber-100 text-amber-700",
  PATCH: "bg-amber-100 text-amber-700",
};

function Page() {
  const { id: idUrl } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { can } = useCan();
  const puedeModificar = can("modificar", "apis_externas");

  const lista = useQuery({ queryKey: [...QK_APIS, "lista"], queryFn: listarIntegraciones });
  const id = idUrl ?? lista.data?.[0]?.id;
  const det = useQuery({ queryKey: [...QK_APIS, "detalle", id], queryFn: () => detalleIntegracion(id!), enabled: !!id });

  const [ambiente, setAmbiente] = useState<AmbienteApi>("Produccion");
  const [matriz, setMatriz] = useState<Record<string, boolean>>({});
  const [rateSbx, setRateSbx] = useState(100);
  const [rateProd, setRateProd] = useState(1000);
  const [ips, setIps] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  const permisos = det.data?.permisos ?? [];
  const integ = det.data?.integracion;

  // Valores del servidor (al cambiar de comercio o de ambiente, y al descartar).
  const cargarMatriz = () => {
    const m: Record<string, boolean> = {};
    for (const p of permisos) m[p.endpoint_id] = !!(ambiente === "Homologacion" ? p.sandbox : p.produccion);
    setMatriz(m);
  };
  const cargarLimites = () => {
    if (!integ) return;
    setRateSbx(integ.rate_limit_sandbox);
    setRateProd(integ.rate_limit_produccion);
    setIps((integ.ip_whitelist ?? []).join("\n"));
  };
  useEffect(cargarMatriz, [det.data, ambiente]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(cargarLimites, [integ]); // eslint-disable-line react-hooks/exhaustive-deps

  const grupos = useMemo(() => {
    const m = new Map<string, PermisoFila[]>();
    for (const p of permisos) m.set(p.path, [...(m.get(p.path) ?? []), p]);
    return [...m.entries()];
  }, [permisos]);

  const sinFila = permisos.filter((p) => (ambiente === "Homologacion" ? p.sandbox : p.produccion) === null).length;
  const prodNoHabilitada = ambiente === "Produccion" && integ && integ.estado !== "Produccion";
  const cambios = permisos.filter(
    (p) => !!(ambiente === "Homologacion" ? p.sandbox : p.produccion) !== !!matriz[p.endpoint_id] ||
      (ambiente === "Homologacion" ? p.sandbox : p.produccion) === null,
  );

  const guardar = async () => {
    if (!id) return;
    setGuardando(true);
    setMensaje(null);
    try {
      await guardarPermisos(id, ambiente, permisos.map((p) => ({ endpoint_id: p.endpoint_id, permitido: !!matriz[p.endpoint_id] })));
      await guardarLimites(id, rateSbx, rateProd, ips.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean));
      await qc.invalidateQueries({ queryKey: QK_APIS });
      setMensaje({ ok: true, texto: "Permisos y límites guardados. Rigen desde la próxima petición." });
    } catch (e) {
      setMensaje({ ok: false, texto: (e as Error).message });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <PermissionGuard recurso="apis_externas">
      <PageHeader
        title="Permisos de API"
        description="Qué endpoints y métodos puede usar cada comercio en cada ambiente, cuántas peticiones por minuto y desde qué IPs. Lo que no está marcado se rechaza (403)."
      />

      {lista.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : lista.isError ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={16} /> {(lista.error as Error).message} (¿se aplicó la migración 20261031100000?)
        </div>
      ) : (lista.data ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          <Inbox size={28} />
          <p>Ningún comercio generó llaves de API todavía.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[260px]">
              <Label htmlFor="p-comercio">Comercio</Label>
              <select
                id="p-comercio"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                value={id ?? ""}
                onChange={(e) => void navigate({ to: "/admin/comercios/apis/restricciones", search: { id: e.target.value } as never })}
              >
                {(lista.data ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.comercio} · {ESTADO_INTEGRACION_LABEL[r.estado]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-1.5">
              {(["Homologacion", "Produccion"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmbiente(a)}
                  className={`h-10 px-4 rounded-md border text-sm font-semibold ${
                    ambiente === a ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"
                  }`}
                >
                  {AMBIENTE_LABEL[a]}
                </button>
              ))}
            </div>
            {integ && <Badge tone={tonoEstadoIntegracion(integ.estado)}>{ESTADO_INTEGRACION_LABEL[integ.estado]}</Badge>}
          </div>

          {det.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando permisos…</p>
          ) : det.isError ? (
            <p className="text-sm text-red-700">{(det.error as Error).message}</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <Card className="p-0 overflow-hidden">
                {prodNoHabilitada && (
                  <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
                    <ShieldAlert size={14} /> Producción todavía no está aprobada para este comercio: los permisos que marques
                    rigen recién cuando se apruebe el pase.
                  </div>
                )}
                {sinFila > 0 && (
                  <div className="border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
                    {sinFila} endpoint(s) sin configurar en {AMBIENTE_LABEL[ambiente]}: hoy se rechazan. Guardá para fijarlos.
                  </div>
                )}
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr className="text-left">
                      <th className="px-4 py-2.5">Endpoint</th>
                      <th className="px-4 py-2.5">Métodos habilitados en {AMBIENTE_LABEL[ambiente]}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {grupos.map(([path, metodos]) => (
                      <tr key={path} className="align-top">
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs">{path}</div>
                          <div className="text-[11px] text-muted-foreground">{metodos[0]?.categoria}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {metodos.map((p) => {
                              const deshabilitado = p.estado !== "Habilitado" || !p.ambientes.includes(ambiente);
                              return (
                                <label
                                  key={p.endpoint_id}
                                  className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${
                                    matriz[p.endpoint_id] ? "border-primary/40 bg-primary/5" : "bg-card"
                                  } ${deshabilitado ? "opacity-50" : "cursor-pointer"}`}
                                  title={deshabilitado ? "Endpoint deshabilitado en el catálogo para este ambiente" : p.nombre}
                                >
                                  <input
                                    type="checkbox"
                                    disabled={!puedeModificar || deshabilitado}
                                    checked={!!matriz[p.endpoint_id]}
                                    onChange={(e) => setMatriz((m) => ({ ...m, [p.endpoint_id]: e.target.checked }))}
                                  />
                                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${METODO_TONO[p.metodo] ?? "bg-muted"}`}>
                                    {p.metodo}
                                  </span>
                                  <span>{p.nombre}</span>
                                  {!p.default_produccion && ambiente === "Produccion" && (
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
              </Card>

              <div className="space-y-4">
                <Card className="p-5 space-y-3">
                  <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Límite de peticiones
                  </h4>
                  <div>
                    <Label htmlFor="r-sbx">Sandbox (por minuto)</Label>
                    <Input id="r-sbx" type="number" min={1} max={100000} value={rateSbx} disabled={!puedeModificar}
                      onChange={(e) => setRateSbx(Math.max(1, Number(e.target.value) || 1))} />
                  </div>
                  <div>
                    <Label htmlFor="r-prod">Producción (por minuto)</Label>
                    <Input id="r-prod" type="number" min={1} max={100000} value={rateProd} disabled={!puedeModificar}
                      onChange={(e) => setRateProd(Math.max(1, Number(e.target.value) || 1))} />
                  </div>
                </Card>
                <Card className="p-5 space-y-2">
                  <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">IPs autorizadas</h4>
                  <textarea
                    className="w-full min-h-[110px] rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
                    value={ips}
                    disabled={!puedeModificar}
                    onChange={(e) => setIps(e.target.value)}
                    placeholder={"Vacío = cualquier IP\n203.0.113.10\n198.51.100.0/24"}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Una por línea; acepta rangos CIDR. Las peticiones desde otras IPs se rechazan con 403 IP_NOT_ALLOWED. El
                    comercio también puede editarlas desde su portal.
                  </p>
                </Card>
                {mensaje && (
                  <div className={`rounded-lg border px-3 py-2 text-sm ${mensaje.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
                    {mensaje.texto}
                  </div>
                )}
                <div className="flex gap-2">
                  <BtnOutline
                    type="button"
                    onClick={() => {
                      cargarMatriz();
                      cargarLimites();
                      setMensaje(null);
                    }}
                  >
                    Descartar cambios
                  </BtnOutline>
                  <BtnPrimary type="button" disabled={!puedeModificar || guardando} onClick={() => void guardar()}>
                    <Save size={14} /> {guardando ? "Guardando…" : `Guardar${cambios.length ? ` (${cambios.length})` : ""}`}
                  </BtnPrimary>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </PermissionGuard>
  );
}
