import { addDaysIso, parseIso, toIsoDate } from "../../lib/date";
import type { ReminderSettings } from "../../lib/settings";
import type { Task } from "../tasks/task-types";

export type Reminder = {
  /** Stable id so each reminder fires once. */
  key: string;
  kind: "due" | "custom" | "digest";
  at: number;
  taskId?: string;
};

/** Reminders older than this when the app wakes up are skipped (the digest covers them). */
export const CATCH_UP_MS = 2 * 60 * 60_000;

function atTime(iso: string, hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  const d = parseIso(iso);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

/**
 * Reminders due in (from, to]: `leadMinutes` before a timed due date, a
 * task's custom reminder, and the daily digest. Already-fired keys and
 * finished tasks are skipped; anything older than CATCH_UP_MS is dropped.
 */
export function collectReminders(
  tasks: Task[],
  settings: ReminderSettings,
  from: number,
  to: number,
  fired: ReadonlySet<string>,
): Reminder[] {
  if (!settings.enabled) return [];
  const start = Math.max(from, to - CATCH_UP_MS);
  const out: Reminder[] = [];
  const add = (r: Reminder) => {
    if (r.at > start && r.at <= to && !fired.has(r.key)) out.push(r);
  };

  for (const t of tasks) {
    if (t.status === "done") continue;
    if (t.dueDate && t.dueTime) {
      const at = atTime(t.dueDate, t.dueTime) - settings.leadMinutes * 60_000;
      add({ key: `due:${t.id}:${t.dueDate}T${t.dueTime}`, kind: "due", at, taskId: t.id });
    }
    if (t.remindAt) add({ key: `custom:${t.id}:${t.remindAt}`, kind: "custom", at: t.remindAt, taskId: t.id });
  }

  if (settings.digestTime) {
    for (const iso of [addDaysIso(toIsoDate(new Date(to)), -1), toIsoDate(new Date(to))]) {
      add({ key: `digest:${iso}`, kind: "digest", at: atTime(iso, settings.digestTime) });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/** Keep the fired log bounded (newest last). */
export function remember(fired: string[], keys: string[], cap = 500): string[] {
  return [...fired.filter((k) => !keys.includes(k)), ...keys].slice(-cap);
}

/** "2 việc quá hạn · 3 việc hạn hôm nay · 4 việc trong kế hoạch" */
export function digestText(tasks: Task[], today: string): string {
  const open = tasks.filter((t) => t.status !== "done");
  const overdue = open.filter((t) => t.dueDate && t.dueDate < today).length;
  const due = open.filter((t) => t.dueDate === today).length;
  const planned = open.filter((t) => t.plannedFor === today).length;
  const parts = [
    overdue ? `${overdue} việc quá hạn` : "",
    due ? `${due} việc hạn hôm nay` : "",
    planned ? `${planned} việc trong kế hoạch` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Chưa có việc nào cho hôm nay — lên kế hoạch nhé.";
}
