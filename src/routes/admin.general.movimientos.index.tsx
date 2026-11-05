import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { MovementsPage } from "@/features/movements/components/movements-page";

export const Route = createFileRoute("/admin/general/movimientos/")({
  validateSearch: z.object({ legajo: z.string().optional(), txid: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Todos los movimientos — Movimientos — Admin Molly" },
      {
        name: "description",
        content: "Movimientos por concepto (ingreso, comisión, impuesto) desde el ledger.",
      },
    ],
  }),
  component: MovementsPage,
});
