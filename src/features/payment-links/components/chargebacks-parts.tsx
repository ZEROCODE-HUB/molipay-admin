import { type ReactElement } from "react";
import { Badge } from "@/shared/ui/badge";
import { daysHabilesRestantes } from "@/features/payment-links/chargebacks.rules";

export function PlazoMediacion({
  fechaLimite: dateLimit,
  enviadoAt: sentAt,
}: {
  fechaLimite: string | null;
  enviadoAt: string | null;
}) {
  if (!dateLimit) {
    return (
      <p className="text-xs text-muted-foreground">
        Sin plazo definido (se calcula al pasar a mediación).
      </p>
    );
  }
  const days = daysHabilesRestantes(dateLimit);
  const dateFmt = new Date(dateLimit).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  let badge: ReactElement;
  let text: string;
  if (sentAt) {
    badge = <Badge tone="success">Enviado a PayWay</Badge>;
    text = `Enviado el ${new Date(sentAt).toLocaleDateString("es-AR")}.`;
  } else if (days < 0) {
    badge = <Badge tone="danger">Vencido hace {-days} día(s) hábil(es)</Badge>;
    text = `Venció el ${dateFmt}.`;
  } else if (days === 0) {
    badge = <Badge tone="warn">Vence hoy</Badge>;
    text = `Vence hoy a las ${new Date(dateLimit).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}.`;
  } else {
    badge = <Badge tone="warn">Vence en {days} día(s) hábil(es)</Badge>;
    text = `Límite: ${dateFmt}.`;
  }
  return (
    <div className="flex items-center gap-2 text-xs">
      {badge}
      <span className="text-muted-foreground">{text}</span>
    </div>
  );
}

export function CheckCircleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
