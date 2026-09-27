import { describe, expect, it } from "vitest";
import { applyDrag, spanColumns, taskSpan } from "./timeline-model";
import type { Task } from "./task-types";

const t = (startDate: string, dueDate: string) => ({ startDate, dueDate }) as Task;

describe("taskSpan", () => {
  it("uses start/due, falling back to whichever exists", () => {
    expect(taskSpan(t("2026-09-01", "2026-09-05"))).toEqual({ start: "2026-09-01", end: "2026-09-05" });
    expect(taskSpan(t("", "2026-09-05"))).toEqual({ start: "2026-09-05", end: "2026-09-05" });
    expect(taskSpan(t("2026-09-03", ""))).toEqual({ start: "2026-09-03", end: "2026-09-03" });
    expect(taskSpan(t("2026-09-09", "2026-09-05"))).toEqual({ start: "2026-09-05", end: "2026-09-09" });
    expect(taskSpan(t("", ""))).toBeNull();
  });
});

describe("spanColumns", () => {
  const span = { start: "2026-09-25", end: "2026-10-02" };

  it("clips to the window and reports clipping", () => {
    expect(spanColumns(span, "2026-09-28", 14)).toEqual({ from: 0, to: 4, clippedStart: true, clippedEnd: false });
    expect(spanColumns(span, "2026-09-20", 7)).toEqual({ from: 5, to: 6, clippedStart: false, clippedEnd: true });
  });

  it("returns null outside the window", () => {
    expect(spanColumns(span, "2026-10-03", 7)).toBeNull();
    expect(spanColumns(span, "2026-09-01", 7)).toBeNull();
  });
});

describe("applyDrag", () => {
  const task = t("2026-09-10", "2026-09-12");

  it("moves both ends", () => {
    expect(applyDrag(task, "move", 3)).toEqual({ startDate: "2026-09-13", dueDate: "2026-09-15" });
  });

  it("resizes without inverting the range", () => {
    expect(applyDrag(task, "resize-end", 2)).toEqual({ startDate: "2026-09-10", dueDate: "2026-09-14" });
    expect(applyDrag(task, "resize-end", -5)).toEqual({ startDate: "2026-09-10", dueDate: "2026-09-10" });
    expect(applyDrag(task, "resize-start", -1)).toEqual({ startDate: "2026-09-09", dueDate: "2026-09-12" });
    expect(applyDrag(task, "resize-start", 9)).toEqual({ startDate: "2026-09-12", dueDate: "2026-09-12" });
  });

  it("fills in a missing start when dragging a due-only task", () => {
    expect(applyDrag(t("", "2026-09-12"), "resize-start", -2)).toEqual({ startDate: "2026-09-10", dueDate: "2026-09-12" });
  });

  it("ignores zero or undated drags", () => {
    expect(applyDrag(task, "move", 0)).toBeNull();
    expect(applyDrag(t("", ""), "move", 2)).toBeNull();
  });
});
