import { supabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";

export type CrearAdminInput = {
  email: string;
  password: string;
  nombre: string;
  legajo?: string;
  /** Nombre del rol (se resuelve a rol_id vía tabla roles) o rol_id directo. */
  rol?: string;
  rolId?: string;
};

/**
 * Cambio manual de estado de un movimiento a través de la Edge Function
 * `cambiar-estado-movimiento`, que delega en la RPC atómica
 * `cambiar_estado_movimiento` (valida vía estados_por_tipo, actualiza
 * movimientos.estado_id y corrige la transición a origen='manual' con
 * admin_user_id real, en una sola transacción).
 */
export async function cambiarEstadoMovimiento(
  movimientoId: string,
  nuevoEstadoId: number,
  observaciones?: string,
) {
  if (!supabase) throw new DataAccessError(new Error("Supabase no está configurado"));
  const { data, error } = await supabase.functions.invoke("cambiar-estado-movimiento", {
    body: { movimiento_id: movimientoId, nuevo_estado_id: nuevoEstadoId, observaciones },
  });
  if (error) throw new DataAccessError(error);
  return data;
}

/** Alta de usuario admin con rol (Edge Function `crear-admin`). */
export async function crearAdminUser(input: CrearAdminInput) {
  if (!supabase) throw new DataAccessError(new Error("Supabase no está configurado"));
  const { data, error } = await supabase.functions.invoke("crear-admin", { body: input });
  if (error) throw new DataAccessError(error);
  return data;
}
