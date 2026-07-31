import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Save, Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";

type SwitchParam = { label: string; key: string; enabled: boolean };
type NumberParam = { label: string; key: string; value: string };
type SelectParam = { label: string; key: string; value: string; options: string[] };
type ScheduleParam = {
  name: string;
  key: string;
  enabled: boolean;
  inicio: string;
  fin: string;
};
type Group = {
  title: string;
  switches?: SwitchParam[];
  numbers?: NumberParam[];
  selects?: SelectParam[];
  schedule?: ScheduleParam[];
};

const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export const Route = createFileRoute("/admin/general/alertas/parametros-alertas")({
  head: () => ({ meta: [{ title: "Parámetros de alertas — Admin Panel" }] }),
  component: Page,
});

function Toggle({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${
        enabled ? "bg-moli-blue" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function Page() {
  const [groups, setGroups] = useState<Group[]>([
    {
      title: "Límite de depósitos excedidos",
      switches: [
        { label: "Depósito por empresa", key: "limite_deposito_empresa_activo", enabled: true },
        {
          label: "Límite de depósito excedido",
          key: "limite_deposito_excedido_activo",
          enabled: true,
        },
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
      switches: [
        {
          label: "Límite de depósito mensual",
          key: "limite_deposito_mensual_activo",
          enabled: true,
        },
      ],
      numbers: [
        {
          label: "Monto del límite de depósito mensual",
          key: "limite_deposito_mensual",
          value: "2000000",
        },
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
        {
          label: "Tiempo de evaluación de retiros fallidos (segundos)",
          key: "tiempo_eval_retiros_fallidos",
          value: "300",
        },
      ],
    },
    {
      title: "Transferencias repetidas",
      switches: [
        { label: "Operaciones repetitivas", key: "transferencias_repetidas_activo", enabled: true },
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
      switches: [
        { label: "Afinidad entre cuentas", key: "afinidad_cuentas_activo", enabled: true },
      ],
      numbers: [{ label: "Afinidad entre cuentas (umbral)", key: "afinidad_cuentas", value: "3" }],
    },
    {
      title: "Volumen anormal de operación",
      switches: [
        { label: "Alerta de volumen habilitada", key: "volumen_anormal_activo", enabled: true },
      ],
      numbers: [
        { label: "Monto mínimo por operación", key: "volumen_anormal_min", value: "1000000" },
        { label: "Monto máximo por operación", key: "volumen_anormal_max", value: "5000000" },
      ],
    },
    {
      title: "Política de transferencia a menores",
      switches: [
        { label: "Transferencia a menor", key: "politica_menores_activo", enabled: false },
      ],
      selects: [
        {
          label: "Política",
          key: "politica_menores",
          value: "bloquear",
          options: ["bloquear", "BLOCKED"],
        },
      ],
    },
    {
      title: "Movimiento en horario inusual",
      switches: [
        {
          label: "Regla de horario inusual habilitada",
          key: "horario_inusual_activo",
          enabled: true,
        },
      ],
      schedule: dayNames.map((name, i) => ({
        name,
        key: `horario_inusual_${i}`,
        enabled: i < 5,
        inicio: "09:00",
        fin: "18:00",
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

  const updateSelect = (gIdx: number, selIdx: number, value: string) => {
    setGroups((prev) => {
      const next = structuredClone(prev);
      const sel = next[gIdx].selects?.[selIdx];
      if (sel) sel.value = value;
      return next;
    });
  };

  const toggleSchedule = (gIdx: number, sIdx: number) => {
    setGroups((prev) => {
      const next = structuredClone(prev);
      const sch = next[gIdx].schedule?.[sIdx];
      if (sch) sch.enabled = !sch.enabled;
      return next;
    });
  };

  const updateSchedule = (gIdx: number, sIdx: number, field: "inicio" | "fin", value: string) => {
    setGroups((prev) => {
      const next = structuredClone(prev);
      const sch = next[gIdx].schedule?.[sIdx];
      if (sch) sch[field] = value;
      return next;
    });
  };

  return (
    <>
      <PageHeader
        title="Parámetros de alertas"
        description="Configuración de umbrales que activan alertas (solo notifican, no bloquean)"
      />

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 flex gap-3">
        <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-300">
          Una <strong>alerta</strong> solo notifica y queda pendiente de revisión manual. No
          suspende la cuenta automáticamente.
        </div>
      </div>

      <div className="bg-card border rounded-lg p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((g, gIdx) => (
            <div key={g.title} className="break-inside-avoid">
              <h4 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b border-border">
                {g.title}
              </h4>
              <div className="space-y-3">
                {g.switches?.map((s, sIdx) => (
                  <div key={s.key} className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                    <Toggle enabled={s.enabled} onClick={() => toggleSwitch(gIdx, sIdx)} />
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
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                    />
                  </div>
                ))}
                {g.selects?.map((sel, selIdx) => (
                  <div key={sel.key}>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      {sel.label}
                    </label>
                    <select
                      value={sel.value}
                      onChange={(e) => updateSelect(gIdx, selIdx, e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                    >
                      {sel.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                {g.schedule?.map((sch, sIdx) => (
                  <div key={sch.key} className="rounded-md border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-foreground">{sch.name}</span>
                      <Toggle enabled={sch.enabled} onClick={() => toggleSchedule(gIdx, sIdx)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                          Inicio
                        </label>
                        <input
                          type="time"
                          value={sch.inicio}
                          disabled={!sch.enabled}
                          onChange={(e) => updateSchedule(gIdx, sIdx, "inicio", e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                          Fin
                        </label>
                        <input
                          type="time"
                          value={sch.fin}
                          disabled={!sch.enabled}
                          onChange={(e) => updateSchedule(gIdx, sIdx, "fin", e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-6 mt-6 border-t border-border">
          <button className="inline-flex items-center gap-2 h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition">
            <Save size={14} /> Guardar configuración
          </button>
        </div>
      </div>
    </>
  );
}
