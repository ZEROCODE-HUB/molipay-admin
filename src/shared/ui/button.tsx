export function BtnPrimary({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold cursor-pointer hover:bg-moli-red-dark active:bg-moli-red-darker transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${p.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function BtnOutline({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-border bg-card text-foreground text-sm font-semibold cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${p.className ?? ""}`}
    >
      {children}
    </button>
  );
}
