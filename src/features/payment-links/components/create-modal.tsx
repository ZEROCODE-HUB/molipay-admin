import { Modal } from "@/shared/ui/modal";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useMerchants } from "@/features/merchants/merchants.hooks";
import { moneyInputToNumber } from "@/shared/lib/money";
import { toast } from "sonner";
import { createChargeback } from "@/features/payment-links/chargebacks.supabase";
import { userMessage } from "@/shared/lib/errors";
import { Plus, X } from "lucide-react";
import { Input, Label, Select } from "@/shared/ui/form-controls";

// ---------------------------------------------------------------------------
// Crear simulación
// ---------------------------------------------------------------------------

export function CreateModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [merchantId, setMerchantId] = useState("");
  const [amount, setAmount] = useState("");
  const [ticket, setTicket] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const merchantsQuery = useMerchants({ page: 0, pageSize: 200 });
  const merchantsList = merchantsQuery.rows;

  const create = async () => {
    if (!merchantId || moneyInputToNumber(amount) <= 0) {
      toast.error("Completá comercio e importe");
      return;
    }
    setSaving(true);
    try {
      await createChargeback({
        comercioId: merchantId,
        importe: moneyInputToNumber(amount),
        ticketPayway: ticket || null,
        motivoPayway: reason || null,
        estado: "Simulado",
        esSimulacion: true,
      });
      toast.success("Simulación de contracargo creada");
      qc.invalidateQueries({ queryKey: ["contracargos"] });
      onClose();
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} size="custom" className="max-w-md">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-center">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <Plus size={18} /> Simular contracargo
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs text-muted-foreground">
            Cargá los datos del contracargo para simular el impacto sin afectar la caja ni los
            lotes.
          </p>
          <div>
            <Label>Comercio</Label>
            <Select
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              className="mt-1"
            >
              <option value="">Seleccionar comercio…</option>
              {merchantsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombreComercio ?? c.usuario} ({c.legajo})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Importe del contracargo</Label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ej: 15000,00"
              className="font-mono"
            />
          </div>
          <div>
            <Label>
              Ticket PayWay <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              value={ticket}
              onChange={(e) => setTicket(e.target.value)}
              placeholder="PW-TKT-xxxxx"
              className="font-mono"
            />
          </div>
          <div>
            <Label>
              Motivo <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo del contracargo"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="h-9 px-3 rounded-md border bg-card text-sm">
              Cancelar
            </button>
            <button
              onClick={create}
              disabled={saving}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "Creando…" : "Simular impacto"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
