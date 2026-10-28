import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().replace(/\s+/g, " ").toLowerCase();

type Option = { value: string; label?: string };

/**
 * Selección múltiple con chips. `options` son los valores sugeridos; si
 * `allowCustom`, se pueden agregar valores libres (ej. actividades nuevas).
 */
export function ChipsSelect({
  value,
  onChange,
  options,
  placeholder = "Buscar…",
  allowCustom = false,
  emptyLabel = "Sin valores seleccionados",
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: Option[];
  placeholder?: string;
  allowCustom?: boolean;
  emptyLabel?: string;
}) {
  const [q, setQ] = useState("");
  const elegidos = useMemo(() => new Set(value.map(norm)), [value]);
  const labelDe = (v: string) => options.find((o) => norm(o.value) === norm(v))?.label ?? v;

  const sugeridas = useMemo(() => {
    const nq = norm(q);
    return options.filter((o) => !elegidos.has(norm(o.value)) && (!nq || norm(o.label ?? o.value).includes(nq))).slice(0, 50);
  }, [options, elegidos, q]);

  const agregar = (v: string) => {
    const t = v.trim();
    if (!t || elegidos.has(norm(t))) return;
    onChange([...value, t]);
    setQ("");
  };

  const puedeAgregarLibre = allowCustom && q.trim() !== "" && !elegidos.has(norm(q)) && !options.some((o) => norm(o.value) === norm(q));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {value.length === 0 ? (
          <span className="text-[11px] text-muted-foreground self-center">{emptyLabel}</span>
        ) : (
          value.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium">
              {labelDe(v)}
              <button type="button" aria-label={`Quitar ${labelDe(v)}`} onClick={() => onChange(value.filter((x) => x !== v))} className="hover:opacity-70">
                <X size={12} />
              </button>
            </span>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (sugeridas.length === 1) agregar(sugeridas[0].value);
              else if (puedeAgregarLibre) agregar(q);
            }
          }}
          placeholder={placeholder}
          className="flex-1 h-8 rounded-md border border-input bg-background px-2.5 text-xs outline-none focus:ring-2 focus:ring-ring/40"
        />
        {puedeAgregarLibre && (
          <button type="button" onClick={() => agregar(q)} className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-input text-xs hover:bg-accent">
            <Plus size={12} /> Agregar
          </button>
        )}
      </div>
      {sugeridas.length > 0 && (
        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-auto">
          {sugeridas.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => agregar(o.value)}
              className="rounded-full border border-dashed border-input px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
            >
              + {o.label ?? o.value}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Jurisdicciones de Argentina (sugeridas además de las que existen en las fichas). */
export const PROVINCIAS_AR = [
  "Buenos Aires", "Ciudad Autónoma de Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes",
  "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro",
  "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

/** Une listas de valores sin duplicados (ignorando acentos y mayúsculas). */
export function unirValores(...listas: string[][]): string[] {
  const vistos = new Set<string>();
  const out: string[] = [];
  for (const l of listas)
    for (const v of l) {
      const k = norm(v);
      if (k && !vistos.has(k)) {
        vistos.add(k);
        out.push(v.trim());
      }
    }
  return out.sort((a, b) => a.localeCompare(b, "es"));
}

export const normalizarValor = norm;
