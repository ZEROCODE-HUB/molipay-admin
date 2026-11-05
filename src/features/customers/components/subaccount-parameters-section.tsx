import { Trash2 } from "lucide-react";

import type { SubaccountsTabVm } from "./use-subaccounts-tab";

export function SubaccountParametersSection({
  config,
  actualizarParam,
  quitarParam,
  addParam,
  actualizarFee,
  quitarFee,
  addFee,
}: Pick<
  SubaccountsTabVm,
  | "config"
  | "actualizarParam"
  | "quitarParam"
  | "addParam"
  | "actualizarFee"
  | "quitarFee"
  | "addFee"
>) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border p-4">
        <h4 className="mb-2 text-sm font-semibold">Parámetros de alerta</h4>
        {config.alertas.map((p, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <input
              className="flex-1 rounded-md border border-input px-2 py-1.5 text-sm"
              value={p.label}
              onChange={(e) => actualizarParam("alertas", i, { label: e.target.value })}
            />
            <input
              className="flex-1 rounded-md border border-input px-2 py-1.5 text-sm"
              value={p.valor}
              placeholder="Valor"
              onChange={(e) => actualizarParam("alertas", i, { valor: e.target.value })}
            />
            <button
              type="button"
              onClick={() => quitarParam("alertas", i)}
              className="px-2 text-red-600 hover:bg-red-50 rounded-md"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addParam("alertas")}
          className="text-sm text-primary hover:underline"
        >
          + Agregar parámetro
        </button>
      </div>

      <div className="rounded-lg border border-border p-4">
        <h4 className="mb-2 text-sm font-semibold">Parámetros de bloqueo</h4>
        {config.bloqueos.map((p, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <input
              className="flex-1 rounded-md border border-input px-2 py-1.5 text-sm"
              value={p.label}
              onChange={(e) => actualizarParam("bloqueos", i, { label: e.target.value })}
            />
            <input
              className="flex-1 rounded-md border border-input px-2 py-1.5 text-sm"
              value={p.valor}
              placeholder="Valor"
              onChange={(e) => actualizarParam("bloqueos", i, { valor: e.target.value })}
            />
            <button
              type="button"
              onClick={() => quitarParam("bloqueos", i)}
              className="px-2 text-red-600 hover:bg-red-50 rounded-md"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addParam("bloqueos")}
          className="text-sm text-primary hover:underline"
        >
          + Agregar parámetro
        </button>
      </div>

      <div className="rounded-lg border border-border p-4">
        <h4 className="mb-2 text-sm font-semibold">Comisiones</h4>
        {config.comisiones.length === 0 && (
          <p className="mb-2 text-xs text-muted-foreground">Sin comisiones configuradas.</p>
        )}
        {config.comisiones.map((c, i) => (
          <div key={c.id} className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <input
              className="rounded-md border border-input px-2 py-1.5 text-sm"
              value={c.tipo}
              placeholder="Tipo"
              onChange={(e) => actualizarFee(i, { tipo: e.target.value })}
            />
            <input
              className="rounded-md border border-input px-2 py-1.5 text-sm"
              value={c.monto}
              placeholder="Monto"
              onChange={(e) => actualizarFee(i, { monto: e.target.value })}
            />
            <input
              className="rounded-md border border-input px-2 py-1.5 text-sm"
              value={c.fecha}
              placeholder="Fecha"
              onChange={(e) => actualizarFee(i, { fecha: e.target.value })}
            />
            <div className="flex gap-1">
              <input
                className="flex-1 rounded-md border border-input px-2 py-1.5 text-sm"
                value={c.origen}
                placeholder="Origen"
                onChange={(e) => actualizarFee(i, { origen: e.target.value })}
              />
              <button
                type="button"
                onClick={() => quitarFee(i)}
                className="px-2 text-red-600 hover:bg-red-50 rounded-md"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addFee} className="text-sm text-primary hover:underline">
          + Agregar comisión
        </button>
      </div>
    </div>
  );
}
