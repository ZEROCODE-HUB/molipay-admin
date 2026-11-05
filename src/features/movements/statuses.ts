import type { StatusMovement,Movement } from "@/infrastructure/supabase/legacy/types";

export interface StatusResuelto {
  /** Código legible del estado (p. ej. "APROBADO"). Nunca es un id numérico suelto. */
  codigo: string;
  /** Nombre humano del estado (p. ej. "Aprobado"). */
  nombre: string;
  /** true si se pudo resolver contra el catálogo o el join embebido. */
  resuelto: boolean;
}

/**
 * Fuente de verdad para el estado de un movimiento.
 *
 * El estado se almacena como FK numérica (`estado_id`) a `estados_movimiento`.
 * La UI nunca debe mostrar ese número: lo resuelve a su código/nombre legible.
 *
 * Prioridad de resolución:
 *   1. `estadoCodigo` del join embebido en la fila (fuente autoritativa).
 *   2. lookup por `estadoId` contra el catálogo de sesión (`useEstadosMovimiento`),
 *      que centraliza y cachea todos los estados una sola vez.
 *   3. último recurso: un código explícito `ESTADO_<id>` para no mostrar nunca
 *      un número suelto (indica un problema de datos/infra, no un estado válido).
 */
export function resolverStatusMovement(
  m: Pick<Movement, "estadoId" | "estadoCodigo" | "estadoNombre">,
  catalog: StatusMovement[],
): StatusResuelto {
  if (m.estadoCodigo) {
    return {
      codigo: m.estadoCodigo,
      nombre: m.estadoNombre ?? m.estadoCodigo,
      resuelto: true,
    };
  }

  const byId = catalog.find((e) => e.id === m.estadoId);
  if (byId) {
    return { codigo: byId.codigo, nombre: byId.nombre, resuelto: true };
  }

  return {
    codigo: `ESTADO_${m.estadoId}`,
    nombre: `Estado ${m.estadoId}`,
    resuelto: false,
  };
}
