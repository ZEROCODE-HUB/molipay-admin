import { type SubaccountKind } from "@/features/customers/subaccounts.supabase";
import { Coins,ShieldCheck,Wallet } from "lucide-react";

export const PAGE_SIZES = [10, 20, 50];

/**
 * Mapea el `subcuentas.tipo` (4 valores oficiales: Operativa | Recaudacion | Garantias | Sueldos)
 * a un badge con color e ícono. Etiqueta y "kind" se usan también en el dropdown del modal.
 */
export const KIND_SUBACCOUNT_META: Record<SubaccountKind, { label: string; icon: typeof Wallet }> =
  {
    Operativa: { label: "Operativa", icon: Wallet },
    Recaudacion: { label: "Recaudación", icon: Coins },
    Garantias: { label: "Garantías", icon: ShieldCheck },
    Sueldos: { label: "Sueldos", icon: Wallet },
  };
