import { useEffect } from "react";
import { useQueryClient,type QueryKey } from "@tanstack/react-query";
import { subscribeToTable,type TableSubscription } from "./realtime";

/** Rafagas de cambios (p. ej. un lote que toca muchas filas) se agrupan en una sola invalidacion. */
const DEBOUNCE_MS = 250;

/**
 * Mientras el componente esta montado, cualquier cambio en `tables` invalida
 * `queryKeys` (TanStack vuelve a consultar). Se desuscribe al desmontar.
 */
export function useRealtimeInvalidation(tables: TableSubscription[], queryKeys: QueryKey[]): void {
  const queryClient = useQueryClient();
  // Las listas suelen crearse en cada render: la firma evita resuscribirse por eso.
  const signature = JSON.stringify([tables, queryKeys]);

  useEffect(() => {
    const [currentTables, currentKeys] = JSON.parse(signature) as [TableSubscription[], QueryKey[]];
    let timer: ReturnType<typeof setTimeout> | undefined;
    const invalidate = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        for (const queryKey of currentKeys) void queryClient.invalidateQueries({ queryKey });
      }, DEBOUNCE_MS);
    };
    const unsubscribers = currentTables.map((table) => subscribeToTable(table, invalidate));
    return () => {
      clearTimeout(timer);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [queryClient, signature]);
}
