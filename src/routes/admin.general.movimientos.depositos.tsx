import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { PermissionGuard } from "@/components/permission-guard";
import { MovimientosLineasTable } from "@/components/movimientos/movimientos-lineas-table";

export const Route = createFileRoute("/admin/general/movimientos/depositos")({
  head: () => ({
    meta: [
      { title: "Depósitos — Movimientos — Admin Molly" },
      { name: "description", content: "Depósitos realizados en la plataforma Moli." },
    ],
  }),
  component: () => (
    <PermissionGuard recurso="movimientos">
      <PageHeader
        title="Depósitos"
        description="Depósitos entrantes, una fila por concepto (ingreso, comisión, impuesto). Las líneas de un mismo depósito comparten el TXID."
      />
      <MovimientosLineasTable tiposOperacion={["deposito"]} />
    </PermissionGuard>
  ),
});
