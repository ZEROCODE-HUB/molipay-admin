import { Modal } from "@/shared/ui/modal";
import {
listItemsFiling,
markFiled,
markPaid,
type Filing,
type ItemFiling,
} from "@/features/taxes/iibb-reports.supabase";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { DataTable,type Column } from "@/shared/ui/data-table";
import { Badge } from "@/shared/ui/badge";
import { Loader2,X } from "lucide-react";
import { KpiCard } from "@/shared/ui/kpi-card";
import { Input,Label } from "@/shared/ui/form-controls";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import {
date,
filedTxt,
fmtCreacion,
paidTxt,
tierLabel,
versionTxt,
} from "@/features/taxes/tax-reports.rules";
import { pct } from "@/features/taxes/components/iibb-normalization";
import { money } from "@/features/taxes/components/iibb-normalization";

// ---------------------------------------------------------------------------

export function DetailReport({
  r,
  puedeEditar: canEdit,
  onClose,
  onCambio: onChange,
}: {
  r: Filing;
  puedeEditar: boolean;
  onClose: () => void;
  onCambio: () => void;
}) {
  const items = useQuery({
    queryKey: ["tax_filing_items", r.id],
    queryFn: () => listItemsFiling(r.id),
    enabled: r.registros > 0,
  });
  const [referencia, setReferencia] = useState(r.referenciaPago ?? "");
  const [saving, setSaving] = useState(false);

  const run = async (fn: () => Promise<void>, ok: string) => {
    setSaving(true);
    try {
      await fn();
      toast.success(ok);
      onChange();
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<ItemFiling>[] = [
    {
      key: "fecha",
      label: "Fecha",
      render: (i) => <span className="font-mono tabular-nums">{date(i.fecha)}</span>,
    },
    {
      key: "tipo",
      label: "Tipo",
      render: (i) => <Badge tone={i.tipo === "Ajuste" ? "warn" : "neutral"}>{i.tipo}</Badge>,
    },
    {
      key: "cuit",
      label: "CUIT",
      render: (i) => (
        <div className="leading-tight">
          <div className="font-mono tabular-nums">{i.cuit}</div>
          <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
            {i.razonSocial ?? i.legajo}
          </div>
        </div>
      ),
    },
    {
      key: "base",
      label: "Base",
      render: (i) => <span className="font-mono tabular-nums">{money(i.base)}</span>,
    },
    {
      key: "alicuota",
      label: "Alícuota",
      render: (i) => <span className="font-mono tabular-nums">{pct(i.alicuota)}</span>,
    },
    {
      key: "monto",
      label: "Monto",
      render: (i) => (
        <span
          className={`font-mono tabular-nums font-semibold ${i.monto < 0 ? "text-emerald-700" : ""}`}
        >
          {money(i.monto)}
        </span>
      ),
    },
  ];

  const editable = canEdit && r.vigente;

  return (
    <Modal open onClose={onClose} size="custom" className="max-w-4xl">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div>
            <h3 className="font-display text-lg font-semibold">
              {r.impuestoCodigo} · {r.periodo} · {tierLabel(r.tramo)}
            </h3>
            <p className="text-sm text-muted-foreground">
              {r.archivo} · {versionTxt(r)} · generado {fmtCreacion(r.generadoAt)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Registros" value={r.registros.toLocaleString("es-AR")} />
            <KpiCard label="Monto bruto gravado" value={money(r.totalBase)} />
            <KpiCard label="Total a rendir" value={money(r.totalRetenido)} />
            <KpiCard label="Vencimiento" value={date(r.vencimiento)} />
          </div>
          <p className="text-xs text-muted-foreground">
            Operaciones del {date(r.desde)} al {date(r.hasta)}. Los ajustes vienen de
            normalizaciones aplicadas sobre operaciones del tramo.
          </p>
          {!r.vigente && (
            <p className="text-xs border border-amber-300 bg-amber-50 text-amber-800 rounded px-3 py-2">
              Esta versión fue reemplazada: presentado y pagado se registran en la vigente.
            </p>
          )}

          {r.registros === 0 ? (
            <p className="text-xs text-muted-foreground border rounded px-3 py-2">
              El tramo no tuvo retenciones: se presenta sin archivo y no lleva pago.
            </p>
          ) : items.isLoading ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Cargando registros…
            </div>
          ) : items.isError ? (
            <p className="text-sm text-red-700">{userMessage(items.error)}</p>
          ) : (
            <DataTable
              columns={columns}
              data={items.data ?? []}
              keyExtractor={(i) => String(i.id)}
              pageSize={10}
              showGlobalFilter={false}
              showDownloadButton={false}
            />
          )}

          <div className="grid gap-4 md:grid-cols-2 border-t pt-4">
            <div className="space-y-2">
              <Label>Presentado</Label>
              <div className="flex items-center gap-2">
                <Badge tone={r.presentadoAt ? "success" : "neutral"}>{filedTxt(r)}</Badge>
                {r.presentadoAt && (
                  <span className="text-xs text-muted-foreground">
                    {fmtCreacion(r.presentadoAt)}
                  </span>
                )}
              </div>
              {editable && (
                <BtnOutline
                  disabled={saving || (!!r.presentadoAt && !!r.pagadoAt)}
                  onClick={() =>
                    run(
                      () => markFiled(r.id, !r.presentadoAt),
                      r.presentadoAt ? "Presentación desmarcada" : "Marcado como presentado",
                    )
                  }
                >
                  {r.presentadoAt ? "Desmarcar presentado" : "Marcar como presentado"}
                </BtnOutline>
              )}
            </div>
            <div className="space-y-2">
              <Label>Pagado</Label>
              {r.archivo === "Sin archivo" ? (
                <p className="text-sm text-muted-foreground">N/A · tramo sin retenciones.</p>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Badge tone={r.pagadoAt ? "success" : "neutral"}>{paidTxt(r)}</Badge>
                    {r.pagadoAt && (
                      <span className="text-xs text-muted-foreground">
                        {fmtCreacion(r.pagadoAt)}
                        {r.referenciaPago ? ` · ref. ${r.referenciaPago}` : ""}
                      </span>
                    )}
                  </div>
                  {editable && !r.pagadoAt && (
                    <div className="flex gap-2">
                      <Input
                        value={referencia}
                        onChange={(e) => setReferencia(e.target.value)}
                        placeholder="Referencia de la transferencia (opcional)"
                        disabled={!r.presentadoAt || saving}
                      />
                      <BtnPrimary
                        disabled={!r.presentadoAt || saving}
                        title={!r.presentadoAt ? "Primero marcalo como presentado" : undefined}
                        onClick={() =>
                          run(() => markPaid(r.id, true, referencia), "Pago registrado")
                        }
                      >
                        Registrar pago
                      </BtnPrimary>
                    </div>
                  )}
                  {editable && r.pagadoAt && (
                    <BtnOutline
                      disabled={saving}
                      onClick={() => run(() => markPaid(r.id, false), "Pago desmarcado")}
                    >
                      Desmarcar pago
                    </BtnOutline>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="border-t px-6 py-3 flex justify-end">
          <BtnOutline onClick={onClose}>Cerrar</BtnOutline>
        </div>
      </div>
    </Modal>
  );
}
