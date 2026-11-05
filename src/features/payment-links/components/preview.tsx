import { type ParsedPaywayFile } from "@/features/payment-links/importers/payway-chargebacks";
import { AlertCircle,CheckCircle2,Info } from "lucide-react";

export function Preview({ parsed }: { parsed: ParsedPaywayFile }) {
  const preview = parsed.rows.slice(0, 10);
  return (
    <div className="space-y-3">
      <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs flex items-start gap-2">
        <Info size={14} className="text-blue-600 mt-0.5 shrink-0" />
        <div>
          <strong>Vista previa</strong> ({parsed.totalRows} fila(s) en total). Se importarán sólo
          las que matcheen con un pago existente.
          {parsed.unresolvedHeaders.length > 0 && (
            <p className="mt-1 text-amber-700">
              ⚠ Headers no reconocidos: {parsed.unresolvedHeaders.join(", ")}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left px-2 py-1.5">#</th>
              <th className="text-left px-2 py-1.5">TID</th>
              <th className="text-left px-2 py-1.5">Fecha</th>
              <th className="text-left px-2 py-1.5">Tarjeta</th>
              <th className="text-right px-2 py-1.5">Monto</th>
              <th className="text-left px-2 py-1.5">Motivo</th>
              <th className="text-left px-2 py-1.5">Estado</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((r, i) => {
              const hasErr = r.errors.length > 0;
              return (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                  <td className="px-2 py-1.5 font-mono">{r.parsed.idTransaccion ?? "—"}</td>
                  <td className="px-2 py-1.5 font-mono">{r.parsed.fechaTransaccion ?? "—"}</td>
                  <td className="px-2 py-1.5 font-mono">{r.parsed.nroTarjeta ?? "—"}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{r.parsed.monto ?? "—"}</td>
                  <td className="px-2 py-1.5">{r.parsed.ccoMotivo ?? "—"}</td>
                  <td className="px-2 py-1.5">
                    {hasErr ? (
                      <span className="inline-flex items-center gap-1 text-red-600">
                        <AlertCircle size={12} /> error
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 size={12} /> ok
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {parsed.totalRows > preview.length && (
        <p className="text-xs text-muted-foreground text-center">
          …y {parsed.totalRows - preview.length} fila(s) más.
        </p>
      )}

      {parsed.rows.some((r) => r.errors.length > 0) && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          Hay {parsed.rows.filter((r) => r.errors.length > 0).length} fila(s) con errores de parseo.
          Se omitirán al importar.
        </div>
      )}
    </div>
  );
}
