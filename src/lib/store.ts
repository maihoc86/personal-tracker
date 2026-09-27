import { useSyncExternalStore } from "react";
import { readStorage, writeStorage } from "./persistence";

export type Updater<T> = T | ((prev: T) => T);

export type Store<T> = {
  get: () => T;
  set: (next: Updater<T>) => void;
  subscribe: (listener: () => void) => () => void;
};

type PersistOptions<T> = {
  /** Turn whatever is in storage (maybe an older shape) into a valid value. */
  normalize?: (raw: unknown) => T;
  /** Coalesce writes for high-frequency state (typing); flushed on pagehide. */
  debounce?: number;
  /** Computes the starting value when the key is empty (e.g. from legacy data). */
  whenEmpty?: () => T;
};

/**
 * A tiny global store persisted to one localStorage key. Every component that
 * reads it sees the same value (unlike per-component useState), writes are
 * serialized back under the same key the app has always used, and changes made
 * in another tab are picked up through the `storage` event.
 */
export function createPersistedStore<T>(
  key: string,
  initial: T,
  options: PersistOptions<T> = {},
): Store<T> {
  const normalize = options.normalize ?? ((raw: unknown) => raw as T);
  const listeners = new Set<() => void>();
  let timer: number | undefined;
  // Read lazily on first use, so code that runs at startup (seeding sample
  // data, applying an import) can write storage before any store loads it.
  let loaded = false;
  let value = initial;
  const load = () => {
    if (loaded) return value;
    loaded = true;
    const stored = readStorage(key);
    if (stored !== undefined) {
      value = safeNormalize(normalize, stored, initial);
    } else if (options.whenEmpty) {
      value = options.whenEmpty();
      // Persist a migrated value right away so it stays stable (same ids)
      // across reloads even if nothing edits it.
      if (!Object.is(value, initial)) writeStorage(key, value);
    }
    return value;
  };

  const emit = () => listeners.forEach((l) => l());
  const flush = () => {
    if (timer === undefined) return;
    window.clearTimeout(timer);
    timer = undefined;
    writeStorage(key, value);
  };
  const persist = () => {
    if (!options.debounce) {
      writeStorage(key, value);
      return;
    }
    if (timer !== undefined) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = undefined;
      writeStorage(key, value);
    }, options.debounce);
  };

  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", flush);
    window.addEventListener("storage", (e) => {
      if (e.key !== key || e.storageArea !== window.localStorage) return;
      // Someone is typing here and their write hasn't landed yet: keep the
      // local edits rather than swapping the editor's content underneath them.
      // Our pending write wins and the other tab picks it up via this event.
      if (timer !== undefined) return;
      const raw = e.newValue === null ? undefined : safeParse(e.newValue);
      value = raw === undefined ? initial : safeNormalize(normalize, raw, initial);
      loaded = true;
      emit();
    });
  }

  return {
    get: load,
    set: (next) => {
      const current = load();
      const resolved =
        typeof next === "function" ? (next as (prev: T) => T)(current) : next;
      if (Object.is(resolved, current)) return;
      value = resolved;
      persist();
      emit();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Same interface, memory only — for transient app-wide UI state. */
export function createMemoryStore<T>(initial: T): Store<T> {
  const listeners = new Set<() => void>();
  let value = initial;
  return {
    get: () => value,
    set: (next) => {
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(value) : next;
      if (Object.is(resolved, value)) return;
      value = resolved;
      listeners.forEach((l) => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Subscribe a component to a store; re-renders when the value changes. */
export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function safeNormalize<T>(normalize: (raw: unknown) => T, raw: unknown, fallback: T): T {
  try {
    return normalize(raw);
  } catch {
    return fallback;
  }
}
