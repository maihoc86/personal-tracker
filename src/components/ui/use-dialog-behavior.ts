import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

/** Open dialogs, newest last — only the top one reacts to Escape/Tab. */
const stack: symbol[] = [];

/**
 * A Radix popover/menu/select is open and should consume Escape first. Only
 * layers in the "open" state count — one that is still animating out (or a
 * hover tooltip) must not swallow the next Escape meant for the dialog.
 */
export function isPopperOpen(): boolean {
  return !!document.querySelector('[data-radix-popper-content-wrapper] > [data-state="open"]');
}

/**
 * Shared behaviour for modal surfaces (dialogs, the task sheet, the palette):
 * Escape closes only the top-most one, Tab stays inside it, background
 * scrolling is locked, and focus returns to the trigger on close.
 */
export function useDialogBehavior(
  open: boolean,
  onClose: () => void,
  ref: RefObject<HTMLElement | null>,
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const id = Symbol("dialog");
    stack.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === "Escape") {
        // Not `e.defaultPrevented`: a Radix layer still animating out keeps
        // calling preventDefault, which would swallow a quick second Escape.
        // Nested editors that own Escape stop propagation instead.
        if (isPopperOpen()) return;
        e.preventDefault();
        onCloseRef.current();
      } else if (e.key === "Tab") {
        trapTab(e, ref.current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      stack.splice(stack.indexOf(id), 1);
    };
  }, [open, ref]);

  useEffect(() => {
    if (!open) return;
    const active = document.activeElement as HTMLElement | null;
    const trigger = ref.current?.contains(active) ? null : active;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = window.setTimeout(() => {
      const el = ref.current;
      if (el && !el.contains(document.activeElement)) el.focus();
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.body.style.overflow = prevOverflow;
      if (trigger?.isConnected) trigger.focus();
    };
  }, [open, ref]);
}

/** True while any dialog is open (global shortcuts stay quiet). */
export function isDialogOpen(): boolean {
  return stack.length > 0;
}

function trapTab(e: KeyboardEvent, container: HTMLElement | null) {
  if (!container) return;
  const active = document.activeElement as HTMLElement | null;
  if (active && !container.contains(active)) return;
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null,
  );
  if (nodes.length === 0) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}
