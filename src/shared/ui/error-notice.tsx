import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

/** Aviso de error dentro de un formulario o seccion. */
export function ErrorNotice({
  children,
  icon = true,
  className = "",
}: {
  children: ReactNode;
  icon?: boolean;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 ${className}`}
    >
      {icon && <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
