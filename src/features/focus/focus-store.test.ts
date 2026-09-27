import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialFocus } from "./focus-model";
import { focusActions, focusStore } from "./focus-store";

vi.mock("../../lib/notify", () => ({ ensureNotifyPermission: vi.fn(), notify: vi.fn(), playChime: vi.fn() }));

beforeEach(() => focusStore.set(initialFocus()));

describe("focusActions", () => {
  it("toggles between running and paused", () => {
    focusActions.toggle();
    expect(focusStore.get().running).toBe(true);
    focusActions.toggle();
    expect(focusStore.get().running).toBe(false);
  });

  it("starts a focus session on a task from any phase", () => {
    focusActions.skip();
    expect(focusStore.get().phase).toBe("break");
    focusActions.startOn("t1");
    expect(focusStore.get()).toMatchObject({ phase: "focus", running: true, taskId: "t1" });
  });

  it("selects presets, links tasks and resets", () => {
    focusActions.selectPreset("deep");
    focusActions.setTask("t2");
    expect(focusStore.get()).toMatchObject({ presetId: "deep", taskId: "t2", remainingMs: 50 * 60_000 });
    focusActions.toggle();
    focusActions.reset();
    expect(focusStore.get()).toMatchObject({ running: false, remainingMs: 50 * 60_000 });
  });
});
