import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resumePersistence, STORAGE_FULL_EVENT, suspendPersistence } from "./persistence";
import { createMemoryStore, createPersistedStore } from "./store";

beforeEach(() => {
  window.localStorage.clear();
  resumePersistence();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("createPersistedStore", () => {
  it("starts from the initial value when storage is empty", () => {
    const store = createPersistedStore("k", [1]);
    expect(store.get()).toEqual([1]);
  });

  it("reads and normalizes an existing value", () => {
    window.localStorage.setItem("k", JSON.stringify([1, 2]));
    const store = createPersistedStore<number[]>("k", [], {
      normalize: (raw) => (raw as number[]).map((n) => n * 10),
    });
    expect(store.get()).toEqual([10, 20]);
  });

  it("falls back to the initial value when normalize throws", () => {
    window.localStorage.setItem("k", JSON.stringify("bad"));
    const store = createPersistedStore<number[]>("k", [7], {
      normalize: () => {
        throw new Error("boom");
      },
    });
    expect(store.get()).toEqual([7]);
  });

  it("reads storage lazily on first access", () => {
    const store = createPersistedStore("k", 0);
    window.localStorage.setItem("k", "5");
    expect(store.get()).toBe(5);
  });

  it("uses whenEmpty only when the key is missing, persisting its result", () => {
    const empty = createPersistedStore("k", 0, { whenEmpty: () => 3 });
    expect(empty.get()).toBe(3);
    expect(window.localStorage.getItem("k")).toBe("3");
    window.localStorage.setItem("k2", "8");
    const filled = createPersistedStore("k2", 0, { whenEmpty: () => 3 });
    expect(filled.get()).toBe(8);
  });

  it("persists and notifies on set, including updater functions", () => {
    const store = createPersistedStore("k", 1);
    const listener = vi.fn();
    store.subscribe(listener);
    store.set((n) => n + 1);
    expect(store.get()).toBe(2);
    expect(window.localStorage.getItem("k")).toBe("2");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("skips notification when the value is unchanged", () => {
    const store = createPersistedStore("k", 1);
    const listener = vi.fn();
    store.subscribe(listener);
    store.set(1);
    expect(listener).not.toHaveBeenCalled();
  });

  it("stops notifying after unsubscribe", () => {
    const store = createPersistedStore("k", 1);
    const listener = vi.fn();
    const off = store.subscribe(listener);
    off();
    store.set(2);
    expect(listener).not.toHaveBeenCalled();
  });

  it("debounces writes and flushes on pagehide", () => {
    vi.useFakeTimers();
    const store = createPersistedStore("k", "", { debounce: 300 });
    store.set("a");
    store.set("ab");
    expect(window.localStorage.getItem("k")).toBeNull();
    vi.advanceTimersByTime(300);
    expect(window.localStorage.getItem("k")).toBe('"ab"');
    store.set("abc");
    window.dispatchEvent(new Event("pagehide"));
    expect(window.localStorage.getItem("k")).toBe('"abc"');
  });

  it("does not write while persistence is suspended", () => {
    const store = createPersistedStore("k", 1);
    suspendPersistence();
    store.set(5);
    expect(window.localStorage.getItem("k")).toBeNull();
  });

  it("warns when storage is full", () => {
    const onFull = vi.fn();
    window.addEventListener(STORAGE_FULL_EVENT, onFull);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    const store = createPersistedStore("k", 1);
    store.set(2);
    expect(store.get()).toBe(2);
    expect(onFull).toHaveBeenCalledTimes(1);
    window.removeEventListener(STORAGE_FULL_EVENT, onFull);
  });

  it("picks up changes written by another tab", () => {
    const store = createPersistedStore("k", 1);
    const listener = vi.fn();
    store.subscribe(listener);
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "k",
        newValue: "9",
        storageArea: window.localStorage,
      }),
    );
    expect(store.get()).toBe(9);
    expect(listener).toHaveBeenCalled();
  });
});

describe("createMemoryStore", () => {
  it("notifies without touching storage", () => {
    const store = createMemoryStore({ open: false });
    const listener = vi.fn();
    store.subscribe(listener);
    store.set((s) => ({ ...s, open: true }));
    store.set(store.get());
    expect(store.get()).toEqual({ open: true });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(window.localStorage.length).toBe(0);
  });
});

describe("cross-tab updates during a pending debounced write", () => {
  it("keeps local edits and writes them when the timer fires", () => {
    vi.useFakeTimers();
    const store = createPersistedStore("notes", "", { debounce: 300 });
    store.get();
    store.set("typed here");
    window.dispatchEvent(
      new StorageEvent("storage", { key: "notes", newValue: '"from other tab"', storageArea: window.localStorage }),
    );
    expect(store.get()).toBe("typed here");
    vi.advanceTimersByTime(300);
    expect(window.localStorage.getItem("notes")).toBe('"typed here"');
  });
});
