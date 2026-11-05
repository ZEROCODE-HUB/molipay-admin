import { useQuery,useQueryClient } from "@tanstack/react-query";
import { readSmvm,saveSmvm } from "@/features/regulatory-reports/compliance.supabase";
import { useEffect,useState } from "react";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { Loader2,Save } from "lucide-react";

/** Valor del SMVM: referencia de todas las reglas expresadas en salarios mínimos. */
export function SmvmCard() {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["smvm"], queryFn: readSmvm });
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (q.data !== undefined) setValue(q.data > 0 ? String(q.data) : "");
  }, [q.data]);

  const save = async () => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Ingresá el valor vigente del SMVM (mayor a 0)");
      return;
    }
    setSaving(true);
    try {
      await saveSmvm(Math.round(n * 100) / 100);
      await queryClient.invalidateQueries({ queryKey: ["smvm"] });
      toast.success("Valor del SMVM guardado");
    } catch (e) {
      toast.error(`No se pudo guardar: ${userMessage(e)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border rounded-lg p-6 mb-6">
      <h3 className="font-display text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border">
        Salario mínimo vital y móvil (SMVM)
      </h3>
      {q.isError ? (
        <p className="text-xs text-red-600">No se pudo cargar: {userMessage(q.error)}</p>
      ) : (
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[240px]">
            <label
              htmlFor="smvm"
              className="block text-xs font-semibold text-muted-foreground mb-1"
            >
              Valor vigente (ARS)
            </label>
            <input
              id="smvm"
              type="number"
              min={0}
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Sin configurar"
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <button
            type="button"
            onClick={() => void save()}
            disabled={
              saving || q.isLoading || value === (q.data && q.data > 0 ? String(q.data) : "")
            }
            className="inline-flex items-center gap-2 h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar
            SMVM
          </button>
          {q.data === 0 && (
            <p className="w-full text-[11px] font-medium text-amber-700">
              Sin SMVM configurado, las reglas expresadas en salarios mínimos (alertas y bloqueos)
              no se evalúan.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
