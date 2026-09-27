import type { Task } from "./task-types";

/**
 * Write a reordered subset (what the board shows after filters/scope) back
 * into the full task list: the subset's slots keep their positions relative
 * to hidden tasks and are refilled in the new order.
 */
export function mergeVisibleOrder(all: Task[], reordered: Task[]): Task[] {
  const ids = new Set(reordered.map((t) => t.id));
  let i = 0;
  return all.map((t) => (ids.has(t.id) && i < reordered.length ? reordered[i++] : t));
}
