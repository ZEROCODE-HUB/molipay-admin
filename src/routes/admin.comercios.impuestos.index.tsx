import { createFileRoute } from "@tanstack/react-router";
import { TaxesPage } from "@/features/taxes/components/taxes-page";

export const Route = createFileRoute("/admin/comercios/impuestos/")({
  component: TaxesPage,
  head: () => ({
    meta: [{ title: "Impuestos — Admin — Moli" }],
  }),
});
