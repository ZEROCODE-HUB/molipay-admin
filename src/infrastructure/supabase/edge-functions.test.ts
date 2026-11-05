import { describe,expect,it,vi } from "vitest";

const invoke = vi.fn();
vi.mock("./client", () => ({ requireSupabase: () => ({ functions: { invoke } }) }));

const { invokeEdgeFunction } = await import("./edge-functions");
type AppError = import("@/shared/lib/errors").AppError;

const httpError = (status: number, body: unknown) => ({
  message: "Edge Function returned a non-2xx status code",
  context: new Response(JSON.stringify(body), { status }),
});

describe("invokeEdgeFunction", () => {
  it("devuelve los datos si no hay error", async () => {
    invoke.mockResolvedValueOnce({ data: { ok: true }, error: null });
    await expect(invokeEdgeFunction("f", {})).resolves.toEqual({ ok: true });
  });

  it("usa el mensaje en español que devuelve la funcion y clasifica por status", async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: httpError(409, { error: "Ese email ya tiene una cuenta." }),
    });
    await expect(invokeEdgeFunction("invite", {})).rejects.toMatchObject({
      kind: "conflict",
      message: "Ese email ya tiene una cuenta.",
      context: { operation: "invite" },
    });

    invoke.mockResolvedValueOnce({ data: null, error: httpError(403, { error: "Sin permiso" }) });
    await expect(invokeEdgeFunction("f", {})).rejects.toMatchObject({ kind: "permission" });
  });

  it("un 5xx no expone el detalle tecnico", async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: httpError(500, { error: "TypeError: x is undefined" }),
    });
    const error = (await invokeEdgeFunction("f", {}).catch((e: unknown) => e)) as AppError;
    expect(error.kind).toBe("unknown");
    expect(error.message).not.toContain("TypeError");
  });

  it("sin respuesta del servidor es un error de red (reintentable)", async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { message: "Failed to send a request" } });
    await expect(invokeEdgeFunction("f", {})).rejects.toMatchObject({
      kind: "network",
      retryable: true,
    });
  });
});
