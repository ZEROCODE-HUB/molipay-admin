import { useState } from "react";
import { isSupabaseConfigured } from "@/infrastructure/supabase/client";
import { Card } from "@/shared/ui/card";
import { FilingsTab } from "./filings-tab";
import { ItemsTab } from "./items-tab";

export function ReportsBCRA() {
  const [tab, setTab] = useState<"presentaciones" | "partidas">("presentaciones");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground max-w-3xl">
          Régimen Informativo de Proveedores de Servicios de Pago — Com. "A" 8207 (BCRA), presentado
          vía SISCEN. Los apartados se calculan desde el ledger de MoliPay; cada generación queda
          guardada como foto auditable.
        </p>
        <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
          {(
            [
              ["presentaciones", "Presentaciones"],
              ["partidas", "Partidas y parámetros"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`px-3 h-8 rounded-md text-xs font-semibold transition-colors ${
                tab === k
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {!isSupabaseConfigured ? (
        <Card className="p-5 text-sm text-muted-foreground">
          Supabase no está configurado: no se pueden generar los reportes.
        </Card>
      ) : tab === "presentaciones" ? (
        <FilingsTab />
      ) : (
        <ItemsTab />
      )}
    </div>
  );
}
