import {
type AlertRuleCode,
type MinorsPolicy,
type RuleConditions,
type ScheduleDay,
} from "@/features/alerts/alert-rules.supabase";

export type NumberField = { key: string; label: string; integer?: boolean };

/**
 * Presentacion de cada regla: titulo del grupo, etiqueta del switch y campos.
 * Los VALORES salen de la base (alert_rules); aca solo vive como se muestran.
 */
export type RuleView = { code: AlertRuleCode; switchLabel: string; numbers?: NumberField[] };
export type GroupView = { title: string; rules: RuleView[]; full?: boolean };

/** Estado editable: numeros como texto para no perder lo que se esta tipeando. */
export type Draft = Record<
  string,
  {
    isEnabled: boolean;
    values: Record<string, string>;
    conditions: RuleConditions;
    policy?: MinorsPolicy;
    days?: ScheduleDay[];
    jurisdictions?: string[];
    byActivity?: { activity: string; amount: string }[];
  }
>;

/** Valida y arma los parametros a guardar; devuelve errores por campo. */
export type RuleToSave = {
  code: AlertRuleCode;
  isEnabled: boolean;
  parameters: Record<string, unknown>;
  conditions: RuleConditions;
};
