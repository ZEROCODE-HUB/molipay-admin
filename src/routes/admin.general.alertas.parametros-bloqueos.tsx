import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Save, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/admin/general/alertas/parametros-bloqueos")({
  head: () => ({ meta: [{ title: "Parámetros de bloqueos — Admin Panel" }] }),
  component: Page,
});

function Page() {
  const [params, setParams] = useState({
    salarios_minimos_persona: "15",
    salarios_minimos_empresa: "50",
  });

  return (
    <>
      <PageHeader
        title="Parámetros de bloqueos"
        description="Umbrales que activan bloqueo automático de cuenta hasta revisión de compliance"
      />

      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 flex gap-3 max-w-2xl">
        <ShieldAlert size={18} className="text-red-600 shrink-0 mt-0.5" />
        <div className="text-sm text-red-800 dark:text-red-300">
          <strong>Importante:</strong> Un <strong>bloqueo</strong> suspende la cuenta
          automáticamente al cumplirse el umbral. La cuenta queda bloqueada hasta que compliance la
          revise y la reactive manualmente.
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 max-w-2xl">
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Cantidad de salarios mínimos depositados por persona
            </label>
            <input
              type="number"
              value={params.salarios_minimos_persona}
              onChange={(e) =>
                setParams((p) => ({ ...p, salarios_minimos_persona: e.target.value }))
              }
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Si una persona física supera este acumulado de depósitos, la cuenta se bloquea
              automáticamente.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Cantidad de salarios mínimos depositados por empresa
            </label>
            <input
              type="number"
              value={params.salarios_minimos_empresa}
              onChange={(e) =>
                setParams((p) => ({ ...p, salarios_minimos_empresa: e.target.value }))
              }
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Si una persona jurídica supera este acumulado de depósitos, la cuenta se bloquea
              automáticamente.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button className="inline-flex items-center gap-2 h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
            <Save size={14} /> Guardar configuración
          </button>
        </div>
      </div>
    </>
  );
}
