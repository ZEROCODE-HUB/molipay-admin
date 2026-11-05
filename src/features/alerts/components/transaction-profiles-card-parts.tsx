import { formatMoney } from "@/shared/lib/format";

/** Consumo del mes respecto del perfil (para ver de un vistazo quién está cerca del límite). */
export function Consumo({ actual: current, perfil: profile }: { actual: number; perfil: number }) {
  if (profile <= 0) return <span className="text-muted-foreground">—</span>;
  const pct = Math.round((current / profile) * 100);
  const tone = pct > 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="min-w-[120px]">
      <div className="flex justify-between text-[11px] tabular-nums">
        <span>{formatMoney(current)}</span>
        <span className="font-semibold">{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}
