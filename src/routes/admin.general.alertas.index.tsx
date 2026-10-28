import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Loader2, Landmark, History } from "lucide-react";
import { toast } from "sonner";
import { FormDialog } from "@/components/form-dialog";
import { BtnOutline } from "@/components/portal-shell";
import { PageHeader } from "@/components/page-header";
import { AlertsTable, ALERTS_QUERY_KEY } from "@/components/alertas/alerts-table";
import { runComplianceSweep, simulateDeposit, simulateHistory } from "@/lib/api/compliance";

export const Route = createFileRoute("/admin/general/alertas/")({
  head: () => ({
    meta: [{ title: "Listado de alertas — Admin" }],
  }),
  component: ListadoAlertas,
});

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

function ListadoAlertas() {
  const queryClient = useQueryClient();
  const [barriendo, setBarriendo] = useState(false);
  const [simOpen, setSimOpen] = useState(false);
  const [histOpen, setHistOpen] = useState(false);

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY });

  const barrer = async () => {
    setBarriendo(true);
    try {
      const r = await runComplianceSweep();
      toast.success(
        `Barrido ejecutado: ${r.coincidencias_revisadas} coincidencias PLAFT revisadas, ${r.alertas_nuevas} alertas nuevas` +
          (r.clientes_revisados ? `; ${r.clientes_revisados} clientes revisados por jurisdicción, ${r.alertas_jurisdiccion_nuevas ?? 0} alertas nuevas.` : ".") +
          (r.ultima_corrida_plaft ? ` Última corrida PLAFT: ${fmtFecha(r.ultima_corrida_plaft)}.` : " No hay corridas PLAFT registradas."),
      );
      await refrescar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBarriendo(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Listado de alertas"
        description="Alertas generadas por el motor de monitoreo y el screening PLAFT."
        action={
          <div className="flex flex-wrap gap-2">
            <BtnOutline onClick={() => setSimOpen(true)}>
              <Landmark size={14} /> Simular depósito
            </BtnOutline>
            <BtnOutline onClick={() => setHistOpen(true)}>
              <History size={14} /> Simular historial
            </BtnOutline>
            <BtnOutline onClick={() => void barrer()} disabled={barriendo}>
              {barriendo ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Ejecutar barrido de compliance
            </BtnOutline>
          </div>
        }
      />

      <AlertsTable />

      {simOpen && <SimularDepositoDialog onClose={() => setSimOpen(false)} onDone={refrescar} />}
      {histOpen && <SimularHistorialDialog onClose={() => setHistOpen(false)} />}
    </>
  );
}

/** Depósito entrante de prueba: pasa por el mismo motor que un PAY-IN real. */
function SimularDepositoDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ cbu: "", importe: "", cuit: "", titular: "", cbuOrigen: "" });
  const [enviando, setEnviando] = useState(false);
  const inputCls = "w-full h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

  const enviar = async () => {
    const importe = Number(form.importe);
    if (!/^\d{22}$/.test(form.cbu.trim())) {
      toast.error("El CVU destino debe tener 22 dígitos");
      return;
    }
    if (!(importe > 0)) {
      toast.error("Ingresá un importe mayor a 0");
      return;
    }
    setEnviando(true);
    try {
      const r = await simulateDeposit({
        cbuDestino: form.cbu.trim(),
        importe: Math.round(importe * 100) / 100,
        cuitOrigen: form.cuit.replace(/\D/g, ""),
        titularOrigen: form.titular.trim(),
        cbuOrigen: form.cbuOrigen.trim(),
      });
      if (r.estado === "acreditado") {
        toast.success(
          r.retenido
            ? `Depósito ${r.idCoelsa} acreditado RETENIDO (bloqueo preventivo).`
            : `Depósito ${r.idCoelsa} acreditado (${r.decision === "alert" ? "con alertas" : "sin alertas"}).`,
        );
        onDone();
        onClose();
      } else {
        toast.error(r.estado === "sin_subcuenta" ? "No hay ninguna subcuenta con ese CVU" : `Resultado: ${r.estado}`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title="Simular depósito entrante"
      description="Registra un PAY-IN de prueba que pasa por las reglas de depósitos (solo desarrollo)."
      onSubmit={() => void enviar()}
      submitLabel={enviando ? "Enviando…" : "Simular"}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-semibold mb-1.5 block">CVU destino (subcuenta del cliente)</label>
          <input className={`${inputCls} font-mono`} value={form.cbu} onChange={(e) => setForm({ ...form, cbu: e.target.value })} placeholder="0000003100..." />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1.5 block">Importe (ARS)</label>
          <input className={inputCls} type="number" min={0} step="0.01" value={form.importe} onChange={(e) => setForm({ ...form, importe: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1.5 block">CUIT del depositante</label>
          <input className={`${inputCls} font-mono`} value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })} placeholder="20123456789" />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1.5 block">Titular del depositante</label>
          <input className={inputCls} value={form.titular} onChange={(e) => setForm({ ...form, titular: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1.5 block">CBU de origen</label>
          <input className={`${inputCls} font-mono`} value={form.cbuOrigen} onChange={(e) => setForm({ ...form, cbuOrigen: e.target.value })} />
        </div>
      </div>
    </FormDialog>
  );
}

/** Historial de prueba: depósitos de meses anteriores para armar la base de comparación. */
function SimularHistorialDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ cbu: "", monto: "", cantidad: "1", meses: "1" });
  const [enviando, setEnviando] = useState(false);
  const inputCls = "w-full h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

  const enviar = async () => {
    const monto = Number(form.monto);
    const cantidad = Number(form.cantidad);
    const meses = Number(form.meses);
    if (!/^\d{22}$/.test(form.cbu.trim())) {
      toast.error("El CVU destino debe tener 22 dígitos");
      return;
    }
    if (!(monto > 0)) {
      toast.error("Ingresá un monto total mayor a 0");
      return;
    }
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 50) {
      toast.error("La cantidad de depósitos debe estar entre 1 y 50");
      return;
    }
    if (!Number.isInteger(meses) || meses < 1 || meses > 12) {
      toast.error("Los meses hacia atrás deben estar entre 1 y 12");
      return;
    }
    setEnviando(true);
    try {
      const r = await simulateHistory({
        cbuDestino: form.cbu.trim(),
        montoTotal: Math.round(monto * 100) / 100,
        cantidad,
        mesesAtras: meses,
      });
      if (r.estado === "acreditado") {
        toast.success(`Historial creado: ${r.cantidad} depósito(s) por ${r.montoTotal} en ${r.mes} (legajo ${r.legajo}).`);
        void queryClient.invalidateQueries();
        onClose();
      } else {
        toast.error(r.estado === "sin_subcuenta" ? "No hay ninguna subcuenta con ese CVU" : `Resultado: ${r.estado}`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title="Simular historial de meses anteriores"
      description="Crea depósitos ya acreditados con fecha de un mes pasado, repartidos en el mes. No evalúa reglas ni genera alertas: sirve como base para probar variación mensual y perfil transaccional (solo desarrollo)."
      onSubmit={() => void enviar()}
      submitLabel={enviando ? "Creando…" : "Crear historial"}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-semibold mb-1.5 block">CVU destino (subcuenta del cliente)</label>
          <input className={`${inputCls} font-mono`} value={form.cbu} onChange={(e) => setForm({ ...form, cbu: e.target.value })} placeholder="0000003100..." />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold mb-1.5 block">Monto total del mes (ARS)</label>
          <input className={inputCls} type="number" min={0} step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} placeholder="200000" />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1.5 block">Cantidad de depósitos</label>
          <input className={inputCls} type="number" min={1} max={50} step={1} value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1.5 block">Meses hacia atrás</label>
          <select className={inputCls} value={form.meses} onChange={(e) => setForm({ ...form, meses: e.target.value })}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m === 1 ? "1 (mes anterior)" : m}
              </option>
            ))}
          </select>
        </div>
      </div>
    </FormDialog>
  );
}
