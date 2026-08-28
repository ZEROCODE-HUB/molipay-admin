import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/comercios/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/comercios/gestion" });
  },
});
