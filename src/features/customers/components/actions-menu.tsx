import { useEffect,useRef,useState } from "react";
import { MoreVertical } from "lucide-react";
import { createPortal } from "react-dom";

export function ActionsMenu({
  items,
}: {
  items: { label: string; onClick: () => void; disabled?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.right - 176 });
    }
  }, [open]);

  if (items.length === 0) return null;
  return (
    <div className="relative inline-block text-left">
      <button
        ref={btnRef}
        type="button"
        title="Acciones"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input text-muted-foreground transition hover:bg-accent hover:text-foreground"
      >
        <MoreVertical size={16} />
      </button>
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div
              className="fixed z-40 w-44 overflow-hidden rounded-md border border-border bg-card shadow-lg"
              style={{ top: pos.top, left: pos.left }}
            >
              {items.map((it) => (
                <button
                  key={it.label}
                  type="button"
                  disabled={it.disabled}
                  onClick={() => {
                    setOpen(false);
                    it.onClick();
                  }}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  {it.label}
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
