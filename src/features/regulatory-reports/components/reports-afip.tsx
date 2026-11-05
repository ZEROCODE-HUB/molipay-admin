import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/shared/ui/card";
import { Input,Label } from "@/shared/ui/form-controls";
import { BtnPrimary } from "@/shared/ui/button";
import { type AfipParams } from "@/features/regulatory-reports/reports.types";
import { afipParamsInitials } from "@/features/regulatory-reports/reports.rules";
import { AfipTable } from "./afip-table";

/* ---------- Reportes AFIP (B-8-1-25 / B-8-1-26) ---------- */

export function ReportsAFIP() {
  const [params, setParams] = useState<AfipParams>(afipParamsInitials);

  const saveParams = () => {
    toast.success("Parámetros para reportes actualizados");
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Parámetros para reportes
        </h4>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="afip-monto-txn">Monto de transacción por mes</Label>
            <Input
              id="afip-monto-txn"
              value={params.montoTransaccion}
              onChange={(e) => setParams({ ...params, montoTransaccion: e.target.value })}
              placeholder="Ej: 500000"
            />
          </div>
          <div>
            <Label htmlFor="afip-monto-saldo">Monto de saldo a fin de mes</Label>
            <Input
              id="afip-monto-saldo"
              value={params.montoSaldo}
              onChange={(e) => setParams({ ...params, montoSaldo: e.target.value })}
              placeholder="Ej: 100000"
            />
          </div>
        </div>
        <div className="mt-4">
          <BtnPrimary className="h-8 text-xs px-3" onClick={saveParams}>
            Guardar
          </BtnPrimary>
        </div>
      </Card>

      <AfipTable params={params} />
    </div>
  );
}
