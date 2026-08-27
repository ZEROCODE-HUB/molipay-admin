import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/comercios/codigos/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/comercios/codigos/categoria" });
  },
});
