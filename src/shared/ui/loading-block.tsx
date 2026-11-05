/** Bloque de carga de una seccion o tabla. */
export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
      <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      {label}
    </div>
  );
}
