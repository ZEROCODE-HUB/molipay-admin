import type { ReactNode } from "react";
import { Badge } from "@/components/portal-shell";
import { LegajoCell } from "@/components/legajo-label";
import { fmtARS, type Desglose } from "@/lib/aranceles";

export type Movimiento = {
  clienteId: string;
  legajo: string;
  id: string;
  tipo: string;
  cvu: string;
  usuario: string;
  nombreOrigen: string;
  nombreDestino: string;
  cuit: string;
  monto: string;
  fecha: string;
  estado: string;
  desglose?: Desglose;
};

const lifecycleTooltip =
  "Una transacción de depósito o retiro nace en EN PROGRESO: el saldo se descuenta para el cliente, pero el dinero aún no salió realmente. La plataforma espera confirmación de la cuenta recaudadora del banco. Si confirma, pasa a APROBADO; si no, pasa a RECHAZADO y el saldo se revierte.";

const estadoMap: Record<
  string,
  { label: string; tone: "neutral" | "success" | "warn" | "danger" }
> = {
  APROBADO: { label: "APROBADO", tone: "success" },
  EN_PROGRESO: { label: "EN PROGRESO", tone: "warn" },
  RECHAZADO: { label: "RECHAZADO", tone: "danger" },
  BLOQUEADO: { label: "BLOQUEADO", tone: "danger" },
  CREADO: { label: "CREADO", tone: "neutral" },
  ABIERTO: { label: "ABIERTO", tone: "warn" },
  EXPIRADO: { label: "EXPIRADO", tone: "neutral" },
  REEMBOLSADO: { label: "REEMBOLSADO", tone: "warn" },
  Activo: { label: "Activo", tone: "success" },
  Usado: { label: "Usado", tone: "neutral" },
  Expirado: { label: "Expirado", tone: "neutral" },
  Cancelado: { label: "Cancelado", tone: "danger" },
};

export const estadoBadge = (e: string) => {
  // Guarda defensiva: nunca debe mostrarse un id numérico suelto en la UI.
  // El estado siempre llega como código legible (ver resolverEstadoMovimiento).
  const esNumerico = /^\d+$/.test(e.trim());
  const clave = esNumerico ? "DESCONOCIDO" : e;
  const m = estadoMap[clave] ?? { label: esNumerico ? "Desconocido" : e, tone: "neutral" as const };
  const badge = <Badge tone={m.tone}>{m.label}</Badge>;
  return e === "EN_PROGRESO" || e === "APROBADO" || e === "RECHAZADO" ? (
    <span title={lifecycleTooltip} className="cursor-help">
      {badge}
    </span>
  ) : (
    badge
  );
};

export type DetailRow = { label: string; value: ReactNode };

export function DetailModal({
  title,
  rows,
  onClose,
}: {
  title: string;
  rows: DetailRow[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-card border rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 hover:opacity-70 text-muted-foreground">
            ✕
          </button>
        </div>
        <dl className="space-y-3 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between gap-4">
              <dt className="text-muted-foreground shrink-0">{r.label}</dt>
              <dd className="font-semibold text-right">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export function MovimientoDetail({ m, onClose }: { m: Movimiento; onClose: () => void }) {
  return (
    <DetailModal
      title="Detalle de movimiento"
      onClose={onClose}
      rows={[
        {
          label: "Legajo",
          value: <LegajoCell legajo={m.legajo} />,
        },
        { label: "ID Transacción", value: <span className="font-mono text-xs">{m.id}</span> },
        { label: "Tipo", value: m.tipo },
        { label: "Usuario", value: m.usuario },
        { label: "Nombre completo", value: m.nombreOrigen },
        { label: "Destino", value: m.nombreDestino },
        { label: "CUIT destino", value: <span className="font-mono tabular-nums">{m.cuit}</span> },
        { label: "CVU/CBU", value: <span className="font-mono text-xs">{m.cvu}</span> },
        {
          label: "Monto",
          value: <span className="font-mono font-semibold tabular-nums">{m.monto}</span>,
        },
        ...(m.desglose
          ? [
              {
                label: `Comisión (${m.desglose.porcentajeImpuesto}% imp. no incluido)`,
                value: (
                  <span className="font-mono tabular-nums">{fmtARS(m.desglose.comision)}</span>
                ),
              },
              {
                label: "Impuesto (IVA)",
                value: (
                  <span className="font-mono tabular-nums">{fmtARS(m.desglose.impuesto)}</span>
                ),
              },
              {
                label: "Monto cobrado al cliente",
                value: (
                  <span className="font-mono font-semibold tabular-nums">
                    {fmtARS(m.desglose.total)}
                  </span>
                ),
              },
            ]
          : []),
        { label: "Fecha", value: <span className="font-mono">{m.fecha}</span> },
        { label: "Estado", value: estadoBadge(m.estado) },
      ]}
    />
  );
}
