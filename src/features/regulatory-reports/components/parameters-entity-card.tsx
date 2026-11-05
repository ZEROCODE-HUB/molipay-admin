import { useQuery,useQueryClient } from "@tanstack/react-query";
import { readParametersBcra,saveParameterBcra } from "@/features/regulatory-reports/bcra.supabase";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/shared/ui/card";
import { BtnPrimary } from "@/shared/ui/button";
import { QK,errMsg } from "@/features/regulatory-reports/bcra-reports.rules";

export function ParametersEntityCard() {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: [...QK, "parametros"], queryFn: readParametersBcra });
  const [cuit, setCuit] = useState<string | null>(null);
  const [cbu, setCbu] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const vCuit = cuit ?? q.data?.bcra_cuit_entidad ?? "";
  const vCbu = cbu ?? q.data?.bcra_cbu_cuenta_vista ?? "";
  const changes =
    (cuit !== null && cuit !== (q.data?.bcra_cuit_entidad ?? "")) ||
    (cbu !== null && cbu !== (q.data?.bcra_cbu_cuenta_vista ?? ""));
  const inputCls =
    "w-full h-9 rounded-md border border-input bg-card px-3 text-sm font-mono outline-none focus:ring-2 focus:ring-ring/40";

  const save = async () => {
    if (!/^\d{11}$/.test(vCuit)) {
      toast.error("El CUIT debe tener 11 dígitos, sin guiones.");
      return;
    }
    setSaving(true);
    try {
      if (cuit !== null) await saveParameterBcra("bcra_cuit_entidad", vCuit);
      if (cbu !== null) await saveParameterBcra("bcra_cbu_cuenta_vista", vCbu.trim());
      toast.success("Parámetros guardados.");
      setCuit(null);
      setCbu(null);
      await queryClient.invalidateQueries({ queryKey: [...QK, "parametros"] });
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Datos de la entidad
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_auto] gap-3 items-end">
        <div>
          <label className="text-xs font-semibold mb-1.5 block">
            CUIT de la entidad (nombre del paquete)
          </label>
          <input
            className={inputCls}
            value={vCuit}
            onChange={(e) => setCuit(e.target.value.replace(/\D/g, ""))}
            maxLength={11}
          />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1.5 block">
            CBU de la cuenta a la vista (Apartado A, bloque 20000dd)
          </label>
          <input
            className={inputCls}
            value={vCbu}
            onChange={(e) => setCbu(e.target.value)}
            placeholder="Sin cargar"
          />
        </div>
        <BtnPrimary onClick={() => void save()} disabled={!changes || saving}>
          {saving ? "Guardando…" : "Guardar"}
        </BtnPrimary>
      </div>
    </Card>
  );
}
