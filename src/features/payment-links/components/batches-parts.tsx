import { type ReactNode } from "react";
import { formatMoney } from "@/shared/lib/format";

/**
 * Liquidacion de un lote del archivo de Payway: la cadena de importes que
 * calculo la base (lote_calculo). No se recalcula nada en el navegador.
 */
/** Liquidacion del lote con el formato de extracto comun (components/acreditaciones). */
/** Fila de descuento del detalle financiero del lote. */
export function RowDescuento({
  icon,
  label,
  monto: amount,
  estimado: estimated = false,
}: {
  icon: ReactNode;
  label: string;
  monto: number;
  estimado?: boolean;
}) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground flex items-center gap-1">
        {icon} {label}
      </span>
      <span className={`font-mono ${estimated ? "text-muted-foreground/60" : "text-red-600"}`}>
        - {formatMoney(amount)}
      </span>
    </div>
  );
}
