import { describe, expect, it } from "vitest";
import {
  applyTaskChanges,
  createTask,
  diffActivity,
  migrateTasks,
  nextNumber,
  type ChangeContext,
} from "./task-model";
import type { Task } from "./task-types";

function ctx(overrides: Partial<ChangeContext> = {}): ChangeContext {
  let n = 0;
  return { now: 1000, today: "2026-09-27", makeId: () => `id${++n}`, ...overrides };
}

function task(overrides: Partial<Task> = {}): Task {
  return createTask({ title: "Việc", ...overrides }, [], {
    now: 1,
    today: "2026-09-27",
    makeId: () => overrides.id ?? "t",
  });
}

describe("createTask", () => {
  it("fills defaults and records creation", () => {
    const t = createTask({ title: "  Viết báo cáo " }, [], ctx());
    expect(t).toMatchObject({
      title: "Viết báo cáo",
      number: 1,
      projectId: "",
      status: "todo",
      priority: "medium",
      tags: [],
      createdAt: 1000,
    });
    expect(t.activity).toEqual([{ id: "id2", at: 1000, kind: "created" }]);
  });

  it("numbers after existing tasks in the same project only", () => {
    const existing = [
      { ...task({ id: "a" }), projectId: "p", number: 4 },
      { ...task({ id: "b" }), projectId: "", number: 9 },
    ];
    expect(createTask({ title: "x", projectId: "p" }, existing, ctx()).number).toBe(5);
    expect(nextNumber(existing, "q")).toBe(1);
  });

  it("drops the due time when there is no due date", () => {
    expect(createTask({ title: "x", dueTime: "09:00" }, [], ctx()).dueTime).toBe("");
  });

  it("stamps doneAt when created as done", () => {
    expect(createTask({ title: "x", status: "done" }, [], ctx()).doneAt).toBe(1000);
  });
});

describe("diffActivity", () => {
  it("records only fields that changed", () => {
    const before = task();
    const after = { ...before, status: "doing" as const, dueDate: "2026-10-01" };
    const entries = diffActivity(before, after, ctx());
    expect(entries.map((e) => [e.kind, e.from, e.to])).toEqual([
      ["status", "todo", "doing"],
      ["due", "", "2026-10-01"],
    ]);
  });
});

describe("applyTaskChanges", () => {
  it("leaves untouched tasks as the same objects", () => {
    const a = task({ id: "a" });
    const out = applyTaskChanges([a], [a], ctx());
    expect(out[0]).toBe(a);
  });

  it("stamps updatedAt, doneAt and activity on status change", () => {
    const a = task({ id: "a" });
    const [out] = applyTaskChanges([a], [{ ...a, status: "done" }], ctx());
    expect(out.updatedAt).toBe(1000);
    expect(out.doneAt).toBe(1000);
    expect(out.activity.at(-1)).toMatchObject({ kind: "status", from: "todo", to: "done" });
  });

  it("clears doneAt when reopened", () => {
    const a = { ...task({ id: "a" }), status: "done" as const, doneAt: 5 };
    const [out] = applyTaskChanges([a], [{ ...a, status: "todo" }], ctx());
    expect(out.doneAt).toBeUndefined();
  });

  it("renumbers a task moved to another project", () => {
    const a = { ...task({ id: "a" }), projectId: "p", number: 3 };
    const b = { ...task({ id: "b" }), projectId: "q", number: 7 };
    const out = applyTaskChanges([a, b], [a, { ...b, projectId: "p" }], ctx());
    expect(out[1]).toMatchObject({ projectId: "p", number: 4 });
  });

  it("numbers several tasks moved into one project consecutively", () => {
    const a = { ...task({ id: "a" }), projectId: "p", number: 5 };
    const b = { ...task({ id: "b" }), projectId: "q", number: 9 };
    const c = { ...task({ id: "c" }), projectId: "q", number: 10 };
    const out = applyTaskChanges([a, b, c], [a, { ...b, projectId: "p" }, { ...c, projectId: "p" }], ctx());
    expect(out.map((t) => t.number)).toEqual([5, 6, 7]);
  });

  it("spawns the next occurrence of a completed recurring task", () => {
    const a = {
      ...task({ id: "a" }),
      dueDate: "2026-09-27",
      startDate: "2026-09-26",
      recurrence: { freq: "weekly" as const, interval: 1 },
      checklist: [{ id: "c", text: "x", done: true }],
      comments: [{ id: "m", text: "hi", at: 1 }],
    };
    const out = applyTaskChanges([a], [{ ...a, status: "done" }], ctx());
    expect(out).toHaveLength(2);
    const [next, done] = out;
    expect(next).toMatchObject({
      status: "todo",
      dueDate: "2026-10-04",
      startDate: "2026-10-03",
      number: 2,
      comments: [],
      recurrence: { freq: "weekly", interval: 1 },
    });
    expect(next.checklist[0].done).toBe(false);
    expect(done.recurrence).toBeUndefined();
    expect(done.activity.at(-1)).toMatchObject({ kind: "recurred", to: "2026-10-04" });
  });

  it("does not respawn when an already-done task is edited", () => {
    const a = {
      ...task({ id: "a" }),
      status: "done" as const,
      recurrence: { freq: "daily" as const, interval: 1 },
    };
    expect(applyTaskChanges([a], [{ ...a, title: "y" }], ctx())).toHaveLength(1);
  });
});

describe("migrateTasks", () => {
  it("returns [] for non-arrays", () => {
    expect(migrateTasks(null)).toEqual([]);
    expect(migrateTasks({})).toEqual([]);
  });

  it("upgrades legacy tasks with defaults and numbers by age", () => {
    const legacy = [
      { id: "b", title: "B", description: "", dueDate: "", status: "todo", createdAt: 20 },
      { id: "a", title: "A", description: "", dueDate: "2026-09-30", status: "done", createdAt: 10 },
      { nope: true },
    ];
    const out = migrateTasks(legacy);
    expect(out.map((t) => [t.id, t.number])).toEqual([
      ["b", 2],
      ["a", 1],
    ]);
    expect(out[1]).toMatchObject({
      projectId: "",
      priority: "medium",
      tags: [],
      comments: [],
      doneAt: 10,
      updatedAt: 10,
    });
  });

  it("repairs invalid values and duplicate numbers", () => {
    const out = migrateTasks([
      { id: "a", title: "A", number: 1, status: "weird", priority: "x", dueDate: "31/12", createdAt: 1 },
      { id: "b", title: "B", number: 1, createdAt: 2, estimatedHours: -2, recurrence: { freq: "hourly" } },
      { id: "b", title: "dupe id", createdAt: 3 },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ status: "todo", priority: "medium", dueDate: "", number: 1 });
    expect(out[1]).toMatchObject({ number: 2, estimatedHours: undefined, recurrence: undefined });
  });

  it("keeps valid nested records and drops broken ones", () => {
    const [t] = migrateTasks([
      {
        id: "a",
        title: "A",
        createdAt: 1,
        checklist: [{ id: "c", text: "x", done: true }, "bad"],
        comments: [{ id: "m", text: "hi", at: 5 }, { id: 1 }],
        timeLogs: [{ id: "l", minutes: 30, at: 5, source: "focus" }, { id: "z", minutes: 0 }],
        activity: [{ id: "x", at: 1, kind: "status", from: "todo", to: "done" }, { id: "y", kind: "?" }],
        blockedBy: ["b", 3],
        recurrence: { freq: "monthly", interval: 2 },
      },
    ]);
    expect(t.checklist).toHaveLength(1);
    expect(t.comments).toHaveLength(1);
    expect(t.timeLogs).toEqual([{ id: "l", minutes: 30, at: 5, source: "focus" }]);
    expect(t.activity).toHaveLength(1);
    expect(t.blockedBy).toEqual(["b"]);
    expect(t.recurrence).toEqual({ freq: "monthly", interval: 2 });
  });
});
