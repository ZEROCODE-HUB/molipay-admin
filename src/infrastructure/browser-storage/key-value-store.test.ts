import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { createKeyValueStore } from "./key-value-store";

function fakeStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

describe("createKeyValueStore", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: fakeStorage(), sessionStorage: fakeStorage() });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("guarda, lee y borra", () => {
    const store = createKeyValueStore<string[]>({ key: "k", validate: isStringArray });
    expect(store.get()).toBeNull();
    store.set(["a", "b"]);
    expect(store.get()).toEqual(["a", "b"]);
    store.remove();
    expect(store.get()).toBeNull();
  });

  it("descarta lo guardado con otra versión", () => {
    createKeyValueStore<number>({ key: "k", version: 1 }).set(5);
    expect(createKeyValueStore<number>({ key: "k", version: 2 }).get()).toBeNull();
  });

  it("descarta lo vencido", () => {
    vi.useFakeTimers();
    const store = createKeyValueStore<number>({ key: "k", ttlMs: 1000 });
    store.set(1);
    vi.advanceTimersByTime(1001);
    expect(store.get()).toBeNull();
  });

  it("descarta valores con forma inesperada o JSON roto", () => {
    window.localStorage.setItem("k", "no-es-json");
    const store = createKeyValueStore<string[]>({ key: "k", validate: isStringArray });
    expect(store.get()).toBeNull();
    window.localStorage.setItem("k", JSON.stringify({ v: 1, t: Date.now(), d: [1, 2] }));
    expect(store.get()).toBeNull();
  });

  it("sin storage disponible usa memoria y no lanza", () => {
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new Error("bloqueado");
      },
    });
    const store = createKeyValueStore<number>({ key: "mem-test" });
    store.set(7);
    expect(store.get()).toBe(7);
  });

  it("en el servidor (sin window) no lee ni guarda", () => {
    vi.unstubAllGlobals();
    const store = createKeyValueStore<number>({ key: "k" });
    store.set(1);
    expect(store.get()).toBeNull();
  });
});
