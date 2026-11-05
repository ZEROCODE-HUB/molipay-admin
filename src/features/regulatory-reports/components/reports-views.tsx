import { type ReactNode } from "react";
import { Reconciliations } from "@/features/regulatory-reports/components/reconciliations";
import { ReportsBCRA } from "@/features/regulatory-reports/components/bcra-reports";
import { ReportsAFIP } from "@/features/regulatory-reports/components/reports-afip";
import { ReportsFees } from "@/features/regulatory-reports/components/reports-fees";
import { ReportsMovements } from "@/features/regulatory-reports/components/reports-movements";
import { ActividadUsers } from "@/features/regulatory-reports/components/actividad-users";
import { ReportsTaxes } from "@/features/regulatory-reports/components/reports-taxes";
import { ReconciliationsBLP } from "@/features/regulatory-reports/components/reconciliations-blp";
import { ReportUnidadNegocio } from "./reports-parts";

/* ---------- Enrutado de vistas ---------- */

export const views: Record<string, () => ReactNode> = {
  conciliaciones: Reconciliations,
  bcra: ReportsBCRA,
  afip: ReportsAFIP,
  comisiones: ReportsFees,
  movimientos: ReportsMovements,
  actividad: ActividadUsers,
  impuestos: ReportsTaxes,
  "conciliaciones-blp": ReconciliationsBLP,
  "unidad-negocio": ReportUnidadNegocio,
};
