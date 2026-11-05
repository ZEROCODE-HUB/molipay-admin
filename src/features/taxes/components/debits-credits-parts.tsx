import { situacion,type Exemption } from "@/features/taxes/exemptions.supabase";
import { Badge } from "@/shared/ui/badge";
import { TONE_SITUACION } from "@/features/taxes/debits-credits.rules";

export function SituacionBadge({ e }: { e: Exemption }) {
  const s = situacion(e);
  return <Badge tone={TONE_SITUACION[s]}>{s}</Badge>;
}

export function TarjetaAction({
  titulo: title,
  texto: text,
  children,
}: {
  titulo: string;
  texto: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-3">
      <div>
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1">{text}</p>
      </div>
      <div className="mt-auto">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detalle
// ---------------------------------------------------------------------------

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="font-medium mt-0.5 break-words">{children}</div>
    </div>
  );
}
