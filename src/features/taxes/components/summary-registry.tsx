import { type RegistryIibb } from "@/features/taxes/iibb-registry.supabase";
import { KpiCard } from "@/shared/ui/kpi-card";
import { AlertTriangle } from "lucide-react";
import { date,n,pct } from "@/features/taxes/iibb-registry.rules";
import { RegistryEntriesTable } from "./registry-entries-table";

// ---------------------------------------------------------------------------
// Resumen del borrador (preview)
// ---------------------------------------------------------------------------

export function SummaryRegistry({ p }: { p: RegistryIibb }) {
  const k = p.kpis;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Período"
          value={p.periodo ?? "—"}
          sub={`Vigencia ${date(p.vigenciaDesde)} – ${date(p.vigenciaHasta)}`}
        />
        <KpiCard
          label="CUITs válidos"
          value={n(p.filasValidas)}
          sub={`${n(p.filasLeidas)} filas leídas`}
        />
        <KpiCard
          label="Filas con error"
          value={n(p.filasError)}
          sub={`${n(p.filasDuplicadas)} duplicadas (gana la mayor alícuota)`}
        />
        <KpiCard
          label="Con alícuota > 0"
          value={n(k?.con_alicuota)}
          sub={`${n(k?.exentos)} marcados exentos`}
        />
      </div>
      {k && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="Clientes en el padrón"
            value={n(k.clientes_en_padron)}
            sub={`de ${n(k.clientes_con_cuit)} con CUIT válido`}
          />
          <KpiCard
            label="Clientes con retención"
            value={n(k.clientes_con_retencion)}
            sub="alícuota de retención > 0"
          />
          <KpiCard
            label="Fuera del padrón"
            value={n(k.clientes_fuera_padron)}
            sub="se les aplicará 0%"
          />
          <KpiCard
            label="Cambian de alícuota"
            value={k.padron_anterior_id ? n(k.clientes_con_cambio) : "—"}
            sub={
              k.padron_anterior_nombre
                ? `vs. ${k.padron_anterior_nombre}`
                : "sin padrón anterior para comparar"
            }
          />
        </div>
      )}
      {k && k.clientes_sin_cuit_valido > 0 && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 flex items-start gap-1.5">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {n(k.clientes_sin_cuit_valido)} clientes no tienen un CUIT de 11 dígitos cargado: no se
          pueden cruzar con el padrón.
        </p>
      )}
      {k && k.cambios.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Clientes con cambio de alícuota ({n(k.clientes_con_cambio)}
            {k.clientes_con_cambio > k.cambios.length ? `, se muestran ${k.cambios.length}` : ""})
          </h4>
          <div className="max-h-56 overflow-y-auto border rounded-lg">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/60 border-b text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">CUIT</th>
                  <th className="px-3 py-2 font-medium text-right">Anterior</th>
                  <th className="px-3 py-2 font-medium text-right">Nueva</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {k.cambios.map((c) => (
                  <tr key={c.legajo}>
                    <td className="px-3 py-1.5">
                      <div className="font-medium truncate max-w-[220px]">{c.nombre}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{c.legajo}</div>
                    </td>
                    <td className="px-3 py-1.5 font-mono">{c.cuit}</td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {c.anterior == null ? "No figuraba" : pct(c.anterior)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {c.nueva == null ? "No figura" : pct(c.nueva)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {p.filasValidas > 0 && <RegistryEntriesTable registryId={p.id} />}
    </div>
  );
}
