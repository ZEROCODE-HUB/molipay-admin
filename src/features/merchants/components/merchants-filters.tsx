import {
LEVELS_MERCHANT,
STATUSES_MERCHANT,
type LevelMerchant,
type StatusMerchant,
} from "@/infrastructure/supabase/legacy/types";
import { BtnOutline } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input,Label,Select } from "@/shared/ui/form-controls";

import type { MerchantsPageVm } from "./use-merchants-page";

export function MerchantsFilters({
  searchInput,
  setSearchInput,
  setPage,
  statusFilter,
  setStatusFilter,
  levelFilter,
  setLevelFilter,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
}: Pick<
  MerchantsPageVm,
  | "searchInput"
  | "setSearchInput"
  | "setPage"
  | "statusFilter"
  | "setStatusFilter"
  | "levelFilter"
  | "setLevelFilter"
  | "dateFrom"
  | "setDateFrom"
  | "dateTo"
  | "setDateTo"
>) {
  return (
    <Card className="p-4 mb-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="buscar">Buscar</Label>
          <Input
            id="buscar"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(0);
            }}
            placeholder="Usuario (email) o legajo…"
          />
        </div>
        <div>
          <Label htmlFor="f-estado">Estado</Label>
          <Select
            id="f-estado"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusMerchant | "");
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            {STATUSES_MERCHANT.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="f-nivel">Nivel</Label>
          <Select
            id="f-nivel"
            value={levelFilter}
            onChange={(e) => {
              setLevelFilter(e.target.value as LevelMerchant | "");
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            {LEVELS_MERCHANT.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="f-desde">Fecha desde</Label>
          <Input
            id="f-desde"
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(0);
            }}
            className="h-10"
          />
        </div>
        <div>
          <Label htmlFor="f-hasta">Fecha hasta</Label>
          <Input
            id="f-hasta"
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(0);
            }}
            className="h-10"
          />
        </div>
        {(dateFrom || dateTo || statusFilter || levelFilter || searchInput) && (
          <BtnOutline
            type="button"
            onClick={() => {
              setSearchInput("");
              setStatusFilter("");
              setLevelFilter("");
              setDateFrom("");
              setDateTo("");
              setPage(0);
            }}
          >
            Limpiar filtros
          </BtnOutline>
        )}
      </div>
    </Card>
  );
}
