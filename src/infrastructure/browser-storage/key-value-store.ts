/**
 * Preferencias y cachés del navegador (localStorage / sessionStorage / memoria).
 *
 * - Cada valor se guarda con versión y fecha: si cambia la versión o vence el
 *   TTL, se descarta.
 * - Nunca lanza: sin storage (modo privado, bloqueado) usa memoria; en SSR no
 *   lee ni guarda nada (no hay usuario y la memoria del servidor es compartida).
 * - `validate` descarta valores con forma inesperada.
 *
 * Nunca guardar tokens, contraseñas ni secretos: la sesión la maneja el SDK de auth.
 */

export type StorageKind = "local" | "session" | "memory";

export type KeyValueStore<T> = {
  get(): T | null;
  set(value: T): void;
  remove(): void;
};

type Backend = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type Envelope = { v: number; t: number; d: unknown };

const memory = new Map<string, string>();
const memoryBackend: Backend = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => void memory.set(key, value),
  removeItem: (key) => void memory.delete(key),
};

function resolveBackend(kind: StorageKind): Backend | null {
  if (typeof window === "undefined") return null;
  if (kind === "memory") return memoryBackend;
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return memoryBackend;
  }
}

export function createKeyValueStore<T>({
  key,
  storage = "local",
  version = 1,
  ttlMs,
  validate,
}: {
  key: string;
  storage?: StorageKind;
  version?: number;
  ttlMs?: number;
  validate?: (value: unknown) => value is T;
}): KeyValueStore<T> {
  return {
    get() {
      const backend = resolveBackend(storage);
      if (!backend) return null;
      try {
        const raw = backend.getItem(key);
        if (!raw) return null;
        const envelope = JSON.parse(raw) as Partial<Envelope>;
        if (envelope?.v !== version || typeof envelope.t !== "number") return null;
        if (ttlMs !== undefined && Date.now() - envelope.t > ttlMs) return null;
        if (validate && !validate(envelope.d)) return null;
        return envelope.d as T;
      } catch {
        return null;
      }
    },
    set(value) {
      const backend = resolveBackend(storage);
      if (!backend) return;
      const envelope: Envelope = { v: version, t: Date.now(), d: value };
      try {
        backend.setItem(key, JSON.stringify(envelope));
      } catch {
        /* storage lleno o bloqueado: se sigue sin guardar */
      }
    },
    remove() {
      const backend = resolveBackend(storage);
      if (!backend) return;
      try {
        backend.removeItem(key);
      } catch {
        /* storage bloqueado */
      }
    },
  };
}
