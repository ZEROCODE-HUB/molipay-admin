import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Save, Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";

type SwitchParam = { label: string; key: string; enabled: boolean };
type NumberParam = { label: string; key: string; value: string };
type Group = {
  title: string;
  switches?: SwitchParam[];
  numbers?: NumberParam[];
};

const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export const Route = createFileRoute("/admin/general/alertas/parametros-alertas")({
  head: () => ({ meta: [{ title: "Parámetros de alertas — Admin Panel" }] }),
  component: Page,
});

function Page() {
  const [groups, setGroups] = useState<Group[]>([
    {
      title: "Límite de depósito excedido",
      switches: [
        { label: "Depósito por empresa", key: "limite_deposito_empresa_activo", enabled: true },
      ],
      numbers: [
        {
          label: "Depósito por empresa (monto máx.)",
          key: "limite_deposito_empresa",
          value: "500000",
        },
        { label: "Salario mínimo (cantidad)", key: "limite_deposito_salmin", value: "10" },
        {
          label: "Depósitos de salario mínimo por transferencia",
          key: "depositos_salmin_transf",
          value: "5",
        },
      ],
    },
    {
      title: "Límite de depósito mensual",
      numbers: [
        { label: "Límite de depósito mensual", key: "limite_deposito_mensual", value: "2000000" },
        {
          label: "Depósito de un mismo origen por mes",
          key: "deposito_mismo_origen_mes",
          value: "500000",
        },
      ],
    },
    {
      title: "Máximo intentos fallidos por retiro",
      numbers: [
        { label: "Intentos fallidos permitidos", key: "max_intentos_fallidos", value: "3" },
      ],
    },
    {
      title: "Transferencias repetidas",
      switches: [
        { label: "Operaciones repetidas", key: "transferencias_repetidas_activo", enabled: true },
      ],
      numbers: [
        { label: "Umbral de operaciones repetidas", key: "transferencias_repetidas", value: "5" },
      ],
    },
    {
      title: "Transferencias por hora",
      switches: [
        { label: "Límite de depósito horario", key: "limite_horario_activo", enabled: true },
      ],
      numbers: [{ label: "Transferencias por hora", key: "transferencias_hora", value: "10" }],
    },
    {
      title: "Afinidad entre cuentas (solo transferencias entre cuentas empresa)",
      numbers: [{ label: "Afinidad entre cuentas", key: "afinidad_cuentas", value: "3" }],
    },
    {
      title: "Volumen anormal de operación",
      switches: [
        { label: "Alerta de volumen habilitada", key: "volumen_anormal_activo", enabled: true },
      ],
      numbers: [{ label: "Monto mínimo por operación", key: "volumen_anormal", value: "1000000" }],
    },
    {
      title: "Política de transferencia a menores",
      switches: [{ label: "Política habilitada", key: "politica_menores_activo", enabled: false }],
      numbers: [{ label: "Política", key: "politica_menores", value: "bloquear" }],
    },
    {
      title: "Movimiento en horario inusual",
      switches: dayNames.map((name, i) => ({
        label: name,
        key: `horario_inusual_${i}`,
        enabled: i < 5,
      })),
    },
  ]);

  const toggleSwitch = (gIdx: number, sIdx: number) => {
    setGroups((prev) => {
      const next = structuredClone(prev);
      const sw = next[gIdx].switches?.[sIdx];
      if (sw) sw.enabled = !sw.enabled;
      return next;
    });
  };

  const updateNumber = (gIdx: number, nIdx: number, value: string) => {
    setGroups((prev) => {
      const next = structuredClone(prev);
      const num = next[gIdx].numbers?.[nIdx];
      if (num) num.value = value;
      return next;
    });
  };

  return (
    <>
      <PageHeader
        title="Parámetros de alertas"
        description="Configuración de umbrales que activan alertas (solo notifican, no bloquean)"
      />

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 flex gap-3 max-w-2xl">
        <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-300">
          Una <strong>alerta</strong> solo notifica y queda pendiente de revisión manual. No
          suspende la cuenta automáticamente.
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 max-w-2xl space-y-8">
        {groups.map((g, gIdx) => (
          <div key={g.title}>
            <h4 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b border-border">
              {g.title}
            </h4>
            <div className="space-y-4">
              {g.switches?.map((s, sIdx) => (
                <div key={s.key} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <button
                    type="button"
                    onClick={() => toggleSwitch(gIdx, sIdx)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${s.enabled ? "bg-primary" : "bg-muted"}`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${s.enabled ? "translate-x-5" : "translate-x-0.5"}`}
                    />
                  </button>
                </div>
              ))}
              {g.numbers?.map((n, nIdx) => (
                <div key={n.key}>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    {n.label}
                  </label>
                  <input
                    type="number"
                    value={n.value}
                    onChange={(e) => updateNumber(gIdx, nIdx, e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end pt-4 border-t border-border">
          <button className="inline-flex items-center gap-2 h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
            <Save size={14} /> Guardar configuración
          </button>
        </div>
      </div>
    </>
  );
}
