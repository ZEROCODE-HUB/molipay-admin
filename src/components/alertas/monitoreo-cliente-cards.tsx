import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Pencil, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  deleteClientBlockParameter,
  deleteTransactionProfile,
  getClientBlockParameter,
  getTransactionProfile,
  listAlertRules,
  saveClientBlockParameter,
  saveTransactionProfile,
} from "@/lib/api/alert-rules";
import { readSmvm } from "@/lib/api/compliance";

const fmtMonto = (n: number) => `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const inputCls = "w-full h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";
const btnCls = "inline-flex items-center gap-1 h-8 rounded-md border border-input px-2 text-xs font-medium text-foreground hover:bg-accent";

function Cabecera({ icon, titulo, children }: { icon: ReactNode; titulo: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon} {titulo}
      </div>
      <div className="flex gap-1.5">{children}</div>
    </div>
  );
}

/** Perfil transaccional esperado (base de la alerta "Exceso del perfil transaccional"). */
export function PerfilTransaccionalClienteCard({ legajo }: { legajo: string }) {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["transaction_profiles", "cliente", legajo], queryFn: () => getTransactionProfile(legajo) });
  const p = q.data ?? null;
  const [editando, setEditando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [form, setForm] = useState({ monto: "", ops: "", notas: "" });
  const [guardando, setGuardando] = useState(false);

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ["transaction_profiles"] });

  const abrir = () => {
    setForm({ monto: p ? String(p.monthlyAmount) : "", ops: p?.monthlyOperations == null ? "" : String(p.monthlyOperations), notas: p?.notes ?? "" });
    setEditando(true);
  };

  const guardar = async () => {
    const monto = Number(form.monto);
    if (form.monto.trim() === "" || !Number.isFinite(monto) || monto < 0) return toast.error("Ingresá el volumen mensual esperado");
    const ops = form.ops.trim() === "" ? null : Number(form.ops);
    if (ops !== null && (!Number.isInteger(ops) || ops < 0)) return toast.error("La cantidad de operaciones debe ser un entero");
    setGuardando(true);
    try {
      await saveTransactionProfile({ legajo, monthlyAmount: Math.round(monto * 100) / 100, monthlyOperations: ops, notes: form.notas.trim() || null });
      await refrescar();
      toast.success("Perfil transaccional guardado");
      setEditando(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!p) return;
    try {
      await deleteTransactionProfile(p.id);
      await refrescar();
      toast.success("Perfil eliminado: el cliente deja de evaluarse por exceso de perfil");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBorrando(false);
    }
  };

  const pct = p && p.monthlyAmount > 0 ? Math.round((p.currentMonthAmount / p.monthlyAmount) * 100) : null;
  const tono = pct == null ? "" : pct > 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="rounded-lg border border-border p-4">
      <Cabecera icon={<Activity size={13} />} titulo="Perfil transaccional esperado">
        {p && (
          <button type="button" onClick={() => setBorrando(true)} className={btnCls} title="Eliminar perfil">
            <Trash2 size={12} />
          </button>
        )}
        <button type="button" onClick={abrir} className={btnCls}>
          <Pencil size={12} /> {p ? "Editar" : "Cargar"}
        </button>
      </Cabecera>

      {q.isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando…</p>
      ) : q.isError ? (
        <p className="text-xs text-red-600">No se pudo cargar: {(q.error as Error).message}</p>
      ) : !p ? (
        <p className="text-xs text-muted-foreground">
          Sin perfil cargado: la alerta "Exceso del perfil transaccional" no evalúa a este cliente.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">Volumen mensual esperado</div>
              <div className="text-sm font-semibold tabular-nums">{fmtMonto(p.monthlyAmount)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">Operaciones por mes</div>
              <div className="text-sm font-semibold tabular-nums">{p.monthlyOperations ?? "Sin límite"}</div>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
              <span>Este mes: {fmtMonto(p.currentMonthAmount)} · {p.currentMonthOperations} operación(es)</span>
              {pct != null && <span className="font-semibold text-foreground">{pct}%</span>}
            </div>
            {pct != null && (
              <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={`h-full ${tono}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            )}
          </div>
          {p.notes && <p className="mt-3 text-xs text-foreground">{p.notes}</p>}
        </>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">Volumen = depósitos + transferencias salientes del mes calendario (sin internas).</p>

      {editando && (
        <FormDialog open onClose={() => setEditando(false)} title={p ? "Editar perfil transaccional" : "Cargar perfil transaccional"} onSubmit={() => void guardar()} submitLabel={guardando ? "Guardando…" : "Guardar"}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold mb-1.5 block">Volumen mensual esperado ($)</label>
                <input type="number" min={0} step="0.01" value={form.monto} onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block">Operaciones por mes (opcional)</label>
                <input type="number" min={0} step={1} value={form.ops} onChange={(e) => setForm((f) => ({ ...f, ops: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block">Fundamento (opcional)</label>
              <textarea
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                placeholder="Ej.: declaración jurada de ingresos, balance, facturación estimada…"
                className="w-full h-20 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
              />
            </div>
          </div>
        </FormDialog>
      )}

      <ConfirmDialog
        open={borrando}
        onClose={() => setBorrando(false)}
        onConfirm={eliminar}
        title="Eliminar perfil transaccional"
        message="El cliente deja de evaluarse por exceso de perfil hasta que se le cargue uno nuevo."
        confirmLabel="Eliminar"
      />
    </div>
  );
}

/** Umbral de bloqueo por salarios mínimos depositados: individual del cliente o general. */
export function UmbralBloqueoClienteCard({ legajo, tipoPersona }: { legajo: string; tipoPersona: "fisica" | "juridica" }) {
  const queryClient = useQueryClient();
  const individual = useQuery({ queryKey: ["client_block_parameters", "cliente", legajo], queryFn: () => getClientBlockParameter(legajo) });
  const reglas = useQuery({ queryKey: ["alert_rules"], queryFn: listAlertRules });
  const smvm = useQuery({ queryKey: ["smvm"], queryFn: readSmvm });
  const [editando, setEditando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [valor, setValor] = useState("");
  const [guardando, setGuardando] = useState(false);

  const regla = reglas.data?.find((r) => r.code === "deposit_min_wages_block");
  const campo = tipoPersona === "juridica" ? "company_min_wages" : "individual_min_wages";
  const general = typeof regla?.parameters[campo] === "number" ? (regla.parameters[campo] as number) : null;
  const propio = individual.data ? (tipoPersona === "juridica" ? individual.data.companyMinWages : individual.data.individualMinWages) : null;
  const efectivo = propio ?? general;
  const valorSmvm = smvm.data ?? 0;

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ["client_block_parameters"] });

  const guardar = async () => {
    const n = valor.trim() === "" ? null : Number(valor);
    if (n === null || !Number.isInteger(n) || n < 0) return toast.error("Ingresá una cantidad entera de salarios mínimos");
    setGuardando(true);
    try {
      await saveClientBlockParameter({
        id: individual.data?.id,
        legajo,
        individualMinWages: tipoPersona === "fisica" ? n : individual.data?.individualMinWages ?? null,
        companyMinWages: tipoPersona === "juridica" ? n : individual.data?.companyMinWages ?? null,
      });
      await refrescar();
      toast.success("Umbral individual guardado");
      setEditando(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!individual.data) return;
    try {
      await deleteClientBlockParameter(individual.data.id);
      await refrescar();
      toast.success("El cliente vuelve a usar el umbral general");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBorrando(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-4">
      <Cabecera icon={<ShieldAlert size={13} />} titulo="Bloqueo por salarios mínimos">
        {propio != null && (
          <button type="button" onClick={() => setBorrando(true)} className={btnCls} title="Volver al umbral general">
            <Trash2 size={12} />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setValor(propio != null ? String(propio) : "");
            setEditando(true);
          }}
          className={btnCls}
        >
          <Pencil size={12} /> {propio != null ? "Editar" : "Personalizar"}
        </button>
      </Cabecera>

      {individual.isLoading || reglas.isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando…</p>
      ) : individual.isError ? (
        <p className="text-xs text-red-600">No se pudo cargar: {(individual.error as Error).message}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Umbral mensual</div>
            <div className="text-sm font-semibold tabular-nums">{efectivo != null ? `${efectivo} SMVM` : "—"}</div>
            <div className="text-[11px] text-muted-foreground">{propio != null ? "Individual de este cliente" : "General (Parámetros de bloqueos)"}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Equivale a</div>
            <div className="text-sm font-semibold tabular-nums">
              {efectivo != null && valorSmvm > 0 ? fmtMonto(efectivo * valorSmvm) : "—"}
            </div>
            <div className="text-[11px] text-muted-foreground">{valorSmvm > 0 ? `SMVM ${fmtMonto(valorSmvm)}` : "SMVM sin configurar: la regla no se evalúa"}</div>
          </div>
        </div>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">
        Si los depósitos del mes alcanzan el umbral, la cuenta se bloquea y el depósito queda retenido{regla && !regla.isEnabled ? " (la regla está deshabilitada)" : ""}.
      </p>

      {editando && (
        <FormDialog open onClose={() => setEditando(false)} title="Umbral individual de bloqueo" description={`Reemplaza al general (${general ?? "—"} SMVM) solo para este cliente.`} onSubmit={() => void guardar()} submitLabel={guardando ? "Guardando…" : "Guardar"}>
          <label className="text-xs font-semibold mb-1.5 block">
            Salarios mínimos depositados por mes ({tipoPersona === "juridica" ? "empresa" : "persona"})
          </label>
          <input type="number" min={0} step={1} value={valor} onChange={(e) => setValor(e.target.value)} className={inputCls} />
        </FormDialog>
      )}

      <ConfirmDialog
        open={borrando}
        onClose={() => setBorrando(false)}
        onConfirm={eliminar}
        title="Volver al umbral general"
        message="Se elimina el umbral individual y el cliente usa el valor general de Parámetros de bloqueos."
        confirmLabel="Confirmar"
      />
    </div>
  );
}
