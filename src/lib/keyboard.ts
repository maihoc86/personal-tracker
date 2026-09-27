import type { KeyboardEvent } from "react";

/**
 * True when the user pressed Enter to confirm an action — and NOT the Enter that
 * commits an in-progress IME composition (Vietnamese Telex/VNI, CJK, etc.).
 *
 * Without the `isComposing` guard, that composition-ending Enter also fires the
 * keydown handler, so a single keystroke submits twice (e.g. creates two tasks).
 */
export function isSubmitEnter(e: KeyboardEvent): boolean {
  return e.key === "Enter" && !e.nativeEvent.isComposing;
}

/** "⌘" on Apple platforms, "Ctrl" elsewhere. */
export const MOD_KEY =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";
