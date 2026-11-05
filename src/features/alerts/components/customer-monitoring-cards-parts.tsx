import { type ReactNode } from "react";

export function Cabecera({
  icon,
  titulo: title,
  children,
}: {
  icon: ReactNode;
  titulo: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon} {title}
      </div>
      <div className="flex gap-1.5">{children}</div>
    </div>
  );
}
