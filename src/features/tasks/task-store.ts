import { DATA_KEYS } from "../../lib/data-keys";
import { createId } from "../../lib/id";
import { createPersistedStore, useStore } from "../../lib/store";
import { reconcileStages, resolveStage, stagesFor } from "../workflow/workflow-model";
import { workflowStore } from "../workflow/workflow-store";
import { applyTaskChanges, createTask, defaultContext, migrateTasks } from "./task-model";
import type { Task, TaskDraft, TaskPatch, TimeLog } from "./task-types";

/** Single source of truth for tasks, shared by every page and view. */
export const taskStore = createPersistedStore<Task[]>(DATA_KEYS.todos, [], {
  normalize: migrateTasks,
});

/**
 * Apply a change through the bookkeeping: keep stage and status consistent
 * with the task's workflow, then applyTaskChanges (history, numbering,
 * recurrence), then place any spawned occurrence in a stage.
 */
function commit(update: (prev: Task[]) => Task[]) {
  const wf = workflowStore.get();
  const stageName = (t: Task) => resolveStage(t, stagesFor(wf, t.projectId)).name;
  taskStore.set((prev) => {
    const next = reconcileStages(prev, update(prev), wf);
    const applied = applyTaskChanges(prev, next, { ...defaultContext(), stageName });
    return reconcileStages(applied, applied, wf);
  });
}

const mapOne = (id: string, fn: (t: Task) => Task) =>
  commit((prev) => prev.map((t) => (t.id === id ? fn(t) : t)));

export const taskActions = {
  add(draft: TaskDraft): Task {
    const [created] = reconcileStages([], [createTask(draft, taskStore.get())], workflowStore.get());
    taskStore.set((prev) => [created, ...prev]);
    return created;
  },

  /** Move a task to a workflow stage (its status follows the stage category). */
  setStage(id: string, stageId: string) {
    const task = taskStore.get().find((t) => t.id === id);
    if (!task) return;
    const stage = stagesFor(workflowStore.get(), task.projectId).find((s) => s.id === stageId);
    if (stage) mapOne(id, (t) => ({ ...t, stageId: stage.id, status: stage.category }));
  },

  /** Re-align every task with the current workflows (after stages change). */
  syncStages() {
    const wf = workflowStore.get();
    taskStore.set((prev) => reconcileStages(prev, prev, wf));
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
