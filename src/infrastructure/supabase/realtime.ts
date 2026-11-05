import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./client";

/**
 * Suscripciones Realtime compartidas.
 *
 * - Un solo canal por tabla + filtro, aunque lo usen varios componentes
 *   (se cuentan los suscriptores y el canal se cierra con el ultimo).
 * - Los eventos solo avisan "algo cambio": quien escucha invalida su cache
 *   y TanStack Query vuelve a pedir los datos. No se copian datos.
 * - Al reconectar se avisa igual, porque pudieron perderse eventos.
 */

export type TableSubscription = {
  table: string;
  /** Filtro de Realtime, p. ej. "cliente_legajo=eq.LPF-123". */
  filter?: string;
  schema?: string;
};

type SharedChannel = {
  channel: RealtimeChannel;
  listeners: Set<() => void>;
  connectedOnce: boolean;
};

const channels = new Map<string, SharedChannel>();

const channelKey = ({ schema = "public", table, filter = "*" }: TableSubscription) =>
  `${schema}:${table}:${filter}`;

export function subscribeToTable(
  subscription: TableSubscription,
  onChange: () => void,
): () => void {
  const client = supabase;
  if (!client) return () => undefined;

  const key = channelKey(subscription);
  let shared = channels.get(key);
  if (!shared) {
    const listeners = new Set<() => void>();
    const notify = () => listeners.forEach((listener) => listener());
    const created: SharedChannel = {
      listeners,
      connectedOnce: false,
      channel: client.channel(`rt:${key}`),
    };
    created.channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: subscription.schema ?? "public",
          table: subscription.table,
          ...(subscription.filter ? { filter: subscription.filter } : {}),
        },
        notify,
      )
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        if (created.connectedOnce) notify();
        created.connectedOnce = true;
      });
    channels.set(key, created);
    shared = created;
  }

  // Funcion propia por suscripcion: dos componentes con el mismo callback cuentan como dos.
  const listener = () => onChange();
  shared.listeners.add(listener);

  return () => {
    const current = channels.get(key);
    if (!current) return;
    current.listeners.delete(listener);
    if (current.listeners.size === 0) {
      channels.delete(key);
      void client.removeChannel(current.channel);
    }
  };
}
