import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, type LucideIcon } from "lucide-react";

export type ActionItem = {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: "default" | "danger";
};

type ActionsDropdownProps = {
  actions: ActionItem[];
};

export function ActionsDropdown({ actions }: ActionsDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="p-1.5 rounded-md hover:bg-muted transition-colors"
        aria-label="Acciones"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[170px] bg-card border rounded-lg shadow-lg py-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-muted ${
                  action.variant === "danger" ? "text-red-600" : "text-foreground"
                }`}
              >
                {Icon && <Icon size={14} />}
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
