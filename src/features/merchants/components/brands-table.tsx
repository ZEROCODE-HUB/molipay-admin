import { ErrorNotice } from "@/shared/ui/error-notice";
import { BtnOutline } from "@/shared/ui/button";
import { Edit3,Trash2 } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { formatPct } from "@/features/merchants/merchants.rules";

import type { BrandsSectionVm } from "./use-brands-section";

export function BrandsTable({
  loading,
  error,
  load,
  brands,
  loadInstallments,
  openEdit,
  setConfirmDelete,
}: Pick<
  BrandsSectionVm,
  "loading" | "error" | "load" | "brands" | "loadInstallments" | "openEdit" | "setConfirmDelete"
>) {
  return (
    <>
      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Cargando banderas…</div>
      ) : error ? (
        <ErrorNotice icon={false}>
          <span>{error}</span>
          <BtnOutline type="button" onClick={load} className="h-7 text-xs">
            Reintentar
          </BtnOutline>
        </ErrorNotice>
      ) : brands.length === 0 ? (
        <div className="border border-dashed rounded-lg py-8 text-center text-sm text-muted-foreground">
          Sin banderas habilitadas para este comercio.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-3 py-2.5 font-display font-semibold text-foreground">Bandera</th>
                <th className="px-3 py-2.5 font-display font-semibold text-foreground">Método</th>
                <th className="px-3 py-2.5 font-display font-semibold text-foreground text-right">
                  % Comisión MoliPay
                </th>
                <th className="px-3 py-2.5 font-display font-semibold text-foreground text-right">
                  % Comisión PayWay
                </th>
                <th className="px-3 py-2.5 font-display font-semibold text-foreground text-right">
                  % Neto
                </th>
                <th className="px-3 py-2.5 font-display font-semibold text-foreground">Estado</th>
                <th className="px-3 py-2.5 font-display font-semibold text-foreground text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <tr key={b.id} className="border-b last:border-0">
                  <td className="px-3 py-2.5 font-medium">{b.bandera}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                    {b.metodoKey || "-"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {formatPct(b.comisionMolipay)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {formatPct(b.comisionPayway)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums font-semibold">
                    {formatPct(b.comisionNeta)}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone={b.estado === "Activo" ? "success" : "neutral"}>{b.estado}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => loadInstallments(b)}
                        className="h-7 px-2 rounded-md border bg-card text-xs hover:bg-accent inline-flex items-center gap-1"
                      >
                        Cuotas
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(b)}
                        className="h-7 px-2 rounded-md border bg-card text-xs hover:bg-accent inline-flex items-center gap-1"
                      >
                        <Edit3 size={12} /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(b)}
                        className="h-7 px-2 rounded-md border border-red-200 text-red-600 bg-card text-xs hover:bg-red-50 inline-flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Eliminar
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
