import { addDaysIso, parseIso, toIsoDate } from "../../lib/date";
import type { Recurrence } from "./task-types";

/** One step of the rule from `iso` (no "after today" catch-up). */
export function stepRecurrence(iso: string, rule: Recurrence): string {
  const interval = Math.max(1, Math.floor(rule.interval || 1));
  switch (rule.freq) {
    case "daily":
      return addDaysIso(iso, interval);
    case "weekly":
      return addDaysIso(iso, 7 * interval);
    case "weekdays": {
      let next = addDaysIso(iso, 1);
      while ([0, 6].includes(parseIso(next).getDay())) next = addDaysIso(next, 1);
      return next;
    }
    case "monthly":
      return addMonthsClamped(iso, interval);
  }
}

/**
 * Next due date after completing a recurring task. Starts from the current
 * due date (or today) and keeps stepping until it lands after today, so a
 * daily task that was overdue for a week comes back tomorrow, not in the past.
 */
export function nextDueDate(dueIso: string, rule: Recurrence, today: string): string {
  let next = stepRecurrence(dueIso || today, rule);
  for (let i = 0; next <= today && i < 1000; i++) next = stepRecurrence(next, rule);
  return next;
}

function addMonthsClamped(iso: string, months: number): string {
  const d = parseIso(iso);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return toIsoDate(target);
}

/** "Hằng ngày", "Mỗi 2 tuần", "Ngày làm việc (T2–T6)"... */
export function describeRecurrence(rule: Recurrence): string {
  const n = Math.max(1, rule.interval || 1);
  switch (rule.freq) {
    case "daily":
      return n === 1 ? "Hằng ngày" : `Mỗi ${n} ngày`;
    case "weekdays":
      return "Ngày làm việc (T2–T6)";
    case "weekly":
      return n === 1 ? "Hằng tuần" : `Mỗi ${n} tuần`;
    case "monthly":
      return n === 1 ? "Hằng tháng" : `Mỗi ${n} tháng`;
  }
}
