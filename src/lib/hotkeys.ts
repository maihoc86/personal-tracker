import { useEffect, useRef } from "react";
import { isDialogOpen, isPopperOpen } from "../components/ui/use-dialog-behavior";

/** True when the keystroke belongs to a text field, not to a shortcut. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    el.isContentEditable ||
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT"
  );
}

type Handlers = {
  /** ⌘K / Ctrl+K — works everywhere, even inside fields. */
  onPalette: () => void;
  /** Single keys, e.g. { c: createTask }. Ignored while typing or in a dialog. */
  keys: Record<string, () => void>;
  /** "g" then a key, e.g. { h: goToday }. */
  goto: Record<string, () => void>;
};

/** Global keyboard shortcuts (Linear-style single keys + "g" chords). */
export function useHotkeys(handlers: Handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    let chordUntil = 0;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current.onPalette();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (isTypingTarget(e.target) || isDialogOpen() || isPopperOpen()) return;
      const key = e.key.toLowerCase();

      if (Date.now() < chordUntil) {
        chordUntil = 0;
        const go = ref.current.goto[key];
        if (go) {
          e.preventDefault();
          go();
        }
        return;
      }
      if (key === "g") {
        chordUntil = Date.now() + 1200;
        return;
      }
      const action = ref.current.keys[e.key] ?? ref.current.keys[key];
      if (action) {
        e.preventDefault();
        action();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
