import { createFileRoute } from "@tanstack/react-router";
import { ImpuestosBanner, MovimientosSubRoute } from "@/components/movimientos-subroute";

export const Route = createFileRoute("/admin/general/movimientos/impuestos")({
  head: () => ({
    meta: [
      { title: "Impuestos cobrados — Movimientos — Admin Molly" },
      { name: "description", content: "Impuestos cobrados a través de la plataforma Moli." },
    ],
  }),
  component: ImpuestosPage,
});

function ImpuestosPage() {
  return (
    <>
      <ImpuestosBanner />
      <MovimientosSubRoute
        titulo="Impuestos cobrados"
        descripcion="Retenciones impositivas al cliente registradas en la columna impuesto de cada movimiento (todos los tipos)."
        soloConImpuesto
      />
    </>
  );
}
