import { createFileRoute } from "@tanstack/react-router";
import { DebitsCreditsPage } from "@/features/taxes/components/debits-credits-page";

export const Route = createFileRoute("/admin/comercios/impuestos/debitos-creditos")({
  head: () => ({ meta: [{ title: "Exenciones impositivas — Admin — Moli" }] }),
  component: DebitsCreditsPage,
});
