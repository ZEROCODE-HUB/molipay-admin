import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Save, Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/admin/general/alertas/parametros-bloqueos")({
  head: () => [{ title: "Parámetros de bloqueos — Admin Panel" }],
  component: Page,
});

function Page() {
  const [params, setParams] = useState({
    salarios_minimos_persona: "15",
    salarios_minimos_empresa: "50",
  });

  return (
    <>
      <PageHeader title="Parámetros de bloqueos" description="Umbrales que activan bloqueo automático de cuenta" />

      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 flex gap-3 max-w-2xl">
        <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Diferencia de negocio:</strong> Una <strong>alerta</strong> solo notifica y queda pendiente de revisión manual. Un <strong>bloqueo</strong> suspende la cuenta automáticamente hasta revisión de compliance.
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 max-w-2xl">
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Cantidad de salarios mínimos depositados por persona</label>
            <input type="number" value={params.salarios_minimos_persona} onChange={(e) => setParams((p) => ({ ...p, salarios_minimos_persona: e.target.value }))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Cantidad de salarios mínimos depositados por empresa</label>
            <input type="number" value={params.salarios_minimos_empresa} onChange={(e) => setParams((p) => ({ ...p, salarios_minimos_empresa: e.target.value }))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
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
