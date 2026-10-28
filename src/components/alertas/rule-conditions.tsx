import { useEffect, useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import type { RuleConditionKey, RuleConditions } from "@/lib/api/alert-rules";
import { ChipsSelect, PROVINCIAS_AR, unirValores } from "./chips-select";

type Def = { key: RuleConditionKey; label: string; options?: { value: string; label: string }[]; libre?: boolean };

const ESTADOS = [
  ["pendiente_verificacion", "Pendiente de verificación"],
  ["registrado", "Registrado"],
  ["preactivado", "Preactivado"],
  ["activado", "Activado"],
  ["activo", "Activo"],
  ["suspendido", "Suspendido"],
  ["deshabilitado", "Deshabilitado"],
  ["rechazado", "Rechazado"],
  ["eliminado", "Eliminado"],
] as const;

const DEFS: Def[] = [
  { key: "tipo_persona", label: "Tipo de persona", options: [{ value: "fisica", label: "Persona física" }, { value: "juridica", label: "Persona jurídica" }] },
  { key: "estado", label: "Estado del cliente", options: ESTADOS.map(([value, label]) => ({ value, label })) },
  {
    key: "riesgo",
    label: "Nivel de riesgo vigente",
    options: [
      { value: "bajo", label: "Bajo" },
      { value: "medio", label: "Medio" },
      { value: "alto", label: "Alto" },
      { value: "critico", label: "Crítico" },
      { value: "sin_evaluar", label: "Sin evaluar" },
    ],
  },
  { key: "es_pep", label: "PEP", options: [{ value: "si", label: "Es PEP" }, { value: "no", label: "No es PEP" }] },
  { key: "actividad", label: "Actividad económica", libre: true },
  { key: "provincia", label: "Provincia del domicilio", libre: true },
];

const LABEL_VALOR = new Map(DEFS.flatMap((d) => (d.options ?? []).map((o) => [`${d.key}:${o.value}`, o.label] as const)));

/** Limpia listas vacías para guardar `{}` cuando aplica a todos. */
export function limpiarCondiciones(c: RuleConditions): RuleConditions {
  const out: RuleConditions = {};
  for (const [k, v] of Object.entries(c) as [RuleConditionKey, string[] | undefined][]) if (v && v.length > 0) out[k] = v;
  return out;
}

export function resumenCondiciones(c: RuleConditions): string {
  const partes = DEFS.filter((d) => (c[d.key]?.length ?? 0) > 0).map(
    (d) => `${d.label}: ${c[d.key]!.map((v) => LABEL_VALOR.get(`${d.key}:${v}`) ?? v).join(", ")}`,
  );
  return partes.length === 0 ? "Todos los clientes" : partes.join(" · ");
}

export function RuleConditionsDialog({
  open,
  ruleName,
  value,
  fichaValues,
  onClose,
  onApply,
}: {
  open: boolean;
  ruleName: string;
  value: RuleConditions;
  fichaValues: { actividades: string[]; provincias: string[] };
  onClose: () => void;
  onApply: (c: RuleConditions) => void;
}) {
  const [draft, setDraft] = useState<RuleConditions>(value);
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const opcionesLibres = (k: RuleConditionKey) =>
    (k === "actividad" ? fichaValues.actividades : unirValores(PROVINCIAS_AR, fichaValues.provincias)).map((v) => ({ value: v }));

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Clientes a los que aplica"
      description={`${ruleName}. Sin valores en un campo = no filtra por ese campo.`}
      onSubmit={() => {
        onApply(limpiarCondiciones(draft));
        onClose();
      }}
      submitLabel="Aplicar"
      size="lg"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {DEFS.map((d) => (
          <div key={d.key}>
            <div className="text-xs font-semibold text-foreground mb-1.5">{d.label}</div>
            <ChipsSelect
              value={draft[d.key] ?? []}
              onChange={(v) => setDraft((p) => ({ ...p, [d.key]: v }))}
              options={d.options ?? opcionesLibres(d.key)}
              allowCustom={Boolean(d.libre)}
              emptyLabel="Todos"
            />
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">
        Se compara ignorando mayúsculas y acentos contra la ficha del cliente. Los clientes sin dato en un campo filtrado no quedan alcanzados.
      </p>
    </FormDialog>
  );
}
