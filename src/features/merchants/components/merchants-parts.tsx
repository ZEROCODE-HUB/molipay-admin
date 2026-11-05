import { Label } from "@/shared/ui/form-controls";
import { HelpCircle } from "lucide-react";

/**
 * Label con un icono "?" a la derecha. Al pasar el mouse muestra la ayuda
 * en lenguaje simple, pensada para usuarios no técnicos.
 */
export function LabelHelp({
  htmlFor,
  hint,
  children,
}: {
  htmlFor: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{children}</Label>
      <span title={hint} className="cursor-help inline-flex shrink-0">
        <HelpCircle size={13} className="text-muted-foreground/70" />
      </span>
    </div>
  );
}
