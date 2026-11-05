import { beforeEach,describe,expect,it,vi } from "vitest";

// Cliente de Supabase falso: registra canales creados y cerrados.
const created: { name: string; handler?: () => void; status?: (s: string) => void }[] = [];
const removed: string[] = [];

vi.mock("./client", () => ({
  supabase: {
    channel(name: string) {
      const entry: (typeof created)[number] = { name };
      created.push(entry);
      const channel = {
        on(_type: string, _filter: unknown, handler: () => void) {
          entry.handler = handler;
          return channel;
        },
        subscribe(cb: (s: string) => void) {
          entry.status = cb;
          return channel;
        },
        name,
      };
      return channel;
    },
    removeChannel(channel: { name: string }) {
      removed.push(channel.name);
      return Promise.resolve("ok");
    },
  },
}));

const { subscribeToTable } = await import("./realtime");

describe("subscribeToTable", () => {
  beforeEach(() => {
    created.length = 0;
    removed.length = 0;
  });

  it("comparte un canal por tabla y lo cierra con el ultimo suscriptor", () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = subscribeToTable({ table: "clientes" }, a);
    const offB = subscribeToTable({ table: "clientes" }, b);
    expect(created).toHaveLength(1);

    created[0].handler?.();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);

    offA();
    expect(removed).toHaveLength(0);
    offB();
    expect(removed).toEqual([created[0].name]);
  });

  it("filtros distintos usan canales distintos", () => {
    const off1 = subscribeToTable({ table: "subaccounts", filter: "cliente_legajo=eq.A" }, vi.fn());
    const off2 = subscribeToTable({ table: "subaccounts", filter: "cliente_legajo=eq.B" }, vi.fn());
    expect(created).toHaveLength(2);
    off1();
    off2();
  });

  it("avisa al reconectar, no en la primera conexion", () => {
    const listener = vi.fn();
    const off = subscribeToTable({ table: "transactions" }, listener);
    created[0].status?.("SUBSCRIBED");
    expect(listener).not.toHaveBeenCalled();
    created[0].status?.("SUBSCRIBED");
    expect(listener).toHaveBeenCalledTimes(1);
    off();
  });
});
