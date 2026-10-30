import { createFileRoute, Link } from "@tanstack/react-router";
import { QK_ACRED, cambiarEstadoContracargo, listContracargosRecupero } from "@/lib/api/acreditaciones";
import { useState, useEffect, useMemo, useRef, type ReactElement } from "react";
import {
  Eye,
  AlertTriangle,
  Inbox,
  Ticket,
  FileText,
  ArrowRight,
  Clock,
  ShieldCheck,
  Plus,
  X,
  Upload,
  Link2,
  Paperclip,
  Trash2,
  Send,
  ExternalLink,
  Copy,
  UploadCloud,
  Download,
  Calendar,
  CreditCard,
  Banknote,
} from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader, Badge, Card, Input, Label, BtnOutline } from "@/components/portal-shell";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PermissionGuard } from "@/components/permission-guard";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { useCan } from "@/lib/permissions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { requireSupabase } from "@/lib/supabase";
import {
  listContracargos,
  updateContracargo,
  createContracargo,
  deleteContracargo,
  confirmarSimulacion,
  agregarAdjunto,
  quitarAdjunto,
  enviarAPayway,
  estadoUiToDb,
  type Contra,
  type EstadoContra,
} from "@/lib/api/contracargos";
import { useComercios } from "@/hooks/useComercios";
import { ImportarContracargosModal } from "@/components/importar-contracargos-modal";
import { SimularContracargosModal } from "@/components/acreditaciones/simular-contracargos-modal";
import { getAdjuntoSignedUrl } from "@/lib/storage/contracargos";

export const Route = createFileRoute("/admin/comercios/link-pago/contracargos")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Contracargos — Links de Pago — Admin — Moli" },
      { name: "description", content: "Gestión de contracargos de links de pago." },
    ],
  }),
});

const ESTADO_LABEL: Record<EstadoContra, string> = {
  Simulado: "Simulado",
  Abierto: "Abierto",
  "En_mediación": "En mediación",
  En_mediacion: "En mediación",
  Cerrado_acreditado: "Cerrado acreditado",
  Cerrado_retenido: "Cerrado retenido",
};

const ESTADO_OPTIONS_UI: EstadoContra[] = [
  "Simulado",
  "Abierto",
  "En_mediación",
  "Cerrado_acreditado",
  "Cerrado_retenido",
];

function tone(e: EstadoContra): "warn" | "neutral" | "success" | "danger" {
  if (e === "Simulado") return "neutral";
  if (e === "Abierto") return "warn";
  if (e === "En_mediación" || e === "En_mediacion") return "neutral";
  if (e === "Cerrado_acreditado") return "success";
  return "danger"; // Cerrado_retenido
}

function fmt(n: number) {
  return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Días hábiles entre hoy y `fecha_limite`.
 * - Positivo: días que faltan (en horario hábil, lun-vie)
 * - Negativo: días que se pasó del plazo
 * - 0: vence hoy
 */
function diasHabilesRestantes(fechaLimite: string): number {
  const limite = new Date(fechaLimite);
  const hoy = new Date();
  // Normalizamos a inicio de día para evitar líos de hora.
  const dLimite = new Date(limite.getFullYear(), limite.getMonth(), limite.getDate());
  const dHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (dLimite.getTime() === dHoy.getTime()) return 0;

  const sentido = dLimite.getTime() > dHoy.getTime() ? 1 : -1;
  const cursor = new Date(dHoy);
  let count = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    cursor.setDate(cursor.getDate() + sentido);
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) count += sentido;
    if (sentido > 0 && cursor.getTime() >= dLimite.getTime()) break;
    if (sentido < 0 && cursor.getTime() <= dLimite.getTime()) break;
  }
  return count;
}

function PlazoMediacion({ fechaLimite, enviadoAt }: { fechaLimite: string | null; enviadoAt: string | null }) {
  if (!fechaLimite) {
    return (
      <p className="text-xs text-muted-foreground">
        Sin plazo definido (se calcula al pasar a mediación).
      </p>
    );
  }
  const dias = diasHabilesRestantes(fechaLimite);
  const fechaFmt = new Date(fechaLimite).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  let badge: ReactElement;
  let texto: string;
  if (enviadoAt) {
    badge = <Badge tone="success">Enviado a PayWay</Badge>;
    texto = `Enviado el ${new Date(enviadoAt).toLocaleDateString("es-AR")}.`;
  } else if (dias < 0) {
    badge = <Badge tone="danger">Vencido hace {-dias} día(s) hábil(es)</Badge>;
    texto = `Venció el ${fechaFmt}.`;
  } else if (dias === 0) {
    badge = <Badge tone="warn">Vence hoy</Badge>;
    texto = `Vence hoy a las ${new Date(fechaLimite).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}.`;
  } else {
    badge = <Badge tone="warn">Vence en {dias} día(s) hábil(es)</Badge>;
    texto = `Límite: ${fechaFmt}.`;
  }
  return (
    <div className="flex items-center gap-2 text-xs">
      {badge}
      <span className="text-muted-foreground">{texto}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detalle (modal de gestión)
// ---------------------------------------------------------------------------

function Detalle({
  c,
  onClose,
}: {
  c: Contra;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { can } = useCan();
  const puedeGestionar = can("modificar", "comercios");
  const puedeBorrar = can("borrar", "comercios");

  const [estado, setEstado] = useState<EstadoContra>(c.estado);
  const [ticket, setTicket] = useState(c.ticketPayway ?? "");
  const [doc, setDoc] = useState(c.documentacion ?? "");
  const [resolucion, setResolucion] = useState(c.resolucion ?? "");
  const [saving, setSaving] = useState(false);
  const [archivos, setArchivos] = useState(c.archivosAdjuntos);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Donde se desconto y si se recupero (vista v_contracargos_recupero).
  const recupero = useQuery({
    queryKey: [...QK_ACRED, "contracargo-recupero", c.id],
    queryFn: async () => (await listContracargosRecupero()).find((x) => x.id === c.id) ?? null,
  });

  const guardar = async () => {
    setSaving(true);
    try {
      // El dinero no se mueve aca: el descuento llega por el renglon negativo
      // del archivo de Payway. Descontarlo ademas a mano lo cobraba dos veces.
      // Los cambios de estado de la mediacion pasan por la RPC.
      const cambio = estado !== c.estado;
      if (cambio && estado !== "Simulado" && c.estado !== "Simulado") {
        await cambiarEstadoContracargo(c.id, estadoUiToDb(estado), resolucion || undefined);
        await updateContracargo(c.id, {
          ticketPayway: ticket || null,
          documentacion: doc || null,
        });
      } else {
        await updateContracargo(c.id, {
          estado,
          ticketPayway: ticket || null,
          documentacion: doc || null,
          resolucion: resolucion || null,
          esSimulacion: estado === "Simulado",
        });
      }
      toast.success("Contracargo actualizado");
      qc.invalidateQueries({ queryKey: ["contracargos"] });
      qc.invalidateQueries({ queryKey: ["lotes"] });
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onConfirmarSimulacion = async () => {
    setSaving(true);
    try {
      const actualizado = await confirmarSimulacion(c.id);
      toast.success(
        actualizado.loteSugeridoId
          ? "Contracargo abierto. Se retiene al acreditar el lote de la venta (o del saldo si ya se acreditó)."
          : "Contracargo abierto. Sin venta vinculada: se descuenta cuando llegue en la liquidación de Payway.",
      );
      qc.invalidateQueries({ queryKey: ["contracargos"] });
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onSubirArchivo = async (file: File) => {
    setUploading(true);
    try {
      const r = await agregarAdjunto(c, file);
      setArchivos(r.contra.archivosAdjuntos);
      qc.invalidateQueries({ queryKey: ["contracargos"] });
      toast.success("Archivo adjunto");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const onQuitarArchivo = async (path: string) => {
    if (!confirm("¿Quitar este archivo?")) return;
    try {
      const actualizado = await quitarAdjunto(c, path);
      setArchivos(actualizado.archivosAdjuntos);
      qc.invalidateQueries({ queryKey: ["contracargos"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onEnviarPayway = async () => {
    try {
      const r = await enviarAPayway(c.id);
      toast.success("Marcado como enviado a PayWay");
      qc.invalidateQueries({ queryKey: ["contracargos"] });
      // refrescar el modal: re-leemos del server
      qc.setQueryData(["contracargos"], (old: unknown) => old); // noop, sólo para forzar re-render abajo
      onClose();
      // Reabrimos con el contra actualizado
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["contracargos"] });
      }, 100);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onVerArchivo = async (path: string) => {
    try {
      const url = await getAdjuntoSignedUrl(path);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start z-10">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <AlertTriangle
                size={18}
                className={c.esSimulacion ? "text-blue-600" : "text-red-600"}
              />
              Contracargo {c.id.slice(0, 8)}…
            </h3>
            <p className="text-sm text-muted-foreground">
              {c.comercioNombre} · {c.comercioLegajo}
              {c.clienteLegajo && (
                <>
                  {" "}
                  · Legajo cliente <span className="font-mono">{c.clienteLegajo}</span>
                </>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-md"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Simulación: mostrar impacto antes de confirmar */}
          {c.esSimulacion && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm">
              <div className="font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                <Clock size={14} /> Simulación — estos valores aún no están aplicados
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {c.impactoNeto != null && (
                  <div>
                    <span className="text-blue-600">Descuento neto:</span>{" "}
                    <span className="font-mono font-semibold">{fmt(c.impactoNeto)}</span>
                  </div>
                )}
                {c.impactoSaldo != null && (
                  <div>
                    <span className="text-blue-600">Saldo commerce:</span>{" "}
                    <span className="font-mono font-semibold">{fmt(c.impactoSaldo)}</span>
                  </div>
                )}
                {c.impactoTasa != null && (
                  <div>
                    <span className="text-blue-600">Tasa MoliPay:</span>{" "}
                    <span className="font-mono">{c.impactoTasa}%</span>
                  </div>
                )}
                {c.impactoCierre != null && (
                  <div>
                    <span className="text-blue-600">Cierre lote:</span>{" "}
                    <span className="font-mono">{fmt(c.impactoCierre)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Flujo */}
          <div className="rounded-lg bg-muted/40 border px-3 py-2 text-xs flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold">Flujo:</span>
            <span>Visa</span> <ArrowRight size={12} /> <span>PayWay</span>{" "}
            <ArrowRight size={12} /> <span>MoliPay</span>{" "}
            <ArrowRight size={12} /> <span>comprador</span>
          </div>

          {/* Link original */}
          {(c.urlOrigen || c.linkId) && (
            <Card className="p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <Link2 size={12} /> Link de pago original
              </h4>
              {c.urlOrigen ? (
                <a
                  href={c.urlOrigen}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-primary underline break-all inline-flex items-center gap-1"
                >
                  {c.urlOrigen} <ExternalLink size={10} />
                </a>
              ) : (
                <p className="text-xs text-muted-foreground font-mono">
                  ID link: {c.linkId || "—"}
                </p>
              )}
            </Card>
          )}

          {/* Datos del contracargo + PayWay */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card className="p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                <Banknote size={12} /> Contracargo
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Importe</span>
                  <div className="font-mono font-semibold text-lg text-red-600">
                    -{fmt(c.importe)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Fecha creación</span>
                  <div className="font-mono text-xs">
                    {new Date(c.createdAt).toLocaleString("es-AR")}
                  </div>
                </div>
                {c.fechaTransaccion && (
                  <div>
                    <span className="text-muted-foreground">Fecha transacción</span>
                    <div className="font-mono text-xs">
                      {new Date(c.fechaTransaccion).toLocaleString("es-AR")}
                    </div>
                  </div>
                )}
                {c.motivoPayway && (
                  <div>
                    <span className="text-muted-foreground">Motivo</span>
                    <div className="text-sm">{c.motivoPayway}</div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                <CreditCard size={12} /> Datos PayWay
              </h4>
              <div className="space-y-2 text-sm">
                {c.nroTarjetaMasked && (
                  <div>
                    <span className="text-muted-foreground">Tarjeta</span>
                    <div className="font-mono">
                      {c.nroTarjetaMasked}
                      {c.marcaTarjeta && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({c.marcaTarjeta})
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {c.siteTransactionId && (
                  <div>
                    <span className="text-muted-foreground">TID</span>
                    <div className="font-mono text-xs flex items-center gap-1">
                      {c.siteTransactionId}
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(c.siteTransactionId!);
                          toast.success("Copiado");
                        }}
                        className="p-0.5 hover:bg-muted rounded"
                      >
                        <Copy size={10} />
                      </button>
                    </div>
                  </div>
                )}
                {c.siteId && (
                  <div>
                    <span className="text-muted-foreground">Establecimiento</span>
                    <div className="font-mono text-xs">{c.siteId}</div>
                  </div>
                )}
                {c.ccoOrigen && (
                  <div>
                    <span className="text-muted-foreground">Origen (CCO)</span>
                    <div className="text-xs">{c.ccoOrigen}</div>
                  </div>
                )}
                {c.ticketPayway && (
                  <div>
                    <span className="text-muted-foreground">Ticket PayWay</span>
                    <div className="font-mono text-xs">{c.ticketPayway}</div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Plazo de mediación (solo si En_mediación) */}
          {estado === "En_mediación" && (
            <Card className="p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <Calendar size={12} /> Plazo de mediación
              </h4>
              <PlazoMediacion fechaLimite={c.fechaLimite} enviadoAt={c.enviadoPaywayAt} />
            </Card>
          )}

          {/* Adjuntos */}
          {(estado === "En_mediación" ||
            estado === "Cerrado_acreditado" ||
            estado === "Cerrado_retenido") && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Paperclip size={12} /> Documentación adjunta ({archivos.length})
                </h4>
                {puedeGestionar && estado === "En_mediación" && !c.enviadoPaywayAt && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1 h-7 px-2 rounded-md border bg-card text-xs hover:bg-muted disabled:opacity-50"
                  >
                    {uploading ? (
                      <span className="inline-block w-3 h-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                    ) : (
                      <Upload size={12} />
                    )}
                    Adjuntar
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onSubirArchivo(f);
                    e.target.value = "";
                  }}
                />
              </div>

              {archivos.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin adjuntos todavía.</p>
              ) : (
                <ul className="space-y-1">
                  {archivos.map((a) => (
                    <li
                      key={a.path}
                      className="flex items-center justify-between gap-2 text-xs rounded-md border px-2 py-1.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={12} className="shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{a.name}</p>
                          <p className="text-muted-foreground text-[10px]">
                            {(a.size / 1024).toFixed(1)} KB ·{" "}
                            {new Date(a.uploaded_at).toLocaleString("es-AR")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onVerArchivo(a.path)}
                          className="h-7 w-7 rounded-md border bg-card hover:bg-muted inline-flex items-center justify-center"
                          title="Ver"
                        >
                          <Eye size={12} />
                        </button>
                        {puedeBorrar && !c.enviadoPaywayAt && (
                          <button
                            type="button"
                            onClick={() => onQuitarArchivo(a.path)}
                            className="h-7 w-7 rounded-md border border-red-200 text-red-600 hover:bg-red-50 inline-flex items-center justify-center"
                            title="Quitar"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {estado === "En_mediación" &&
                archivos.length > 0 &&
                !c.enviadoPaywayAt &&
                puedeGestionar && (
                  <button
                    type="button"
                    onClick={onEnviarPayway}
                    className="mt-3 w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-1.5"
                  >
                    <Send size={14} /> Enviar a PayWay
                  </button>
                )}

              {estado === "En_mediación" && archivos.length === 0 && (
                <p className="text-xs text-amber-700 mt-2">
                  Adjuntá al menos un comprobante antes de enviar a PayWay.
                </p>
              )}
            </Card>
          )}

          {/* Gestión */}
          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Gestión
            </h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold">Estado</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as EstadoContra)}
                  className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm"
                  disabled={!puedeGestionar}
                >
                  {ESTADO_OPTIONS_UI.map((s) => (
                    <option key={s} value={s}>
                      {ESTADO_LABEL[s]}
                    </option>
                  ))}
                </select>
                {estado === "En_mediación" && !c.fechaLimite && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Al guardar se calculará el plazo (10 días hábiles).
                  </p>
                )}
                {estado === "Simulado" && (
                  <p className="text-xs text-blue-600 mt-1">
                    Simulación — sin impacto en caja ni lotes.
                  </p>
                )}
                {estado === "Cerrado_retenido" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Gana el comprador. El importe ya lo descontó Payway en su liquidación (renglón negativo del archivo): no se descuenta de nuevo.
                  </p>
                )}
              </div>

              {recupero.data && (
                <div className="rounded-md border px-3 py-2 text-xs space-y-0.5">
                  <div className="font-semibold">Descuento y recupero</div>
                  <div>
                    Estado: <Badge tone={recupero.data.estado_recupero === "Recuperado" || recupero.data.estado_recupero === "Descontado" || recupero.data.estado_recupero === "Liberado" ? "success" : recupero.data.estado_recupero === "Pendiente de recuperar" ? "danger" : recupero.data.estado_recupero === "Retención programada" || recupero.data.estado_recupero === "Retenido" ? "warn" : "neutral"}>{recupero.data.estado_recupero}</Badge>
                  </div>
                  {recupero.data.lote_venta_codigo && (
                    <div>
                      Lote de la venta: <span className="font-mono">{recupero.data.lote_venta_codigo}</span>
                      {recupero.data.lote_venta_estado ? ` (${recupero.data.lote_venta_estado})` : ""}
                    </div>
                  )}
                  {recupero.data.retencion_estado === "pendiente" && (
                    <div className="text-amber-700">Se retiene {fmt(c.importe)} al acreditar el lote de la venta.</div>
                  )}
                  {recupero.data.retenido_monto > 0 && (
                    <div>
                      Retenido al comercio: {fmt(recupero.data.retenido_monto)}
                      {recupero.data.retencion_lote_codigo ? ` (lote ${recupero.data.retencion_lote_codigo})` : " (del saldo)"}
                    </div>
                  )}
                  {recupero.data.retencion_estado === "aplicado_payway" && (
                    <div className="text-muted-foreground">Lo retenido cubrió el descuento que hizo Payway: no se cobró dos veces.</div>
                  )}
                  {recupero.data.retencion_estado === "liberado" && (
                    <div className="text-emerald-700">Resuelto a favor del comercio: se le devolvió lo retenido.</div>
                  )}
                  <div>
                    Lote donde se descontó:{" "}
                    {recupero.data.lote_descuento_id ? (
                      <Link to="/admin/comercios/link-pago/lotes" search={{ lote: recupero.data.lote_descuento_id }} className="font-mono text-primary hover:underline">
                        {recupero.data.lote_descuento_codigo}
                      </Link>
                    ) : (
                      "todavía no llegó en el archivo de Payway"
                    )}
                  </div>
                  {recupero.data.pendiente_recuperar > 0 && <div>Pendiente de recuperar: {fmt(recupero.data.pendiente_recuperar)}</div>}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold flex items-center gap-1">
                  <Ticket size={12} /> Ticket PayWay
                </label>
                <input
                  value={ticket}
                  onChange={(e) => setTicket(e.target.value)}
                  placeholder="Ej: PW-TKT-88421"
                  className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm font-mono"
                  disabled={!puedeGestionar}
                />
              </div>
              <div>
                <label className="text-xs font-semibold flex items-center gap-1">
                  <FileText size={12} /> Documentación (notas)
                </label>
                <textarea
                  value={doc}
                  onChange={(e) => setDoc(e.target.value)}
                  rows={3}
                  placeholder="Comprobante, factura, KYC, entrega…"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  disabled={!puedeGestionar}
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Resolución</label>
                <textarea
                  value={resolucion}
                  onChange={(e) => setResolucion(e.target.value)}
                  rows={2}
                  placeholder="Cómo se resolvió…"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  disabled={!puedeGestionar}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                {c.esSimulacion && puedeGestionar && (
                  <button
                    type="button"
                    onClick={onConfirmarSimulacion}
                    disabled={saving}
                    className="h-9 px-3 rounded-md bg-blue-600 text-white text-sm inline-flex items-center gap-1.5"
                  >
                    <CheckCircleIcon /> Confirmar simulación
                  </button>
                )}
                {c.esSimulacion && puedeBorrar && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("¿Eliminar esta simulación?")) return;
                      try {
                        await deleteContracargo(c.id);
                        qc.invalidateQueries({ queryKey: ["contracargos"] });
                        onClose();
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                    className="h-9 px-3 rounded-md border border-red-200 text-red-600 text-sm"
                  >
                    Eliminar simulación
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-3 rounded-md border bg-card text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={guardar}
                  disabled={saving || !puedeGestionar}
                  className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {saving && (
                    <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  Guardar
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Crear simulación
// ---------------------------------------------------------------------------

function CrearModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [comercioId, setComercioId] = useState("");
  const [importe, setImporte] = useState("");
  const [ticket, setTicket] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const comerciosQuery = useComercios({ page: 0, pageSize: 200 });
  const comerciosList = comerciosQuery.rows;

  const crear = async () => {
    if (!comercioId || !importe) {
      toast.error("Completá comercio e importe");
      return;
    }
    setSaving(true);
    try {
      await createContracargo({
        comercioId,
        importe: parseFloat(importe.replace(",", ".")),
        ticketPayway: ticket || null,
        motivoPayway: motivo || null,
        estado: "Simulado",
        esSimulacion: true,
      });
      toast.success("Simulación de contracargo creada");
      qc.invalidateQueries({ queryKey: ["contracargos"] });
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-md shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-center">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <Plus size={18} /> Simular contracargo
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs text-muted-foreground">
            Cargá los datos del contracargo para simular el impacto sin afectar la
            caja ni los lotes.
          </p>
          <div>
            <Label>Comercio</Label>
            <select
              value={comercioId}
              onChange={(e) => setComercioId(e.target.value)}
              className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Seleccionar comercio…</option>
              {comerciosList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombreComercio ?? c.usuario} ({c.legajo})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Importe del contracargo</Label>
            <Input
              value={importe}
              onChange={(e) => setImporte(e.target.value)}
              placeholder="Ej: 15000,00"
              className="font-mono"
            />
          </div>
          <div>
            <Label>
              Ticket PayWay <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              value={ticket}
              onChange={(e) => setTicket(e.target.value)}
              placeholder="PW-TKT-xxxxx"
              className="font-mono"
            />
          </div>
          <div>
            <Label>
              Motivo <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo del contracargo"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="h-9 px-3 rounded-md border bg-card text-sm">
              Cancelar
            </button>
            <button
              onClick={crear}
              disabled={saving}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "Creando…" : "Simular impacto"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function Page() {
  const [detail, setDetail] = useState<Contra | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [showCrear, setShowCrear] = useState(false);
  const [showImportar, setShowImportar] = useState(false);
  const [showSimular, setShowSimular] = useState(false);
  const [estadoFilter, setEstadoFilter] = useState<EstadoContra | "">("");
  const { can } = useCan();
  const puedeGestionar = can("modificar", "comercios");
  const qc = useQueryClient();

  const filterEstado = useMemo<EstadoContra | undefined>(() => {
    if (!estadoFilter) return undefined;
    return estadoFilter;
  }, [estadoFilter]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["contracargos", filterEstado ? estadoUiToDb(filterEstado) : undefined],
    queryFn: () => listContracargos(filterEstado ? { estado: filterEstado } : undefined),
  });

  // Realtime: cualquier cambio en contracargos (incluso desde Enterprise)
  // invalida esta query y la de lotes (por si cambió contracargo_monto).
  useEffect(() => {
    const sb = requireSupabase();
    if (!sb) return;
    const ch = sb
      .channel("realtime-contracargos-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contracargos" },
        () => {
          qc.invalidateQueries({ queryKey: ["contracargos"] });
          qc.invalidateQueries({ queryKey: ["lotes"] });
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [qc]);

  const getActions = (r: Contra): ActionItem[] => {
    const base: ActionItem[] = [
      { label: "Ver / gestionar", icon: Eye, onClick: () => setDetail(r) },
    ];
    if (r.estado === "Simulado" && puedeGestionar) {
      base.push({
        label: "Confirmar (Aplicar)",
        icon: AlertTriangle,
        onClick: () => setDetail(r),
      });
    }
    return base;
  };

  const columns: Column<Contra>[] = [
    {
      key: "id",
      label: "ID",
      filterable: true,
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {r.esSimulacion && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 font-medium">
              sim
            </span>
          )}
          {r.siteTransactionId && (
            <span
              className="text-[10px] px-1 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 font-medium"
              title="Importado de PayWay"
            >
              PW
            </span>
          )}
          <span className="font-mono text-xs">{r.id.slice(0, 8)}…</span>
        </div>
      ),
    },
    {
      key: "comercio",
      label: "Comercio",
      filterable: true,
      render: (r) => (
        <div>
          <div className="font-semibold text-sm truncate max-w-[140px]">
            {r.comercioNombre}
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            {r.comercioLegajo}
          </div>
        </div>
      ),
    },
    {
      key: "importe",
      label: "Importe",
      render: (r) => (
        <span className="font-mono tabular-nums font-semibold text-red-600">
          -{fmt(r.importe)}
        </span>
      ),
    },
    {
      key: "ticketPayway",
      label: "Ticket / TID",
      filterable: true,
      render: (r) => (
        <div className="space-y-0.5">
          {r.ticketPayway && (
            <span className="font-mono text-xs block">{r.ticketPayway}</span>
          )}
          {r.siteTransactionId && (
            <span
              className="font-mono text-[10px] text-muted-foreground block truncate max-w-[160px]"
              title={r.siteTransactionId}
            >
              TID: {r.siteTransactionId.slice(0, 12)}…
            </span>
          )}
          {!r.ticketPayway && !r.siteTransactionId && "—"}
        </div>
      ),
    },
    {
      key: "estado",
      label: "Estado",
      filterable: "enum",
      filterOptions: ESTADO_OPTIONS_UI.map((s) => ESTADO_LABEL[s]),
      render: (r) => <Badge tone={tone(r.estado)}>{ESTADO_LABEL[r.estado]}</Badge>,
    },
    {
      key: "createdAt",
      label: "Fecha",
      render: (r) => (
        <span className="font-mono text-xs">
          {new Date(r.createdAt).toLocaleDateString("es-AR")}
        </span>
      ),
    },
  ];

  // KPIs: usar la lista completa que ya cargamos
  const kpis: Record<EstadoContra, number> = {
    Simulado: 0,
    Abierto: 0,
    "En_mediación": 0,
    En_mediacion: 0,
    Cerrado_acreditado: 0,
    Cerrado_retenido: 0,
  };
  for (const r of rows) kpis[r.estado] = (kpis[r.estado] ?? 0) + 1;

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Contracargos"
        description="Gestión de contracargos de links de pago. Simular impacto → confirmar para aplicar."
      />
      <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground mb-4">
        <strong>Flujo:</strong> Simular (carga manual) → Confirmar (aplica
        descuento al lote) → En mediación (doc) → Cerrado acreditado / retenido.
        Los contracargos de simulación no afectan la caja ni los lotes.
      </div>

      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex gap-2 flex-wrap">
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value as EstadoContra | "")}
            className="h-8 px-2 rounded-md border bg-background text-xs"
          >
            <option value="">Todos los estados</option>
            {ESTADO_OPTIONS_UI.map((s) => (
              <option key={s} value={s}>
                {ESTADO_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {puedeGestionar && (
            <button
              onClick={() => setShowImportar(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md border bg-card text-xs font-semibold hover:bg-muted"
              title="Importar reporte de Alertas Tempranas de PayWay"
            >
              <UploadCloud size={14} /> Importar PayWay
            </button>
          )}
          {puedeGestionar && (
            <button
              onClick={() => setShowSimular(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md border bg-card text-xs font-semibold hover:bg-muted"
              title="CSV de prueba con ventas reales de lotes Programados o Pendientes"
            >
              <Download size={14} /> Simular contracargos
            </button>
          )}
          {puedeGestionar && (
            <button
              onClick={() => setShowCrear(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold"
            >
              <Plus size={14} /> Simular contracargo
            </button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {ESTADO_OPTIONS_UI.map((s) => (
          <Card key={s} className="p-3">
            <div className="text-xs text-muted-foreground">{ESTADO_LABEL[s]}</div>
            <div className="font-mono text-xl font-semibold mt-1">{kpis[s] ?? 0}</div>
          </Card>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        keyExtractor={(r) => r.id}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />

      {detail && <Detalle c={detail} onClose={() => setDetail(null)} />}
      {showCrear && <CrearModal onClose={() => setShowCrear(false)} />}
      {showImportar && <ImportarContracargosModal onClose={() => setShowImportar(false)} />}
      {showSimular && <SimularContracargosModal onClose={() => setShowSimular(false)} />}
      {confirm && (
        <ConfirmDialog
          open={!!confirm}
          onClose={() => setConfirm(null)}
          title={confirm.title}
          message={confirm.message}
          confirmLabel="Cerrar"
          variant="default"
          onConfirm={() => {
            confirm.onConfirm();
            setConfirm(null);
          }}
        />
      )}
    </PermissionGuard>
  );
}
