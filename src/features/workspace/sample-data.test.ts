import { describe, expect, it } from "vitest";
import { migrateProjects } from "../projects/project-types";
import { migrateTasks } from "../tasks/task-model";
import { buildSampleData } from "./sample-data";

describe("buildSampleData", () => {
  const data = buildSampleData("2026-09-27", new Date(2026, 8, 27, 12).getTime());

  it("survives the migrations unchanged", () => {
    expect(migrateTasks(data.tasks)).toEqual(data.tasks);
    expect(migrateProjects(data.projects)).toEqual(data.projects);
  });

  it("numbers tasks uniquely per project and links real blockers", () => {
    const keys = data.tasks.map((t) => `${t.projectId}-${t.number}`);
    expect(new Set(keys).size).toBe(keys.length);
    const ids = new Set(data.tasks.map((t) => t.id));
    for (const t of data.tasks) for (const b of t.blockedBy) expect(ids.has(b)).toBe(true);
  });

  it("mixes work and personal projects plus inbox tasks", () => {
    expect(new Set(data.projects.map((p) => p.area))).toEqual(new Set(["work", "personal"]));
    expect(data.tasks.some((t) => t.projectId === "")).toBe(true);
  });

  it("gives every task a stage that matches its status", () => {
    for (const t of data.tasks) {
      const stages = data.workflows.byProject[t.projectId] ?? data.workflows.defaultStages;
      const stage = stages.find((s) => s.id === t.stageId);
      expect(stage?.category).toBe(t.status);
    }
    expect(data.tasks.some((t) => t.stageId === "web-review")).toBe(true);
  });

  it("includes material for every view", () => {
    expect(data.tasks.some((t) => t.status === "done" && t.timeLogs.length)).toBe(true);
    expect(data.tasks.some((t) => t.recurrence)).toBe(true);
    expect(data.tasks.some((t) => t.startDate && t.dueDate)).toBe(true);
    expect(data.focus.sessions.length).toBeGreaterThan(0);
    expect(data.notes.some((n) => n.pinned)).toBe(true);
  });
});
