import { describe, expect, it } from "vitest";
import type { Task } from "../tasks/task-types";
import {
  DEFAULT_STAGES,
  initialWorkflow,
  migrateWorkflow,
  pickStage,
  reconcileStages,
  resolveStage,
  stagesFor,
  validateStages,
  type Stage,
  type WorkflowState,
} from "./workflow-model";

const software: Stage[] = [
  { id: "bl", name: "Backlog", category: "backlog" },
  { id: "td", name: "Cần làm", category: "todo" },
  { id: "dev", name: "Đang làm", category: "doing" },
  { id: "rv", name: "Review", category: "doing" },
  { id: "ok", name: "Hoàn thành", category: "done" },
];
const simple: Stage[] = [
  { id: "a", name: "Cần làm", category: "todo" },
  { id: "b", name: "Đang làm", category: "doing" },
  { id: "c", name: "Xong", category: "done" },
];
const state: WorkflowState = { defaultStages: DEFAULT_STAGES, byProject: { web: software, home: simple } };

const t = (o: Partial<Task>): Task => ({ id: "t", projectId: "", stageId: "", status: "todo", ...o }) as Task;

describe("stagesFor", () => {
  it("uses project stages or the default", () => {
    expect(stagesFor(state, "web")).toBe(software);
    expect(stagesFor(state, "")).toBe(DEFAULT_STAGES);
    expect(stagesFor(state, "other")).toBe(DEFAULT_STAGES);
  });
});

describe("pickStage", () => {
  it("takes the first stage of the category", () => {
    expect(pickStage(software, "doing").id).toBe("dev");
  });

  it("falls back to the nearest open category", () => {
    expect(pickStage(simple, "backlog").id).toBe("a");
  });

  it("maps done to a done stage", () => {
    expect(pickStage(simple, "done").id).toBe("c");
  });
});

describe("resolveStage", () => {
  it("finds the task's stage or falls back by status", () => {
    expect(resolveStage(t({ stageId: "rv", status: "doing" }), software).name).toBe("Review");
    expect(resolveStage(t({ stageId: "", status: "done" }), software).id).toBe("ok");
    expect(resolveStage(t({ stageId: "doing", status: "doing" }), DEFAULT_STAGES).id).toBe("doing");
  });
});

describe("reconcileStages", () => {
  it("assigns a stage to new tasks from their status", () => {
    const [out] = reconcileStages([], [t({ projectId: "web", status: "doing" })], state);
    expect(out).toMatchObject({ stageId: "dev", status: "doing" });
  });

  it("lets the stage decide the status when a stage was chosen", () => {
    const [out] = reconcileStages([], [t({ projectId: "web", stageId: "ok", status: "todo" })], state);
    expect(out).toMatchObject({ stageId: "ok", status: "done" });
  });

  it("follows a status change (tick done, reopen)", () => {
    const before = t({ projectId: "web", stageId: "rv", status: "doing" });
    const [done] = reconcileStages([before], [{ ...before, status: "done" }], state);
    expect(done).toMatchObject({ stageId: "ok", status: "done" });
  });

  it("maps tasks moved to another project by category", () => {
    const before = t({ projectId: "web", stageId: "bl", status: "backlog" });
    const [moved] = reconcileStages([before], [{ ...before, projectId: "home" }], state);
    expect(moved).toMatchObject({ stageId: "a", status: "todo" });
  });

  it("applies an edited stage category to its tasks", () => {
    const task = t({ projectId: "home", stageId: "b", status: "doing" });
    const edited: WorkflowState = { ...state, byProject: { ...state.byProject, home: simple.map((s) => (s.id === "b" ? { ...s, category: "todo" as const } : s)) } };
    const [out] = reconcileStages([task], [task], edited);
    expect(out).toMatchObject({ stageId: "b", status: "todo" });
  });

  it("keeps consistent tasks as the same object", () => {
    const task = t({ projectId: "web", stageId: "td", status: "todo" });
    expect(reconcileStages([task], [task], state)[0]).toBe(task);
  });
});

describe("validateStages", () => {
  it("accepts valid lists and explains invalid ones", () => {
    expect(validateStages(software)).toBeNull();
    expect(validateStages([])).toMatch(/ít nhất một stage/);
    expect(validateStages([{ id: "x", name: " ", category: "todo" }, simple[2]])).toMatch(/tên/);
    expect(validateStages([simple[0], { ...simple[1], name: "cần LÀM" }, simple[2]])).toMatch(/trùng/);
    expect(validateStages(simple.slice(0, 2))).toMatch(/Hoàn thành/);
    expect(validateStages([simple[2]])).toMatch(/chưa hoàn thành/);
  });
});

describe("migrateWorkflow", () => {
  it("falls back to defaults for garbage and drops invalid project lists", () => {
    expect(migrateWorkflow(null)).toEqual(initialWorkflow());
    const out = migrateWorkflow({
      defaultStages: [{ id: "x", name: "Only open", category: "todo" }],
      byProject: {
        web: [...software.map((s) => ({ ...s, color: "red", wipLimit: 3 })), { id: "bad", name: "?", category: "weird" }],
        broken: [{ id: "a", name: "A", category: "todo" }],
      },
    });
    expect(out.defaultStages).toEqual(DEFAULT_STAGES);
    expect(Object.keys(out.byProject)).toEqual(["web"]);
    expect(out.byProject.web).toHaveLength(5);
    expect(out.byProject.web[0]).toMatchObject({ color: undefined, wipLimit: 3 });
  });
});
