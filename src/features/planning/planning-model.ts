import { PRIORITY_META, type Task } from "../tasks/task-types";
import { loggedMinutes } from "../tasks/task-selectors";

export type PlanBuckets = {
  /** Open tasks planned for today, most important first. */
  planned: Task[];
  /** Planned for an earlier day and still open — roll over or drop. */
  carryOver: Task[];
  /** Due (or overdue) or in progress but not in today's plan. */
  suggestions: Task[];
};

const byImportance = (a: Task, b: Task) =>
  PRIORITY_META[b.priority].rank - PRIORITY_META[a.priority].rank ||
  (a.dueTime || "99").localeCompare(b.dueTime || "99");

export function planBuckets(tasks: Task[], today: string): PlanBuckets {
  const open = tasks.filter((t) => t.status !== "done");
  const planned = open.filter((t) => t.plannedFor === today).sort(byImportance);
  const carryOver = open.filter((t) => t.plannedFor && t.plannedFor < today).sort(byImportance);
  const suggestions = open
    .filter((t) => t.plannedFor !== today && !(t.plannedFor && t.plannedFor < today))
    .filter((t) => (t.dueDate && t.dueDate <= today) || t.status === "doing")
    .sort(byImportance);
  return { planned, carryOver, suggestions };
}

/** Hours still needed: estimate minus time already logged (never negative). */
export function remainingHours(task: Task): number | null {
  if (task.estimatedHours === undefined) return null;
  return Math.max(0, task.estimatedHours - loggedMinutes(task) / 60);
}

export type Capacity = {
  plannedHours: number;
  capacityHours: number;
  /** Planned tasks without an estimate (not counted in plannedHours). */
  unestimated: number;
  overBy: number;
  ratio: number;
};

export function capacitySummary(planned: Task[], capacityHours: number): Capacity {
  let hours = 0;
  let unestimated = 0;
  for (const t of planned) {
    const left = remainingHours(t);
    if (left === null) unestimated++;
    else hours += left;
  }
  const plannedHours = Math.round(hours * 100) / 100;
  return {
    plannedHours,
    capacityHours,
    unestimated,
    overBy: Math.max(0, Math.round((plannedHours - capacityHours) * 100) / 100),
    ratio: capacityHours > 0 ? plannedHours / capacityHours : 0,
  };
}
