import { useState, useRef, useEffect, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, type LucideIcon } from "lucide-react";

export type ActionItem = {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: "default" | "danger";
  disabled?: boolean;
};

type ActionsDropdownProps = {
  actions: ActionItem[];
};

export function ActionsDropdown({ actions }: ActionsDropdownProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const toggle = (e: ReactMouseEvent) => {
    e.stopPropagation();
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const width = 190;
      let left = r.right - width;
      if (left < 8) left = 8;
      setCoords({ top: r.bottom + 4, left });
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    };
    const onScrollOrResize = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open]);

  return (
    <div ref={triggerRef} className="relative inline-block">
      <button
        type="button"
        onClick={toggle}
        className="p-1.5 rounded-md hover:bg-muted transition-colors"
        aria-label="Acciones"
      >
        <MoreHorizontal size={16} />
      </button>
      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 9999 }}
            className="min-w-[170px] bg-card border rounded-lg shadow-lg py-1 animate-in fade-in slide-in-from-top-1 duration-150"
          >
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  disabled={action.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (action.disabled) return;
                    action.onClick();
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
                    action.disabled
                      ? "cursor-not-allowed text-muted-foreground/50"
                      : action.variant === "danger"
                        ? "text-red-600 hover:bg-muted"
                        : "text-foreground hover:bg-muted"
                  }`}
                >
                  {Icon && <Icon size={14} />}
                  {action.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
