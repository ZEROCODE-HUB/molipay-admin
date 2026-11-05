import { AppError } from "@/shared/lib/errors";
import { toAppError } from "@/infrastructure/supabase/errors";
import { supabase } from "@/infrastructure/supabase/client";

/**
 * Cambio manual de estado de un movimiento a través de la Edge Function
 * `cambiar-estado-movimiento`, que delega en la RPC atómica
 * `cambiar_estado_movimiento` (valida vía estados_por_tipo, actualiza
 * movimientos.estado_id y corrige la transición a origen='manual' con
 * admin_user_id real, en una sola transacción).
 */
export async function changeStatusMovement(
  movementId: string,
  newStatusId: number,
  observaciones?: string,
) {
  if (!supabase) throw new AppError("validation", "Supabase no está configurado");
  const { data, error } = await supabase.functions.invoke("cambiar-estado-movimiento", {
    body: { movimiento_id: movementId, nuevo_estado_id: newStatusId, observaciones },
  });
  if (error) throw toAppError(error);
  return data;
}
