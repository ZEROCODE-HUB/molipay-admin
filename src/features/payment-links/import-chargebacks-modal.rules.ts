import { type Phase } from "./import-chargebacks-modal.types";

export function phaseLabel(p: Phase): string {
  if (p === "parsing") return "Parseando archivo…";
  if (p === "importing") return "Importando filas…";
  return "";
}
