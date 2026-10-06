import { Wrench } from "lucide-react";
import { useDeveloperMode } from "@/hooks/use-developer-mode";

export function DeveloperModeToggle() {
  const { devMode, setDevMode } = useDeveloperMode();

  return (
    <button
      type="button"
      onClick={() => setDevMode(!devMode)}
      className={`inline-flex items-center gap-2 h-10 px-4 rounded-lg border text-sm font-semibold transition-colors ${
        devMode
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
      aria-pressed={devMode}
    >
      <Wrench size={15} />
      Modo desarrollador
      <span
        className={`relative inline-flex w-8 h-4.5 rounded-full transition-colors ${
          devMode ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-card shadow transition-transform ${
            devMode ? "translate-x-3.5" : ""
          }`}
        />
      </span>
    </button>
  );
}
