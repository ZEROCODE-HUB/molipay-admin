import { Amount } from "@/features/payment-links/components/credits-common";

export function Tot({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <Amount v={v} strong />
    </div>
  );
}
