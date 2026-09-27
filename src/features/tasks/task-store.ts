import { DATA_KEYS } from "../../lib/data-keys";
import { createId } from "../../lib/id";
import { createPersistedStore, useStore } from "../../lib/store";
import { applyTaskChanges, createTask, migrateTasks } from "./task-model";
import type { Task, TaskDraft, TaskPatch, TimeLog } from "./task-types";

/** Single source of truth for tasks, shared by every page and view. */
export const taskStore = createPersistedStore<Task[]>(DATA_KEYS.todos, [], {
  normalize: migrateTasks,
});

/** Apply a change through the bookkeeping in applyTaskChanges. */
function commit(update: (prev: Task[]) => Task[]) {
  taskStore.set((prev) => applyTaskChanges(prev, update(prev)));
}

const mapOne = (id: string, fn: (t: Task) => Task) =>
  commit((prev) => prev.map((t) => (t.id === id ? fn(t) : t)));

export const taskActions = {
  add(draft: TaskDraft): Task {
    const created = createTask(draft, taskStore.get());
    taskStore.set((prev) => [created, ...prev]);
    return created;
  },

  patch(id: string, patch: TaskPatch) {
    mapOne(id, (t) => ({ ...t, ...patch }));
  },

  patchMany(ids: string[], patch: TaskPatch) {
    const set = new Set(ids);
    commit((prev) => prev.map((t) => (set.has(t.id) ? { ...t, ...patch } : t)));
  },

  /** Replace the list wholesale — board drag persists new order + status. */
  reorder(next: Task[]) {
    commit(() => next);
  },

  /** Remove and return what's needed to undo. */
  remove(id: string): { task: Task; index: number } | null {
    const list = taskStore.get();
    const index = list.findIndex((t) => t.id === id);
    if (index < 0) return null;
    taskStore.set(list.filter((t) => t.id !== id));
    return { task: list[index], index };
  },

  restore(task: Task, index: number) {
    taskStore.set((prev) => {
      if (prev.some((t) => t.id === task.id)) return prev;
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, task);
      return next;
    });
  },

  addComment(id: string, text: string) {
    const clean = text.trim();
    if (!clean) return;
    mapOne(id, (t) => ({
      ...t,
      comments: [...t.comments, { id: createId(), text: clean, at: Date.now() }],
    }));
  },

  removeComment(id: string, commentId: string) {
    mapOne(id, (t) => ({ ...t, comments: t.comments.filter((c) => c.id !== commentId) }));
  },

  logTime(id: string, minutes: number, source: TimeLog["source"] = "manual") {
    if (!(minutes > 0)) return;
    mapOne(id, (t) => ({
      ...t,
      timeLogs: [...t.timeLogs, { id: createId(), minutes, at: Date.now(), source }],
    }));
  },

  /** Permanently delete the given tasks (used by "purge old done tasks"). */
  removeMany(ids: string[]) {
    const set = new Set(ids);
    taskStore.set((prev) => prev.filter((t) => !set.has(t.id)));
  },

  removeTimeLog(id: string, logId: string) {
    mapOne(id, (t) => ({ ...t, timeLogs: t.timeLogs.filter((l) => l.id !== logId) }));
  },
};

export function useTasks(): Task[] {
  return useStore(taskStore);
}
