export function Field({
  label,
  value,
  mono,
  full,
}: {
  label: string;
  value: string;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : undefined}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-medium break-words ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  );
}
