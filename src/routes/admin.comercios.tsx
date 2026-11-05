import { createFileRoute,Outlet } from "@tanstack/react-router";
import { MerchantsProvider } from "@/features/merchants/merchants-context";

export const Route = createFileRoute("/admin/comercios")({
  component: MerchantsLayout,
  head: () => ({
    meta: [
      { title: "Comercios — Admin — Moli" },
      { name: "description", content: "Gestión de comercios de la plataforma Molly." },
    ],
  }),
});

function MerchantsLayout() {
  return (
    <MerchantsProvider>
      <Outlet />
    </MerchantsProvider>
  );
}
