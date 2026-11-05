import { useEffect,useId,useRef,type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Base de todos los modales.
 *
 * - Se monta en un portal sobre <body>: el ultimo abierto queda arriba (sin pelear z-index).
 * - Escape y click en el fondo cierran (salvo `dismissible={false}`, p. ej. mientras guarda).
 * - Bloquea el scroll de la pagina y devuelve el foco al cerrar.
 * - Accesible: role="dialog", aria-modal y titulo asociado.
 *
 * El contenido se arma con ModalHeader / ModalBody / ModalFooter. Cada modal de
 * negocio vive en su propio archivo dentro de su feature.
 */

/** "custom": el ancho lo da `className` (p. ej. "max-w-lg"). */
export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full" | "custom";
export type ModalHeight = "auto" | "tall" | "full";

const WIDTH: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-5xl",
  full: "max-w-[min(96vw,1400px)]",
  custom: "",
};

const HEIGHT: Record<ModalHeight, string> = {
  auto: "max-h-[90vh]",
  tall: "h-[85vh] max-h-[90vh]",
  full: "h-[96vh]",
};

// Varios modales abiertos (p. ej. confirmar sobre un formulario) comparten el bloqueo de scroll.
let openCount = 0;
/** Modales abiertos, el ultimo arriba: Escape cierra solo el de arriba. */
const openStack: symbol[] = [];

export function Modal({
  open,
  onClose,
  size = "md",
  height = "auto",
  dismissible = true,
  labelledBy,
  className = "",
  children,
}: {
  open: boolean;
  onClose: () => void;
  size?: ModalSize;
  height?: ModalHeight;
  /** false: Escape y el fondo no cierran (p. ej. mientras se guarda). */
  dismissible?: boolean;
  /** id del titulo (lo pone ModalHeader si se usa `titleId`). */
  labelledBy?: string;
  /** Ajustes puntuales de ancho/alto/estilo. */
  className?: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // onClose suele ser una funcion nueva en cada render: se lee desde refs para que
  // el foco y el bloqueo de scroll se apliquen UNA vez al abrir (y no roben el foco al escribir).
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  onCloseRef.current = onClose;
  dismissibleRef.current = dismissible;

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    openCount += 1;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    const id = Symbol("modal");
    openStack.push(id);

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || openStack[openStack.length - 1] !== id) return;
      if (dismissibleRef.current) onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      openStack.splice(openStack.indexOf(id), 1);
      openCount -= 1;
      if (openCount === 0) document.body.style.overflow = "";
      previousFocus?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => dismissible && onClose()}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`relative flex w-full flex-col overflow-hidden rounded-t-xl bg-card shadow-xl outline-none sm:rounded-lg ${WIDTH[size]} ${HEIGHT[height]} ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ModalHeader({
  title,
  description,
  titleId,
  onClose,
  closeDisabled = false,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Mismo valor que `labelledBy` del Modal (usá useModalTitleId). */
  titleId?: string;
  onClose?: () => void;
  closeDisabled?: boolean;
  /** Botones extra a la izquierda del cierre. */
  actions?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-3 border-b bg-card px-6 py-4">
      <div className="min-w-0">
        <h3 id={titleId} className="font-display text-lg font-semibold">
          {title}
        </h3>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {actions}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="Cerrar"
            className="rounded-md p-1.5 hover:bg-muted disabled:opacity-50"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Contenido con scroll propio (el encabezado y el pie quedan fijos). */
export function ModalBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`min-h-0 flex-1 overflow-y-auto px-6 py-5 ${className}`}>{children}</div>;
}

export function ModalFooter({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex shrink-0 gap-2 border-t bg-card px-6 py-4 ${className}`}>{children}</div>
  );
}

/** id estable para enlazar el titulo con el dialogo (accesibilidad). */
export const useModalTitleId = useId;
