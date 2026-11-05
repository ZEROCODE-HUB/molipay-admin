import {
BCRA_FILE_LABEL,
corregirRow,
getRowsFiling,
type BcraFiling,
} from "@/features/regulatory-reports/bcra.supabase";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FormDialog } from "@/shared/ui/form-dialog";
import {
FIELDS_EDITABLES,
QK,
errMsg,
labelPeriod,
} from "@/features/regulatory-reports/bcra-reports.rules";

export function CorregirDialog({
  p,
  onClose,
  onDone,
}: {
  p: BcraFiling;
  onClose: () => void;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const rowsQ = useQuery({ queryKey: [...QK, "filas", p.id], queryFn: () => getRowsFiling(p.id) });
  const rows = (rowsQ.data ?? []) as Record<string, unknown>[];
  const fields = FIELDS_EDITABLES[p.archivo];
  const [row, setRow] = useState(0);
  const [field, setField] = useState(fields[0].key);
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const current = rows[row]?.[field];
  const inputCls =
    "w-full h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";
  const etiqueta = (f: Record<string, unknown>) =>
    p.archivo === "P"
      ? `${f.cuit} — ${String(f.razonSocial ?? "").trim()}`
      : `${f.codigo}${p.archivo === "I" ? ` · titular ${f.titular}` : ""}`;

  const send = async () => {
    if (reason.trim().length < 5) {
      toast.error("Indicá el motivo de la corrección (por ejemplo, la observación del BCRA).");
      return;
    }
    if (
      ["monto", "cantidad"].includes(field) &&
      value.trim() !== "" &&
      !/^-?\d+(\.\d+)?$/.test(value.trim())
    ) {
      toast.error("El valor debe ser numérico.");
      return;
    }
    setSending(true);
    try {
      await corregirRow(p.id, row, field, value.trim(), reason.trim());
      toast.success("Corrección aplicada y registrada en el historial.");
      void queryClient.invalidateQueries({ queryKey: [...QK, "filas", p.id] });
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
      title={`Corregir ${BCRA_FILE_LABEL[p.archivo]} · ${labelPeriod(p.periodo)}`}
      description="Para observaciones del BCRA o rectificaciones puntuales. Queda registrado el valor anterior, el nuevo, quién y por qué."
      onSubmit={() => void send()}
      submitLabel={sending ? "Guardando…" : "Aplicar corrección"}
      isSubmitting={sending}
    >
      {rowsQ.isLoading ? (
        <div className="py-6 text-center text-sm text-muted-foreground">Cargando filas…</div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold mb-1.5 block">Fila</label>
            <select
              className={inputCls}
              value={row}
              onChange={(e) => setRow(Number(e.target.value))}
            >
              {rows.map((f, i) => (
                <option key={i} value={i}>
                  {etiqueta(f)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1.5 block">Campo</label>
              <select className={inputCls} value={field} onChange={(e) => setField(e.target.value)}>
                {fields.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block">Valor actual</label>
              <div className="h-9 flex items-center rounded-md border border-dashed border-border px-3 font-mono text-sm text-muted-foreground">
                {current === null || current === undefined || current === ""
                  ? "—"
                  : String(current)}
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block">Nuevo valor</label>
            <input
              className={`${inputCls} font-mono`}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block">Motivo</label>
            <textarea
              className="w-full min-h-[70px] rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej.: Observación SISCEN del 05/10, saldo del día 12 informado sin retenidos."
            />
          </div>
        </div>
      )}
    </FormDialog>
  );
}
