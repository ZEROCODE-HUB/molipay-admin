import { createFileRoute } from "@tanstack/react-router";
import { SetPasswordPage } from "@/features/auth/components/set-password-page";

export const Route = createFileRoute("/definir-clave")({
  head: () => ({
    meta: [
      { title: "Definí tu contraseña — Moli" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SetPasswordPage,
});
