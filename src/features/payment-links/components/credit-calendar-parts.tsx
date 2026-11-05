import { type DayCalendario } from "@/features/payment-links/credits.supabase";
import { Amount } from "@/features/payment-links/components/credits-common";
import { type Capa } from "@/features/payment-links/credit-calendar.types";
import { CAPAS } from "@/features/payment-links/credit-calendar.rules";

export function Celda({
  f,
  d,
  capas,
  activo: active,
  esHoy: esToday,
  onClick,
}: {
  f: string;
  d?: DayCalendario;
  capas: Record<Capa, boolean>;
  activo: boolean;
  esHoy: boolean;
  onClick: () => void;
}) {
  const noHabil = d?.no_habil ?? [0, 6].includes(new Date(`${f}T12:00:00`).getDay());
  const tieneAlgo = d && CAPAS.some((c) => capas[c.k] && Number(d[c.k]) !== 0);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[86px] rounded-md border p-1.5 text-left text-[11px] transition ${noHabil ? "bg-muted/50" : "bg-card hover:bg-muted/30"} ${
        active ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className={`font-semibold ${esToday ? "text-primary" : "text-muted-foreground"}`}>
        {Number(f.slice(8))}
      </div>
      {tieneAlgo &&
        CAPAS.filter((c) => capas[c.k] && Number(d![c.k]) !== 0).map((c) => (
          <div key={c.k} className="flex items-center gap-1 mt-0.5">
            <span className={`h-1.5 w-1.5 rounded-full ${c.color}`} />
            <Amount v={Number(d![c.k])} className="text-[10px]" />
          </div>
        ))}
      {noHabil && tieneAlgo && (
        <div className="text-[9px] text-amber-700 mt-0.5">Día no hábil [A-22]</div>
      )}
    </button>
  );
}
