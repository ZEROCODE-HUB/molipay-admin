import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/features/auth/components/login-page";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Panel de Administración — Moli" },
      { name: "description", content: "Panel de administración de la plataforma Moli." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LoginPage,
});
