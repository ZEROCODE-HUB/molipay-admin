import { Modal } from "@/shared/ui/modal";
import { useQuery } from "@tanstack/react-query";
import { type OverdueExemption,verifyOverdues } from "@/features/taxes/exemptions.supabase";
import { useState } from "react";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { DataTable,type Column } from "@/shared/ui/data-table";
import { Loader2,X } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { dateHour } from "@/features/taxes/debits-credits.rules";

// ---------------------------------------------------------------------------
// Verificar vencidas
// ---------------------------------------------------------------------------

export function VerifyOverduesDialog({
  onClose,
  onHecho,
}: {
  onClose: () => void;
  onHecho: () => void;
}) {
  const preview = useQuery({
    queryKey: ["tax_exemptions", "vencidas"],
    queryFn: () => verifyOverdues(true),
  });
  const [aplicando, setAplicando] = useState(false);

  const apply = async () => {
    setAplicando(true);
    try {
      const r = await verifyOverdues(false);
      toast.success(
        r.total > 0
          ? `${r.total} exención(es) vencida(s) pasaron a inactivas.`
          : "No había exenciones vencidas.",
      );
      onHecho();
      onClose();
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setAplicando(false);
    }
  };

  const columns: Column<OverdueExemption>[] = [
    {
      key: "cuit",
      label: "CUIT",
      render: (v) => (
        <div className="leading-tight">
          <div className="font-mono tabular-nums">{v.cuit}</div>
          <div className="text-[11px] text-muted-foreground">
            {v.clienteNombre ?? v.clienteLegajo ?? "—"}
          </div>
        </div>
      ),
    },
    {
      key: "impuesto",
      label: "Impuesto",
      render: (v) => <span className="font-mono text-xs">{v.impuestoCodigo}</span>,
    },
    { key: "direccion", label: "Dirección", render: (v) => v.direccion },
    {
      key: "hasta",
      label: "Venció",
      render: (v) => <span className="text-xs">{dateHour(v.hasta)}</span>,
    },
  ];

  const total = preview.data?.total ?? 0;

  return (
    <Modal open onClose={onClose} dismissible={!aplicando} size="custom" className="max-w-3xl">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div>
            <h3 className="font-display text-lg font-semibold">Verificar vencidas</h3>
            <p className="text-sm text-muted-foreground">
              Exenciones activas con la vigencia vencida. El cálculo ya no las aplica; al confirmar
              quedan inactivas.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={aplicando}
            className="p-1.5 hover:bg-muted rounded-md"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6">
          {preview.isLoading ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Buscando vencidas…
            </div>
          ) : preview.isError ? (
            <p className="text-sm text-red-700">{userMessage(preview.error)}</p>
          ) : total === 0 ? (
            <div className="flex items-center gap-2 text-sm">
              <Badge tone="success">Al día</Badge> No hay exenciones vencidas activas.
            </div>
          ) : (
            <>
              <p className="text-sm mb-3">
                <span className="font-semibold">{total}</span> exención(es) vencida(s)
                {total > (preview.data?.items.length ?? 0)
                  ? ` (se muestran las primeras ${preview.data?.items.length})`
                  : ""}
                .
              </p>
              <DataTable
                columns={columns}
                data={preview.data?.items ?? []}
                keyExtractor={(v) => v.id}
                pageSize={8}
                showGlobalFilter={false}
                showDownloadButton={false}
              />
            </>
          )}
        </div>
        <div className="border-t px-6 py-3 flex justify-end gap-2">
          <BtnOutline onClick={onClose} disabled={aplicando}>
            Cerrar
          </BtnOutline>
          {total > 0 && (
            <BtnPrimary onClick={apply} disabled={aplicando}>
              {aplicando ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Desactivando…
                </>
              ) : (
                `Desactivar ${total} vencida(s)`
              )}
            </BtnPrimary>
          )}
        </div>
      </div>
    </Modal>
  );
}
