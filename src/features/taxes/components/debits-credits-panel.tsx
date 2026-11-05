import {
SITUACIONES_EXEMPTION,
type AddressExemption,
type SituacionExemption,
} from "@/features/taxes/exemptions.supabase";
import { Download,Loader2 } from "lucide-react";
import { BtnOutline } from "@/shared/ui/button";
import { Input,Label } from "@/shared/ui/form-controls";
import { selectCls } from "@/features/taxes/taxes.rules";

import type { DebitsCreditsPageVm } from "./use-debits-credits-page";

export function DebitsCreditsPanel({
  cuitInput,
  setCuitInput,
  taxId,
  setTaxId,
  taxes,
  address,
  setAddress,
  status,
  setStatus,
  hayFilters,
  exportar,
  exporting,
  total,
}: Pick<
  DebitsCreditsPageVm,
  | "cuitInput"
  | "setCuitInput"
  | "taxId"
  | "setTaxId"
  | "taxes"
  | "address"
  | "setAddress"
  | "status"
  | "setStatus"
  | "hayFilters"
  | "exportar"
  | "exporting"
  | "total"
>) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="f-cuit">CUIT</Label>
        <Input
          id="f-cuit"
          inputMode="numeric"
          value={cuitInput}
          onChange={(e) => setCuitInput(e.target.value)}
          placeholder="CUIT o comienzo del CUIT…"
        />
      </div>
      <div className="min-w-[170px]">
        <Label htmlFor="f-impuesto">Impuesto</Label>
        <select
          id="f-impuesto"
          className={selectCls}
          value={taxId}
          onChange={(e) => setTaxId(e.target.value)}
        >
          <option value="">Todos los impuestos</option>
          {taxes.map((i) => (
            <option key={i.id} value={i.id}>
              {i.codigo}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[170px]">
        <Label htmlFor="f-direccion">Dirección</Label>
        <select
          id="f-direccion"
          className={selectCls}
          value={address}
          onChange={(e) => setAddress(e.target.value as AddressExemption | "")}
        >
          <option value="">Todas las direcciones</option>
          <option value="Entrantes">Entrantes</option>
          <option value="Salientes">Salientes</option>
        </select>
      </div>
      <div className="min-w-[170px]">
        <Label htmlFor="f-estado">Estado</Label>
        <select
          id="f-estado"
          className={selectCls}
          value={status}
          onChange={(e) => setStatus(e.target.value as SituacionExemption | "")}
        >
          <option value="">Todos los estados</option>
          {SITUACIONES_EXEMPTION.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {hayFilters && (
        <BtnOutline
          onClick={() => {
            setCuitInput("");
            setTaxId("");
            setAddress("");
            setStatus("");
          }}
        >
          Limpiar
        </BtnOutline>
      )}
      <BtnOutline onClick={exportar} disabled={exporting || total === 0}>
        {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}{" "}
        Exportar
      </BtnOutline>
    </div>
  );
}
