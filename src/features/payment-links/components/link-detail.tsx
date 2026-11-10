import { ErrorNotice } from "@/shared/ui/error-notice";
import { type LinkPayment } from "@/features/payment-links/payment-link-urls.supabase";
import { Modal } from "@/shared/ui/modal";
import { CheckCircle, Copy, Link2, XCircle } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { toast } from "sonner";
import { Badge } from "@/shared/ui/badge";
import { fmtMoney, tone } from "@/features/payment-links/payment-links.rules";

export function LinkDetail({
  enlace: link,
  onClose,
}: {
  enlace: LinkPayment;
  onClose: () => void;
}) {
  const payment = link.pago;
  const esPaid = link.estado === "Pagado";
  const esChargeback = link.estado === "Contracargo";
  return (
    <Modal open onClose={onClose} size="custom" className="max-w-2xl">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <Link2 size={18} /> Enlace de pago
            </h3>
            <p className="text-sm text-muted-foreground break-all">{link.url ?? "—"}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md shrink-0">
            <XCircle size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Enlace */}
          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Enlace
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2">
                <span className="text-muted-foreground">URL</span>
                <div className="font-mono text-xs break-all flex items-center gap-2">
                  {link.url ?? "—"}{" "}
                  {link.url && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(link.url!);
                        toast.success("Copiado");
                      }}
                      className="h-6 px-2 rounded border text-xs shrink-0"
                    >
                      <Copy size={12} />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Comercio</span>
                <div className="font-semibold">{link.comercioNombre}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Usuario / Legajo</span>
                <div className="font-semibold break-all">{link.usuario ?? link.clienteLegajo}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Estado</span>
                <div>
                  <Badge tone={tone(link.estado)}>{link.estado}</Badge>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Monto</span>
                <div className="font-mono font-semibold">{fmtMoney(link.monto)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Referencia</span>
                <div className="font-mono text-xs break-all">{link.referencia ?? "—"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Expira</span>
                <div className="font-mono text-xs">
                  {link.expiraEn ? new Date(link.expiraEn).toLocaleDateString("es-AR") : "—"}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Pagos parciales</span>
                <div>{link.pagosParciales ? "Sí" : "No"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Métodos habilitados</span>
                <div className="text-xs">{link.metodosPago?.join(", ") ?? "—"}</div>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Notas</span>
                <div className="text-xs">{link.notas ?? "—"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Vistas</span>
                <div className="font-mono">{link.vistas}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Pagos</span>
                <div className="font-mono">{link.pagos}</div>
              </div>
              <div className="col-span-2 text-xs text-muted-foreground border-t pt-3 mt-1">
                <span className="font-semibold">Ciclo:</span> PayWay crea → Pendiente de aprobación
                → Activado (sin cobro) → Pagado / Expirado (24h) / Desactivado (comercio) /
                Contracargo (comprador desconoce)
              </div>
            </div>
          </Card>

          {/* Pago — solo si Pagado o Contracargo, como pide el spec */}
          {(esPaid || esChargeback) && payment && (
            <Card className="p-4 border-primary/20">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                <CheckCircle size={14} className="text-emerald-600" /> Información del pago{" "}
                {esChargeback && (
                  <Badge tone="danger" className="ml-2">
                    Contracargo
                  </Badge>
                )}
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Método de pago</span>
                  <div className="font-semibold">{payment.metodoPago}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo</span>
                  <div className="font-semibold">{payment.tipoTarjeta}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Marca / Tarjeta</span>
                  <div className="font-semibold">{payment.marcaTarjeta ?? "—"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Cuotas</span>
                  <div className="font-mono font-semibold">
                    {payment.cuotas} {payment.cuotas === 1 ? "cuota (pago único)" : "cuotas"}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Importe pagado</span>
                  <div className="font-mono font-semibold">{fmtMoney(payment.importePagado)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Fecha de pago</span>
                  <div className="font-mono text-xs">
                    {payment.fechaPago ? new Date(payment.fechaPago).toLocaleString("es-AR") : "—"}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Autorización</span>
                  <div className="font-mono text-xs">{payment.autorizacion ?? "—"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Link vencimiento</span>
                  <div className="text-xs">
                    {link.expiraEn ? `Expiró en 24h / Pagado antes` : "—"}
                  </div>
                </div>
                {esChargeback && (
                  <ErrorNotice className="col-span-2 mt-1" icon={false}>
                    Este pago entró en flujo de <strong>contracargo</strong> (desconocimiento). Ver
                    pestaña <strong>Contracargos</strong> para ticket PayWay y documentación.
                  </ErrorNotice>
                )}
              </div>
            </Card>
          )}

          {/* Leyenda estados para quien consulta un link */}
          {!payment && (
            <p className="text-xs text-muted-foreground">
              El detalle de método/tarjeta/cuotas aparece cuando el link está en estado{" "}
              <strong>Pagado</strong> (o <strong>Contracargo</strong>). Permite entender cómo se
              realizó el pago.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
