import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cambiarEstadoMovimiento } from "@/lib/api/edge";

/** Mutación para cambiar el estado de un movimiento vía Edge Function atómica. */
export function useCambiarEstadoMovimiento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { movimientoId: string; nuevoEstadoId: number; observaciones?: string }) =>
      cambiarEstadoMovimiento(vars.movimientoId, vars.nuevoEstadoId, vars.observaciones),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movimientos"] });
    },
  });
}
