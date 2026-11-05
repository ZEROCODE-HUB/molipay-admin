import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
createExemption,
type ExemptionAddress,
} from "@/features/customers/customer-detail.supabase";
import { userMessage } from "@/shared/lib/errors";
import { ModalDialog } from "@/shared/ui/modal-dialog";
import { Info } from "lucide-react";

export function ExemptionModal({
  open,
  onClose,
  legajo,
  cuitDefault,
}: {
  open: boolean;
  onClose: () => void;
  legajo: string;
  cuitDefault: string;
}) {
  const queryClient = useQueryClient();
  const [cuit, setCuit] = useState(cuitDefault);
  const [address, setAddress] = useState<ExemptionAddress>("Ambos");
  const [reason, setReason] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      await createExemption(legajo, {
        cuit: cuit || cuitDefault,
        direccion: address,
        motivo: reason,
        vigenciaDesde: from || null,
        vigenciaHasta: to || null,
      });
      await queryClient.invalidateQueries({ queryKey: ["exenciones", legajo] });
      onClose();
    } catch (e) {
      setErr(userMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      title="Nueva excención de Débitos y Créditos"
      size="lg"
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">CUIT</label>
          <input
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={cuit}
            onChange={(e) => setCuit(e.target.value)}
            placeholder="CUIT"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            Dirección
          </label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={address}
            onChange={(e) => setAddress(e.target.value as ExemptionAddress)}
          >
            <option value="Entrantes">Entrantes</option>
            <option value="Salientes">Salientes</option>
            <option value="Ambos">Ambos</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Motivo</label>
          <textarea
            className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo de la exención"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            Vigencia desde
          </label>
          <input
            type="date"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            Vigencia hasta
          </label>
          <textarea
            className="min-h-[56px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Vigencia hasta"
          />
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            Si no completás la fecha desde, el backend toma la fecha actual. Si no completás la
            fecha hasta, la exención queda abierta.
          </span>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-input px-3 text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Creando…" : "Crear exención"}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
