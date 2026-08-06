import type { ReactNode } from "react";
import { Badge } from "@/components/portal-shell";

export type Movimiento = {
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
  estado: "Pendiente" | "Aprobada" | "Rechazada" | "Bloqueado";
};

const lifecycleTooltip =
  "Una transacción nace Pendiente: el saldo se descuenta para el cliente, pero el dinero aún no salió realmente. La plataforma espera confirmación de la cuenta recaudadora del banco. Si confirma, se genera el ID COELSA —prueba definitiva de salida— y pasa a Aprobada. Si no, pasa a Rechazada y el saldo se revierte.";

const estadoMap: Record<
  string,
  { label: string; tone: "neutral" | "success" | "warn" | "danger" }
> = {
  Aprobada: { label: "Aprobada", tone: "success" },
  Pendiente: { label: "Pendiente", tone: "warn" },
  Rechazada: { label: "Rechazada", tone: "danger" },
  Bloqueado: { label: "Bloqueado", tone: "danger" },
  Creado: { label: "Creado", tone: "neutral" },
  Abierto: { label: "Abierto", tone: "warn" },
  Completado: { label: "Completado", tone: "success" },
  Expirado: { label: "Expirado", tone: "neutral" },
  Rechazado: { label: "Rechazado", tone: "danger" },
  Fallido: { label: "Fallido", tone: "danger" },
  Reembolsado: { label: "Reembolsado", tone: "warn" },
  Activo: { label: "Activo", tone: "success" },
  Usado: { label: "Usado", tone: "neutral" },
  Cancelado: { label: "Cancelado", tone: "danger" },
};

export const estadoBadge = (e: string) => {
  const m = estadoMap[e] ?? { label: e, tone: "neutral" as const };
  const badge = <Badge tone={m.tone}>{m.label}</Badge>;
  return e === "Pendiente" || e === "Aprobada" || e === "Rechazada" ? (
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
        { label: "Legajo", value: <span className="font-mono tabular-nums">{m.legajo}</span> },
        { label: "ID Transacción", value: <span className="font-mono text-xs">{m.id}</span> },
        { label: "Tipo", value: m.tipo },
        { label: "Usuario", value: m.usuario },
        { label: "Nombre completo", value: m.nombreOrigen },
        { label: "Destino", value: m.nombreDestino },
        { label: "CUIT destino", value: <span className="font-mono tabular-nums">{m.cuit}</span> },
        { label: "CVU/CBU", value: <span className="font-mono text-xs">{m.cvu}</span> },
        { label: "Monto", value: <span className="font-mono font-semibold tabular-nums">{m.monto}</span> },
        { label: "Fecha", value: <span className="font-mono">{m.fecha}</span> },
        { label: "Estado", value: estadoBadge(m.estado) },
      ]}
    />
  );
}
