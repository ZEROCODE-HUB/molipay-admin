import { Badge } from "@/components/portal-shell";

export type Movimiento = {
  legajo: string;
  id: string;
  tipo: string;
  cvu: string;
  email: string;
  nombreOrigen: string;
  nombreDestino: string;
  cuit: string;
  monto: string;
  fecha: string;
  estado: "Pendiente" | "Aprobada" | "Rechazada";
};

const lifecycleTooltip =
  "Una transacción nace Pendiente: el saldo se descuenta para el cliente, pero el dinero aún no salió realmente. La plataforma espera confirmación de la cuenta recaudadora del banco. Si confirma, se genera el ID COELSA —prueba definitiva de salida— y pasa a Aprobada. Si no, pasa a Rechazada y el saldo se revierte.";

export const estadoBadge = (e: Movimiento["estado"]) => {
  const map: Record<string, { label: string; tone: "success" | "warn" | "danger" }> = {
    Aprobada: { label: "Aprobada", tone: "success" },
    Pendiente: { label: "Pendiente", tone: "warn" },
    Rechazada: { label: "Rechazada", tone: "danger" },
  };
  const m = map[e];
  return (
    <span title={lifecycleTooltip} className="cursor-help">
      <Badge tone={m.tone}>{m.label}</Badge>
    </span>
  );
};

export function MovimientoDetail({ m, onClose }: { m: Movimiento; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-card border rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Detalle de movimiento</h3>
          <button onClick={onClose} className="p-1 hover:opacity-70 text-muted-foreground">✕</button>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Legajo</dt><dd className="font-semibold">{m.legajo}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">ID Transacción</dt><dd className="font-mono text-xs">{m.id}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Tipo</dt><dd>{m.tipo}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Email</dt><dd>{m.email}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Origen</dt><dd>{m.nombreOrigen}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Destino</dt><dd>{m.nombreDestino}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">CUIT</dt><dd>{m.cuit}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">CVU</dt><dd className="font-mono text-xs">{m.cvu}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Monto</dt><dd className="font-semibold">{m.monto}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Fecha</dt><dd>{m.fecha}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Estado</dt><dd>{estadoBadge(m.estado)}</dd></div>
        </dl>
      </div>
    </div>
  );
}
