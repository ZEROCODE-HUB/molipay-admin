import { type StatusBatch } from "@/infrastructure/supabase/legacy/types";
import { Search } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Input, Label } from "@/shared/ui/form-controls";

import type { BatchesPageVm } from "./use-batches-page";

export function BatchesFilters({
  search,
  setSearch,
  setPage,
  statusFilter,
  setStatusFilter,
  brandFilter,
  setBrandFilter,
  optionsBrand,
  merchantFilter,
  setMerchantFilter,
  merchantsOptions,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
}: Pick<
  BatchesPageVm,
  | "search"
  | "setSearch"
  | "setPage"
  | "statusFilter"
  | "setStatusFilter"
  | "brandFilter"
  | "setBrandFilter"
  | "optionsBrand"
  | "merchantFilter"
  | "setMerchantFilter"
  | "merchantsOptions"
  | "dateFrom"
  | "setDateFrom"
  | "dateTo"
  | "setDateTo"
>) {
  return (
    <Card className="p-4 mb-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <Label>Buscar</Label>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Código, comercio, legajo o CUIT…"
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>
        <div>
          <Label>Estado</Label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusBatch | "");
              setPage(0);
            }}
            className="w-full sm:min-w-[130px] h-8 px-2 rounded-md border bg-background text-xs"
          >
            <option value="">Todos</option>
            <option value="Programado">Programado</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Acreditado">Acreditado</option>
          </select>
        </div>
        <div>
          <Label>Bandera</Label>
          <select
            value={brandFilter}
            onChange={(e) => {
              setBrandFilter(e.target.value);
              setPage(0);
            }}
            className="w-full sm:min-w-[130px] h-8 px-2 rounded-md border bg-background text-xs"
          >
            <option value="">Todas</option>
            {optionsBrand.length > 0
              ? optionsBrand.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))
              : // Fallback por si el catálogo no responde
                ["Visa", "Mastercard", "Amex", "Cabal", "Diners"].map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
          </select>
        </div>
        <div>
          <Label>Comercio</Label>
          <select
            value={merchantFilter}
            onChange={(e) => {
              setMerchantFilter(e.target.value);
              setPage(0);
            }}
            className="w-full sm:min-w-[180px] h-8 px-2 rounded-md border bg-background text-xs"
          >
            <option value="">Todos</option>
            {merchantsOptions.map(
              (c: import("@/infrastructure/supabase/legacy/types").Merchant) => (
                <option key={c.id} value={c.id}>
                  {c.nombreComercio ?? c.usuario} · {c.legajo}
                </option>
              ),
            )}
          </select>
        </div>
        <div>
          <Label>Desde</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(0);
            }}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label>Hasta</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(0);
            }}
            className="h-8 text-xs"
          />
        </div>
      </div>
    </Card>
  );
}
