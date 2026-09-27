/** Low-level localStorage access shared by every persisted store/hook. */

/** Fired when a write fails because localStorage is full; UI shows a warning. */
export const STORAGE_FULL_EVENT = "pt:storage-full";

/**
 * Set just before the app wipes storage and reloads. A debounced field (e.g.
 * a note being typed) flushes its in-memory value on `pagehide`; without this
 * guard that flush would re-write the value right after we removed it.
 */
let persistSuspended = false;

export function suspendPersistence() {
  persistSuspended = true;
}

/** Test hook: undo suspendPersistence between cases. */
export function resumePersistence() {
  persistSuspended = false;
}

/** Parsed JSON at `key`, or undefined when missing/corrupt/unavailable. */
export function readStorage(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? undefined : (JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}

/** Serialize `value` to `key`; warns the UI instead of throwing when full. */
export function writeStorage(key: string, value: unknown): boolean {
  if (persistSuspended) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    // Quota exceeded or storage unavailable — keep state in memory only and
    // warn the user instead of failing silently (which loses data on reload).
    if (isQuotaError(e)) window.dispatchEvent(new CustomEvent(STORAGE_FULL_EVENT));
    return false;
  }
}

function isQuotaError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === "QuotaExceededError" ||
      e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      e.code === 22)
  );
}
