import { describe, expect, it } from "vitest";
import type { Task } from "../tasks/task-types";
import { CATCH_UP_MS, collectReminders, digestText, remember } from "./reminder-model";

const settings = { enabled: true, leadMinutes: 15, digestTime: "08:30" };
const at = (h: number, m = 0, day = 28) => new Date(2026, 8, day, h, m).getTime();
const t = (id: string, o: Partial<Task> = {}) =>
  ({ id, status: "todo", dueDate: "", dueTime: "", plannedFor: "", ...o }) as Task;

describe("collectReminders", () => {
  const tasks = [
    t("timed", { dueDate: "2026-09-28", dueTime: "14:00" }),
    t("custom", { remindAt: at(10, 5) }),
    t("done", { status: "done", dueDate: "2026-09-28", dueTime: "13:00" }),
    t("untimed", { dueDate: "2026-09-28" }),
  ];

  it("fires the due reminder lead minutes early, once", () => {
    const r = collectReminders(tasks, settings, at(13, 40), at(13, 45), new Set());
    expect(r).toEqual([{ key: "due:timed:2026-09-28T14:00", kind: "due", at: at(13, 45), taskId: "timed" }]);
    expect(collectReminders(tasks, settings, at(13, 40), at(13, 50), new Set([r[0].key]))).toEqual([]);
  });

  it("fires custom reminders and the daily digest", () => {
    const r = collectReminders(tasks, settings, at(8), at(10, 10), new Set());
    expect(r.map((x) => x.kind)).toEqual(["digest", "custom"]);
    expect(r[0].key).toBe("digest:2026-09-28");
  });

  it("skips reminders missed long ago and respects the switch", () => {
    expect(collectReminders(tasks, settings, 0, at(10, 5) + CATCH_UP_MS + 1, new Set()).some((r) => r.kind === "custom")).toBe(false);
    expect(collectReminders(tasks, { ...settings, enabled: false }, at(8), at(15), new Set())).toEqual([]);
    expect(collectReminders(tasks, { ...settings, digestTime: "" }, at(8), at(9), new Set())).toEqual([]);
  });
});

describe("helpers", () => {
  it("bounds the fired log", () => {
    expect(remember(["a", "b"], ["b", "c"], 2)).toEqual(["b", "c"]);
  });

  it("summarizes the day", () => {
    const today = "2026-09-28";
    expect(digestText([t("a", { dueDate: "2026-09-20" }), t("b", { dueDate: today, plannedFor: today })], today)).toBe(
      "1 việc quá hạn · 1 việc hạn hôm nay · 1 việc trong kế hoạch",
    );
    expect(digestText([], today)).toMatch(/lên kế hoạch/);
  });
});
