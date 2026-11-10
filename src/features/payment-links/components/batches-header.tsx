import { Link } from "@tanstack/react-router";
import { saveSelection } from "@/features/payment-links/credits.supabase";
import { AlertTriangle, Calendar, Download, FlaskConical, Upload, Wallet } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { BtnOutline, BtnPrimary } from "@/shared/ui/button";

import type { BatchesPageVm } from "./use-batches-page";

export function BatchesHeader({
  exportCsv,
  exporting,
  canGestionar,
  setSimulateCc,
  setTestOpen,
  batches,
  navigate,
  setLoadCsv,
  tab,
}: Pick<
  BatchesPageVm,
  | "exportCsv"
  | "exporting"
  | "canGestionar"
  | "setSimulateCc"
  | "setTestOpen"
  | "batches"
  | "navigate"
  | "setLoadCsv"
  | "tab"
>) {
  return (
    <PageHeader
      title="Lotes de Acreditación"
      description="Lo que Payway liquidó a cada comercio por bandera: Programado → (Subir CSV) → Pendiente → (Conciliar) → (Acreditar) → Acreditado."
      action={
        <div className="flex flex-wrap gap-2">
          <BtnOutline onClick={exportCsv} disabled={exporting}>
            {exporting ? (
              <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
            ) : (
              <Download size={14} />
            )}
            Descargar CSV
          </BtnOutline>
          {import.meta.env.DEV && canGestionar && (
            <BtnOutline
              onClick={() => setTestOpen(true)}
              title="Recorre el flujo completo de un lote y controla sus cálculos"
            >
              <FlaskConical size={14} /> Prueba completa
            </BtnOutline>
          )}
          {canGestionar && (
            <BtnOutline
              onClick={() => setSimulateCc(true)}
              title="CSV de prueba de contracargos con ventas reales de lotes Programados o Pendientes"
            >
              <Download size={14} /> Simular contracargos
            </BtnOutline>
          )}
          <Link
            to="/admin/comercios/link-pago/excepciones"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-accent"
          >
            <AlertTriangle size={14} /> Excepciones
          </Link>
          <Link
            to="/admin/comercios/link-pago/acreditaciones"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-accent"
          >
            <Calendar size={14} /> Conciliar por día
          </Link>
          {canGestionar && (
            <BtnOutline
              onClick={() => {
                saveSelection(batches.filter((l) => l.elegible).map((l) => l.id));
                void navigate({ to: "/admin/comercios/link-pago/ejecucion" });
              }}
            >
              <Wallet size={14} /> Ejecución masiva
            </BtnOutline>
          )}
          {canGestionar && (
            <BtnPrimary
              onClick={() => setLoadCsv({ lote: null })}
              disabled={tab !== "lotes"}
              title={tab !== "lotes" ? "Cambiá a la pestaña Lotes por bandera" : undefined}
            >
              <Upload size={14} />
              Subir CSV de Payway
            </BtnPrimary>
          )}
        </div>
      }
    />
  );
}
