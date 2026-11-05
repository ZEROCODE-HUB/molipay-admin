import {
saveItem,
type BcraItem,
type BcraItemParams,
type BcraRule,
} from "@/features/regulatory-reports/bcra.supabase";
import { useState } from "react";
import { AppError } from "@/shared/lib/errors";
import { toast } from "sonner";
import { FormDialog } from "@/shared/ui/form-dialog";
import { KINDS_OPERATION,RULES,errMsg } from "@/features/regulatory-reports/bcra-reports.rules";

export function ItemDialog({
  partida: item,
  onClose,
  onDone,
}: {
  partida: BcraItem;
  onClose: () => void;
  onDone: () => void;
}) {
  const [descripcion, setDescripcion] = useState(item.descripcion);
  const [rule, setRule] = useState<BcraRule>(item.regla);
  const [params, setParams] = useState<BcraItemParams>(item.params);
  const [method, setMethod] = useState(item.medioPago ?? "");
  const [esquema, setEsquema] = useState(item.esquema ?? "");
  const [activa, setActiva] = useState(item.activa);
  const [confirmada, setConfirmada] = useState(item.confirmada);
  const [sending, setSending] = useState(false);
  const inputCls =
    "w-full h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";
  const set = (patch: Partial<BcraItemParams>) => setParams((p) => ({ ...p, ...patch }));
  const toggleList = (key: "tipos" | "buckets", v: string) =>
    setParams((p) => {
      const current = p[key] ?? [];
      return {
        ...p,
        [key]: current.includes(v) ? current.filter((x) => x !== v) : [...current, v],
      };
    });

  const usaKinds = ["b_operaciones", "b_clientes", "b_cuentas", "i_internas"].includes(rule);
  const usaFilters = ["b_operaciones", "b_clientes", "b_cuentas"].includes(rule);
  const usaPerson = [
    "b_operaciones",
    "b_clientes",
    "b_cuentas",
    "b_clientes_registrados",
    "b_cuentas_activas",
  ].includes(rule);
  const usaUnidad = ["a_saldo_clientes", "a_saldo_cuenta", "b_operaciones", "i_internas"].includes(
    rule,
  );

  const send = async () => {
    setSending(true);
    try {
      // Solo se guardan los parámetros que usa la regla elegida.
      const limpio: BcraItemParams = {};
      if (usaKinds && params.tipos?.length) limpio.tipos = params.tipos;
      if (usaFilters) {
        if (params.sentido) limpio.sentido = params.sentido;
        if (params.contraparte) limpio.contraparte = params.contraparte;
      }
      if ((rule === "b_operaciones" || rule === "i_internas") && params.monto)
        limpio.monto = params.monto;
      if (usaPerson && params.tipo_persona) limpio.tipo_persona = params.tipo_persona;
      if (usaUnidad) limpio.unidad = params.unidad ?? "miles";
      if (rule === "a_saldo_clientes")
        limpio.buckets = params.buckets?.length ? params.buckets : ["disponible", "retenido"];
      if (rule === "a_saldo_cuenta") {
        if (!params.account_code?.trim())
          throw new AppError("validation", "Indicá el código de la cuenta contable.");
        limpio.account_code = params.account_code.trim();
        if (params.aux_param?.trim()) limpio.aux_param = params.aux_param.trim();
      }
      if (rule === "manual") {
        limpio.cantidad = Number(params.cantidad ?? 0);
        if (params.monto_fijo !== undefined && String(params.monto_fijo) !== "")
          limpio.monto_fijo = Number(params.monto_fijo);
      }
      await saveItem({
        id: item.id,
        descripcion,
        regla: rule,
        params: limpio,
        medioPago: method,
        esquema,
        activa,
        confirmada,
      });
      toast.success("Partida guardada. Regenerá los archivos para aplicar el cambio.");
      onDone();
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title={`Partida ${item.apartado === "A" ? `${item.codigo.slice(0, 5)}dd` : item.codigo}`}
      description={`${item.apartado === "I" ? "Intraentidades" : `Apartado ${item.apartado}`}. Los cambios aplican a los archivos que se generen después.`}
      onSubmit={() => void send()}
      submitLabel={sending ? "Guardando…" : "Guardar"}
      isSubmitting={sending}
      size="lg"
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold mb-1.5 block">Descripción</label>
          <input
            className={inputCls}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-3">
            <label className="text-xs font-semibold mb-1.5 block">Regla de cálculo</label>
            <select
              className={inputCls}
              value={rule}
              onChange={(e) => setRule(e.target.value as BcraRule)}
            >
              {(Object.keys(RULES) as BcraRule[])
                .filter((r) => RULES[r].apartado === item.apartado)
                .map((r) => (
                  <option key={r} value={r}>
                    {RULES[r].label}
                  </option>
                ))}
            </select>
          </div>
          {item.apartado !== "A" && (
            <>
              <div>
                <label className="text-xs font-semibold mb-1.5 block">
                  Medio de pago (Tabla 1)
                </label>
                <input
                  className={`${inputCls} font-mono`}
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  placeholder="6"
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block">Esquema (Tabla 2)</label>
                <input
                  className={`${inputCls} font-mono`}
                  value={esquema}
                  onChange={(e) => setEsquema(e.target.value)}
                  placeholder="00007"
                />
              </div>
            </>
          )}
          {usaUnidad && (
            <div>
              <label className="text-xs font-semibold mb-1.5 block">Unidad del monto</label>
              <select
                className={inputCls}
                value={params.unidad ?? "miles"}
                onChange={(e) => set({ unidad: e.target.value as "miles" | "pesos" })}
              >
                <option value="miles">Miles de pesos (redondeado)</option>
                <option value="pesos">Pesos (redondeado)</option>
              </select>
            </div>
          )}
        </div>

        {usaKinds && (
          <div>
            <label className="text-xs font-semibold mb-1.5 block">Tipos de operación</label>
            <div className="flex flex-wrap gap-1.5">
              {KINDS_OPERATION.map(([code, label]) => {
                const on = params.tipos?.includes(code) ?? false;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleList("tipos", code)}
                    className={`h-7 px-2.5 rounded-full border text-[11px] font-semibold ${
                      on
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Sin ninguno seleccionado se cuentan todos los tipos.
            </p>
          </div>
        )}

        {(usaFilters || usaPerson || rule === "i_internas") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {usaFilters && (
              <>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block">Sentido</label>
                  <select
                    className={inputCls}
                    value={params.sentido ?? "todos"}
                    onChange={(e) => set({ sentido: e.target.value as BcraItemParams["sentido"] })}
                  >
                    <option value="todos">Créditos y débitos</option>
                    <option value="credito">Solo créditos (ingresos)</option>
                    <option value="debito">Solo débitos (egresos)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block">Contraparte</label>
                  <select
                    className={inputCls}
                    value={params.contraparte ?? "externa"}
                    onChange={(e) =>
                      set({ contraparte: e.target.value as BcraItemParams["contraparte"] })
                    }
                  >
                    <option value="externa">Externa (CBU o CVU de otra entidad)</option>
                    <option value="cbu">Solo CBU (bancos)</option>
                    <option value="cvu">Solo CVU de otra entidad</option>
                    <option value="interna">Solo cuentas de MoliPay</option>
                    <option value="todas">Todas</option>
                  </select>
                </div>
              </>
            )}
            {(rule === "b_operaciones" || rule === "i_internas") && (
              <div>
                <label className="text-xs font-semibold mb-1.5 block">Monto a informar</label>
                <select
                  className={inputCls}
                  value={params.monto ?? ""}
                  onChange={(e) =>
                    set({ monto: (e.target.value || undefined) as BcraItemParams["monto"] })
                  }
                >
                  <option value="">
                    {rule === "i_internas"
                      ? "Bruto (monto de la operación)"
                      : "Según sentido (créditos netos, débitos totales)"}
                  </option>
                  <option value="neto">Neto de comisión e impuesto</option>
                  <option value="debitado">Total debitado (con comisión e impuesto)</option>
                  <option value="bruto">Bruto (monto de la operación)</option>
                </select>
              </div>
            )}
            {usaPerson && (
              <div>
                <label className="text-xs font-semibold mb-1.5 block">Tipo de persona</label>
                <select
                  className={inputCls}
                  value={params.tipo_persona ?? ""}
                  onChange={(e) =>
                    set({
                      tipo_persona: (e.target.value || undefined) as BcraItemParams["tipo_persona"],
                    })
                  }
                >
                  <option value="">Todas</option>
                  <option value="fisica">Persona Humana</option>
                  <option value="juridica">Persona Jurídica</option>
                </select>
              </div>
            )}
          </div>
        )}

        {rule === "a_saldo_clientes" && (
          <div>
            <label className="text-xs font-semibold mb-1.5 block">Saldos que se suman</label>
            <div className="flex gap-4 text-sm">
              {["disponible", "retenido"].map((b) => (
                <label key={b} className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={(params.buckets ?? ["disponible", "retenido"]).includes(b)}
                    onChange={() => toggleList("buckets", b)}
                  />
                  {b === "disponible" ? "Disponible" : "Retenido (bloqueos)"}
                </label>
              ))}
            </div>
          </div>
        )}

        {rule === "a_saldo_cuenta" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1.5 block">Cuenta contable</label>
              <input
                className={`${inputCls} font-mono`}
                list="bcra-cuentas"
                value={params.account_code ?? ""}
                onChange={(e) => set({ account_code: e.target.value })}
              />
              <datalist id="bcra-cuentas">
                <option value="BANCO_BDC">Cuenta recaudadora</option>
                <option value="PAYWAY_A_COBRAR">Liquidaciones pendientes de Payway</option>
              </datalist>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block">Columna aux (parámetro)</label>
              <input
                className={`${inputCls} font-mono`}
                value={params.aux_param ?? ""}
                onChange={(e) => set({ aux_param: e.target.value })}
                placeholder="bcra_cbu_cuenta_vista"
              />
            </div>
          </div>
        )}

        {rule === "manual" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1.5 block">Cantidad</label>
              <input
                className={inputCls}
                type="number"
                value={params.cantidad ?? 0}
                onChange={(e) => set({ cantidad: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block">
                Monto (vacío = sin monto)
              </label>
              <input
                className={inputCls}
                type="number"
                value={params.monto_fijo ?? ""}
                onChange={(e) =>
                  set({ monto_fijo: e.target.value === "" ? undefined : Number(e.target.value) })
                }
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-5 pt-1 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={activa} onChange={(e) => setActiva(e.target.checked)} />{" "}
            Activa (se incluye en el archivo)
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={confirmada}
              onChange={(e) => setConfirmada(e.target.checked)}
            />{" "}
            Definición confirmada por Compliance
          </label>
        </div>
      </div>
    </FormDialog>
  );
}
