import { useEffect, useState } from "react";
import { readStorage, writeStorage } from "./persistence";

/**
 * Persist a small piece of per-component UI state (a chosen view, a collapsed
 * section) in localStorage. Shared domain data uses createPersistedStore.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = readStorage(key);
    return stored === undefined ? initialValue : (stored as T);
  });

  useEffect(() => {
    writeStorage(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}
