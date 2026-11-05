import { useMutation,useQueryClient } from "@tanstack/react-query";
import { changeStatusMovement } from "@/infrastructure/supabase/legacy/edge";

/** Mutación para cambiar el estado de un movimiento vía Edge Function atómica. */
export function useChangeStatusMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { movimientoId: string; nuevoEstadoId: number; observaciones?: string }) =>
      changeStatusMovement(vars.movimientoId, vars.nuevoEstadoId, vars.observaciones),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movimientos"] });
    },
  });
}
