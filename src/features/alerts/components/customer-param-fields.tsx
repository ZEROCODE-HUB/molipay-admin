import { useState } from "react";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useCustomersForSelect } from "@/features/merchants/merchants.hooks";
import { Search } from "lucide-react";
import { type Draft } from "@/features/alerts/block-settings.types";

export function CustomerParamFields({
  draft,
  onChange,
  editando: editing,
  generales,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  editando: boolean;
  generales: { persona: number | null; empresa: number | null };
}) {
  const [search, setSearch] = useState(draft.correo || draft.legajo);
  const debounced = useDebouncedValue(search, 300);
  const { data: options } = useCustomersForSelect(debounced || undefined);
  const [open, setOpen] = useState(false);
  const inputCls =
    "w-full h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2 relative">
        <label className="text-xs font-semibold text-foreground mb-1.5 block">Cliente</label>
        {editing ? (
          <div className="h-9 flex items-center rounded-md border bg-muted px-3 text-sm">
            <span className="font-mono text-xs mr-2">{draft.legajo}</span>
            <span className="text-muted-foreground truncate">{draft.correo}</span>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  onChange({ ...draft, legajo: "", correo: "" });
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
                      onChange({ ...draft, legajo: c.legajo, correo: c.correo });
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
            {draft.legajo && (
              <p className="text-[11px] text-emerald-700 mt-1">
                Seleccionado: <span className="font-mono">{draft.legajo}</span>
              </p>
            )}
          </>
        )}
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">
          Salarios mínimos por persona
        </label>
        <input
          type="number"
          min={0}
          step={1}
          value={draft.persona}
          onChange={(e) => onChange({ ...draft, persona: e.target.value })}
          placeholder={`General: ${generales.persona ?? "—"}`}
          className={inputCls}
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">
          Salarios mínimos por empresa
        </label>
        <input
          type="number"
          min={0}
          step={1}
          value={draft.empresa}
          onChange={(e) => onChange({ ...draft, empresa: e.target.value })}
          placeholder={`General: ${generales.empresa ?? "—"}`}
          className={inputCls}
        />
      </div>
      <p className="col-span-2 text-[11px] text-muted-foreground">
        Dejá un campo vacío para que ese cliente use el valor general.
      </p>
    </div>
  );
}
