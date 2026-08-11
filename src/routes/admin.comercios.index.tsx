import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/admin/comercios/")({
  component: RedirectToTransferencia,
});

function RedirectToTransferencia() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/admin/comercios/transferencia", replace: true });
  }, [navigate]);
  return null;
}