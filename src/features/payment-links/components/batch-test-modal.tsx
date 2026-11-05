import { CheckCircle2, Circle, FlaskConical, Loader2, XCircle } from "lucide-react";
import { Modal } from "@/shared/ui/modal";
import { BtnOutline, BtnPrimary } from "@/shared/ui/button";
import { Input, Label, Select } from "@/shared/ui/form-controls";
import { type TestStepStatus, useBatchTestModal } from "./use-batch-test-modal";

const STATUS_LABEL: Record<TestStepStatus, string> = {
  pending: "Pendiente",
  running: "En curso",
  ok: "OK",
  failed: "Fallido",
};

function StatusIcon({ status }: { status: TestStepStatus }) {
  if (status === "ok") return <CheckCircle2 size={18} className="text-emerald-600" />;
  if (status === "failed") return <XCircle size={18} className="text-red-600" />;
  if (status === "running") return <Loader2 size={18} className="text-primary animate-spin" />;
  return <Circle size={18} className="text-muted-foreground/40" />;
}

export function BatchTestModal({ onClose }: { onClose: () => void }) {
  const vm = useBatchTestModal();
  const running = vm.phase === "running";

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!running}
      size="custom"
      className="max-w-3xl"
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-4">
        <div>
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <FlaskConical size={18} /> Prueba de punta a punta
          </h3>
          <p className="text-sm text-muted-foreground">
            Recorre el flujo completo de un lote y controla sus cálculos.
          </p>
        </div>

        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          No es un ensayo aislado: crea datos reales en esta base y acredita saldo al comercio
          elegido. Usá un comercio de prueba. Los datos quedan identificados con TEST-LOTE y no se
          borran al terminar.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="test-merchant">Comercio</Label>
            <Select
              id="test-merchant"
              value={vm.merchantId}
              disabled={running}
              onChange={(e) => vm.setMerchantId(e.target.value)}
            >
              <option value="">Seleccionar</option>
              {vm.merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="test-brand">Bandera</Label>
            <Select
              id="test-brand"
              value={vm.brandId}
              disabled={running || !vm.merchantId}
              onChange={(e) => vm.setBrandId(e.target.value)}
            >
              <option value="">Seleccionar</option>
              {vm.brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bandera}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="test-amount">Importe bruto</Label>
            <Input
              id="test-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={vm.monto}
              disabled={running}
              onChange={(e) => vm.setMonto(e.target.value)}
            />
          </div>
        </div>

        {vm.phase !== "idle" && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>
                {running ? "Ejecutando" : vm.failed ? "Prueba detenida" : "Prueba completada"}
              </span>
              <span>{vm.progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full transition-all ${vm.failed ? "bg-red-500" : "bg-emerald-500"}`}
                style={{ width: `${vm.progress}%` }}
              />
            </div>
          </div>
        )}

        <ol className="space-y-2">
          {vm.steps.map((step, index) => (
            <li key={step.id} className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-sm">
                <StatusIcon status={step.status} />
                <span className="flex-1 font-medium">
                  {index + 1}. {step.title}
                </span>
                <span className="text-xs text-muted-foreground">{STATUS_LABEL[step.status]}</span>
              </div>
              {step.rows.length > 0 && (
                <dl className="mt-2 ml-7 space-y-1 text-xs">
                  {step.rows.map((row) => (
                    <div key={row.label} className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">{row.label}</dt>
                      <dd className="font-mono text-right break-all">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {step.error && (
                <p className="mt-2 ml-7 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">
                  {step.error}
                </p>
              )}
            </li>
          ))}
        </ol>

        <div className="flex justify-end gap-2">
          <BtnOutline onClick={onClose} disabled={running}>
            Cerrar
          </BtnOutline>
          <BtnPrimary onClick={() => void vm.start()} disabled={!vm.canStart}>
            {vm.phase === "idle" ? "Iniciar" : "Iniciar otra prueba"}
          </BtnPrimary>
        </div>
      </div>
    </Modal>
  );
}
