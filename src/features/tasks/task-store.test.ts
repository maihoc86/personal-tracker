import { beforeEach, describe, expect, it, vi } from "vitest";
import { projectActions, projectStore } from "../projects/project-store";
import { taskActions, taskStore } from "./task-store";

vi.mock("sonner", () => ({ toast: vi.fn() }));

beforeEach(() => {
  window.localStorage.clear();
  taskStore.set([]);
  projectStore.set([]);
});

describe("taskActions", () => {
  it("adds tasks newest first with numbers and persists them", () => {
    const a = taskActions.add({ title: "Một" });
    const b = taskActions.add({ title: "Hai" });
    expect(taskStore.get().map((t) => t.title)).toEqual(["Hai", "Một"]);
    expect([a.number, b.number]).toEqual([1, 2]);
    expect(JSON.parse(window.localStorage.getItem("pt.todos")!)).toHaveLength(2);
  });

  it("patches through the bookkeeping (activity + doneAt)", () => {
    const t = taskActions.add({ title: "x" });
    taskActions.patch(t.id, { status: "done" });
    const saved = taskStore.get()[0];
    expect(saved.doneAt).toBeTypeOf("number");
    expect(saved.activity.map((a) => a.kind)).toEqual(["created", "status"]);
  });

  it("patches many tasks at once", () => {
    const a = taskActions.add({ title: "a" });
    const b = taskActions.add({ title: "b" });
    taskActions.patchMany([a.id, b.id], { priority: "urgent" });
    expect(taskStore.get().every((t) => t.priority === "urgent")).toBe(true);
  });

  it("removes and restores at the same position", () => {
    taskActions.add({ title: "a" });
    const b = taskActions.add({ title: "b" });
    taskActions.add({ title: "c" });
    const removed = taskActions.remove(b.id)!;
    expect(taskStore.get().map((t) => t.title)).toEqual(["c", "a"]);
    taskActions.restore(removed.task, removed.index);
    taskActions.restore(removed.task, removed.index); // idempotent
    expect(taskStore.get().map((t) => t.title)).toEqual(["c", "b", "a"]);
    expect(taskActions.remove("missing")).toBeNull();
  });

  it("adds and removes comments, ignoring blanks", () => {
    const t = taskActions.add({ title: "x" });
    taskActions.addComment(t.id, "   ");
    taskActions.addComment(t.id, " Xong phần 1 ");
    const [comment] = taskStore.get()[0].comments;
    expect(comment.text).toBe("Xong phần 1");
    taskActions.removeComment(t.id, comment.id);
    expect(taskStore.get()[0].comments).toEqual([]);
  });

  it("logs and removes time, ignoring non-positive values", () => {
    const t = taskActions.add({ title: "x" });
    taskActions.logTime(t.id, 0);
    taskActions.logTime(t.id, 25, "focus");
    const [log] = taskStore.get()[0].timeLogs;
    expect(log).toMatchObject({ minutes: 25, source: "focus" });
    taskActions.removeTimeLog(t.id, log.id);
    expect(taskStore.get()[0].timeLogs).toEqual([]);
  });

  it("reorders and removes many", () => {
    const a = taskActions.add({ title: "a" });
    const b = taskActions.add({ title: "b" });
    taskActions.reorder([{ ...a, status: "doing" }, b]);
    expect(taskStore.get().map((t) => [t.title, t.status])).toEqual([
      ["a", "doing"],
      ["b", "todo"],
    ]);
    taskActions.removeMany([a.id, b.id]);
    expect(taskStore.get()).toEqual([]);
  });
});

describe("projectActions", () => {
  it("creates projects with unique, clean keys", () => {
    const a = projectActions.add({ name: "Website", key: "web", color: "#111111", area: "work" });
    const b = projectActions.add({ name: "Web app", key: "WEB", color: "#222222", area: "work" });
    const c = projectActions.add({ name: "Inbox thật", key: "inb", color: "#333333", area: "personal" });
    expect([a.key, b.key]).toEqual(["WEB", "WEB2"]);
    expect(c.key).not.toBe("INB");
  });

  it("updates name and key without clobbering others", () => {
    const a = projectActions.add({ name: "A", key: "AAA", color: "#111111", area: "work" });
    projectActions.add({ name: "B", key: "BBB", color: "#111111", area: "work" });
    projectActions.update(a.id, { key: "BBB", name: "  " });
    const updated = projectStore.get().find((p) => p.id === a.id)!;
    expect(updated.key).toBe("BBB2");
    expect(updated.name).toBe("A");
  });

  it("moves a deleted project's tasks to the Inbox with Inbox numbers", () => {
    const p = projectActions.add({ name: "A", key: "AAA", color: "#111111", area: "work" });
    taskActions.add({ title: "inbox one" });
    const t = taskActions.add({ title: "in project", projectId: p.id });
    projectActions.remove(p.id);
    const moved = taskStore.get().find((x) => x.id === t.id)!;
    expect(projectStore.get()).toEqual([]);
    expect(moved).toMatchObject({ projectId: "", number: 2 });
  });

  it("reorders projects, keeping unknown ids out and the rest at the end", () => {
    const a = projectActions.add({ name: "A", key: "A", color: "#111111", area: "work" });
    const b = projectActions.add({ name: "B", key: "B", color: "#111111", area: "work" });
    const c = projectActions.add({ name: "C", key: "C", color: "#111111", area: "work" });
    projectActions.reorder([c.id, "nope", a.id]);
    expect(projectStore.get().map((p) => p.name)).toEqual(["C", "A", "B"]);
    expect(b.name).toBe("B");
  });
});
