import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";

type AuthCallback = (event: string, session: { user: { id: string } } | null) => void;
let emit: AuthCallback = () => undefined;

vi.mock("@/infrastructure/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: AuthCallback) => {
        emit = cb;
        return { data: { subscription: { unsubscribe: () => undefined } } };
      },
    },
  },
}));

const { bindQueryCacheToSession } = await import("./session-cache");

describe("bindQueryCacheToSession", () => {
  beforeEach(() => vi.stubGlobal("window", {}));
  afterEach(() => vi.unstubAllGlobals());

  it("usuario A sale y entra B: no queda nada de A en la cache", () => {
    const client = new QueryClient();
    bindQueryCacheToSession(client);

    emit("INITIAL_SESSION", { user: { id: "A" } });
    client.setQueryData(["private", "A", "rbac", "roles"], ["datos de A"]);

    emit("SIGNED_OUT", null);
    emit("SIGNED_IN", { user: { id: "B" } });

    expect(client.getQueryData(["private", "A", "rbac", "roles"])).toBeUndefined();
  });

  it("entrar otro usuario sin pasar por SIGNED_OUT tambien vacia la cache", () => {
    const client = new QueryClient();
    bindQueryCacheToSession(client);

    emit("INITIAL_SESSION", { user: { id: "A" } });
    client.setQueryData(["private", "A", "x"], 1);
    emit("SIGNED_IN", { user: { id: "B" } });

    expect(client.getQueryData(["private", "A", "x"])).toBeUndefined();
  });

  it("renovar el token del mismo usuario no borra la cache", () => {
    const client = new QueryClient();
    bindQueryCacheToSession(client);

    emit("INITIAL_SESSION", { user: { id: "A" } });
    client.setQueryData(["private", "A", "x"], 1);
    emit("TOKEN_REFRESHED", { user: { id: "A" } });

    expect(client.getQueryData(["private", "A", "x"])).toBe(1);
  });
});
