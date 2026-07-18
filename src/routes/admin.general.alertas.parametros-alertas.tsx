import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Save } from "lucide-react";
import { PageHeader } from "@/components/page-header";

type Param = { label: string; key: string; value: string; type: "number" | "text" | "select"; options?: string[] };

const initialParams: Param[] = [
  { label: "Límite de depósito excedido (por empresa)", key: "limite_deposito_empresa", value: "500000", type: "number" },
  { label: "Límite de depósito excedido (salario mínimo)", key: "limite_deposito_salmin", value: "10", type: "number" },
  { label: "Depósitos de salario mínimo por transferencia", key: "depositos_salmin_transf", value: "5", type: "number" },
  { label: "Límite de depósito mensual (por mismo origen)", key: "limite_deposito_mensual", value: "2000000", type: "number" },
  { label: "Máximo de intentos fallidos por retiro", key: "max_intentos_fallidos", value: "3", type: "number" },
  { label: "Transferencias repetidas (umbral)", key: "transferencias_repetidas", value: "5", type: "number" },
  { label: "Transferencias por hora", key: "transferencias_hora", value: "10", type: "number" },
  { label: "Afinidad entre cuentas empresa", key: "afinidad_cuentas", value: "3", type: "number" },
  { label: "Volumen anormal de operación", key: "volumen_anormal", value: "1000000", type: "number" },
  { label: "Política de transferencia a menores", key: "politica_menores", value: "Pendiente de definición", type: "text" },
  { label: "Movimiento en horario inusual (lun–vie)", key: "horario_inusual_lv", value: "22:00–06:00", type: "text" },
  { label: "Movimiento en horario inusual (sáb–dom)", key: "horario_inusual_sd", value: "18:00–08:00", type: "text" },
];

export const Route = createFileRoute("/admin/general/alertas/parametros-alertas")({
  head: () => [{ title: "Parámetros de alertas — Admin Panel" }],
  component: Page,
});

function Page() {
  const [params, setParams] = useState(initialParams);
  const update = (key: string, value: string) => setParams((prev) => prev.map((p) => p.key === key ? { ...p, value } : p));
  return (
    <>
      <PageHeader title="Parámetros de alertas" description="Configuración de umbrales que activan alertas (solo notifican, no bloquean)" />
      <div className="bg-card border rounded-lg p-6 max-w-2xl">
        <div className="space-y-5">
          {params.map((p) => (
            <div key={p.key}>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">{p.label}</label>
              <input
                type={p.type}
                value={p.value === "Pendiente de definición" ? "" : p.value}
                placeholder={p.value === "Pendiente de definición" ? "Pendiente de definición" : undefined}
                onChange={(e) => update(p.key, e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
                disabled={p.value === "Pendiente de definición"}
              />
            </div>
          ))}
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
