import { useState } from "react";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useCustomersForSelect } from "@/features/merchants/merchants.hooks";
import { Search } from "lucide-react";
import { inputCls } from "@/features/alerts/customer-monitoring-cards.rules";

export function BuscadorCustomer({
  onSelect,
  seleccionado,
}: {
  onSelect: (legajo: string, email: string) => void;
  seleccionado: string;
}) {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const { data: options } = useCustomersForSelect(debounced || undefined);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <label className="text-xs font-semibold mb-1.5 block">Cliente</label>
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            onSelect("", "");
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Buscar por legajo, correo o nombre…"
          className={`${inputCls} pl-9`}
          autoComplete="off"
        />
      </div>
      {open && (options?.length ?? 0) > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-input bg-card shadow-lg max-h-56 overflow-auto">
          {(options ?? []).map((c) => (
            <button
              key={c.legajo}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setSearch(c.correo);
                onSelect(c.legajo, c.correo);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex flex-col"
            >
              <span className="font-medium">{c.correo}</span>
              <span className="text-xs text-muted-foreground font-mono">
                {c.legajo} · {c.nombre}
              </span>
            </button>
          ))}
        </div>
      )}
      {seleccionado && (
        <p className="text-[11px] text-emerald-700 mt-1">
          Seleccionado: <span className="font-mono">{seleccionado}</span>
        </p>
      )}
    </div>
  );
}
