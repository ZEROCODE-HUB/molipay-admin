import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MovimientosSubRoute } from "@/components/movimientos-subroute";
import { Card, Input, Label } from "@/components/portal-shell";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/general/movimientos/pagos-qr")({
  head: () => ({
    meta: [
      { title: "Pagos QR — Movimientos — Admin Molly" },
      { name: "description", content: "Pagos con QR (PCT) procesados por la plataforma." },
    ],
  }),
  component: PagosQrPage,
});

function PagosQrPage() {
  const [comision, setComision] = useState("0.50");
  const [err, setErr] = useState<string | null>(null);

  const onChange = (v: string) => {
    if (v !== "" && !/^[0-9]*[.,]?[0-9]*$/.test(v)) return;
    setComision(v);
    if (v !== "") {
      const n = parseFloat(v.replace(",", "."));
      if (!isNaN(n) && n > 0.8) setErr("La comisión MoliPay para QR no puede superar el 0,8%");
      else setErr(null);
    } else setErr(null);
  };

  const guardar = () => {
    const n = parseFloat(comision.replace(",", "."));
    if (isNaN(n) || n < 0 || n > 0.8) {
      toast.error("Comisión inválida: debe ser entre 0 y 0,8%");
      return;
    }
    toast.success(`Comisión MoliPay QR guardada: ${n}%`);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Comisión MoliPay — Pago por QR</h4>
        <div className="flex items-end gap-3 max-w-sm">
          <div className="flex-1">
            <Label htmlFor="qr-comision">Comisión MoliPay (%)</Label>
            <Input id="qr-comision" value={comision} onChange={(e)=> onChange(e.target.value)} placeholder="0.50" className="h-9" inputMode="decimal" />
            <p className="text-[11px] text-muted-foreground mt-1">Máximo 0,8%. Se valida al guardar y al escribir.</p>
            {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
          </div>
          <button onClick={guardar} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold">Guardar</button>
        </div>
      </Card>
      <MovimientosSubRoute titulo="Pagos QR" descripcion="Movimientos de pago PCT (QR)." tipoCode="pago_pct" />
    </div>
  );
}
