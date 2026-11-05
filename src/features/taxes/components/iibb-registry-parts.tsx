import { type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Gestion de padrones: tarjetas de accion + ejecuciones recientes
// ---------------------------------------------------------------------------

export function TarjetaAction({
  titulo: title,
  texto: text,
  children,
}: {
  titulo: string;
  texto: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-lg border bg-muted/20 p-5">
      <div>
        <h4 className="font-semibold">{title}</h4>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}
