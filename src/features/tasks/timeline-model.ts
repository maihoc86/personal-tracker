import { addDaysIso, diffDays } from "../../lib/date";
import type { Task } from "./task-types";

/** Span a task occupies on the timeline (inclusive), or null when undated. */
export function taskSpan(task: Task): { start: string; end: string } | null {
  const start = task.startDate || task.dueDate;
  const end = task.dueDate || task.startDate;
  if (!start || !end) return null;
  return start <= end ? { start, end } : { start: end, end: start };
}

/** Clip a span to the visible window; returns column offsets or null when outside. */
export function spanColumns(
  span: { start: string; end: string },
  windowStart: string,
  days: number,
): { from: number; to: number; clippedStart: boolean; clippedEnd: boolean } | null {
  const from = diffDays(windowStart, span.start);
  const to = diffDays(windowStart, span.end);
  if (to < 0 || from > days - 1) return null;
  return {
    from: Math.max(0, from),
    to: Math.min(days - 1, to),
    clippedStart: from < 0,
    clippedEnd: to > days - 1,
  };
}

export type DragMode = "move" | "resize-start" | "resize-end";

/**
 * New start/due dates after dragging a bar by `deltaDays`. Undated sides are
 * filled in so the result is always a proper range; resizing can't invert it.
 */
export function applyDrag(
  task: Task,
  mode: DragMode,
  deltaDays: number,
): { startDate: string; dueDate: string } | null {
  const span = taskSpan(task);
  if (!span || deltaDays === 0) return null;
  if (mode === "move") {
    return { startDate: addDaysIso(span.start, deltaDays), dueDate: addDaysIso(span.end, deltaDays) };
  }
  if (mode === "resize-end") {
    const end = addDaysIso(span.end, deltaDays);
    return { startDate: span.start, dueDate: end < span.start ? span.start : end };
  }
  const start = addDaysIso(span.start, deltaDays);
  return { startDate: start > span.end ? span.end : start, dueDate: span.end };
}
