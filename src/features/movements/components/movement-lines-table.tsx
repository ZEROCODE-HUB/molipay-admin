import { ErrorNotice } from "@/shared/ui/error-notice";
import { type KindLine } from "@/features/movements/movement-lines.supabase";
import { useMovementLinesTable } from "@/features/movements/components/use-movement-lines-table";
import { Search } from "lucide-react";
import { MovementLinesBody } from "@/features/movements/components/movement-lines-body";
import { MovementDetail } from "@/features/movements/components/movement-detail";
import { FormDialog } from "@/shared/ui/form-dialog";
import { userMessage } from "@/shared/lib/errors";
import { Label,Select } from "@/shared/ui/form-controls";

/**
 * Movimientos del ledger: una fila por concepto (ingreso, comisión, impuesto…).
 * Las líneas de una operación comparten el TXID (clic en él para verlas juntas). Se usa en "Todos los movimientos",
 * en las pestañas por tipo (con `tiposOperacion` / `tipoLinea` fijos) y en la ficha del cliente (con `legajo` fijo y
 * sin las columnas del cliente).
 */
export function MovementsLinesTable(props: {
  legajo?: string;
  initialTxid?: string;
  /** Dentro de la ficha: oculta legajo/email/nombre y el acceso a "movimientos del cliente". */
  embedded?: boolean;
  /** Se llama al limpiar el filtro de contexto (legajo / TXID que vino por URL). */
  onClearContext?: () => void;
  /** Fija las operaciones mostradas (oculta el selector de operación si es una sola). */
  tiposOperacion?: string[];
  /** Fija el tipo de línea mostrado (p. ej. solo comisiones); oculta ese filtro. */
  tipoLinea?: KindLine;
  /** Excluye transferencias internas entre subcuentas propias. */
  excluirInternas?: boolean;
}) {
  const vm = useMovementLinesTable(props);
  const {
    legajo,
    embedded,
    onClearContext,
    txid,
    statuses,
    detail,
    setDetail,
    statusTarget,
    setStatusTarget,
    changeStatus,
    filtrarTxid,
    contextoLegajo,
  } = vm;

  return (
    <>
      {(contextoLegajo || txid) && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm mb-4 flex flex-wrap items-center gap-x-4 gap-y-1">
          {contextoLegajo && (
            <span>
              Cliente <span className="font-mono font-semibold tabular-nums">{legajo}</span>
            </span>
          )}
          {txid && (
            <span className="inline-flex items-center gap-1">
              <Search size={13} /> TXID <span className="font-mono font-semibold">{txid}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              filtrarTxid("");
              onClearContext?.();
            }}
            className="text-xs font-semibold text-primary underline underline-offset-2"
          >
            Limpiar filtro
          </button>
        </div>
      )}

      <MovementLinesBody {...vm} />

      {detail && <MovementDetail m={detail} onClose={() => setDetail(null)} />}

      {statusTarget && (
        <FormDialog
          open
          onClose={() => setStatusTarget(null)}
          title="Cambiar estado de la operación"
          description={`Cambia el estado de toda la operación (todas sus líneas). Rechazar o reembolsar una operación contabilizada genera su reverso en el ledger. Estado actual: ${statusTarget.estadoActual}.`}
          onSubmit={async () => {
            await changeStatus.mutateAsync({
              movimientoId: statusTarget.dbId,
              nuevoEstadoId: statusTarget.nuevoId,
              observaciones: embedded
                ? "Cambio manual desde ficha de cliente"
                : "Cambio manual desde backoffice",
            });
            setStatusTarget(null);
          }}
          submitLabel={changeStatus.isPending ? "Guardando…" : "Confirmar cambio"}
          size="md"
        >
          {changeStatus.isError && (
            <ErrorNotice className="mb-3">
              <span>{userMessage(changeStatus.error)}</span>
            </ErrorNotice>
          )}
          <div>
            <Label htmlFor="nuevo-estado">Nuevo estado</Label>
            <Select
              id="nuevo-estado"
              value={statusTarget.nuevoId}
              onChange={(e) =>
                setStatusTarget((s) => (s ? { ...s, nuevoId: Number(e.target.value) } : s))
              }
            >
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.codigo} — {s.nombre}
                </option>
              ))}
            </Select>
          </div>
        </FormDialog>
      )}
    </>
  );
}
