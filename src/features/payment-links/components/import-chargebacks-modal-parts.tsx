import { type ImportRowResult } from "@/features/payment-links/chargebacks-import.supabase";
import { AlertCircle, AlertTriangle, CheckCircle2, Copy } from "lucide-react";

export function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "neutral" | "warn" | "danger";
}) {
  const colors: Record<typeof tone, string> = {
    success: "text-emerald-700 bg-emerald-50 border-emerald-200",
    neutral: "text-slate-700 bg-slate-50 border-slate-200",
    warn: "text-amber-700 bg-amber-50 border-amber-200",
    danger: "text-red-700 bg-red-50 border-red-200",
  };
  return (
    <div className={`rounded-lg border px-3 py-2 ${colors[tone]}`}>
      <div className="text-xs">{label}</div>
      <div className="font-mono text-xl font-semibold">{value}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: ImportRowResult["status"] }) {
  const map = {
    ok: { icon: CheckCircle2, color: "text-emerald-600", label: "ok" },
    duplicate: { icon: Copy, color: "text-slate-600", label: "duplicado" },
    unmatched: { icon: AlertTriangle, color: "text-amber-600", label: "sin match" },
    error: { icon: AlertCircle, color: "text-red-600", label: "error" },
  } as const;
  const s = map[status];
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 ${s.color}`}>
      <Icon size={12} /> {s.label}
    </span>
  );
}
