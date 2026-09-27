import { describe, expect, it } from "vitest";
import {
  completePhase,
  initialFocus,
  isDue,
  migrateFocus,
  pause,
  progress,
  remainingMs,
  reset,
  selectPreset,
  start,
  switchPhase,
} from "./focus-model";

const MIN = 60_000;

describe("focus timer", () => {
  it("starts, counts down and pauses keeping the remainder", () => {
    const s0 = initialFocus();
    const s1 = start(s0, 0);
    expect(s1).toMatchObject({ running: true, endsAt: 25 * MIN });
    expect(start(s1, 5)).toBe(s1);
    expect(remainingMs(s1, 10 * MIN)).toBe(15 * MIN);
    expect(progress(s1, 10 * MIN)).toBeCloseTo(0.4);
    const s2 = pause(s1, 10 * MIN);
    expect(s2).toMatchObject({ running: false, endsAt: null, remainingMs: 15 * MIN });
    expect(pause(s2, 0)).toBe(s2);
    expect(start(s2, 100).endsAt).toBe(100 + 15 * MIN);
  });

  it("is due once the end passes", () => {
    const s = start(initialFocus(), 0);
    expect(isDue(s, 25 * MIN - 1)).toBe(false);
    expect(isDue(s, 25 * MIN)).toBe(true);
    expect(isDue(initialFocus(), 1e12)).toBe(false);
  });

  it("records a session when focus completes and pauses into a break", () => {
    const s = { ...start(initialFocus(), 0), taskId: "t1" };
    const { state, finished } = completePhase(s, 25 * MIN);
    expect(finished).toEqual({ at: 25 * MIN, minutes: 25, taskId: "t1" });
    expect(state).toMatchObject({ phase: "break", running: false, remainingMs: 5 * MIN });
    expect(state.sessions).toHaveLength(1);
    const back = completePhase(state, 0);
    expect(back.finished).toBeUndefined();
    expect(back.state.phase).toBe("focus");
  });

  it("switches presets and phases, resetting time", () => {
    const deep = selectPreset(initialFocus(), "deep");
    expect(deep.remainingMs).toBe(50 * MIN);
    expect(switchPhase(deep, "break").remainingMs).toBe(10 * MIN);
    expect(reset(pause(start(deep, 0), MIN)).remainingMs).toBe(50 * MIN);
  });
});

describe("migrateFocus", () => {
  it("falls back to defaults for garbage", () => {
    expect(migrateFocus(null)).toEqual(initialFocus());
    expect(migrateFocus({ presetId: "nope", running: true }).running).toBe(false);
  });

  it("keeps a running timer and valid sessions", () => {
    const s = migrateFocus({
      presetId: "deep",
      phase: "break",
      running: true,
      endsAt: 99,
      remainingMs: 5,
      taskId: "t",
      sessions: [{ at: 1, minutes: 25, taskId: "t" }, { at: "x" }, null],
    });
    expect(s).toMatchObject({ presetId: "deep", phase: "break", running: true, endsAt: 99, taskId: "t" });
    expect(s.sessions).toEqual([{ at: 1, minutes: 25, taskId: "t" }]);
  });
});
