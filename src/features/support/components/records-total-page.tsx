import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";

export function RecordsTotalPage() {
  const interno = 45_200_000;
  const taxes = 1_800_000;
  const bank = 46_500_000;
  const internoNew = 46_800_000;

  const formula1 = interno + taxes - bank;
  const formula2 = internoNew - bank;

  return (
    <>
      <PageHeader
        title="Total de fondos"
        description="Control crítico: detecta cuando MoliPay informa a clientes un monto mayor al real en la cuenta recaudadora."
      />

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 flex gap-3">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-300">
          Detecta cuando MoliPay informa a clientes un monto mayor al real en la cuenta recaudadora
          — <strong>control crítico</strong>.
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <h3 className="font-display font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">
            Fórmula 1 (ARS)
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Interno de usuarios</span>
              <span className="font-semibold">$ {interno.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>+ Impuestos cobrados</span>
              <span className="font-semibold">$ {taxes.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span>Subtotal</span>
              <span className="font-semibold">$ {(interno + taxes).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>− Banco</span>
              <span className="font-semibold">$ {bank.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-lg">
              <span className="font-semibold">Diferencia</span>
              <span className={`font-bold ${formula1 < 0 ? "text-red-600" : "text-green-600"}`}>
                {formula1 < 0 ? "-" : "+"}$ {Math.abs(formula1).toLocaleString()}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-display font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">
            Fórmula 2 (ARS) — Interno nuevo
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Interno de usuarios (nuevo)</span>
              <span className="font-semibold">$ {internoNew.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>− Banco</span>
              <span className="font-semibold">$ {bank.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-lg">
              <span className="font-semibold">Diferencia</span>
              <span className={`font-bold ${formula2 < 0 ? "text-red-600" : "text-green-600"}`}>
                {formula2 < 0 ? "-" : "+"}$ {Math.abs(formula2).toLocaleString()}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
