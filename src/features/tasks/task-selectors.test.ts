import { describe, expect, it } from "vitest";
import type { Project } from "../projects/project-types";
import {
  EMPTY_FILTER,
  checklistProgress,
  collectTags,
  doneOlderThan,
  groupByStages,
  filterTasks,
  groupTasks,
  isFilterActive,
  loggedMinutes,
  openBlockers,
  openEstimate,
  projectMap,
  scopeTasks,
  sortTasks,
  taskArea,
  taskKey,
  todayBuckets,
} from "./task-selectors";
import type { Task } from "./task-types";

const today = "2026-09-27";

function t(id: string, o: Partial<Task> = {}): Task {
  return {
    id,
    number: 1,
    projectId: "",
    title: id,
    description: "",
    status: "todo",
    stageId: "", plannedFor: "",
    priority: "medium",
    startDate: "",
    dueDate: "",
    dueTime: "",
    tags: [],
    checklist: [],
    comments: [],
    timeLogs: [],
    activity: [],
    blockedBy: [],
    createdAt: 0,
    updatedAt: 0,
    ...o,
  };
}

const projects: Project[] = [
  { id: "w", name: "Website", key: "WEB", color: "#111111", area: "work", description: "", archived: false, createdAt: 0 },
  { id: "h", name: "Nhà", key: "NHA", color: "#222222", area: "personal", description: "", archived: false, createdAt: 0 },
];
const pm = projectMap(projects);

describe("keys and areas", () => {
  it("formats keys with the project prefix or INB", () => {
    expect(taskKey(t("a", { projectId: "w", number: 12 }), pm)).toBe("WEB-12");
    expect(taskKey(t("a", { number: 3 }), pm)).toBe("INB-3");
  });

  it("resolves the area, inbox counting as personal", () => {
    expect(taskArea(t("a", { projectId: "w" }), pm)).toBe("work");
    expect(taskArea(t("a"), pm)).toBe("personal");
  });
});

describe("scopeTasks", () => {
  const tasks = [t("a", { projectId: "w" }), t("b", { projectId: "h" }), t("c"), t("d", { projectId: "gone" })];

  it("selects by scope", () => {
    expect(scopeTasks(tasks, { kind: "all" }, pm)).toHaveLength(4);
    expect(scopeTasks(tasks, { kind: "inbox" }, pm).map((x) => x.id)).toEqual(["c", "d"]);
    expect(scopeTasks(tasks, { kind: "project", id: "h" }, pm).map((x) => x.id)).toEqual(["b"]);
    expect(scopeTasks(tasks, { kind: "area", area: "work" }, pm).map((x) => x.id)).toEqual(["a"]);
  });
});

describe("filterTasks", () => {
  const tasks = [
    t("a", { title: "Sửa lỗi đăng nhập", priority: "high", tags: ["bug"], dueDate: "2026-09-20" }),
    t("b", { title: "Viết tài liệu", status: "doing", dueDate: today }),
    t("c", { title: "Đi chợ", dueDate: "2026-10-02", projectId: "h", number: 7 }),
    t("d", { title: "Không hạn", status: "done", dueDate: "2026-09-01" }),
  ];
  const ctx = { today, projects: pm };
  const ids = (f: Partial<typeof EMPTY_FILTER>) =>
    filterTasks(tasks, { ...EMPTY_FILTER, ...f }, ctx).map((x) => x.id);

  it("reports whether a filter is active", () => {
    expect(isFilterActive(EMPTY_FILTER)).toBe(false);
    expect(isFilterActive({ ...EMPTY_FILTER, due: "today" })).toBe(true);
  });

  it("matches accent-insensitive text, keys and tags", () => {
    expect(ids({ text: "dang nhap" })).toEqual(["a"]);
    expect(ids({ text: "nha-7" })).toEqual(["c"]);
    expect(ids({ text: "bug" })).toEqual(["a"]);
  });

  it("filters by status, priority and tags", () => {
    expect(ids({ statuses: ["doing"] })).toEqual(["b"]);
    expect(ids({ priorities: ["high"] })).toEqual(["a"]);
    expect(ids({ tags: ["bug", "x"] })).toEqual(["a"]);
  });

  it("filters by due window, ignoring done tasks for overdue", () => {
    expect(ids({ due: "overdue" })).toEqual(["a"]);
    expect(ids({ due: "today" })).toEqual(["b"]);
    expect(ids({ due: "week" })).toEqual(["b", "c"]);
    expect(ids({ due: "none" })).toEqual([]);
  });
});

describe("sortTasks", () => {
  const tasks = [
    t("a", { priority: "low", dueDate: "2026-09-30", createdAt: 3, updatedAt: 1 }),
    t("b", { priority: "urgent", createdAt: 1, updatedAt: 3 }),
    t("c", { priority: "urgent", dueDate: "2026-09-28", dueTime: "09:00", createdAt: 2, updatedAt: 2 }),
  ];
  const order = (by: Parameters<typeof sortTasks>[1]) => sortTasks(tasks, by).map((x) => x.id);

  it("sorts without mutating", () => {
    expect(order("manual")).toEqual(["a", "b", "c"]);
    expect(order("priority")).toEqual(["c", "b", "a"]);
    expect(order("due")).toEqual(["c", "a", "b"]);
    expect(order("created")).toEqual(["a", "c", "b"]);
    expect(order("updated")).toEqual(["b", "c", "a"]);
    expect(tasks.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});

describe("groupTasks", () => {
  const tasks = [
    t("a", { status: "doing", priority: "high", projectId: "w", dueDate: "2026-09-20" }),
    t("b", { priority: "low", dueDate: today }),
    t("c", { projectId: "h", dueDate: "2026-10-30" }),
    t("d", { dueDate: "2026-10-01" }),
  ];
  const ctx = { today, projects };
  const shape = (by: Parameters<typeof groupTasks>[1]) =>
    groupTasks(tasks, by, ctx).map((g) => [g.id, g.tasks.map((x) => x.id)]);

  it("groups by status keeping empty columns", () => {
    expect(shape("status")).toEqual([
      ["backlog", []],
      ["todo", ["b", "c", "d"]],
      ["doing", ["a"]],
      ["done", []],
    ]);
  });

  it("groups by priority, highest first, dropping empties", () => {
    expect(shape("priority")).toEqual([
      ["high", ["a"]],
      ["medium", ["c", "d"]],
      ["low", ["b"]],
    ]);
  });

  it("groups by due bucket", () => {
    expect(shape("due")).toEqual([
      ["overdue", ["a"]],
      ["today", ["b"]],
      ["week", ["d"]],
      ["later", ["c"]],
    ]);
  });

  it("groups by project with Inbox last", () => {
    expect(shape("project")).toEqual([
      ["w", ["a"]],
      ["h", ["c"]],
      ["", ["b", "d"]],
    ]);
    expect(shape("none")).toEqual([["all", ["a", "b", "c", "d"]]]);
  });
});

describe("todayBuckets", () => {
  it("splits open work by urgency and lists today's completions", () => {
    const tasks = [
      t("late", { dueDate: "2026-09-25" }),
      t("now2", { dueDate: today, dueTime: "15:00" }),
      t("now1", { dueDate: today, dueTime: "09:00" }),
      t("soon", { dueDate: "2026-10-01" }),
      t("far", { dueDate: "2026-11-01" }),
      t("wip", { status: "doing" }),
      t("done", { status: "done", doneAt: 500, dueDate: today }),
      t("old", { status: "done", doneAt: 10 }),
    ];
    const b = todayBuckets(tasks, today, 100);
    expect(b.overdue.map((x) => x.id)).toEqual(["late"]);
    expect(b.today.map((x) => x.id)).toEqual(["now1", "now2"]);
    expect(b.upcoming.map((x) => x.id)).toEqual(["soon"]);
    expect(b.inProgress.map((x) => x.id)).toEqual(["wip"]);
    expect(b.doneToday.map((x) => x.id)).toEqual(["done"]);
  });
});

describe("per-task facts", () => {
  it("finds open blockers only", () => {
    const a = t("a", { status: "done" });
    const b = t("b");
    const c = t("c", { blockedBy: ["a", "b", "missing"] });
    const byId = new Map([a, b, c].map((x) => [x.id, x]));
    expect(openBlockers(c, byId).map((x) => x.id)).toEqual(["b"]);
  });

  it("sums logged time, checklist progress and open estimates", () => {
    const task = t("a", {
      timeLogs: [
        { id: "1", minutes: 30, at: 0, source: "manual" },
        { id: "2", minutes: 25, at: 0, source: "focus" },
      ],
      checklist: [
        { id: "x", text: "", done: true },
        { id: "y", text: "", done: false },
      ],
      estimatedHours: 2,
    });
    expect(loggedMinutes(task)).toBe(55);
    expect(checklistProgress(task)).toEqual({ done: 1, total: 2 });
    expect(openEstimate([task, t("b", { status: "done", estimatedHours: 5 })])).toBe(2);
  });

  it("collects tags by frequency", () => {
    expect(collectTags([t("a", { tags: ["x", "y"] }), t("b", { tags: ["y"] })])).toEqual(["y", "x"]);
  });
});

describe("doneOlderThan", () => {
  it("selects only done tasks finished before the cutoff", () => {
    const now = 100 * 86_400_000;
    const tasks = [
      t("old", { status: "done", doneAt: 10 * 86_400_000 }),
      t("recent", { status: "done", doneAt: 95 * 86_400_000 }),
      t("open", { doneAt: 1 }),
    ];
    expect(doneOlderThan(tasks, 30, now).map((x) => x.id)).toEqual(["old"]);
  });
});

describe("groupByStages", () => {
  it("groups by stage, falling back by status for unassigned tasks", () => {
    const stages = [
      { id: "td", name: "Cần làm", category: "todo" as const },
      { id: "rv", name: "Review", category: "doing" as const, color: "#123456" },
      { id: "ok", name: "Xong", category: "done" as const },
    ];
    const groups = groupByStages([t("a", { stageId: "rv", status: "doing" }), t("b"), t("c", { status: "done" })], stages);
    expect(groups.map((g) => [g.id, g.tasks.map((x) => x.id)])).toEqual([
      ["td", ["b"]],
      ["rv", ["a"]],
      ["ok", ["c"]],
    ]);
    expect(groups[1].color).toBe("#123456");
  });
});
