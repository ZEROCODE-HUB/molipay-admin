import { FileArchive,Loader2,Search,Wand2 } from "lucide-react";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { cortoPeriod,labelPeriod } from "@/features/regulatory-reports/bcra-reports.rules";

import type { FilingsTabVm } from "./use-filings-tab";

export function FilingsFilters({
  month,
  periods,
  setMonth,
  applySearch,
  filter,
  setFilter,
  generateFaltantes,
  monthAnterior,
  busy,
  presQ,
  faltantesAnterior,
  pedirPackage,
}: Pick<
  FilingsTabVm,
  | "month"
  | "periods"
  | "setMonth"
  | "applySearch"
  | "filter"
  | "setFilter"
  | "generateFaltantes"
  | "monthAnterior"
  | "busy"
  | "presQ"
  | "faltantesAnterior"
  | "pedirPackage"
>) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="bsra-fecha" className="text-xs font-semibold mb-1.5 block">
            Fecha
          </label>
          <input
            id="bsra-fecha"
            type="month"
            value={month}
            max={periods[0].slice(0, 7)}
            onChange={(e) => setMonth(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>
        <BtnOutline className="h-9 text-xs px-3" onClick={applySearch}>
          <Search size={14} /> Buscar
        </BtnOutline>
        {filter && (
          <button
            type="button"
            onClick={() => setFilter(null)}
            className="h-9 text-xs font-semibold text-primary underline underline-offset-2"
          >
            Ver últimos 12 meses
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <BtnOutline
          className="h-9 text-xs px-3"
          onClick={() => void generateFaltantes(monthAnterior)}
          disabled={busy !== null || presQ.isLoading || filter !== null || faltantesAnterior === 0}
          title={`Genera lo que falte de ${labelPeriod(monthAnterior)}`}
        >
          {busy === "faltantes" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Wand2 size={14} />
          )}{" "}
          Generar faltantes del mes anterior
        </BtnOutline>
        <BtnPrimary
          className="h-9 text-xs px-3"
          onClick={() => pedirPackage(filter ?? monthAnterior)}
          disabled={busy !== null || presQ.isLoading}
          title={`Paquete ZIP de ${labelPeriod(filter ?? monthAnterior)}`}
        >
          <FileArchive size={14} /> Descargar paquete {cortoPeriod(filter ?? monthAnterior)}
        </BtnPrimary>
      </div>
    </div>
  );
}
