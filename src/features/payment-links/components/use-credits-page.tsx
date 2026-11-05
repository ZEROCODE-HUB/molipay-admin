import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { todayIso } from "@/features/payment-links/components/credits-common";
import { route } from "@/features/payment-links/credits.rules";

/** Estado y acciones de CreditsPage: el componente solo dibuja. */
export function useCreditsPage() {
  const search = route.useSearch();
  const navigate = useNavigate({ from: "/admin/comercios/link-pago/acreditaciones" });
  const [from, setFrom] = useState(todayIso(-30));
  const [to, setTo] = useState(todayIso(15));

  const irA = (s: { fecha?: string; comercio?: string }) => void navigate({ search: s });
  return { search, from, setFrom, to, setTo, irA };
}

export type CreditsPageVm = ReturnType<typeof useCreditsPage>;
