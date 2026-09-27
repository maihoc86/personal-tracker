import { addDaysIso, diffDays, formatShortDate, parseIso, toIsoDate } from "../../lib/date";
import type { FocusSession } from "../focus/focus-model";
import type { Project } from "../projects/project-types";
import { loggedMinutes } from "../tasks/task-selectors";
import type { Task } from "../tasks/task-types";

const DAY = 86_400_000;
const dayOf = (ms: number) => toIsoDate(new Date(ms));

export type FlowBucket = { label: string; start: string; end: string; created: number; completed: number };

/**
 * Tasks created vs completed per bucket over the last `rangeDays` (ending
 * today). Daily buckets up to a month, weekly beyond — so columns stay legible.
 */
export function flowSeries(tasks: Task[], rangeDays: number, today: string): FlowBucket[] {
  const size = rangeDays > 31 ? 7 : 1;
  const count = Math.ceil(rangeDays / size);
  const first = addDaysIso(today, -(count * size - 1));
  const buckets: FlowBucket[] = Array.from({ length: count }, (_, i) => {
    const start = addDaysIso(first, i * size);
    const end = addDaysIso(start, size - 1);
    return { label: size === 1 ? formatShortDate(start) : `${formatShortDate(start)}–${formatShortDate(end)}`, start, end, created: 0, completed: 0 };
  });
  const index = (iso: string) => {
    const d = diffDays(first, iso);
    return d < 0 || d >= count * size ? -1 : Math.floor(d / size);
  };
  for (const t of tasks) {
    const c = index(dayOf(t.createdAt));
    if (c >= 0) buckets[c].created++;
    if (t.status === "done" && t.doneAt) {
      const d = index(dayOf(t.doneAt));
      if (d >= 0) buckets[d].completed++;
    }
  }
  return buckets;
}

export type Workload = {
  id: string;
  name: string;
  color?: string;
  backlog: number;
  todo: number;
  doing: number;
  /** Estimated hours left on open tasks. */
  hours: number;
};

/** Open work per project (Inbox last), biggest first. */
export function workloadByProject(tasks: Task[], projects: Project[]): Workload[] {
  const known = new Map(projects.map((p) => [p.id, p]));
  const rows = new Map<string, Workload>();
  for (const t of tasks) {
    if (t.status === "done") continue;
    const p = known.get(t.projectId);
    const id = p?.id ?? "";
    const row = rows.get(id) ?? { id, name: p?.name ?? "Inbox", color: p?.color, backlog: 0, todo: 0, doing: 0, hours: 0 };
    row[t.status]++;
    row.hours += t.estimatedHours ?? 0;
    rows.set(id, row);
  }
  const total = (w: Workload) => w.backlog + w.todo + w.doing;
  return [...rows.values()].sort((a, b) => Number(a.id === "") - Number(b.id === "") || total(b) - total(a));
}

export type Accuracy = { id: string; name: string; color?: string; count: number; estimate: number; logged: number };

/** Estimated vs logged hours on tasks finished since `sinceMs`, per project. */
export function estimateAccuracy(tasks: Task[], projects: Project[], sinceMs: number): Accuracy[] {
  const known = new Map(projects.map((p) => [p.id, p]));
  const rows = new Map<string, Accuracy>();
  for (const t of tasks) {
    const logged = loggedMinutes(t) / 60;
    if (t.status !== "done" || (t.doneAt ?? 0) < sinceMs || !t.estimatedHours || !logged) continue;
    const p = known.get(t.projectId);
    const id = p?.id ?? "";
    const row = rows.get(id) ?? { id, name: p?.name ?? "Inbox", color: p?.color, count: 0, estimate: 0, logged: 0 };
    row.count++;
    row.estimate += t.estimatedHours;
    row.logged += logged;
    rows.set(id, row);
  }
  return [...rows.values()].sort((a, b) => b.logged - a.logged);
}

export type Kpis = {
  completed: number;
  completedPrev: number;
  created: number;
  open: number;
  overdue: number;
  loggedMinutes: number;
  focusMinutes: number;
};

/** Headline numbers for the range ending today, with the previous range for delta. */
export function computeKpis(
  tasks: Task[],
  sessions: FocusSession[],
  rangeDays: number,
  today: string,
): Kpis {
  const end = parseIso(today).getTime() + DAY;
  const start = end - rangeDays * DAY;
  const prevStart = start - rangeDays * DAY;
  const inRange = (ms: number | undefined, from: number, to: number) => ms !== undefined && ms >= from && ms < to;
  let loggedTotal = 0;
  for (const t of tasks) for (const l of t.timeLogs) if (inRange(l.at, start, end)) loggedTotal += l.minutes;
  return {
    completed: tasks.filter((t) => t.status === "done" && inRange(t.doneAt, start, end)).length,
    completedPrev: tasks.filter((t) => t.status === "done" && inRange(t.doneAt, prevStart, start)).length,
    created: tasks.filter((t) => inRange(t.createdAt, start, end)).length,
    open: tasks.filter((t) => t.status !== "done").length,
    overdue: tasks.filter((t) => t.status !== "done" && t.dueDate && t.dueDate < today).length,
    loggedMinutes: loggedTotal,
    focusMinutes: sessions.filter((s) => inRange(s.at, start, end)).reduce((sum, s) => sum + s.minutes, 0),
  };
}

/** Open overdue tasks, most overdue first. */
export function mostOverdue(tasks: Task[], today: string, limit = 5): Task[] {
  return tasks
    .filter((t) => t.status !== "done" && t.dueDate && t.dueDate < today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, limit);
}

/** Round up to a clean, even axis maximum (so the midpoint tick is whole). */
export function niceMax(value: number): number {
  if (value <= 2) return 2;
  const pow = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 4, 6, 8, 10].find((s) => s * pow >= value) ?? 10;
  return step * pow;
}
