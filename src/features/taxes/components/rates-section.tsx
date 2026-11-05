import { Pagination } from "@/shared/ui/pagination";
import { type Rate,type Tax } from "@/infrastructure/supabase/legacy/types";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRates } from "@/features/taxes/taxes.hooks";
import { userMessage } from "@/shared/lib/errors";
import { createRate,deleteRate,setRateStatus,updateRate } from "@/features/taxes/taxes.supabase";
import { BtnOutline } from "@/shared/ui/button";
import { Edit3,Plus,Power,PowerOff,Trash2 } from "lucide-react";
import { LABEL_ADDRESS,effectiveToday,formatValue } from "@/shared/lib/tax-format";
import { Badge } from "@/shared/ui/badge";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { RATE_PAGE_SIZE,aInput,dateCorta,today } from "@/features/taxes/taxes.rules";
import { type RateForm } from "@/features/taxes/taxes.types";
import { RateFormModal } from "./rate-form-modal";

// --- Alícuotas: sección del detalle (fuente Fija y letras del padrón) ----------

export function RatesSection({
  impuesto: tax,
  puedeEditar: canEdit,
  cuitsPorCodigo: cuitsByCode,
}: {
  impuesto: Tax;
  puedeEditar: boolean;
  /** Padron: cuantos CUITs tiene cada letra. */
  cuitsPorCodigo?: Map<string, number>;
}) {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [editTarget, setEditTarget] = useState<Rate | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Rate | null>(null);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);

  const { rows, total, isLoading } = useRates({
    page,
    pageSize: RATE_PAGE_SIZE,
    impuesto_id: tax.id,
  });

  const recargar = () => {
    void qc.invalidateQueries({ queryKey: ["tax_rates"] });
    void qc.invalidateQueries({ queryKey: ["impuestos"] });
  };
  const fallo = (title: string) => (e: unknown) => setNotice({ title, message: userMessage(e) });

  const save = async (form: RateForm) => {
    try {
      if (editTarget) await updateRate(editTarget.id, aInput(form));
      else await createRate(tax.id, aInput(form));
      setShowNew(false);
      setEditTarget(null);
      recargar();
    } catch (e) {
      fallo("No se pudo guardar")(e);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      await deleteRate(confirmDelete.id);
      recargar();
    } catch (e) {
      fallo("No se pudo eliminar")(e);
    }
    setConfirmDelete(null);
  };

  const totalPages = Math.max(1, Math.ceil(total / RATE_PAGE_SIZE));
  const th = "px-3 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide";

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Alícuotas ({total})
        </h4>
        {canEdit && (
          <BtnOutline
            type="button"
            onClick={() => {
              setEditTarget(null);
              setShowNew(true);
            }}
          >
            <Plus size={13} /> Agregar alícuota
          </BtnOutline>
        )}
      </div>
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              <th className={th}>Código</th>
              <th className={th}>Valor</th>
              <th className={th}>Dirección</th>
              <th className={th}>Vigencia</th>
              <th className={th}>Estado</th>
              {cuitsByCode && <th className={`${th} text-right`}>CUITs</th>}
              {canEdit && <th className="px-3 py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-3 py-2.5">
                  <div className="font-mono text-xs font-semibold">{a.codigo}</div>
                  {a.descripcion && (
                    <div className="text-[11px] text-muted-foreground">{a.descripcion}</div>
                  )}
                </td>
                <td className="px-3 py-2.5 font-mono tabular-nums">{formatValue(a)}</td>
                <td className="px-3 py-2.5 text-xs">{LABEL_ADDRESS[a.direccion]}</td>
                <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                  {dateCorta(a.vigenciaDesde)} –{" "}
                  {a.vigenciaHasta ? dateCorta(a.vigenciaHasta) : "sin fin"}
                </td>
                <td className="px-3 py-2.5">
                  {effectiveToday(a) ? (
                    <Badge tone="success">Vigente</Badge>
                  ) : a.estado === "Activo" ? (
                    <Badge tone="warn">
                      {a.vigenciaDesde > today() ? "Programada" : "Vencida"}
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Inactiva</Badge>
                  )}
                </td>
                {cuitsByCode && (
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {(cuitsByCode.get(a.codigo) ?? 0).toLocaleString("es-AR")}
                  </td>
                )}
                {canEdit && (
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      title="Editar"
                      className="p-1.5 hover:bg-muted rounded-md mr-1"
                      onClick={() => {
                        setShowNew(false);
                        setEditTarget(a);
                      }}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      title={a.estado === "Activo" ? "Desactivar" : "Activar"}
                      className="p-1.5 hover:bg-muted rounded-md mr-1"
                      onClick={() =>
                        setRateStatus(a.id, a.estado === "Activo" ? "Inactivo" : "Activo")
                          .then(recargar)
                          .catch(fallo("No se pudo actualizar"))
                      }
                    >
                      {a.estado === "Activo" ? <PowerOff size={14} /> : <Power size={14} />}
                    </button>
                    <button
                      type="button"
                      title="Eliminar"
                      className="p-1.5 hover:bg-red-50 text-red-600 rounded-md"
                      onClick={() => setConfirmDelete(a)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  {isLoading ? "Cargando…" : "Sin alícuotas cargadas."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <Pagination
          variant="compact"
          page={page + 1}
          totalPages={totalPages}
          total={total}
          countLabel="alícuota(s)"
          onPageChange={(p) => setPage(p - 1)}
        />
      )}

      {(showNew || editTarget) && (
        <RateFormModal
          alicuota={editTarget}
          onClose={() => {
            setShowNew(false);
            setEditTarget(null);
          }}
          onSave={save}
        />
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar alícuota"
        message={`¿Eliminar la alícuota "${confirmDelete?.codigo}"? Si ya se usó, mejor desactivala o cerrá su vigencia para conservar el historial.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={remove}
      />
      {notice && (
        <ConfirmDialog
          open
          onClose={() => setNotice(null)}
          title={notice.title}
          message={notice.message}
          confirmLabel="Cerrar"
          variant="danger"
          onConfirm={() => setNotice(null)}
        />
      )}
    </div>
  );
}
