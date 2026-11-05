import { Modal } from "@/shared/ui/modal";
import { useEffect,useState } from "react";
import { moneyInputToNumber } from "@/shared/lib/money";
import { createPortal } from "react-dom";

export function PlaftProfileModal({
  open,
  onClose,
  clienteId: customerId,
  cuit,
  initial,
  loading,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  clienteId: string;
  cuit: string;
  initial: {
    limiteTransferencia: number | null;
    limiteOpsDiarias: number | null;
    limiteMontoDiario: number | null;
  };
  loading: boolean;
  onSubmit: (input: {
    limiteTransferencia: number | null;
    limiteOpsDiarias: number | null;
    limiteMontoDiario: number | null;
  }) => void;
}) {
  const [limitTransfer, setLimitTransfer] = useState<string>(
    initial.limiteTransferencia != null ? String(initial.limiteTransferencia) : "",
  );
  const [limitOpsDiarias, setLimitOpsDiarias] = useState<string>(
    initial.limiteOpsDiarias != null ? String(initial.limiteOpsDiarias) : "",
  );
  const [limitAmountDiario, setLimitAmountDiario] = useState<string>(
    initial.limiteMontoDiario != null ? String(initial.limiteMontoDiario) : "",
  );

  useEffect(() => {
    if (open) {
      setLimitTransfer(
        initial.limiteTransferencia != null ? String(initial.limiteTransferencia) : "",
      );
      setLimitOpsDiarias(initial.limiteOpsDiarias != null ? String(initial.limiteOpsDiarias) : "");
      setLimitAmountDiario(
        initial.limiteMontoDiario != null ? String(initial.limiteMontoDiario) : "",
      );
    }
  }, [open, initial]);

  if (!open) return null;

  const submit = () => {
    const parse = (v: string) => (v.trim() === "" ? null : Number(v.replace(/[^\d.-]/g, "")));
    const parseAmount = (v: string) => (v.trim() === "" ? null : moneyInputToNumber(v));
    onSubmit({
      limiteTransferencia: parseAmount(limitTransfer),
      limiteOpsDiarias: parse(limitOpsDiarias),
      limiteMontoDiario: parseAmount(limitAmountDiario),
    });
  };

  return createPortal(
    <Modal open onClose={() => undefined} size="custom" className="max-w-lg" dismissible={false}>
      <div className="min-h-0 flex-1 overflow-y-auto border p-6 space-y-4">
        <div>
          <h3 className="font-display font-semibold text-lg">Límites operativos declarados</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Cliente <span className="font-mono">{customerId.slice(0, 8)}…</span> · CUIT {cuit}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Monto máximo por transferencia (ARS)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={limitTransfer}
              onChange={(e) => setLimitTransfer(e.target.value)}
              placeholder="Sin límite"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm w-full focus:ring-2 focus:ring-ring/40 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Operaciones diarias máx.</label>
              <input
                type="text"
                inputMode="numeric"
                value={limitOpsDiarias}
                onChange={(e) => setLimitOpsDiarias(e.target.value)}
                placeholder="Sin límite"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm w-full focus:ring-2 focus:ring-ring/40 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Monto diario máx. (ARS)</label>
              <input
                type="text"
                inputMode="numeric"
                value={limitAmountDiario}
                onChange={(e) => setLimitAmountDiario(e.target.value)}
                placeholder="Sin límite"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm w-full focus:ring-2 focus:ring-ring/40 outline-none"
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          El motor de alertas (cuando esté activo) comparará estas cifras con los movimientos del
          cliente y disparará automáticamente alertas de exceso / variación cuando corresponda.
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-9 rounded-md border border-input bg-card px-3 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="h-9 rounded-md bg-primary text-primary-foreground px-4 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Guardando…" : "Guardar perfil"}
          </button>
        </div>
      </div>
    </Modal>,
    document.body,
  );
}
