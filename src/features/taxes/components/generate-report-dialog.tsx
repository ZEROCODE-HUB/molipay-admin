import { Modal } from "@/shared/ui/modal";
import { useState } from "react";
import { toast } from "sonner";
import { generateFiling } from "@/features/taxes/iibb-reports.supabase";
import { userMessage } from "@/shared/lib/errors";
import { Input,Label } from "@/shared/ui/form-controls";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Loader2 } from "lucide-react";
import { TIERS,monthEnCurso,selectCls,tierLabel } from "@/features/taxes/tax-reports.rules";

export function GenerateReportDialog({
  onClose,
  onGenerado,
}: {
  onClose: () => void;
  onGenerado: () => void;
}) {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
  const day = Number(today.slice(8, 10));
  const [period, setPeriod] = useState(monthEnCurso());
  const [tier, setTier] = useState<1 | 2 | 3>(day <= 10 ? 1 : day <= 20 ? 2 : 3);
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    if (!/^\d{4}-\d{2}$/.test(period)) return toast.error("Elegí un período válido.");
    setGenerating(true);
    try {
      await generateFiling(period, tier);
      toast.success(`Reporte IIBB ${period} ${tierLabel(tier)} generado.`);
      onGenerado();
      onClose();
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal open onClose={onClose} dismissible={!generating} size="custom" className="max-w-md">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b px-6 py-4">
          <h3 className="font-display text-lg font-semibold">Generar reporte</h3>
          <p className="text-sm text-muted-foreground">
            Toma las retenciones de IIBB del tramo y los ajustes aplicados. Si el tramo ya tenía
            reporte y cambió, se crea una versión nueva y la anterior queda reemplazada.
          </p>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div>
            <Label>Período</Label>
            <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
          <div>
            <Label>Tramo</Label>
            <select
              className={`w-full ${selectCls}`}
              value={tier}
              onChange={(e) => setTier(Number(e.target.value) as 1 | 2 | 3)}
            >
              {TIERS.map((t) => (
                <option key={t.n} value={t.n}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="border-t px-6 py-3 flex justify-end gap-2">
          <BtnOutline onClick={onClose} disabled={generating}>
            Cancelar
          </BtnOutline>
          <BtnPrimary onClick={generate} disabled={generating}>
            {generating ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Generando…
              </>
            ) : (
              "Generar"
            )}
          </BtnPrimary>
        </div>
      </div>
    </Modal>
  );
}
