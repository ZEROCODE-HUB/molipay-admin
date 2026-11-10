import { CheckCircle2, Store, XCircle } from "lucide-react";
import { BtnOutline } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { DataTable } from "@/shared/ui/data-table";
import { errMsg } from "@/features/payment-links/components/credits-common";
import { esAccionable } from "@/features/payment-links/exceptions.rules";
import type { ExceptionsPageVm } from "./use-exceptions-page";

export function ExceptionsList({
  q,
  columns,
  rows,
  rowKey,
  puede,
  sel,
  toggle,
  toggleAll,
  status,
  setStatus,
  setSel,
  kind,
  setKind,
  open,
}: Pick<
  ExceptionsPageVm,
  | "q"
  | "columns"
  | "rows"
  | "rowKey"
  | "puede"
  | "sel"
  | "toggle"
  | "toggleAll"
  | "status"
  | "setStatus"
  | "setSel"
  | "kind"
  | "setKind"
  | "open"
>) {
  return (
    <>
      {q.isError ? (
        <Card className="text-sm text-red-700">{errMsg(q.error)}</Card>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          keyExtractor={rowKey}
          loading={q.isLoading}
          pageSize={20}
          showDownloadButton={false}
          selection={
            puede ? { selected: sel, onToggle: toggle, onToggleAll: toggleAll } : undefined
          }
          emptyMessage="No hay excepciones con este filtro."
          extraFilters={
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as typeof status);
                  setSel(new Set());
                }}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="abierta">Abiertas</option>
                <option value="resuelta">Resueltas</option>
                <option value="descartada">Descartadas</option>
                <option value="todas">Todas</option>
              </select>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">Todos los tipos</option>
                <option value="excepcion_sin_establecimiento">Establecimiento sin comercio</option>
                <option value="excepcion_comercio_inactivo">Comercio inactivo</option>
                <option value="diferencia_ventas">Diferencia con ventas</option>
              </select>
            </div>
          }
          actions={(r) =>
            !puede || !esAccionable(r) ? null : (
              <div className="flex gap-1">
                {r.clase === "excepcion" ? (
                  <>
                    <BtnOutline
                      className="h-8 text-xs px-2"
                      onClick={() => open("asignar", [r.id])}
                    >
                      <Store size={13} /> Asignar
                    </BtnOutline>
                    <BtnOutline
                      className="h-8 text-xs px-2"
                      onClick={() => open("no_corresponde", [r.id])}
                    >
                      <XCircle size={13} /> No corresponde
                    </BtnOutline>
                  </>
                ) : (
                  <BtnOutline className="h-8 text-xs px-2" onClick={() => open("aceptar", [r.id])}>
                    <CheckCircle2 size={13} /> Aceptar diferencia
                  </BtnOutline>
                )}
              </div>
            )
          }
        />
      )}
    </>
  );
}
