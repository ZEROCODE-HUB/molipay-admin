import { useState } from "react";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useCustomersForSelect } from "@/features/merchants/merchants.hooks";
import { useQuery } from "@tanstack/react-query";
import { listSubaccounts } from "@/features/customers/subaccounts.supabase";
import { toast } from "sonner";
import { createManualBlock } from "@/features/regulatory-reports/compliance.supabase";
import { userMessage } from "@/shared/lib/errors";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Search } from "lucide-react";

/**
 * Alta de bloqueo manual. Con `cliente` (desde la ficha) el cliente queda fijo
 * y solo se elige el alcance.
 */
export function NewBlockDialog({
  onClose,
  onDone,
  cliente: customerFixed,
}: {
  onClose: () => void;
  onDone: () => void;
  cliente?: { legajo: string; correo: string };
}) {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const { data: options } = useCustomersForSelect(
    customerFixed ? undefined : debounced || undefined,
  );
  const [open, setOpen] = useState(false);
  const [elegido, setElegido] = useState<{ legajo: string; correo: string } | null>(null);
  const customer = customerFixed ?? elegido;
  const [subaccount, setSubaccount] = useState("");
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);

  const subs = useQuery({
    queryKey: ["subcuentas", customer?.legajo],
    queryFn: () => listSubaccounts(customer!.legajo),
    enabled: Boolean(customer?.legajo),
  });

  const inputCls =
    "w-full h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

  const save = async () => {
    if (!customer) {
      toast.error("Seleccioná un cliente de la lista");
      return;
    }
    if (reason.trim().length < 5) {
      toast.error("Indicá el motivo del bloqueo (al menos 5 caracteres)");
      return;
    }
    setSending(true);
    try {
      await createManualBlock({
        legajo: customer.legajo,
        subaccountId: subaccount || null,
        reason: reason.trim(),
      });
      toast.success("Bloqueo creado: ya impide los egresos del alcance elegido");
      onDone();
      onClose();
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title="Nuevo bloqueo manual"
      description="Suspende los egresos y retiene los depósitos del alcance elegido."
      onSubmit={() => void save()}
      submitLabel={sending ? "Bloqueando…" : "Bloquear"}
    >
      <div className="space-y-3">
        {customerFixed ? (
          <div className="text-sm">
            <span className="text-xs text-muted-foreground block">Cliente</span>
            <span className="font-medium">{customerFixed.correo}</span>{" "}
            <span className="font-mono text-xs text-muted-foreground">{customerFixed.legajo}</span>
          </div>
        ) : (
          <div className="relative">
            <label className="text-xs font-semibold mb-1.5 block">Cliente</label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setElegido(null);
                  setSubaccount("");
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                placeholder="Buscar por legajo, correo o nombre…"
                className={`${inputCls} pl-9`}
                autoComplete="off"
              />
            </div>
            {open && (options?.length ?? 0) > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-md border border-input bg-card shadow-lg max-h-56 overflow-auto">
                {(options ?? []).map((c) => (
                  <button
                    key={c.legajo}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSearch(c.correo);
                      setElegido({ legajo: c.legajo, correo: c.correo });
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex flex-col"
                  >
                    <span className="font-medium">{c.correo}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {c.legajo} · {c.nombre}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div>
          <label className="text-xs font-semibold mb-1.5 block">Alcance</label>
          <select
            value={subaccount}
            onChange={(e) => setSubaccount(e.target.value)}
            disabled={!customer}
            className={inputCls}
          >
            <option value="">Toda la cuenta del cliente</option>
            {(subs.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                Subcuenta {s.nombre} — {s.cbu ?? "sin CVU"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold mb-1.5 block">Motivo</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full h-24 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
          />
        </div>
      </div>
    </FormDialog>
  );
}
