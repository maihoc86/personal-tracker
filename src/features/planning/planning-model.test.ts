import { describe, expect, it } from "vitest";
import type { Task } from "../tasks/task-types";
import { capacitySummary, planBuckets, remainingHours } from "./planning-model";

const today = "2026-09-28";
const t = (id: string, o: Partial<Task> = {}) =>
  ({ id, status: "todo", priority: "medium", dueDate: "", dueTime: "", plannedFor: "", timeLogs: [], ...o }) as Task;

describe("planBuckets", () => {
  it("splits planned, carried-over and suggested work", () => {
    const b = planBuckets(
      [
        t("p1", { plannedFor: today, priority: "low" }),
        t("p2", { plannedFor: today, priority: "urgent" }),
        t("old", { plannedFor: "2026-09-27" }),
        t("due", { dueDate: today }),
        t("late", { dueDate: "2026-09-20" }),
        t("wip", { status: "doing" }),
        t("later", { dueDate: "2026-10-10" }),
        t("done", { plannedFor: today, status: "done" }),
      ],
      today,
    );
    expect(b.planned.map((x) => x.id)).toEqual(["p2", "p1"]);
    expect(b.carryOver.map((x) => x.id)).toEqual(["old"]);
    expect(b.suggestions.map((x) => x.id).sort()).toEqual(["due", "late", "wip"]);
  });
});

describe("capacity", () => {
  it("counts remaining estimate and flags overload", () => {
    const planned = [
      t("a", { estimatedHours: 3, timeLogs: [{ id: "l", minutes: 60, at: 0, source: "manual" }] }),
      t("b", { estimatedHours: 5 }),
      t("c"),
      t("d", { estimatedHours: 1, timeLogs: [{ id: "l", minutes: 120, at: 0, source: "focus" }] }),
    ];
    expect(remainingHours(planned[3])).toBe(0);
    expect(remainingHours(planned[2])).toBeNull();
    expect(capacitySummary(planned, 6)).toEqual({ plannedHours: 7, capacityHours: 6, unestimated: 1, overBy: 1, ratio: 7 / 6 });
    expect(capacitySummary([], 0).ratio).toBe(0);
  });
});
