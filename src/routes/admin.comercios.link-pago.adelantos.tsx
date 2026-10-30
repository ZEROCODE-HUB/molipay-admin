import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  Eye,
  Clock,
  Wallet,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Banknote,
  X,
} from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader, Badge, Card, Input, Label, BtnOutline, BtnPrimary } from "@/components/portal-shell";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PermissionGuard } from "@/components/permission-guard";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAdelantos,
  aprobarAdelanto,
  rechazarAdelanto,
  acreditarAdelanto,
  calcularTopeDisponible,
  obtenerPoolRecaudacion,
  type PoolRecaudacion,
} from "@/lib/api/adelantos";
import { requireSupabase } from "@/lib/supabase";
import type { Adelanto, EstadoAdelanto } from "@/lib/api/types";

/**
 * Deep link desde el calendario de acreditaciones:
 *   ?comercio=<uuid>  → filtra el listado al comercio (se mantiene hasta
 *                        que el operador lo limpie con "Limpiar")
 *   ?adelanto=<uuid>  → abre el modal del ticket apenas carga la fila
 */
const searchSchema = z.object({
  comercio: z.string().optional(),
  adelanto: z.string().optional(),
});

export const Route = createFileRoute("/admin/comercios/link-pago/adelantos")({
  validateSearch: searchSchema,
  component: Page,
  head: () => ({
    meta: [
      { title: "Adelantos de Dinero — Links de Pago — Admin — Moli" },
      { name: "description", content: "Solicitudes de adelanto de fondos de comercios." },
    ],
  }),
});

// Lo que la grilla necesita del comercio lo armamos via join para no
// mostrar el UUID crudo en la columna "Comercio".
type ComercioResumen = {
  id: string;
  nombre: string;
  legajo: string;
};

type AdelantoUI = {
  id: string;
  /** UUID real del adelanto (para llamar a las RPCs). */
  fullId: string;
  /** Texto a mostrar: nombre del comercio o, si no se pudo resolver, el UUID. */
  comercio: string;
  legajo: string;
  fechaSolicitud: string;
  importeSolicitado: number;
  plazoSolicitado: string;
  plazoContractual: string;
  comision: string;
  tasaEfectiva?: string;
  estado: EstadoAdelanto;
  notas?: string | null;
  tasaInteresPct?: number | null;
  motivo?: string | null;
  fechaAcreditacion?: string | null;
  montoPorAcreditar?: number | null;
  fechaResolucion?: string | null;
  /** Monto aprobado en la oferta. */
  montoOfertado?: number | null;
  descuento?: number | null;
  netoARecibir?: number | null;
  compensado?: number;
  rechazoMotivo?: string | null;
};

function tone(e: EstadoAdelanto): "warn" | "success" | "danger" | "neutral" {
  if (e === "Pendiente") return "warn";
  if (e === "Aprobado") return "neutral";
  if (e === "Aceptado") return "warn";
  if (e === "Acreditado") return "success";
  if (e === "Compensado") return "success";
  if (e === "Cancelado") return "neutral";
  return "danger";
}

/** Nombre que ve el operador: Pendiente = Solicitado, Aprobado = Ofertado. */
function etiqueta(e: EstadoAdelanto): string {
  if (e === "Pendiente") return "Solicitado";
  if (e === "Aprobado") return "Ofertado";
  return e;
}

function fmt(n: number) {
  return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function Detalle({
  a,
  onClose,
  onSave,
  onAcreditado,
}: {
  a: AdelantoUI;
  onClose: () => void;
  onSave: (u: AdelantoUI) => void;
  onAcreditado: () => void;
}) {
  // El modal hace cosas distintas según el estado:
  //  - Solicitado (Pendiente): el usuario maestro oferta (monto + tasa) o rechaza.
  //  - Ofertado (Aprobado): espera que la empresa acepte o cancele.
  //  - Aceptado: el usuario maestro acredita (sale de la recaudadora de Payway).
  //  - Acreditado / Compensado: solo lectura, con lo compensado.
  const [tasaInteres, setTasaInteres] = useState<string>(
    a.tasaInteresPct != null ? String(a.tasaInteresPct) : "",
  );
  const [notas, setNotas] = useState<string>("");
  const [montoOferta, setMontoOferta] = useState<string>(String(a.montoOfertado ?? a.importeSolicitado));
  const [busy, setBusy] = useState(false);
  const [tope, setTope] = useState<number | null>(null);

  // Sólo se muestra el tope cuando el adelanto está en revisión
  // (Pendiente o Aprobado). Es informativo: le dice al admin cuánto le
  // queda al comercio para pedir más adelantos.
  useEffect(() => {
    if (a.estado !== "Pendiente" && a.estado !== "Aprobado" && a.estado !== "Aceptado") {
      setTope(null);
      return;
    }
    // Necesitamos el comercioId (UUID), no el legajo ni el nombre.
    // El join del nombre se hace en la grilla pasando fullId; acá lo
    // derivamos del AdelantoUI (fullId) buscando el comercio en un
    // cache que armamos arriba. Para simplificar, hacemos un query
    // directo: de las filas que ya tenemos, sacamos el comercio_id.
    let cancelled = false;
    (async () => {
      const sb = requireSupabase();
      const { data } = await sb
        .from("adelantos")
        .select("comercio_id")
        .eq("id", a.fullId)
        .maybeSingle();
      if (cancelled || !data?.comercio_id) return;
      const t = await calcularTopeDisponible(data.comercio_id as string, a.fullId);
      if (!cancelled) setTope(t);
    })();
    return () => {
      cancelled = true;
    };
  }, [a.fullId, a.estado]);

  const tasaPctNum = useMemo(() => {
    if (tasaInteres.trim() === "") return null;
    const v = parseFloat(tasaInteres.replace(",", "."));
    return Number.isFinite(v) ? v : null;
  }, [tasaInteres]);

  const montoOfertaNum = useMemo(() => {
    const v = parseFloat(montoOferta.replace(",", "."));
    return Number.isFinite(v) ? v : 0;
  }, [montoOferta]);

  // Tasa = descuento unico sobre el monto (no TNA / TEM).
  const interesEstimado = useMemo(() => {
    if (tasaPctNum == null) return 0;
    return Math.round((montoOfertaNum * tasaPctNum) / 100 * 100) / 100;
  }, [montoOfertaNum, tasaPctNum]);

  const netoEstimado = useMemo(
    () => Math.max(0, montoOfertaNum - interesEstimado),
    [montoOfertaNum, interesEstimado],
  );

  const montoAcreditar = a.montoOfertado ?? a.importeSolicitado;

  // Pool de Recaudación: se consulta solo cuando el modal está abierto
  // y el adelanto está en estado Aprobado (es el único caso donde el
  // botón "Acreditar" podría habilitarse). La RPC devuelve los 3 KPIs.
  const { data: pool } = useQuery<PoolRecaudacion>({
    queryKey: ["pool-recaudacion", a.fullId],
    queryFn: () => obtenerPoolRecaudacion(),
    enabled: a.estado === "Aceptado",
    refetchInterval: 30_000, // refresca cada 30s mientras el modal está abierto
  });
  const poolInsuficiente =
    a.estado === "Aceptado" && (pool?.cupoDisponiblePool ?? 0) < montoAcreditar;

  const handleAprobar = async () => {
    if (tasaPctNum == null) {
      toast.error("Cargá la tasa de interés (0-100%)");
      return;
    }
    if (tasaPctNum < 0 || tasaPctNum > 100) {
      toast.error("Tasa fuera de rango (0-100%)");
      return;
    }
    setBusy(true);
    try {
      if (!(montoOfertaNum > 0)) {
        toast.error("Cargá el monto aprobado");
        setBusy(false);
        return;
      }
      if (tope != null && montoOfertaNum > tope) {
        toast.error("El monto aprobado supera el tope del comercio");
        setBusy(false);
        return;
      }
      const r = await aprobarAdelanto(a.fullId, tasaPctNum, notas.trim() || undefined, { monto: montoOfertaNum });
      onSave({ ...a, estado: "Aprobado", tasaInteresPct: r.tasaPct, motivo: notas.trim() || a.motivo });
      toast.success(`Oferta enviada: ${fmt(r.netoARecibir)} netos al ${r.tasaPct}%. La empresa tiene que aceptarla.`);
      if (!r.alcanza) toast.warning("Hoy la recaudadora no alcanza para este monto: no se va a poder acreditar hasta que haya disponible.");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleRechazar = async () => {
    if (!notas.trim()) {
      toast.error("Cargá un motivo de rechazo en el campo de notas");
      return;
    }
    setBusy(true);
    try {
      await rechazarAdelanto(a.fullId, notas.trim());
      onSave({ ...a, estado: "Rechazado", rechazoMotivo: notas.trim() });
      toast.success("Adelanto rechazado");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleAcreditar = async () => {
    if (a.estado !== "Aceptado") {
      toast.error("Solo se acreditan adelantos que la empresa aceptó");
      return;
    }
    setBusy(true);
    try {
      const r = await acreditarAdelanto(a.fullId, notas.trim() || undefined);
      toast.success(
        `Adelanto acreditado. Depósito neto: ${fmt(r.montoNetoDepositado)} (descuento ${fmt(r.interes)}).`,
      );
      onAcreditado();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const readOnly = ["Acreditado", "Compensado", "Cancelado", "Rechazado"].includes(a.estado);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <Wallet size={18} /> Adelanto {shortId(a.fullId)}
            </h3>
            <p className="text-sm text-muted-foreground">
              {a.comercio} · {a.legajo}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={tone(a.estado)}>{etiqueta(a.estado)}</Badge>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">✕</button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {/* Tope disponible: banner contextual sólo en Pendiente/Aprobado */}
          {tope != null && (
            <div className="rounded-lg border bg-amber-50 border-amber-200 px-3 py-2 text-xs text-amber-800 flex items-center justify-between">
              <span>
                Tope disponible del comercio:{" "}
                <span className="font-mono font-semibold">{fmt(tope)}</span>
              </span>
              <span className="text-amber-700">
                Importe solicitado: <span className="font-mono font-semibold">{fmt(a.importeSolicitado)}</span>
              </span>
            </div>
          )}

          {/* Recaudadora de Payway: banner solo cuando el adelanto está
              Aceptado (es el único caso donde se Acredita y se mueve
              plata). */}
          {a.estado === "Aceptado" && pool && (
            <div
              className={
                "rounded-lg border px-3 py-2 text-xs flex items-center justify-between " +
                (poolInsuficiente
                  ? "bg-red-50 border-red-300 text-red-800"
                  : "bg-sky-50 border-sky-200 text-sky-800")
              }
            >
              <span className="flex items-center gap-3">
                <span>
                  Pendiente de acreditar:{" "}
                  <span className="font-mono font-semibold">{fmt(pool.poolRecaudacionTotal)}</span>
                </span>
                <span>
                  Adelantos sin compensar:{" "}
                  <span className="font-mono font-semibold">{fmt(pool.adelantosEnCurso)}</span>
                </span>
                <span>
                  Cupo disponible:{" "}
                  <span className="font-mono font-semibold">{fmt(pool.cupoDisponiblePool)}</span>
                </span>
              </span>
              {poolInsuficiente && (
                <span className="font-semibold">
                  ⚠ La recaudadora no alcanza para acreditar {fmt(montoAcreditar)}
                </span>
              )}
            </div>
          )}

          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Solicitud
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Building2 size={12} /> Comercio
                </span>
                <div className="font-semibold truncate">{a.comercio}</div>
                <div className="font-mono text-xs text-muted-foreground">{a.legajo}</div>
              </div>
              <div>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar size={12} /> Fecha solicitud
                </span>
                <div className="font-mono">{a.fechaSolicitud}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Importe solicitado</span>
                <div className="font-mono font-semibold text-base">
                  {fmt(a.importeSolicitado)}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock size={12} /> Plazo solicitado
                </span>
                <div className="font-semibold">{a.plazoSolicitado}</div>
                <div className="text-xs text-muted-foreground">Contractual: {a.plazoContractual}</div>
              </div>
              {a.motivo && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Motivo</span>
                  <div className="text-sm whitespace-pre-wrap">{a.motivo}</div>
                </div>
              )}
              {a.montoOfertado != null && (
                <div>
                  <span className="text-muted-foreground">Oferta</span>
                  <div className="font-mono font-semibold">{fmt(a.montoOfertado)} al {a.tasaInteresPct ?? 0}%</div>
                  <div className="text-xs text-muted-foreground">
                    Neto a recibir: <span className="font-mono">{fmt(a.netoARecibir ?? 0)}</span>
                  </div>
                </div>
              )}
              {a.rechazoMotivo && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Motivo del rechazo</span>
                  <div className="text-sm whitespace-pre-wrap">{a.rechazoMotivo}</div>
                </div>
              )}
              {a.fechaResolucion && (
                <div>
                  <span className="text-muted-foreground">Fecha resolución</span>
                  <div className="font-mono text-xs">{a.fechaResolucion}</div>
                </div>
              )}
              {a.fechaAcreditacion && (
                <div>
                  <span className="text-muted-foreground">Fecha acreditación</span>
                  <div className="font-mono text-xs">{a.fechaAcreditacion}</div>
                </div>
              )}
            </div>
          </Card>

          {/* Acciones según estado */}
          {!readOnly && (
            <Card className="p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Gestión (Admin)
              </h4>

              {a.estado === "Aprobado" && (
                <p className="text-sm text-muted-foreground">
                  Oferta enviada. Esperando que la empresa la acepte o la cancele desde su portal.
                </p>
              )}

              {a.estado === "Pendiente" && (
              <div>
                <Label htmlFor="monto-oferta">Monto aprobado (no puede superar el tope)</Label>
                <Input
                  id="monto-oferta"
                  value={montoOferta}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v !== "" && !/^[0-9]*[.,]?[0-9]*$/.test(v)) return;
                    setMontoOferta(v);
                  }}
                  className="h-9"
                  inputMode="decimal"
                />
              </div>
              )}

              {a.estado === "Pendiente" && (
              <div>
                <Label htmlFor="tasa-interes">Tasa (%) — descuento único sobre el monto</Label>
                <Input
                  id="tasa-interes"
                  value={tasaInteres}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v !== "" && !/^[0-9]*[.,]?[0-9]*$/.test(v)) return;
                    setTasaInteres(v);
                  }}
                  placeholder="Ej: 4.5"
                  className="h-9"
                  inputMode="decimal"
                />
                {tasaPctNum != null && (
                  <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-3">
                    <span>
                      Descuento: <span className="font-mono font-semibold text-red-600">- {fmt(interesEstimado)}</span>
                    </span>
                    <span>
                      Neto que recibe el comercio:{" "}
                      <span className="font-mono font-semibold text-emerald-700">{fmt(netoEstimado)}</span>
                    </span>
                  </div>
                )}
              </div>
              )}

              {/* Notas: se concatenan al motivo del adelanto */}
              <div>
                <Label htmlFor="notas">Notas / motivo</Label>
                <textarea
                  id="notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  placeholder="Ej. tasa preferencial por volumen, rechazo por tope agotado, etc."
                  className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {/* Aprobar (sólo Pendiente) */}
                {a.estado === "Pendiente" && (
                  <BtnPrimary disabled={busy} onClick={handleAprobar}>
                    <CheckCircle2 size={14} className="mr-1" /> Enviar oferta
                  </BtnPrimary>
                )}

                {/* Acreditar (sólo Aceptado por la empresa) — mueve plata */}
                {a.estado === "Aceptado" && (
                  <BtnPrimary
                    disabled={busy || poolInsuficiente}
                    onClick={handleAcreditar}
                    className={poolInsuficiente
                      ? "bg-red-300 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700"}
                    title={poolInsuficiente
                      ? "La recaudadora de Payway no alcanza para este adelanto. La RPC rechazará la operación."
                      : "Sale de la recaudadora de Payway y acredita el neto en la Operativa del comercio"}
                  >
                    <Banknote size={14} className="mr-1" />
                    {poolInsuficiente ? "Recaudadora insuficiente" : "Acreditar y mover saldo"}
                  </BtnPrimary>
                )}

                {/* Rechazar (solo Solicitado) */}
                {a.estado === "Pendiente" && (
                  <BtnOutline
                    disabled={busy}
                    onClick={handleRechazar}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <XCircle size={14} className="mr-1" /> Rechazar
                  </BtnOutline>
                )}

                <BtnOutline disabled={busy} onClick={onClose}>
                  Cerrar
                </BtnOutline>
              </div>
            </Card>
          )}

          {readOnly && (
            <Card className="p-4 text-sm text-muted-foreground">
              {a.estado === "Acreditado" || a.estado === "Compensado" ? (
                <p>
                  Este adelanto ya fue acreditado. Los fondos se depositaron en la subcuenta{" "}
                  <span className="font-mono">Operativa</span> del legajo{" "}
                  <span className="font-mono">{a.legajo}</span> el {a.fechaAcreditacion}.{" "}
                  {a.estado === "Compensado"
                    ? "Ya se descontó todo de sus liquidaciones siguientes."
                    : `Compensado hasta ahora: ${fmt(a.compensado ?? 0)}; se descuenta solo de sus próximos lotes.`}
                </p>
              ) : a.estado === "Rechazado" ? (
                <p>Este adelanto fue rechazado.</p>
              ) : (
                <p>Este adelanto fue cancelado por el comercio. No se pueden revertir las acciones.</p>
              )}
            </Card>
          )}

          {/* Detalle del movimiento de saldo — sólo visible si ya se acreditó */}
          {(a.estado === "Acreditado" || a.estado === "Compensado") && a.fechaAcreditacion && (
            <Card className="p-4 border-l-4 border-l-emerald-500">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <Banknote size={14} className="text-emerald-600" /> Movimiento de saldo
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Adelantado (recaudadora de Payway)</div>
                <div className="font-mono text-red-600 text-right">- {fmt(montoAcreditar)}</div>
                <div className="text-muted-foreground">Descuento ({a.tasaInteresPct ?? 0}%)</div>
                <div className="font-mono text-red-600 text-right">- {fmt(a.descuento ?? 0)}</div>
                <div className="text-muted-foreground font-semibold">Neto a Operativa</div>
                <div className="font-mono text-emerald-700 text-right font-semibold">+ {fmt(a.netoARecibir ?? 0)}</div>
                <div className="text-muted-foreground">Compensado con lotes</div>
                <div className="font-mono text-right">{fmt(a.compensado ?? 0)}</div>
                <div className="text-muted-foreground">Pendiente de compensar</div>
                <div className="font-mono text-right font-semibold">{fmt(Math.max(0, montoAcreditar - (a.compensado ?? 0)))}</div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Page() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [estadoFilter, setEstadoFilter] = useState<EstadoAdelanto | "">("");
  const [detail, setDetail] = useState<AdelantoUI | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string } | null>(null);

  // Deep link desde el calendario: ?comercio=<uuid>&adelanto=<uuid>
  // Si viene `comercio`, lo usamos como filtro hasta que el operador
  // lo limpie con "Limpiar". Si viene `adelanto`, abrimos el modal
  // apenas la fila esté disponible en la página actual.
  const search = useSearch({ from: "/admin/comercios/link-pago/adelantos" });
  const comercioFromUrl = search?.comercio;
  const adelantoFromUrl = search?.adelanto;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["adelantos", page, pageSize, estadoFilter],
    queryFn: () =>
      listAdelantos({
        page,
        pageSize,
        estado: (estadoFilter as EstadoAdelanto) || undefined,
      }),
  });

  // Si la URL trae `adelanto=<uuid>`, marcamos la intención de abrir
  // el modal. El render del detalle se hace en base a la grilla: si
  // la fila está en la página actual, el modal se abre apenas se
  // arme el `AdelantoUI` con su join a comercios. Si la fila no está
  // (paginado distinto), igual el operador tiene el deep link
  // copiable y puede navegar manualmente.
  useEffect(() => {
    if (!adelantoFromUrl || detail) return;
    setPendingDeepLinkAdelantoId(adelantoFromUrl);
  }, [adelantoFromUrl, detail]);

  // Marker interno: id de adelanto a abrir cuando aparezca en la
  // grilla. Se limpia cuando el modal se cierra.
  const [pendingDeepLinkAdelantoId, setPendingDeepLinkAdelantoId] =
    useState<string | null>(null);

  // Pool de Recaudación: KPIs globales que se muestran SIEMPRE en la
  // cabecera de la pantalla. Refresca cada 30s para mantener el saldo
  // "vivo" mientras el operador evalúa acreditar.
  const { data: poolCabecera } = useQuery<PoolRecaudacion>({
    queryKey: ["pool-recaudacion", "cabecera"],
    queryFn: () => obtenerPoolRecaudacion(),
    refetchInterval: 30_000,
  });

  // La grilla trae los adelantos pero la columna "Comercio" necesita
  // nombre y legajo, no el UUID. Armamos un cache comercio_id →
  // { nombre, legajo } haciendo un solo query que une los comercios
  // que aparecieron en la página actual.
  const adelantosCrudos: Adelanto[] = data ?? [];
  const comerciosIds = useMemo(
    () => Array.from(new Set(adelantosCrudos.map((a) => a.comercioId))),
    [adelantosCrudos],
  );
  const { data: comerciosMap } = useQuery<Record<string, ComercioResumen>>({
    queryKey: ["adelantos-comercios", comerciosIds],
    queryFn: async () => {
      if (comerciosIds.length === 0) return {};
      const sb = requireSupabase();
      const { data, error } = await sb
        .from("comercios")
        .select("id, nombre_comercio, legajo")
        .in("id", comerciosIds);
      if (error) throw new Error(error.message);
      const map: Record<string, ComercioResumen> = {};
      for (const r of (data ?? []) as { id: string; nombre_comercio: string | null; legajo: string }[]) {
        map[r.id] = {
          id: r.id,
          nombre: r.nombre_comercio || "(sin nombre)",
          legajo: r.legajo,
        };
      }
      return map;
    },
    enabled: comerciosIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const rows: AdelantoUI[] = adelantosCrudos.map((a) => {
    const c = comerciosMap?.[a.comercioId];
    return {
      id: shortId(a.id),
      fullId: a.id,
      comercio: c?.nombre ?? a.comercioId,
      legajo: c?.legajo ?? "—",
      fechaSolicitud: new Date(a.fechaSolicitud).toLocaleDateString("es-AR"),
      importeSolicitado: a.montoSolicitado,
      plazoSolicitado: `${a.plazoAdelantadoDias} días`,
      plazoContractual: `${a.plazoOriginalDias} días`,
      comision: a.tasaInteresPct != null ? `${a.tasaInteresPct}%` : "Pendiente",
      tasaEfectiva: a.netoARecibir != null ? `Neto ${fmt(a.netoARecibir)}` : undefined,
      estado: a.estado,
      notas: a.motivo,
      tasaInteresPct: a.tasaInteresPct,
      motivo: a.motivo,
      fechaAcreditacion: a.fechaAcreditacion,
      montoPorAcreditar: a.montoPorAcreditar,
      fechaResolucion: a.fechaResolucion,
      montoOfertado: a.montoOfertado,
      descuento: a.descuento,
      netoARecibir: a.netoARecibir,
      compensado: a.compensado,
      rechazoMotivo: a.rechazoMotivo,
    };
  });

  // Deep link: si la fila del adelanto está en la página actual,
  // abrimos el modal automáticamente y limpiamos el marker.
  useEffect(() => {
    if (!pendingDeepLinkAdelantoId || detail) return;
    const target = rows.find((r) => r.fullId === pendingDeepLinkAdelantoId);
    if (target) {
      setDetail(target);
      setPendingDeepLinkAdelantoId(null);
    }
  }, [pendingDeepLinkAdelantoId, rows, detail]);

  // Si la URL trae `comercio`, filtramos la grilla en cliente. La
  // query al backend sigue trayendo la página completa (necesitamos
  // encontrar el `adelantoFromUrl` que viene en otra página) y el
  // filtro visual se aplica acá.
  const rowsVisibles = useMemo(() => {
    if (!comercioFromUrl) return rows;
    return rows.filter((r) => {
      const cruda = adelantosCrudos.find((a) => a.id === r.fullId);
      return cruda?.comercioId === comercioFromUrl;
    });
  }, [rows, adelantosCrudos, comercioFromUrl]);

  // Banner contextual: si la URL trae `comercio`, mostramos un chip
  // arriba explicando que el listado está filtrado.
  const filtradoPorComercio = !!comercioFromUrl;

  const limpiarFiltroComercio = () => {
    void navigate({
      to: "/admin/comercios/link-pago/adelantos",
      search: {},
    } as never);
  };

  const guardar = (_u: AdelantoUI) => {
    refetch();
  };

  const invalidarTodo = () => {
    queryClient.invalidateQueries({ queryKey: ["adelantos"] });
    queryClient.invalidateQueries({ queryKey: ["lotes"] });
    queryClient.invalidateQueries({ queryKey: ["lotes-resumen"] });
    // Para que el portal de Enterprises vea el cambio al refrescar
    queryClient.invalidateQueries({ queryKey: ["subcuentas"] });
    // Pool de Recaudación: cambia cuando se Acredita un adelanto o se
    // actualiza el saldo de cualquier subcuenta tipo=Recaudacion.
    queryClient.invalidateQueries({ queryKey: ["pool-recaudacion"] });
  };

  const getActions = (r: AdelantoUI): ActionItem[] => [
    {
      label: "Ver / gestionar",
      icon: Eye,
      onClick: () => setDetail(r),
    },
  ];

  // Totales para las cards KPI
  const totalesPorEstado = useMemo(() => {
    const m: Record<EstadoAdelanto, { cantidad: number; monto: number }> = {
      Pendiente: { cantidad: 0, monto: 0 },
      Aprobado: { cantidad: 0, monto: 0 },
      Aceptado: { cantidad: 0, monto: 0 },
      Rechazado: { cantidad: 0, monto: 0 },
      Acreditado: { cantidad: 0, monto: 0 },
      Compensado: { cantidad: 0, monto: 0 },
      Cancelado: { cantidad: 0, monto: 0 },
    };
    for (const a of adelantosCrudos) {
      const estado = a.estado as EstadoAdelanto;
      m[estado].cantidad += 1;
      m[estado].monto += Number(a.montoSolicitado ?? 0);
    }
    return m;
  }, [adelantosCrudos]);

  const columns: Column<AdelantoUI>[] = [
    {
      key: "id",
      label: "Solicitud",
      filterable: true,
      render: (r) => <span className="font-mono text-xs font-semibold">{r.id}</span>,
    },
    {
      key: "comercio",
      label: "Comercio",
      filterable: true,
      render: (r) => (
        <div>
          <div className="font-semibold text-sm truncate max-w-[200px]">{r.comercio}</div>
          <div className="font-mono text-xs text-muted-foreground">{r.legajo}</div>
        </div>
      ),
    },
    {
      key: "importeSolicitado",
      label: "Importe",
      render: (r) => (
        <span className="font-mono tabular-nums font-semibold">
          {fmt(r.importeSolicitado)}
        </span>
      ),
    },
    {
      key: "plazoSolicitado",
      label: "Plazo",
      render: (r) => (
        <div>
          <div className="font-semibold text-sm">{r.plazoSolicitado}</div>
          <div className="text-xs text-muted-foreground">{r.plazoContractual}</div>
        </div>
      ),
    },
    {
      key: "comision",
      label: "Tasa / neto",
      render: (r) => (
        <div>
          <div className="font-semibold text-sm">{r.comision}</div>
          <div className="text-xs text-muted-foreground">{r.tasaEfectiva ?? "—"}</div>
        </div>
      ),
    },
    {
      key: "estado",
      label: "Estado",
      filterable: "enum",
      filterOptions: ["Pendiente", "Aprobado", "Aceptado", "Rechazado", "Acreditado", "Compensado", "Cancelado"],
      render: (r) => <Badge tone={tone(r.estado)}>{etiqueta(r.estado)}</Badge>,
    },
    {
      key: "compensado",
      label: "Pendiente de compensar",
      render: (r) =>
        r.estado === "Acreditado" || r.estado === "Compensado" ? (
          <span className="font-mono tabular-nums text-xs">
            {fmt(Math.max(0, (r.montoOfertado ?? r.importeSolicitado) - (r.compensado ?? 0)))}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "fechaSolicitud",
      label: "Fecha",
      render: (r) => <span className="font-mono text-xs">{r.fechaSolicitud}</span>,
    },
  ];

  const err = error as Error | null;

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Adelantos de Dinero"
        description="Solicitudes de comercios para recibir fondos antes de que Payway liquide. Se fondean desde la recaudadora de Payway hacia la Operativa del comercio y se compensan solos con sus próximos lotes."
      />

      {filtradoPorComercio && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 mb-4 flex items-center gap-2">
          <Building2 size={14} />
          <span>
            Viniendo del calendario: listado filtrado al comercio{" "}
            <span className="font-mono">{comercioFromUrl}</span>.
          </span>
          <button
            type="button"
            onClick={limpiarFiltroComercio}
            className="ml-auto h-6 px-2 rounded-md border bg-card text-xs hover:bg-muted inline-flex items-center gap-1"
          >
            <X size={12} /> Quitar filtro
          </button>
        </div>
      )}

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Estado</Label>
            <select
              value={estadoFilter}
              onChange={(e) => {
                setEstadoFilter(e.target.value as EstadoAdelanto | "");
                setPage(0);
              }}
              className="w-full sm:min-w-[130px] h-8 px-2 rounded-md border bg-background text-xs"
            >
              <option value="">Todos</option>
              <option value="Pendiente">Solicitado</option>
              <option value="Aprobado">Ofertado</option>
              <option value="Aceptado">Aceptado</option>
              <option value="Rechazado">Rechazado</option>
              <option value="Acreditado">Acreditado</option>
              <option value="Compensado">Compensado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Cards de Pool de Recaudación (KPIs globales). Siempre visibles
          en la cabecera para que el operador vea el estado del pool antes
          de evaluar acreditar cualquier adelanto. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            Pendiente de acreditar (recaudadora Payway)
          </div>
          <div className="font-mono text-2xl font-semibold mt-1">
            {poolCabecera ? fmt(poolCabecera.poolRecaudacionTotal) : "—"}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Lo que Payway ya depositó y todavía no es saldo de ningún comercio.
            Es la única fuente de fondeo para los adelantos.
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            Adelantos en curso
          </div>
          <div className="font-mono text-2xl font-semibold mt-1">
            {poolCabecera ? fmt(poolCabecera.adelantosEnCurso) : "—"}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Adelantos acreditados que todavía no se compensaron con los lotes
            del comercio.
          </div>
        </Card>
        <Card
          className={
            "p-4 border-l-4 " +
            ((poolCabecera?.cupoDisponiblePool ?? 0) <= 0
              ? "border-l-red-500"
              : (poolCabecera?.cupoDisponiblePool ?? 0) < 10000
                ? "border-l-amber-500"
                : "border-l-emerald-500")
          }
        >
          <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center justify-between">
            <span>Cupo disponible del pool</span>
            {(poolCabecera?.cupoDisponiblePool ?? 0) <= 0 && (
              <span className="text-red-600 font-semibold">⚠ Sin liquidez</span>
            )}
          </div>
          <div
            className={
              "font-mono text-2xl font-semibold mt-1 " +
              ((poolCabecera?.cupoDisponiblePool ?? 0) <= 0
                ? "text-red-600"
                : (poolCabecera?.cupoDisponiblePool ?? 0) < 10000
                  ? "text-amber-700"
                  : "text-emerald-700")
            }
          >
            {poolCabecera ? fmt(poolCabecera.cupoDisponiblePool) : "—"}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Pendiente de acreditar − adelantos sin compensar. Define si se puede seguir acreditando adelantos.
          </div>
        </Card>
      </div>

      {/* Cards de totales por estado (cantidad + monto reservado) */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mb-4">
        {(["Pendiente", "Aprobado", "Aceptado", "Rechazado", "Acreditado", "Compensado", "Cancelado"] as const).map((s) => {
          const t = totalesPorEstado[s];
          return (
            <Card key={s} className="p-3">
              <div className="text-xs text-muted-foreground flex items-center justify-between">
                <span>{etiqueta(s)}</span>
                <Badge tone={tone(s)}>{t.cantidad}</Badge>
              </div>
              <div className="font-mono text-lg font-semibold mt-1">
                {t.monto > 0 ? fmt(t.monto) : "—"}
              </div>
            </Card>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando adelantos…
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
          <AlertTriangle size={28} />
          <p>{err?.message ?? "Error"}</p>
          <button
            onClick={() => refetch()}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={rowsVisibles}
          keyExtractor={(r) => r.fullId}
          actions={(r) => <ActionsDropdown actions={getActions(r)} />}
        />
      )}

      {detail && (
        <Detalle
          a={detail}
          onClose={() => setDetail(null)}
          onSave={(u) => {
            guardar(u);
            invalidarTodo();
          }}
          onAcreditado={() => {
            invalidarTodo();
          }}
        />
      )}
      {confirm && (
        <ConfirmDialog
          open
          onClose={() => setConfirm(null)}
          title={confirm.title}
          message={confirm.message}
          confirmLabel="Cerrar"
          variant="default"
          onConfirm={() => setConfirm(null)}
        />
      )}
    </PermissionGuard>
  );
}
