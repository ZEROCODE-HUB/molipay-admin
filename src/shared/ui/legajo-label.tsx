import { HelpCircle } from "lucide-react";
import type { ReactNode } from "react";

export const LEGAJO_TOOLTIP =
  "Legajo: identificador interno del cliente (empresa o persona que contrató MoliPay). " +
  "No es el usuario (mail de login). Formato LPF-#### (Persona Física) o LPJ-#### (Persona Jurídica).";

/**
 * Renderiza el legajo de un cliente con un tooltip que aclara la diferencia
 * con el campo "Usuario" (mail de login), para evitar confusiones.
 */
export function LegajoCell({ legajo, className }: { legajo: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ""}`} title={LEGAJO_TOOLTIP}>
      <span className="font-mono tabular-nums">{legajo}</span>
      <HelpCircle size={12} className="text-muted-foreground/70 shrink-0" />
    </span>
  );
}

export function LegajoTooltip({ children = "Legajo" }: { children?: ReactNode }) {
  return (
    <span title={LEGAJO_TOOLTIP} className="cursor-help inline-flex items-center gap-1">
      {children}
      <HelpCircle size={12} className="text-muted-foreground" />
    </span>
  );
}

export const legajoHint = LEGAJO_TOOLTIP;
