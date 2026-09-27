import { isIsoDate, todayIso } from "../../lib/date";
import { createId } from "../../lib/id";
import { nextDueDate } from "./recurrence";
import {
  RECURRENCE_FREQS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Activity,
  type ChecklistItem,
  type Comment,
  type Recurrence,
  type Task,
  type TaskDraft,
  type TimeLog,
} from "./task-types";

export type ChangeContext = {
  now: number;
  today: string;
  makeId: () => string;
};

const defaultContext = (): ChangeContext => ({
  now: Date.now(),
  today: todayIso(),
  makeId: createId,
});

/** Next free sequence number inside a project ("" = Inbox). */
export function nextNumber(tasks: Task[], projectId: string): number {
  let max = 0;
  for (const t of tasks) if (t.projectId === projectId && t.number > max) max = t.number;
  return max + 1;
}

/** Build a complete task from a draft, numbered after the existing ones. */
export function createTask(
  draft: TaskDraft,
  existing: Task[],
  ctx: ChangeContext = defaultContext(),
): Task {
  const projectId = draft.projectId ?? "";
  const status = draft.status ?? "todo";
  return {
    id: ctx.makeId(),
    number: nextNumber(existing, projectId),
    projectId,
    title: draft.title.trim(),
    description: draft.description ?? "",
    status,
    priority: draft.priority ?? "medium",
    startDate: draft.startDate ?? "",
    dueDate: draft.dueDate ?? "",
    dueTime: draft.dueDate ? (draft.dueTime ?? "") : "",
    estimatedHours: draft.estimatedHours,
    tags: draft.tags ?? [],
    checklist: draft.checklist ?? [],
    comments: [],
    timeLogs: [],
    activity: [{ id: ctx.makeId(), at: ctx.now, kind: "created" }],
    recurrence: draft.recurrence,
    blockedBy: draft.blockedBy ?? [],
    createdAt: ctx.now,
    updatedAt: ctx.now,
    doneAt: status === "done" ? ctx.now : undefined,
  };
}

/** History entries for the fields people care about when reviewing a task. */
export function diffActivity(before: Task, after: Task, ctx: ChangeContext): Activity[] {
  const entries: Activity[] = [];
  const push = (kind: Activity["kind"], from: string, to: string) => {
    if (from !== to) entries.push({ id: ctx.makeId(), at: ctx.now, kind, from, to });
  };
  push("status", before.status, after.status);
  push("priority", before.priority, after.priority);
  push("due", before.dueDate, after.dueDate);
  push("project", before.projectId, after.projectId);
  return entries;
}

/**
 * Run every write through the same bookkeeping so it stays correct no matter
 * which UI path made the change (panel, board drag, list checkbox):
 * renumber on project moves, stamp doneAt/updatedAt, append activity, and
 * spawn the next occurrence when a recurring task is completed.
 */
export function applyTaskChanges(
  prev: Task[],
  next: Task[],
  ctx: ChangeContext = defaultContext(),
): Task[] {
  const prevById = new Map(prev.map((t) => [t.id, t]));
  const result: Task[] = [];
  const spawned: Task[] = [];
  // Tasks changing project get fresh numbers; their old numbers must not
  // count when numbering the others that move in the same write.
  const moving = new Set(
    next.filter((t) => prevById.has(t.id) && prevById.get(t.id)!.projectId !== t.projectId).map((t) => t.id),
  );
  const settled = next.filter((t) => !moving.has(t.id));
  const renumbered: Task[] = [];

  for (const task of next) {
    const before = prevById.get(task.id);
    if (!before || before === task) {
      result.push(task);
      continue;
    }
    let updated: Task = { ...task, updatedAt: ctx.now };
    if (moving.has(task.id)) {
      updated.number = nextNumber([...settled, ...renumbered], task.projectId);
      renumbered.push(updated);
    }
    if (task.status === "done" && before.status !== "done") updated.doneAt = ctx.now;
    if (task.status !== "done") updated.doneAt = undefined;
    updated.activity = [...before.activity, ...diffActivity(before, updated, ctx)];

    if (updated.recurrence && updated.status === "done" && before.status !== "done") {
      const occurrence = spawnOccurrence(updated, [...result, ...next, ...spawned], ctx);
      spawned.push(occurrence);
      updated = {
        ...updated,
        recurrence: undefined,
        activity: [
          ...updated.activity,
          { id: ctx.makeId(), at: ctx.now, kind: "recurred", to: occurrence.dueDate },
        ],
      };
    }
    result.push(updated);
  }
  return [...spawned, ...result];
}

/** The fresh copy that replaces a completed recurring task. */
function spawnOccurrence(done: Task, all: Task[], ctx: ChangeContext): Task {
  const rule = done.recurrence as Recurrence;
  const dueDate = nextDueDate(done.dueDate, rule, ctx.today);
  const shift =
    done.startDate && done.dueDate
      ? (new Date(dueDate).getTime() - new Date(done.dueDate).getTime()) / 86_400_000
      : 0;
  const startDate = done.startDate && shift ? shiftIso(done.startDate, shift) : "";
  return {
    ...done,
    id: ctx.makeId(),
    number: nextNumber(all, done.projectId),
    status: "todo",
    dueDate,
    startDate,
    checklist: done.checklist.map((c) => ({ ...c, done: false })),
    comments: [],
    timeLogs: [],
    activity: [{ id: ctx.makeId(), at: ctx.now, kind: "created" }],
    createdAt: ctx.now,
    updatedAt: ctx.now,
    doneAt: undefined,
  };
}

function shiftIso(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + Math.round(days));
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Migration / sanitizing: turns anything read from storage or an imported
// backup into valid tasks, filling fields that older versions didn't have.
// ---------------------------------------------------------------------------

type Loose = Record<string, unknown>;

const isObject = (v: unknown): v is Loose => typeof v === "object" && v !== null;
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const date = (v: unknown) => (typeof v === "string" && isIsoDate(v) ? v : "");
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  options.includes(v as T) ? (v as T) : fallback;
const list = <T>(v: unknown, map: (item: unknown) => T | null): T[] =>
  Array.isArray(v) ? v.map(map).filter((x): x is T => x !== null) : [];

function toChecklist(v: unknown): ChecklistItem | null {
  if (!isObject(v) || typeof v.id !== "string") return null;
  return { id: v.id, text: str(v.text), done: v.done === true };
}

function toComment(v: unknown): Comment | null {
  if (!isObject(v) || typeof v.id !== "string" || typeof v.text !== "string") return null;
  return { id: v.id, text: v.text, at: num(v.at) ?? 0 };
}

function toTimeLog(v: unknown): TimeLog | null {
  const minutes = isObject(v) ? num(v.minutes) : undefined;
  if (!isObject(v) || typeof v.id !== "string" || !minutes || minutes <= 0) return null;
  return {
    id: v.id,
    minutes,
    at: num(v.at) ?? 0,
    source: v.source === "focus" ? "focus" : "manual",
  };
}

function toActivity(v: unknown): Activity | null {
  if (!isObject(v) || typeof v.id !== "string") return null;
  const kinds = ["created", "status", "priority", "due", "project", "recurred"] as const;
  if (!kinds.includes(v.kind as (typeof kinds)[number])) return null;
  return {
    id: v.id,
    at: num(v.at) ?? 0,
    kind: v.kind as Activity["kind"],
    from: typeof v.from === "string" ? v.from : undefined,
    to: typeof v.to === "string" ? v.to : undefined,
  };
}

function toRecurrence(v: unknown): Recurrence | undefined {
  if (!isObject(v) || !RECURRENCE_FREQS.includes(v.freq as Recurrence["freq"])) return undefined;
  return { freq: v.freq as Recurrence["freq"], interval: Math.max(1, num(v.interval) ?? 1) };
}

function toTask(v: unknown): Task | null {
  if (!isObject(v) || typeof v.id !== "string" || typeof v.title !== "string") return null;
  const createdAt = num(v.createdAt) ?? Date.now();
  const status = oneOf(v.status, TASK_STATUSES, "todo");
  const dueDate = date(v.dueDate);
  const estimate = num(v.estimatedHours);
  return {
    id: v.id,
    number: num(v.number) ?? 0,
    projectId: str(v.projectId),
    title: v.title,
    description: str(v.description),
    status,
    priority: oneOf(v.priority, TASK_PRIORITIES, "medium"),
    startDate: date(v.startDate),
    dueDate,
    dueTime: dueDate ? str(v.dueTime) : "",
    estimatedHours: estimate && estimate > 0 ? estimate : undefined,
    tags: list(v.tags, (t) => (typeof t === "string" && t.trim() ? t : null)),
    checklist: list(v.checklist, toChecklist),
    comments: list(v.comments, toComment),
    timeLogs: list(v.timeLogs, toTimeLog),
    activity: list(v.activity, toActivity),
    recurrence: toRecurrence(v.recurrence),
    blockedBy: list(v.blockedBy, (id) => (typeof id === "string" ? id : null)),
    createdAt,
    updatedAt: num(v.updatedAt) ?? createdAt,
    doneAt: status === "done" ? (num(v.doneAt) ?? createdAt) : undefined,
  };
}

/** Sanitize raw storage/backup data into tasks with unique per-project numbers. */
export function migrateTasks(raw: unknown): Task[] {
  const tasks = list(raw, toTask);
  const seenIds = new Set<string>();
  const unique = tasks.filter((t) => (seenIds.has(t.id) ? false : (seenIds.add(t.id), true)));

  // Number tasks that predate keys (oldest first) and repair duplicates.
  const used = new Map<string, Set<number>>();
  const needsNumber: Task[] = [];
  for (const t of unique) {
    const set = used.get(t.projectId) ?? new Set<number>();
    used.set(t.projectId, set);
    if (t.number > 0 && !set.has(t.number)) set.add(t.number);
    else needsNumber.push(t);
  }
  const assigned = new Map<string, number>();
  for (const t of [...needsNumber].sort((a, b) => a.createdAt - b.createdAt)) {
    const set = used.get(t.projectId)!;
    const n = Math.max(0, ...set) + 1;
    set.add(n);
    assigned.set(t.id, n);
  }
  return unique.map((t) => (assigned.has(t.id) ? { ...t, number: assigned.get(t.id)! } : t));
}
