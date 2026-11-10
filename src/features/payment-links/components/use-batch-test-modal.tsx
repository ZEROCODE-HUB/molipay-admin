import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { userMessage } from "@/shared/lib/errors";
import { listTestBrands, listTestMerchants } from "@/features/payment-links/batch-test.supabase";
import {
  newTestContext,
  TEST_STEPS,
  type TestRow,
} from "@/features/payment-links/batch-test.runner";

export type TestStepStatus = "pending" | "running" | "ok" | "failed";
export type TestStepView = {
  id: string;
  title: string;
  status: TestStepStatus;
  rows: TestRow[];
  error: string | null;
};

const initialSteps = (): TestStepView[] =>
  TEST_STEPS.map((s) => ({ id: s.id, title: s.title, status: "pending", rows: [], error: null }));

/** Estado de la prueba de punta a punta: corre los pasos en orden y frena en el primer fallo. */
export function useBatchTestModal() {
  const queryClient = useQueryClient();
  const [merchantId, setMerchantId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [monto, setMonto] = useState("1050");
  const [steps, setSteps] = useState<TestStepView[]>(initialSteps);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");

  const merchantsQ = useQuery({ queryKey: ["lote-prueba-comercios"], queryFn: listTestMerchants });
  const brandsQ = useQuery({
    queryKey: ["lote-prueba-banderas", merchantId],
    queryFn: () => listTestBrands(merchantId),
    enabled: !!merchantId,
  });

  const merchant = merchantsQ.data?.find((m) => m.id === merchantId);
  const brand = brandsQ.data?.find((b) => b.id === brandId);
  const amount = Number(monto);
  const canStart =
    phase !== "running" &&
    !!merchant &&
    !!brand &&
    amount > 0 &&
    Math.round(amount * 100) / 100 === amount;

  const patch = (id: string, change: Partial<TestStepView>) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...change } : s)));

  const start = async () => {
    if (!merchant || !brand || !canStart) return;
    setSteps(initialSteps());
    setPhase("running");
    const ctx = newTestContext({ merchant, brand, monto: amount });
    for (const step of TEST_STEPS) {
      patch(step.id, { status: "running" });
      try {
        const rows = await step.run(ctx);
        patch(step.id, { status: "ok", rows });
      } catch (e) {
        patch(step.id, { status: "failed", error: userMessage(e) });
        break;
      }
    }
    setPhase("done");
    void queryClient.invalidateQueries({ queryKey: ["lotes"] });
  };

  const finished = steps.filter((s) => s.status === "ok").length;
  return {
    merchants: merchantsQ.data ?? [],
    brands: brandsQ.data ?? [],
    merchantId,
    setMerchantId: (id: string) => {
      setMerchantId(id);
      setBrandId("");
    },
    brandId,
    setBrandId,
    monto,
    setMonto,
    steps,
    phase,
    canStart,
    start,
    progress: Math.round((finished / steps.length) * 100),
    failed: steps.some((s) => s.status === "failed"),
  };
}
