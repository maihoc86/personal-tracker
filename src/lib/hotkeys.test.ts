import { act } from "react";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isTypingTarget, useHotkeys } from "./hotkeys";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(handlers: Parameters<typeof useHotkeys>[0]) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  function Probe() {
    useHotkeys(handlers);
    return null;
  }
  act(() => root.render(createElement(Probe)));
  return () => act(() => root.unmount());
}

const press = (key: string, init: KeyboardEventInit = {}, target: EventTarget = window) =>
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }));

let unmount: (() => void) | undefined;
afterEach(() => unmount?.());

describe("useHotkeys", () => {
  it("fires the palette on Cmd/Ctrl+K, single keys and g-chords", () => {
    const h = { onPalette: vi.fn(), keys: { c: vi.fn() }, goto: { h: vi.fn() } };
    unmount = mount(h);
    press("k", { metaKey: true });
    press("c");
    press("g");
    press("h");
    expect(h.onPalette).toHaveBeenCalledTimes(1);
    expect(h.keys.c).toHaveBeenCalledTimes(1);
    expect(h.goto.h).toHaveBeenCalledTimes(1);
  });

  it("ignores keys typed into fields", () => {
    const h = { onPalette: vi.fn(), keys: { c: vi.fn() }, goto: {} };
    unmount = mount(h);
    const input = document.createElement("input");
    document.body.appendChild(input);
    press("c", {}, input);
    expect(h.keys.c).not.toHaveBeenCalled();
  });
});

describe("isTypingTarget", () => {
  it("recognizes editable elements", () => {
    expect(isTypingTarget(document.createElement("textarea"))).toBe(true);
    expect(isTypingTarget(document.createElement("button"))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
