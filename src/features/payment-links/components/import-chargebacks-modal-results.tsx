import { type ImportRowResult } from "@/features/payment-links/chargebacks-import.supabase";
import { StatusBadge,SummaryCard } from "./import-chargebacks-modal-parts";

export function Results({
  summary,
  results,
}: {
  summary: { ok: number; duplicate: number; unmatched: number; errors: number };
  results: ImportRowResult[];
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        <SummaryCard label="Importados" value={summary.ok} tone="success" />
        <SummaryCard label="Duplicados" value={summary.duplicate} tone="neutral" />
        <SummaryCard label="Sin match" value={summary.unmatched} tone="warn" />
        <SummaryCard label="Con error" value={summary.errors} tone="danger" />
      </div>

      <div className="rounded-lg border overflow-x-auto max-h-[40vh]">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 sticky top-0">
            <tr>
              <th className="text-left px-2 py-1.5">TID</th>
              <th className="text-left px-2 py-1.5">Comercio</th>
              <th className="text-left px-2 py-1.5">Estado</th>
              <th className="text-left px-2 py-1.5">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="px-2 py-1.5 font-mono">{r.parsed.idTransaccion ?? "—"}</td>
                <td className="px-2 py-1.5">{r.comercioNombre ?? "—"}</td>
                <td className="px-2 py-1.5">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-2 py-1.5 text-muted-foreground">{r.message ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
