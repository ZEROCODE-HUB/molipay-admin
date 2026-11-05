import { Card } from "@/shared/ui/card";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Plus,Trash2 } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { formatPct } from "@/features/merchants/merchants.rules";

import type { BrandsSectionVm } from "./use-brands-section";

export function BrandInstallmentsCard({
  installmentsBrand,
  setInstallmentValue,
  setInstallmentRate,
  setInstallmentStatus,
  setShowInstallmentForm,
  setInstallmentsBrand,
  installmentsLoading,
  installments,
  setConfirmDeleteInstallment,
}: Pick<
  BrandsSectionVm,
  | "installmentsBrand"
  | "setInstallmentValue"
  | "setInstallmentRate"
  | "setInstallmentStatus"
  | "setShowInstallmentForm"
  | "setInstallmentsBrand"
  | "installmentsLoading"
  | "installments"
  | "setConfirmDeleteInstallment"
>) {
  return (
    <>
      {installmentsBrand && (
        <Card className="p-5 mt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-display text-sm font-semibold">
                Cuotas de {installmentsBrand.bandera} (TEM por cuota)
              </h4>
              <p className="text-xs text-muted-foreground">
                Tasa efectiva mensual que se cobra al comercio por cada cantidad de cuotas.
              </p>
            </div>
            <div className="flex gap-2">
              <BtnPrimary
                type="button"
                onClick={() => {
                  setInstallmentValue("1");
                  setInstallmentRate("");
                  setInstallmentStatus("Activo");
                  setShowInstallmentForm(true);
                }}
                className="h-8 text-xs"
              >
                <Plus size={14} /> Agregar cuota
              </BtnPrimary>
              <BtnOutline
                type="button"
                onClick={() => setInstallmentsBrand(null)}
                className="h-8 text-xs"
              >
                Cerrar
              </BtnOutline>
            </div>
          </div>
          {installmentsLoading ? (
            <p className="text-sm text-muted-foreground">Cargando cuotas…</p>
          ) : installments.length === 0 ? (
            <p className="text-sm text-muted-foreground border border-dashed rounded-lg py-6 text-center">
              Sin cuotas configuradas. Agregá la primera.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-3 py-2 font-display font-semibold">Cuotas</th>
                  <th className="px-3 py-2 font-display font-semibold text-right">TEM (%)</th>
                  <th className="px-3 py-2 font-display font-semibold">Estado</th>
                  <th className="px-3 py-2 font-display font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {installments.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono font-semibold">{c.cuotas}x</td>
                    <td className="px-3 py-2 text-right font-mono">{formatPct(c.tasaMensual)}</td>
                    <td className="px-3 py-2">
                      <Badge tone={c.estado === "Activo" ? "success" : "neutral"}>{c.estado}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteInstallment(c)}
                        className="h-7 px-2 rounded-md border border-red-200 text-red-600 bg-card text-xs hover:bg-red-50 inline-flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </>
  );
}
