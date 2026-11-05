import type { ReactNode } from "react";

const badgeStyles: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  warn: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  danger: "bg-moli-red-light text-moli-red-dark dark:bg-red-950/30 dark:text-red-400",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warn" | "danger";
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${badgeStyles[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
