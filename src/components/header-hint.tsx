import * as HoverCard from "@radix-ui/react-hover-card";
import { HelpCircle } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Ícono (?) junto a un encabezado de tabla que, al pasar el mouse (o con foco
 * de teclado), abre un popup con la explicación de la columna.
 * El texto acepta saltos de línea: la primera línea se muestra como título
 * si se pasa `title`; cada línea del cuerpo es un párrafo.
 */
export function HeaderHint({ title, text, children }: { title?: string; text: string; children?: ReactNode }) {
  return (
    <HoverCard.Root openDelay={120} closeDelay={80}>
      <HoverCard.Trigger asChild>
        <span
          tabIndex={0}
          role="button"
          aria-label={title ? `Qué es ${title}` : "Ayuda"}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center cursor-help text-muted-foreground hover:text-primary focus:text-primary outline-none"
        >
          {children ?? <HelpCircle size={12} />}
        </span>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="z-[60] w-80 max-w-[calc(100vw-24px)] rounded-xl border border-border bg-popover text-popover-foreground shadow-xl p-3.5 text-left normal-case tracking-normal font-normal animate-in fade-in-0 zoom-in-95"
        >
          {title && <div className="text-xs font-semibold text-foreground mb-1">{title}</div>}
          <div className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
            {text.split("\n").map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
          <HoverCard.Arrow className="fill-border" />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
