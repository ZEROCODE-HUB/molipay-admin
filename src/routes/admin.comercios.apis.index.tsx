import { createFileRoute } from "@tanstack/react-router";
import { CredentialsPage } from "@/features/external-apis/components/credentials-page";

export const Route = createFileRoute("/admin/comercios/apis/")({
  component: CredentialsPage,
  head: () => ({
    meta: [{ title: "APIs externas — Credenciales — Admin — Moli" }],
  }),
});
