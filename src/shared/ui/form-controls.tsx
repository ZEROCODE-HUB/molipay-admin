import type { ReactNode } from "react";

// React 19: `ref` llega como prop, asi que estos controles funcionan con register() de RHF.

export function Input(
  p: React.InputHTMLAttributes<HTMLInputElement> & { ref?: React.Ref<HTMLInputElement> },
) {
  return (
    <input
      {...p}
      className={`w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-200 focus:border-ring focus:ring-2 focus:ring-ring/20 ${p.className ?? ""}`}
    />
  );
}

export function Select(
  p: React.SelectHTMLAttributes<HTMLSelectElement> & { ref?: React.Ref<HTMLSelectElement> },
) {
  return (
    <select
      {...p}
      className={`h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60 ${p.className ?? ""}`}
    />
  );
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-semibold text-foreground mb-1.5 block">
      {children}
    </label>
  );
}
