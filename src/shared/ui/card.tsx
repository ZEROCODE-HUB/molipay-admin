import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-5 ${className}`}>{children}</div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-display text-xl md:text-2xl font-semibold text-foreground mt-1 tabular-nums">
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </Card>
  );
}
