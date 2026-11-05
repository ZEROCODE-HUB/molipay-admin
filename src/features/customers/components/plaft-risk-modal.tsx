import { Modal } from "@/shared/ui/modal";
import { type EvaluacionRiskRow,type RiskPLD } from "@/features/customers/customers.supabase";
import { useEffect,useState } from "react";
import { createPortal } from "react-dom";

// ============================================================================
// Modales PLAFT: Nivel de Riesgo + Perfil Transaccional
// ============================================================================

export function PlaftRiskModal({
  open,
  onClose,
  legajo,
  vigente: effective,
  loading,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  legajo: string;
  vigente: EvaluacionRiskRow | null;
  loading: boolean;
  onSubmit: (level: RiskPLD, reason: string, effectiveTo: string | null) => void;
}) {
  const [nivel, setLevel] = useState<RiskPLD>(effective?.nivel ?? "bajo");
  const [motivo, setReason] = useState("");
  const [vigenteHasta, setEffectiveTo] = useState<string>("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLevel(effective?.nivel ?? "bajo");
      setReason("");
      setEffectiveTo(effective?.vigente_hasta ? effective.vigente_hasta.slice(0, 10) : "");
      setReasonError(null);
    }
  }, [open, effective]);

  if (!open) return null;

  const submit = () => {
    if (motivo.trim().length < 10) {
      setReasonError(
        "Describí brevemente por qué (mín. 10 caracteres). Queda en la auditoría PLAFT.",
      );
      return;
    }
    onSubmit(nivel, motivo.trim(), vigenteHasta || null);
  };

  return createPortal(
    <Modal open onClose={() => undefined} size="custom" className="max-w-lg" dismissible={false}>
      <div className="min-h-0 flex-1 overflow-y-auto border p-6 space-y-4">
        <div>
          <h3 className="font-display font-semibold text-lg">Nivel de riesgo PLAFT</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Legajo <span className="font-mono">{legajo}</span>. La evaluación vigente anterior se
            cierra automáticamente; toda la historia queda registrada.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Nivel</label>
          <div className="grid grid-cols-4 gap-2">
            {(["bajo", "medio", "alto", "critico"] as RiskPLD[]).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setLevel(n)}
                className={`h-9 rounded-md border text-xs font-semibold transition-colors ${
                  nivel === n
                    ? n === "bajo"
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : n === "medio"
                        ? "bg-amber-500 text-white border-amber-500"
                        : n === "alto"
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-red-500 text-white border-red-500"
                    : "bg-card hover:bg-accent text-foreground"
                }`}
              >
                {n.charAt(0).toUpperCase() + n.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Motivo / justificación</label>
          <textarea
            value={motivo}
            onChange={(e) => {
              setReason(e.target.value);
              if (reasonError) setReasonError(null);
            }}
            placeholder="Ej: Cliente con facturación declarada $X, sin alertas regulatorias. Cumple DDR estándar."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] focus:ring-2 focus:ring-ring/40 outline-none"
          />
          {reasonError && <p className="mt-1 text-xs text-red-600">{reasonError}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Vigente hasta (opcional)</label>
          <input
            type="date"
            value={vigenteHasta}
            onChange={(e) => setEffectiveTo(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring/40 outline-none"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Si lo dejás vacío, la evaluación queda vigente hasta que se reevalúe.
          </p>
        </div>

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
            {loading ? "Guardando…" : effective ? "Reevaluar riesgo" : "Asignar riesgo"}
          </button>
        </div>
      </div>
    </Modal>,
    document.body,
  );
}
