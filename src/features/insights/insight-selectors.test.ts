import { describe, expect, it } from "vitest";
import type { Project } from "../projects/project-types";
import type { Task } from "../tasks/task-types";
import { computeKpis, estimateAccuracy, flowSeries, mostOverdue, workloadByProject } from "./insight-selectors";

const today = "2026-09-27";
const at = (iso: string, h = 10) => new Date(`${iso}T${String(h).padStart(2, "0")}:00:00`).getTime();

function t(id: string, o: Partial<Task> = {}): Task {
  return {
    id, number: 1, projectId: "", title: id, description: "", status: "todo", stageId: "", priority: "medium",
    startDate: "", dueDate: "", dueTime: "", tags: [], checklist: [], comments: [], timeLogs: [],
    activity: [], blockedBy: [], createdAt: at("2026-09-01"), updatedAt: 0, ...o,
  };
}

const projects: Project[] = [
  { id: "w", name: "Web", key: "WEB", color: "#111111", area: "work", description: "", archived: false, createdAt: 0 },
];

describe("flowSeries", () => {
  it("counts created and completed per day", () => {
    const tasks = [
      t("a", { createdAt: at("2026-09-27") }),
      t("b", { createdAt: at("2026-09-25"), status: "done", doneAt: at("2026-09-27") }),
      t("c", { createdAt: at("2026-08-01"), status: "done", doneAt: at("2026-09-26") }),
    ];
    const series = flowSeries(tasks, 3, today);
    expect(series.map((b) => [b.start, b.created, b.completed])).toEqual([
      ["2026-09-25", 1, 0],
      ["2026-09-26", 0, 1],
      ["2026-09-27", 1, 1],
    ]);
    expect(series[0].label).toBe("25 Th9");
  });

  it("switches to weekly buckets for long ranges", () => {
    const series = flowSeries([t("a", { createdAt: at("2026-09-27") })], 90, today);
    expect(series).toHaveLength(13);
    expect(series.at(-1)).toMatchObject({ end: today, created: 1 });
    expect(series.at(-1)!.label).toBe("21 Th9–27 Th9");
  });
});

describe("workloadByProject", () => {
  it("counts open tasks by status with Inbox last", () => {
    const rows = workloadByProject(
      [
        t("a", { projectId: "w", status: "doing", estimatedHours: 2 }),
        t("b", { projectId: "w", status: "backlog", estimatedHours: 1.5 }),
        t("c", { projectId: "w", status: "done" }),
        t("d"),
        t("e", { projectId: "gone" }),
      ],
      projects,
    );
    expect(rows).toEqual([
      { id: "w", name: "Web", color: "#111111", backlog: 1, todo: 0, doing: 1, hours: 3.5 },
      { id: "", name: "Inbox", color: undefined, backlog: 0, todo: 2, doing: 0, hours: 0 },
    ]);
  });
});

describe("estimateAccuracy", () => {
  it("compares estimates with logged time for finished tasks in range", () => {
    const log = (minutes: number) => ({ id: String(minutes), minutes, at: 0, source: "manual" as const });
    const rows = estimateAccuracy(
      [
        t("a", { projectId: "w", status: "done", doneAt: at(today), estimatedHours: 2, timeLogs: [log(180)] }),
        t("b", { projectId: "w", status: "done", doneAt: at(today), estimatedHours: 1, timeLogs: [log(30)] }),
        t("old", { projectId: "w", status: "done", doneAt: at("2026-01-01"), estimatedHours: 1, timeLogs: [log(60)] }),
        t("noest", { status: "done", doneAt: at(today), timeLogs: [log(60)] }),
        t("open", { estimatedHours: 1, timeLogs: [log(60)] }),
      ],
      projects,
      at("2026-09-01"),
    );
    expect(rows).toEqual([{ id: "w", name: "Web", color: "#111111", count: 2, estimate: 3, logged: 3.5 }]);
  });
});

describe("computeKpis", () => {
  it("summarizes the range and the previous one", () => {
    const k = computeKpis(
      [
        t("a", { status: "done", doneAt: at("2026-09-26"), createdAt: at("2026-09-24"), timeLogs: [{ id: "l", minutes: 45, at: at("2026-09-26"), source: "focus" }] }),
        t("b", { status: "done", doneAt: at("2026-09-18") }),
        t("c", { dueDate: "2026-09-20" }),
        t("d", { dueDate: "2026-09-30" }),
      ],
      [{ at: at("2026-09-27"), minutes: 25, taskId: "" }, { at: at("2026-09-01"), minutes: 25, taskId: "" }],
      7,
      today,
    );
    expect(k).toEqual({ completed: 1, completedPrev: 1, created: 1, open: 2, overdue: 1, loggedMinutes: 45, focusMinutes: 25 });
  });
});

describe("mostOverdue", () => {
  it("lists the oldest overdue open tasks first", () => {
    const list = mostOverdue([t("a", { dueDate: "2026-09-20" }), t("b", { dueDate: "2026-09-10" }), t("c", { dueDate: "2026-09-01", status: "done" })], today);
    expect(list.map((x) => x.id)).toEqual(["b", "a"]);
  });
});
