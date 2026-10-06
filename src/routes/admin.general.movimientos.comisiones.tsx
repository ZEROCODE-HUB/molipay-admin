import { createFileRoute } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { MovimientosSubRoute } from "@/components/movimientos-subroute";

export const Route = createFileRoute("/admin/general/movimientos/comisiones")({
  head: () => ({
    meta: [
      { title: "Cobro de comisiones — Movimientos — Admin Molly" },
      { name: "description", content: "Comisiones cobradas por la plataforma Moli." },
    ],
  }),
  component: ComisionesPage,
});

function ComisionesPage() {
  return (
    <>
      <div className="flex items-start gap-2 rounded-lg border border-muted bg-muted/30 px-4 py-3 text-sm text-muted-foreground mb-4">
        <Info size={16} className="shrink-0 mt-0.5" />
        <p>
          Vista transversal: movimientos de <strong>todos los tipos</strong> con comisión cobrada
          (columna <strong>comision</strong> de la tabla). La modalidad (Porcentaje/Fijo) del mock
          es configuración arancelaria (<em>comisiones_cliente</em>) y no se muestra por movimiento;
          el IVA sobre la comisión corresponde a la columna <strong>impuesto</strong>.
        </p>
      </div>
      <MovimientosSubRoute
        titulo="Cobro de comisiones"
        descripcion="Comisiones debitadas a clientes por operaciones, con desglose real Comisión / IVA / Monto cobrado."
        soloConComision
      />
    </>
  );
}
