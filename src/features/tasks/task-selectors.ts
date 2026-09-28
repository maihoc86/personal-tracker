import { addDaysIso, diffDays, dueState } from "../../lib/date";
import { matchesQuery } from "../../lib/text";
import { AREA_META, INBOX_KEY, type Area, type Project } from "../projects/project-types";
import { resolveStage, type Stage } from "../workflow/workflow-model";
import {
  PRIORITY_META,
  STATUS_META,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "./task-types";

export type ProjectMap = Map<string, Project>;

export const projectMap = (projects: Project[]): ProjectMap =>
  new Map(projects.map((p) => [p.id, p]));

/** "WEB-12", or "INB-3" for tasks without a project. */
export function taskKey(task: Task, projects: ProjectMap): string {
  const key = projects.get(task.projectId)?.key ?? INBOX_KEY;
  return `${key}-${task.number}`;
}

/** Area a task belongs to; Inbox tasks count as personal until filed. */
export function taskArea(task: Task, projects: ProjectMap): Area {
  return projects.get(task.projectId)?.area ?? "personal";
}

// --- scope ------------------------------------------------------------------

export type Scope =
  | { kind: "all" }
  | { kind: "inbox" }
  | { kind: "project"; id: string }
  | { kind: "area"; area: Area };

export function scopeTasks(tasks: Task[], scope: Scope, projects: ProjectMap): Task[] {
  switch (scope.kind) {
    case "all":
      return tasks;
    case "inbox":
      return tasks.filter((t) => !projects.has(t.projectId));
    case "project":
      return tasks.filter((t) => t.projectId === scope.id);
    case "area":
      return tasks.filter((t) => taskArea(t, projects) === scope.area);
  }
}

// --- filter -----------------------------------------------------------------

export type DueFilter = "any" | "overdue" | "today" | "week" | "none";

export type TaskFilter = {
  text: string;
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  tags: string[];
  due: DueFilter;
};

export const EMPTY_FILTER: TaskFilter = {
  text: "",
  statuses: [],
  priorities: [],
  tags: [],
  due: "any",
};

export function isFilterActive(f: TaskFilter): boolean {
  return (
    f.text.trim() !== "" ||
    f.statuses.length > 0 ||
    f.priorities.length > 0 ||
    f.tags.length > 0 ||
    f.due !== "any"
  );
}

export function matchesDue(task: Task, due: DueFilter, today: string): boolean {
  switch (due) {
    case "any":
      return true;
    case "none":
      return !task.dueDate;
    case "overdue":
      return task.status !== "done" && dueState(task.dueDate, today) === "overdue";
    case "today":
      return task.dueDate === today;
    case "week":
      return !!task.dueDate && task.dueDate >= today && diffDays(today, task.dueDate) <= 7;
  }
}

export function filterTasks(
  tasks: Task[],
  f: TaskFilter,
  ctx: { today: string; projects: ProjectMap },
): Task[] {
  return tasks.filter((t) => {
    if (f.statuses.length && !f.statuses.includes(t.status)) return false;
    if (f.priorities.length && !f.priorities.includes(t.priority)) return false;
    if (f.tags.length && !f.tags.some((tag) => t.tags.includes(tag))) return false;
    if (!matchesDue(t, f.due, ctx.today)) return false;
    if (f.text.trim()) {
      const haystack = [taskKey(t, ctx.projects), t.title, t.description, ...t.tags].join(" ");
      if (!matchesQuery(haystack, f.text)) return false;
    }
    return true;
  });
}

// --- sort -------------------------------------------------------------------

export type SortBy = "manual" | "priority" | "due" | "created" | "updated";

export const SORT_LABELS: Record<SortBy, string> = {
  manual: "Thủ công",
  priority: "Ưu tiên",
  due: "Hạn chót",
  created: "Mới tạo",
  updated: "Mới cập nhật",
};

/** Returns a new array; "manual" keeps the stored (drag) order. */
export function sortTasks(tasks: Task[], by: SortBy): Task[] {
  const copy = [...tasks];
  // Plain code-point compare: locale collation would sort "~" before digits.
  const dueKey = (t: Task) => (t.dueDate ? `${t.dueDate} ${t.dueTime || "99"}` : "\uffff");
  const byDue = (a: Task, b: Task) => compare(dueKey(a), dueKey(b));
  switch (by) {
    case "manual":
      return copy;
    case "priority":
      return copy.sort(
        (a, b) => PRIORITY_META[b.priority].rank - PRIORITY_META[a.priority].rank || byDue(a, b),
      );
    case "due":
      return copy.sort(byDue);
    case "created":
      return copy.sort((a, b) => b.createdAt - a.createdAt);
    case "updated":
      return copy.sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// --- group ------------------------------------------------------------------

export type GroupBy = "status" | "project" | "priority" | "due" | "none";

export const GROUP_LABELS: Record<GroupBy, string> = {
  status: "Trạng thái",
  project: "Dự án",
  priority: "Ưu tiên",
  due: "Hạn chót",
  none: "Không nhóm",
};

export type TaskGroup = {
  id: string;
  label: string;
  tasks: Task[];
  /** Hex for project/area groups, used for the group marker. */
  color?: string;
};

const DUE_GROUPS = [
  ["overdue", "Quá hạn"],
  ["today", "Hôm nay"],
  ["week", "7 ngày tới"],
  ["later", "Sau này"],
  ["none", "Chưa có hạn"],
] as const;

function dueBucket(task: Task, today: string): (typeof DUE_GROUPS)[number][0] {
  if (!task.dueDate) return "none";
  if (task.dueDate < today) return "overdue";
  if (task.dueDate === today) return "today";
  return diffDays(today, task.dueDate) <= 7 ? "week" : "later";
}

/** Group tasks in a stable, meaningful order; empty groups are dropped except for status. */
export function groupTasks(
  tasks: Task[],
  by: GroupBy,
  ctx: { today: string; projects: Project[] },
): TaskGroup[] {
  switch (by) {
    case "none":
      return [{ id: "all", label: "Tất cả", tasks }];
    case "status":
      return TASK_STATUSES.map((s) => ({
        id: s,
        label: STATUS_META[s].label,
        tasks: tasks.filter((t) => t.status === s),
      }));
    case "priority":
      return [...TASK_PRIORITIES]
        .reverse()
        .map((p) => ({ id: p, label: PRIORITY_META[p].label, tasks: tasks.filter((t) => t.priority === p) }))
        .filter((g) => g.tasks.length);
    case "due":
      return DUE_GROUPS.map(([id, label]) => ({
        id,
        label,
        tasks: tasks.filter((t) => dueBucket(t, ctx.today) === id),
      })).filter((g) => g.tasks.length);
    case "project": {
      const known = new Set(ctx.projects.map((p) => p.id));
      const groups: TaskGroup[] = ctx.projects.map((p) => ({
        id: p.id,
        label: p.name,
        color: p.color,
        tasks: tasks.filter((t) => t.projectId === p.id),
      }));
      groups.push({ id: "", label: "Inbox", tasks: tasks.filter((t) => !known.has(t.projectId)) });
      return groups.filter((g) => g.tasks.length);
    }
  }
}

/** One group per stage of a single workflow (all stages kept, even empty). */
export function groupByStages(tasks: Task[], stages: Stage[]): TaskGroup[] {
  return stages.map((stage) => ({
    id: stage.id,
    label: stage.name,
    color: stage.color,
    tasks: tasks.filter((t) => resolveStage(t, stages).id === stage.id),
  }));
}

// --- today ------------------------------------------------------------------

export type TodayBuckets = {
  overdue: Task[];
  today: Task[];
  upcoming: Task[];
  inProgress: Task[];
  doneToday: Task[];
};

/** The "Hôm nay" page: what's late, due today, coming up, and in flight. */
export function todayBuckets(tasks: Task[], today: string, startOfToday: number): TodayBuckets {
  const open = tasks.filter((t) => t.status !== "done");
  const byDue = (a: Task, b: Task) =>
    compare(`${a.dueDate}${a.dueTime}`, `${b.dueDate}${b.dueTime}`) ||
    PRIORITY_META[b.priority].rank - PRIORITY_META[a.priority].rank;
  const weekEnd = addDaysIso(today, 7);
  return {
    overdue: open.filter((t) => t.dueDate && t.dueDate < today).sort(byDue),
    today: open.filter((t) => t.dueDate === today).sort(byDue),
    upcoming: open.filter((t) => t.dueDate > today && t.dueDate <= weekEnd).sort(byDue),
    inProgress: open.filter((t) => t.status === "doing" && !t.dueDate),
    doneToday: tasks.filter((t) => t.status === "done" && (t.doneAt ?? 0) >= startOfToday),
  };
}

// --- per-task facts -----------------------------------------------------------

/** Blockers that are still open (so the task can't really move yet). */
export function openBlockers(task: Task, byId: Map<string, Task>): Task[] {
  return task.blockedBy
    .map((id) => byId.get(id))
    .filter((t): t is Task => !!t && t.status !== "done");
}

export function loggedMinutes(task: Task): number {
  return task.timeLogs.reduce((sum, l) => sum + l.minutes, 0);
}

export function checklistProgress(task: Task): { done: number; total: number } {
  return {
    done: task.checklist.filter((c) => c.done).length,
    total: task.checklist.length,
  };
}

/** Every tag in use, most frequent first. */
export function collectTags(tasks: Task[]): string[] {
  const counts = new Map<string, number>();
  for (const t of tasks) for (const tag of t.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
}

/** Sum of estimates on open tasks, in hours. */
export function openEstimate(tasks: Task[]): number {
  return tasks.reduce((sum, t) => sum + (t.status === "done" ? 0 : (t.estimatedHours ?? 0)), 0);
}

export function areaLabel(area: Area): string {
  return AREA_META[area].label;
}

/** Done tasks completed more than `days` ago (candidates for purging). */
export function doneOlderThan(tasks: Task[], days: number, now: number): Task[] {
  const cutoff = now - days * 86_400_000;
  return tasks.filter((t) => t.status === "done" && t.doneAt !== undefined && t.doneAt < cutoff);
}
